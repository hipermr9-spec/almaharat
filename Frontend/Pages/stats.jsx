import React, { useState, useEffect } from 'react';
import './App.css';

// ─── Rank Tiers (shared config) ───────────────────────────────────────────────
const RANKS = [
  { id: 'bronze',   name: 'برونزي',  icon: '🔰', min: 0,    max: 99,
    p: '#CD7F32', t: '#FDDCA8', g: 'rgba(205,127,50,0.45)'  },
  { id: 'silver',   name: 'فضي',     icon: '⚡',  min: 100,  max: 299,
    p: '#A0B8CE', t: '#D8EAF6', g: 'rgba(160,184,206,0.45)' },
  { id: 'gold',     name: 'ذهبي',    icon: '⭐',  min: 300,  max: 699,
    p: '#FFD700', t: '#FFF2A0', g: 'rgba(255,215,0,0.5)'    },
  { id: 'sapphire', name: 'ياقوت',   icon: '💠',  min: 700,  max: 1499,
    p: '#4169E1', t: '#B0C4FF', g: 'rgba(65,105,225,0.5)'   },
  { id: 'ruby',     name: 'روبي',    icon: '🔴',  min: 1500, max: 2999,
    p: '#DC143C', t: '#FFB0C0', g: 'rgba(220,20,60,0.5)'    },
  { id: 'emerald',  name: 'زمرد',    icon: '💚',  min: 3000, max: 5999,
    p: '#00C86E', t: '#A0FFD4', g: 'rgba(0,200,110,0.5)'    },
  { id: 'diamond',  name: 'الماس',   icon: '💎',  min: 6000, max: Infinity,
    p: '#00D4FF', t: '#C0F6FF', g: 'rgba(0,212,255,0.6)'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getRank     = (pts) => RANKS.find(r => pts >= r.min && (r.max === Infinity || pts <= r.max)) ?? RANKS[0];
const getNextRank = (pts) => { const i = RANKS.findIndex(r => pts >= r.min && (r.max === Infinity || pts <= r.max)); return i < RANKS.length - 1 ? RANKS[i + 1] : null; };
const getProgress = (pts) => { const r = getRank(pts); if (r.max === Infinity) return 100; return ((pts - r.min) / (r.max - r.min + 1)) * 100; };
const fmt         = (n)   => typeof n === 'number' ? n.toLocaleString('ar-SA') : n;
const fmtDate     = (iso) => {
  try { return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return ''; }
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon, value, label, accent }) {
  return (
    <div style={{
      background:   `linear-gradient(135deg, ${accent}20, ${accent}08)`,
      border:       `1px solid ${accent}30`,
      borderRadius:  16, padding: '18px 14px',
      textAlign: 'center', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent, marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
    </div>
  );
}

function PostCard({ post }) {
  const visibility = {
    public:  { label: '🌐 عام',   color: '#22c55e' },
    private: { label: '🔒 خاص',  color: '#f59e0b' },
    link:    { label: '🔗 رابط', color: '#3b82f6' },
  };
  const vis = visibility[post.visibility] ?? visibility.public;

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 14, marginBottom: 8,
      background: 'rgba(255,255,255,.03)',
      border:     '1px solid rgba(255,255,255,.07)',
      transition: 'transform .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
    >
      <div style={{
        fontWeight: 600, fontSize: 14, color: '#e2e8f0',
        marginBottom: 8, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {post.title}
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
        <span>❤️ {post.likes?.length ?? 0}</span>
        <span>💬 {post.comments?.length ?? 0}</span>
        <span style={{ color: vis.color }}>{vis.label}</span>
        <span style={{ marginRight: 'auto' }}>{fmtDate(post.createdAt)}</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ height: 56, borderRadius: 14, marginBottom: 8,
      background: 'rgba(255,255,255,.05)' }} />
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
/**
 * StudentStats
 *
 * Props:
 *   currentUser  { userid, username, points, role }  – the logged-in user
 *   baseUrl      string                               – e.g. "https://almaharat2.com"
 *   adminToken   string                               – X-Admin-Token (optional; used to
 *                                                       refresh points from the server)
 */
export default function StudentStats({
  currentUser = { userid: '', username: 'ضيف', points: 0, role: 'user' },
  baseUrl     = '',
  adminToken  = '',
}) {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [pts,     setPts]     = useState(currentUser?.points ?? 0);

  // Load Google Font
  useEffect(() => {
    if (document.getElementById('cairo-font')) return;
    const link = document.createElement('link');
    link.id   = 'cairo-font';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap';
    document.head.appendChild(link);
  }, []);

  // Keep pts in sync when currentUser prop changes
  useEffect(() => {
    setPts(currentUser?.points ?? 0);
  }, [currentUser?.points]);

  // Fetch posts + optionally refresh points
  useEffect(() => {
    if (!currentUser?.userid) { setLoading(false); return; }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Posts
        const postsRes = await fetch(`${baseUrl}/api/posts/user/${currentUser.userid}`);
        if (!cancelled && postsRes.ok) setPosts(await postsRes.json());

        // Fresh points (admin only)
        if (adminToken) {
          const ptsRes = await fetch(`${baseUrl}/api/admin/get_points/${currentUser.userid}`, {
            headers: { 'X-Admin-Token': adminToken },
          });
          if (!cancelled && ptsRes.ok) {
            const data = await ptsRes.json();
            if (typeof data.points === 'number') setPts(data.points);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) setLoading(false);
    }

    loadData();
    return () => { cancelled = true; };
  }, [currentUser?.userid, baseUrl, adminToken]);

  const rank     = getRank(pts);
  const next     = getNextRank(pts);
  const progress = getProgress(pts);

  const totalLikes    = posts.reduce((s, p) => s + (p.likes?.length    ?? 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments?.length ?? 0), 0);

  // Initials for avatar
  const initials = (currentUser?.username ?? 'ض').slice(0, 1);

  // ─── CSS ─────────────────────────────────────────────────────────────────
  const css = `
    @keyframes ss-fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    .ss-fade-0 { animation: ss-fadeUp .5s       ease both; }
    .ss-fade-1 { animation: ss-fadeUp .5s .10s  ease both; }
    .ss-fade-2 { animation: ss-fadeUp .5s .20s  ease both; }
    .ss-fade-3 { animation: ss-fadeUp .5s .30s  ease both; }
    .ss-fade-4 { animation: ss-fadeUp .5s .40s  ease both; }
  `;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
      direction:  'rtl',
      background: 'linear-gradient(160deg, #06091a 0%, #0c1228 60%, #06091a 100%)',
      minHeight:  '100vh',
      padding:    '24px 16px 48px',
      color:      '#e2e8f0',
    }}>
      <style>{css}</style>

      {/* ── Header label ── */}
      <div className="ss-fade-0" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#4a5568', letterSpacing: 4,
          textTransform: 'uppercase', marginBottom: 6 }}>
          MAHARAT · STATS
        </div>
        <h2 style={{
          margin: 0, fontSize: 24, fontWeight: 900,
          background:          `linear-gradient(135deg, ${rank.p}, ${rank.t})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          إحصائيات الطالب
        </h2>
      </div>

      {/* ── Profile card ── */}
      <div className="ss-fade-1" style={{
        display:     'flex', alignItems: 'center', gap: 16,
        background:  `linear-gradient(135deg, ${rank.p}18, ${rank.p}08)`,
        border:      `1.5px solid ${rank.p}35`,
        borderRadius: 20, padding: '20px 18px', marginBottom: 20,
        boxShadow:   `0 8px 30px ${rank.g}`,
      }}>
        {/* Avatar */}
        <div style={{
          width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
          background:  `linear-gradient(135deg, ${rank.p}, ${rank.p}88)`,
          border:      `2px solid ${rank.p}`,
          boxShadow:   `0 0 18px ${rank.g}`,
          display:     'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: '#06091a',
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 900, fontSize: 18, color: '#e2e8f0',
            marginBottom: 4, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {currentUser?.username ?? 'ضيف'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{rank.icon}</span>
            <span style={{ fontSize: 13, color: rank.t, fontWeight: 600 }}>{rank.name}</span>
            <span style={{ fontSize: 11, color: '#4a5568' }}>•</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {currentUser?.role === 'admin' ? '👑 مشرف' : '🧑‍🎓 طالب'}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: rank.p }}>{fmt(pts)}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>نقطة</div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="ss-fade-2" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <StatCard icon="✦"  value={fmt(pts)}                            label="نقاطي"      accent={rank.p}    />
        <StatCard icon="📝" value={loading ? '…' : fmt(posts.length)}   label="المنشورات"  accent="#8b5cf6"   />
        <StatCard icon="❤️" value={loading ? '…' : fmt(totalLikes)}     label="الإعجابات"  accent="#ef4444"   />
        <StatCard icon="💬" value={loading ? '…' : fmt(totalComments)}  label="التعليقات"  accent="#3b82f6"   />
      </div>

      {/* ── Progress card ── */}
      <div className="ss-fade-3" style={{
        background:  'rgba(255,255,255,.04)',
        border:      '1px solid rgba(255,255,255,.08)',
        borderRadius: 16, padding: 18, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>{rank.icon}</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>التقدم نحو المرتبة التالية</span>
        </div>

        {/* From → To row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>{rank.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: rank.t }}>{rank.name}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{fmt(rank.min)} نقطة</div>
            </div>
          </div>
          {next && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: next.t }}>{next.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{fmt(next.min)} نقطة</div>
              </div>
              <span style={{ fontSize: 22 }}>{next.icon}</span>
            </div>
          )}
        </div>

        {next ? (
          <>
            <div style={{ height: 12, borderRadius: 999,
              background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${rank.p}, ${next.p})`,
                boxShadow:  `0 0 8px ${rank.g}`,
                transition: 'width 1.6s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
            <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
              {fmt(next.min - pts)} نقطة متبقية
            </div>
          </>
        ) : (
          <div style={{ color: rank.t, fontWeight: 700, textAlign: 'center', fontSize: 15 }}>
            🏆 وصلت إلى أعلى رتبة!
          </div>
        )}
      </div>

      {/* ── Recent posts ── */}
      <div className="ss-fade-4">
        <h3 style={{
          margin: '0 0 12px', fontSize: 16,
          fontWeight: 700, color: '#94a3b8',
        }}>
          📮 منشوراتي الأخيرة
        </h3>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 12,
            background: 'rgba(220,20,60,.1)', border: '1px solid rgba(220,20,60,.3)',
            color: '#FFB0C0', fontSize: 13,
          }}>
            ⚠️ تعذّر تحميل البيانات: {error}
          </div>
        )}

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : posts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '32px 16px',
            background: 'rgba(255,255,255,.03)', borderRadius: 14,
            border:     '1px solid rgba(255,255,255,.07)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>لا توجد منشورات بعد</div>
          </div>
        ) : (
          posts.slice(0, 6).map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}