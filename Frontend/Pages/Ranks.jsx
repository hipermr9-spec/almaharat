import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// ─── Rank Tiers ───────────────────────────────────────────────────────────────
const RANKS = [
  { id: 'bronze',   name: 'برونزي',      icon: '🔰', min: 0,    max: 99,
    p: '#CD7F32', t: '#FDDCA8', g: 'rgba(205,127,50,0.45)'  },
  { id: 'silver',   name: 'فضي',         icon: '⚡',  min: 100,  max: 299,
    p: '#A0B8CE', t: '#D8EAF6', g: 'rgba(160,184,206,0.45)' },
  { id: 'gold',     name: 'ذهبي',        icon: '⭐',  min: 300,  max: 699,
    p: '#FFD700', t: '#FFF2A0', g: 'rgba(255,215,0,0.5)'    },
  { id: 'sapphire', name: 'ياقوت',       icon: '💠',  min: 700,  max: 1499,
    p: '#4169E1', t: '#B0C4FF', g: 'rgba(65,105,225,0.5)'   },
  { id: 'ruby',     name: 'روبي',        icon: '🔴',  min: 1500, max: 2999,
    p: '#DC143C', t: '#FFB0C0', g: 'rgba(220,20,60,0.5)'    },
  { id: 'emerald',  name: 'زمرد',        icon: '💚',  min: 3000, max: 5999,
    p: '#00C86E', t: '#A0FFD4', g: 'rgba(0,200,110,0.5)'    },
  { id: 'diamond',  name: 'الماس',       icon: '💎',  min: 6000, max: Infinity,
    p: '#00D4FF', t: '#C0F6FF', g: 'rgba(0,212,255,0.6)'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getRank     = (pts) => RANKS.find(r => pts >= r.min && (r.max === Infinity || pts <= r.max)) ?? RANKS[0];
const getNextRank = (pts) => { const i = RANKS.findIndex(r => pts >= r.min && (r.max === Infinity || pts <= r.max)); return i < RANKS.length - 1 ? RANKS[i + 1] : null; };
const getProgress = (pts) => { const r = getRank(pts); if (r.max === Infinity) return 100; return ((pts - r.min) / (r.max - r.min + 1)) * 100; };
const fmt         = (n)   => typeof n === 'number' ? n.toLocaleString('ar-SA') : n;

// ─── Sub-components ───────────────────────────────────────────────────────────
const Shimmer = () => (
  <div style={{ padding: '10px 14px', borderRadius: 14, marginBottom: 8,
    background: 'rgba(255,255,255,.05)', height: 58 }} />
);

function LeaderboardRow({ user, position, isMe }) {
  const r      = getRank(user.points ?? 0);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 14, marginBottom: 8,
      background:  isMe ? `${r.p}18` : 'rgba(255,255,255,.03)',
      border:      `1px solid ${isMe ? r.p + '50' : 'rgba(255,255,255,.07)'}`,
      boxShadow:   isMe ? `0 0 18px ${r.g}` : 'none',
      transition:  'transform .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-4px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
    >
      <div style={{ width: 30, textAlign: 'center', flexShrink: 0,
        fontSize: position <= 3 ? 22 : 13, color: '#94a3b8', fontWeight: 700 }}>
        {position <= 3 ? medals[position - 1] : `#${position}`}
      </div>
      <div style={{ fontSize: 26, flexShrink: 0 }}>{r.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: isMe ? 700 : 500, fontSize: 14,
          color: isMe ? r.t : '#e2e8f0', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.username}
          {isMe && <span style={{ fontSize: 11, color: r.p, marginRight: 6 }}>(أنت)</span>}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{r.name}</div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: r.p, flexShrink: 0 }}>
        {fmt(user.points ?? 0)} ✦
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
/**
 * RanksSystem
 *
 * Props:
 *   currentUser  { userid, username, points }  – the logged-in user
 *   users        array of all users            – optional; provides leaderboard data
 *   baseUrl      string                         – e.g. "https://almaharat2.com"
 *   adminToken   string                         – X-Admin-Token header value
 */
export default function RanksSystem({
  currentUser = { userid: '', username: 'ضيف', points: 0 },
  users       = [],
  baseUrl     = '',
  adminToken  = '',
}) {
  const [board,   setBoard]   = useState(users);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState('board');

  // Load Google Font
  useEffect(() => {
    if (document.getElementById('cairo-font')) return;
    const link = document.createElement('link');
    link.id   = 'cairo-font';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap';
    document.head.appendChild(link);
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { 'X-Admin-Token': adminToken },
      });
      if (res.ok) setBoard(await res.json());
    } catch { /* silently fail */ }
    setLoading(false);
  }, [adminToken, baseUrl]);

  useEffect(() => {
    if (users.length > 0) setBoard(users);
    else fetchUsers();
  }, [users, fetchUsers]);

  const pts      = currentUser?.points ?? 0;
  const rank     = getRank(pts);
  const next     = getNextRank(pts);
  const progress = getProgress(pts);
  const sorted   = [...board].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 10);
  const myPos    = sorted.findIndex(u => u.userid === currentUser?.userid) + 1;

  // ─── CSS injected once ────────────────────────────────────────────────────
  const css = `
    @keyframes rs-pulse   { 0%,100%{transform:scale(1)}   50%{transform:scale(1.06)} }
    @keyframes rs-fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    .rs-badge     { animation: rs-pulse  2.8s ease-in-out infinite; }
    .rs-fade-0    { animation: rs-fadeUp .55s ease both; }
    .rs-fade-1    { animation: rs-fadeUp .55s .10s ease both; }
    .rs-fade-2    { animation: rs-fadeUp .55s .20s ease both; }
    .rs-fade-3    { animation: rs-fadeUp .55s .30s ease both; }
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

      {/* ── Header ── */}
      <div className="rs-fade-0" style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: '#4a5568', letterSpacing: 4,
          textTransform: 'uppercase', marginBottom: 6 }}>
          MAHARAT · RANKS
        </div>
        <h2 style={{
          margin: 0, fontSize: 26, fontWeight: 900,
          background:          `linear-gradient(135deg, ${rank.p}, ${rank.t})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          نظام المراتب
        </h2>
      </div>

      {/* ── Current Rank Card ── */}
      <div className="rs-fade-1" style={{
        background:  `linear-gradient(135deg, ${rank.p}1a, ${rank.p}08)`,
        border:      `1.5px solid ${rank.p}40`,
        borderRadius: 20,
        padding:     '28px 20px',
        textAlign:   'center',
        marginBottom: 20,
        boxShadow:   `0 8px 40px ${rank.g}`,
      }}>
        {/* Badge */}
        <div className="rs-badge" style={{
          width: 88, height: 88, borderRadius: '50%',
          margin: '0 auto 16px',
          background:  `radial-gradient(circle at 35% 35%, ${rank.p}cc, ${rank.p}55)`,
          border:      `2.5px solid ${rank.p}`,
          boxShadow:   `0 0 28px ${rank.g}, inset 0 2px 10px rgba(255,255,255,.15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40,
        }}>
          {rank.icon}
        </div>

        <div style={{ fontSize: 26, fontWeight: 900, color: rank.t, marginBottom: 4 }}>
          {rank.name}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: rank.p, marginBottom: 16 }}>
          {fmt(pts)} ✦ نقطة
        </div>

        {/* Progress bar */}
        {next ? (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12, color: '#94a3b8', marginBottom: 8,
            }}>
              <span>{rank.name}</span>
              <span>
                {fmt(next.min - pts)} نقطة حتى{' '}
                <span style={{ color: next.p }}>{next.name}</span>
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 999,
              background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${rank.p}, ${next.p})`,
                boxShadow:  `0 0 8px ${rank.g}`,
                transition: 'width 1.4s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </>
        ) : (
          <div style={{ color: rank.t, fontWeight: 700, fontSize: 15 }}>
            👑 لقد بلغت الرتبة القصوى!
          </div>
        )}

        {myPos > 0 && (
          <div style={{ marginTop: 14, fontSize: 12, color: '#64748b' }}>
            مرتبتك في لوحة الصدارة:{' '}
            <span style={{ color: rank.p, fontWeight: 700 }}>#{myPos}</span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="rs-fade-2" style={{
        display: 'flex', gap: 6, marginBottom: 18,
        background: 'rgba(255,255,255,.04)',
        borderRadius: 14, padding: 4,
      }}>
        {[['board', '🏆 لوحة الصدارة'], ['ranks', '📋 المراتب']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '10px 0',
            border: 'none', borderRadius: 11, cursor: 'pointer',
            fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 14,
            background:  tab === id ? rank.p       : 'transparent',
            color:       tab === id ? '#06091a'    : '#64748b',
            transition: 'all .3s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Leaderboard ── */}
      {tab === 'board' && (
        <div className="rs-fade-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} />)
            : sorted.length === 0
              ? <div style={{ textAlign: 'center', color: '#64748b', padding: 40, fontSize: 14 }}>
                  لا توجد بيانات — مرر adminToken لتحميل قائمة المستخدمين
                </div>
              : sorted.map((u, i) => (
                  <LeaderboardRow
                    key={u.userid ?? i}
                    user={u}
                    position={i + 1}
                    isMe={u.userid === currentUser?.userid}
                  />
                ))
          }
        </div>
      )}

      {/* ── All Ranks ── */}
      {tab === 'ranks' && (
        <div className="rs-fade-3">
          {RANKS.map((r) => {
            const unlocked  = pts >= r.min;
            const isCurrent = r.id === rank.id;
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14, marginBottom: 8,
                background:  isCurrent ? `${r.p}18` : unlocked ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)',
                border:      `1px solid ${isCurrent ? r.p + '55' : 'rgba(255,255,255,.07)'}`,
                opacity:     unlocked ? 1 : 0.45,
                boxShadow:   isCurrent ? `0 4px 20px ${r.g}` : 'none',
                transition:  'all .3s',
              }}>
                <div style={{ fontSize: 34, flexShrink: 0,
                  filter: unlocked ? 'none' : 'grayscale(100%)' }}>
                  {r.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: isCurrent ? 700 : 500, fontSize: 15,
                    color:  isCurrent ? r.t : unlocked ? '#e2e8f0' : '#4a5568',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {r.name}
                    {isCurrent && (
                      <span style={{
                        background: r.p, color: '#06091a',
                        fontSize: 10, padding: '2px 8px',
                        borderRadius: 999, fontWeight: 700,
                      }}>
                        أنت هنا
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {r.max === Infinity
                      ? `${fmt(r.min)}+ نقطة`
                      : `${fmt(r.min)} – ${fmt(r.max)} نقطة`}
                  </div>
                </div>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: unlocked ? r.p : 'rgba(255,255,255,.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: unlocked ? '#06091a' : '#4a5568',
                }}>
                  {unlocked ? '✓' : '🔒'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}