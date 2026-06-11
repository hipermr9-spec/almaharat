/**
 * Profile.jsx
 *
 * Route mapping (add to your router):
 *   <Route path="/profile"    element={<Profile />} />   ← own profile
 *   <Route path="/:userid"    element={<Profile />} />   ← public profile
 *
 * ⚠️  Public profile fetching uses GET /api/users/public/:userid
 *     which doesn't exist in app.py yet — add it or adapt the fetch below.
 *
 * Fix: the original import `import App from './App.css'` is invalid
 * (CSS files have no default export). Use the plain import below instead.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./App.css";

// ─── Config ──────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL ?? "https://api.almaharat2.com";

// One color per first letter so the same user always gets the same hue
const PALETTE = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#f43f5e", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#14b8a6",
];
const userColor = (name = "") =>
  PALETTE[name.charCodeAt(0) % PALETTE.length];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
  catch { return null; }
};

// ─── AnimatedStat ─────────────────────────────────────────────────────────────
function AnimatedStat({ value, label }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const start  = performance.now();
    const DURATION = 900;

    const tick = (now) => {
      const ease = 1 - Math.pow(1 - Math.min((now - start) / DURATION, 1), 3);
      setDisplay(Math.round(ease * target));
      if (ease < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return (
    <div className="stat-item">
      <span className="stat-value">{display.toLocaleString()}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
function PostCard({ post, onOpen }) {
  const thumb = post.media?.[0];

  return (
    <button className="post-card" onClick={() => onOpen(post)} aria-label={post.title}>
      {thumb?.type === "image" && (
        <img src={thumb.url} alt={post.title} className="post-thumb" loading="lazy" />
      )}
      {thumb?.type === "video" && (
        <div className="post-thumb post-thumb--video">
          <video src={thumb.url} muted playsInline preload="metadata" />
          <span className="video-badge">▶</span>
        </div>
      )}
      {!thumb && (
        <div className="post-thumb post-thumb--text">
          <span>{post.title}</span>
        </div>
      )}
      <div className="post-overlay" aria-hidden="true">
        <span className="overlay-stat">❤ {post.likes?.length ?? 0}</span>
        <span className="overlay-stat">💬 {post.comments?.length ?? 0}</span>
      </div>
    </button>
  );
}

// ─── PostModal ────────────────────────────────────────────────────────────────
function PostModal({ post, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="إغلاق">×</button>

        {post.media?.length > 0 && (
          <div className="modal-media-list">
            {post.media.map((m, i) =>
              m.type === "image" ? (
                <img key={i} src={m.url} alt="" className="modal-media" />
              ) : m.type === "video" ? (
                <video key={i} src={m.url} controls className="modal-media" />
              ) : null
            )}
          </div>
        )}

        <div className="modal-body">
          <h2 className="modal-title">{post.title}</h2>

          {post.description && (
            <p className="modal-desc">{post.description}</p>
          )}

          {post.hashtags?.length > 0 && (
            <div className="modal-tags">
              {post.hashtags.map((t) => (
                <span key={t} className="hashtag">#{t}</span>
              ))}
            </div>
          )}

          <div className="modal-meta">
            <span>❤ {post.likes?.length ?? 0}</span>
            <span>👎 {post.dislikes?.length ?? 0}</span>
            <span>💬 {post.comments?.length ?? 0}</span>
            <span className="modal-date">
              {new Date(post.createdAt).toLocaleDateString("ar-SA")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile (main) ───────────────────────────────────────────────────────────
export default function Profile() {
  const { userid: paramId } = useParams();
  const location            = useLocation();
  const navigate            = useNavigate();

  // Detect which mode we're in
  const isOwn   = location.pathname === "/profile";
  const stored  = getStoredUser();
  const userId  = isOwn ? stored?.userid : paramId;

  // Redirect own-profile to login if not authenticated
  useEffect(() => {
    if (isOwn && !stored) navigate("/login", { replace: true });
  }, [isOwn, stored, navigate]);

  // If viewing own profile via /:userid, redirect to /profile
  useEffect(() => {
    if (!isOwn && stored && paramId === stored.userid) {
      navigate("/profile", { replace: true });
    }
  }, [isOwn, stored, paramId, navigate]);

  const [user,     setUser]     = useState(null);
  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // ── Own profile: read from localStorage ──
      if (isOwn && stored) {
        setUser(stored);
      } else {
        // ── Public profile: fetch from API ──
        // ⚠️  Requires GET /api/users/public/:userid in app.py
        const r = await fetch(`${API}/api/users/public/${userId}`);
        if (!r.ok) throw new Error("المستخدم غير موجود");
        setUser(await r.json());
      }

      // ── Posts (both modes) ──
      const pr = await fetch(`${API}/api/posts/user/${userId}`);
      if (pr.ok) setPosts(await pr.json());

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, isOwn]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loader-ring" />
        <p className="loader-text">جارٍ التحميل…</p>
      </div>
    );
  }

  // ── Error ──
  if (error || !user) {
    return (
      <div className="profile-error">
        <span className="error-icon">⚠</span>
        <p>{error ?? "لم يتم العثور على المستخدم"}</p>
        <button className="btn-back" onClick={() => navigate(-1)}>رجوع</button>
      </div>
    );
  }

  const color = userColor(user.username);

  return (
    <div className="profile-root" dir="rtl">

      {/* ── Cover ─────────────────────────────────── */}
      <div
        className="cover"
        style={{ "--user-color": color }}
        aria-hidden="true"
      />

      {/* ── Main ──────────────────────────────────── */}
      <main className="profile-main">

        {/* ── Info card ── */}
        <section className="profile-card">

          {/* Avatar */}
          <div className="avatar-wrap">
            <div className="avatar" style={{ background: color }}>
              {user.username?.[0]?.toUpperCase()}
            </div>
            {user.verified && (
              <span className="verified-badge" title="حساب موثق">✓</span>
            )}
          </div>

          {/* Name & chips */}
          <div className="profile-identity">
            <h1 className="profile-name">
              {user.username}
            </h1>
            <div className="profile-chips">
              {user.role === "admin" && (
                <span className="chip chip--admin">مشرف</span>
              )}
              {user.verified && (
                <span className="chip chip--verified">موثق ✓</span>
              )}
              {user.is_banned && (
                <span className="chip chip--banned">محظور</span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <AnimatedStat value={posts.length}        label="منشورات" />
            <AnimatedStat value={user.followers ?? 0} label="متابعون"  />
            <AnimatedStat value={user.following ?? 0} label="يتابع"    />
            <AnimatedStat value={user.points    ?? 0} label="نقاط"     />
            <AnimatedStat value={user.lessons   ?? 0} label="دروس"     />
          </div>

          {/* Actions */}
          <div className="profile-actions">
            {isOwn ? (
              <>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/settings")}
                >
                  تعديل الملف الشخصي
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => navigate("/port/helpers/submit/usersubmiter/" + user.userid)}
                >
                  طلب التوثيق
                </button>
              </>
            ) : (
              <button className="btn-primary">
                + متابعة
              </button>
            )}
          </div>
        </section>

        {/* ── Posts ── */}
        <section className="posts-section">
          <h2 className="section-title">
            <span>المنشورات</span>
            <span className="posts-count">{posts.length}</span>
          </h2>

          {posts.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p className="empty-text">لا توجد منشورات بعد</p>
              {isOwn && (
                <button className="btn-primary" onClick={() => navigate("/Posts/New")}>
                  أنشئ أول منشور
                </button>
              )}
            </div>
          ) : (
            <div className="posts-grid">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onOpen={setSelected} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Post modal ── */}
      {selected && (
        <PostModal post={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}