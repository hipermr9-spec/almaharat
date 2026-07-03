import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import './App.css';
import BlockedPosts from './Website/BlockedPosts';

const API = "https://api.almaharat2.com";

/* ─── helpers ──────────────────────────────────────────────────────────── */
function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)   return 'الآن';
  if (diff < 3600) return `${Math.floor(diff/60)} د`;
  if (diff < 86400)return `${Math.floor(diff/3600)} س`;
  return `${Math.floor(diff/86400)} يوم`;
}

function Avatar({ name, size = 40 }) {
  const colors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${bg}, ${bg}99)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight:700, fontSize: size * 0.38, color:'#fff',
      flexShrink: 0, fontFamily:'monospace',
      boxShadow: `0 0 0 2px ${bg}44`
    }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

/* ─── Comment ─────────────────────────────────────────────────────────── */
function Comment({ comment, user, onDelete }) {
  return (
    <div style={{
      display:'flex', gap:10, padding:'10px 0',
      borderBottom:'1px solid rgba(255,255,255,0.05)',
      animation:'fadeIn .3s ease'
    }}>
      <Avatar name={comment.username} size={32} />
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ fontWeight:700, fontSize:13, color:'#e2e8f0' }}>{comment.username}</span>
          <span style={{ fontSize:11, color:'#475569' }}>{timeAgo(comment.createdAt)}</span>
          {user?.userid === comment.userid && (
            <button onClick={() => onDelete(comment.id)} style={{
              marginRight:'auto', background:'none', border:'none',
              color:'#ef4444', cursor:'pointer', fontSize:12, opacity:.7, padding:0
            }}>✕</button>
          )}
        </div>
        <p style={{ margin:0, fontSize:14, color:'#94a3b8', lineHeight:1.5, direction:'rtl' }}>
          {comment.text}
        </p>
      </div>
    </div>
  );
}

/* ─── MediaGrid ───────────────────────────────────────────────────────── */
function MediaGrid({ media }) {
  if (!media?.length) return null;
  const single = media.length === 1;
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns: single ? '1fr' : 'repeat(2, 1fr)',
      gap:3, borderRadius:16, overflow:'hidden', marginTop:12,
    }}>
      {media.slice(0,4).map((m, i) => (
        <div key={i} style={{
          position:'relative', paddingTop: single ? '56.25%' : '75%',
          background:'#0f172a', overflow:'hidden'
        }}>
          {m.type === 'video'
            ? <video src={m.url} controls style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
            : <img src={m.url} alt="" style={{
                position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
                transition:'transform .4s', cursor:'pointer'
              }}
              onMouseOver={e => {
                const el = e.currentTarget
                if (!el) return
                el.style.transform = 'scale(1.04)'
              }}
              onMouseOut={e => {
                const el = e.currentTarget
                if (!el) return
                el.style.transform = 'scale(1)'
              }}
              />
          }
          {i === 3 && media.length > 4 && (
            <div style={{
              position:'absolute', inset:0, background:'rgba(0,0,0,.6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:28, fontWeight:800, color:'#fff'
            }}>+{media.length - 4}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── ActionBtn ───────────────────────────────────────────────────────── */
function ActionBtn({ icon, count, active, activeColor, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:6,
      background: active ? `${activeColor}22` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.08)'}`,
      borderRadius:10, padding:'7px 14px', cursor:'pointer',
      color: active ? activeColor : '#64748b',
      fontWeight:600, fontSize:14, transition:'all .2s',
    }}
    onMouseOver={e => {
      const el = e.currentTarget
      if (!el) return
      el.style.background = `${activeColor}22`
      el.style.color = activeColor
    }}
    onMouseOut={e => {
      const el = e.currentTarget
      if (!el) return
      if (!active) {
        el.style.background = 'rgba(255,255,255,0.04)'
        el.style.color = '#64748b'
      }
    }}>
      {icon} <span>{count}</span>
    </button>
  );
}

/* ─── PostCard ────────────────────────────────────────────────────────── */
function PostCard({ post, user, onRefresh }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [likes, setLikes]               = useState(post.likes?.length || 0);
  const [dislikes, setDislikes]         = useState(post.dislikes?.length || 0);
  const [liked, setLiked]               = useState(user && post.likes?.includes(user.userid));
  const [disliked, setDisliked]         = useState(user && post.dislikes?.includes(user.userid));

  async function handleLike() {
    if (!user) return;
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/like`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userid: user.userid })
      });
      if (res.ok) {
        const d = await res.json();
        setLikes(d.likes); setDislikes(d.dislikes);
        setLiked(l => !l); if (disliked) setDisliked(false);
      } else {
        console.error('Failed to like post:', res.status);
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  }

  async function handleDislike() {
    if (!user) return;
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/dislike`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userid: user.userid })
      });
      if (res.ok) {
        const d = await res.json();
        setLikes(d.likes); setDislikes(d.dislikes);
        setDisliked(l => !l); if (liked) setLiked(false);
      } else {
        console.error('Failed to dislike post:', res.status);
      }
    } catch (err) {
      console.error('Error disliking post:', err);
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/comment`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userid: user.userid, username: user.username, text: newComment })
      });
      if (res.ok) {
        setNewComment(''); onRefresh();
      } else {
        console.error('Failed to post comment:', res.status);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!user) return;
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/comment/${commentId}`, {
        method:'DELETE', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userid: user.userid })
      });
      if (res.ok) {
        onRefresh();
      } else {
        console.error('Failed to delete comment:', res.status);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  }

  async function handleDeletePost() {
    if (!user || user.userid !== post.userid) return;
    if (!window.confirm('حذف المنشور؟')) return;
    try {
      const res = await fetch(`${API}/api/posts/${post.id}`, {
        method:'DELETE', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userid: user.userid })
      });
      if (res.ok) {
        onRefresh();
      } else {
        console.error('Failed to delete post:', res.status);
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  }

  return (
    <article style={{
      background:'linear-gradient(145deg, #1e293b, #0f172a)',
      border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:20, padding:'20px 22px', marginBottom:18,
      animation:'slideUp .4s ease', boxShadow:'0 4px 30px rgba(0,0,0,.4)',
      transition:'box-shadow .3s',
    }}
    onMouseOver={e => {
      const el = e.currentTarget
      if (!el) return
      el.style.boxShadow='0 8px 40px rgba(99,102,241,0.15)'
    }}
    onMouseOut={e => {
      const el = e.currentTarget
      if (!el) return
      el.style.boxShadow='0 4px 30px rgba(0,0,0,.4)'
    }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <Avatar name={post.username} size={44} />
        <div style={{ flex:1, direction:'rtl' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'#e2e8f0' }}>{post.username}</div>
          <div style={{ fontSize:12, color:'#475569' }}>{timeAgo(post.createdAt)}</div>
        </div>
        {user?.userid === post.userid && (
          <button onClick={handleDeletePost} style={{
            background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)',
            borderRadius:8, color:'#ef4444', cursor:'pointer', padding:'4px 10px', fontSize:12,
          }}>حذف</button>
        )}
      </div>

      <div style={{ direction:'rtl', marginBottom:10 }}>
        <h3 style={{ margin:'0 0 6px', fontSize:17, fontWeight:700, color:'#f1f5f9', lineHeight:1.4 }}>
          {post.title}
        </h3>
        {post.description && (
          <p style={{ margin:0, color:'#94a3b8', fontSize:14, lineHeight:1.7 }}>{post.description}</p>
        )}
      </div>

      {post.hashtags?.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8, direction:'rtl' }}>
          {post.hashtags.map(tag => (
            <span key={tag} style={{
              background:'rgba(99,102,241,.15)', color:'#818cf8',
              borderRadius:20, padding:'2px 10px', fontSize:12,
              border:'1px solid rgba(99,102,241,.25)'
            }}>#{tag}</span>
          ))}
        </div>
      )}

      <MediaGrid media={post.media} />

      <div style={{ display:'flex', gap:8, marginTop:16, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <ActionBtn icon="👍" count={likes} active={liked} activeColor="#6366f1" onClick={handleLike} />
        <ActionBtn icon="👎" count={dislikes} active={disliked} activeColor="#ef4444" onClick={handleDislike} />
        <ActionBtn icon="💬" count={post.comments?.length || 0} onClick={() => setShowComments(v => !v)} active={showComments} activeColor="#10b981" />
      </div>

      {showComments && (
        <div style={{ marginTop:16, animation:'fadeIn .25s ease' }}>
          {post.comments?.length > 0
            ? post.comments.map(c => <Comment key={c.id} comment={c} user={user} onDelete={handleDeleteComment} />)
            : <p style={{ color:'#475569', fontSize:13, textAlign:'center', padding:'12px 0' }}>لا توجد تعليقات بعد</p>
          }
          {user && (
            <form onSubmit={handleComment} style={{ display:'flex', gap:8, marginTop:12 }}>
              <input
                value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="أضف تعليقاً..." dir="rtl"
                style={{
                  flex:1, background:'rgba(255,255,255,0.05)',
                  border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:12, padding:'10px 14px',
                  color:'#e2e8f0', fontSize:14, outline:'none', fontFamily:'inherit'
                }}
              />
              <button type="submit" disabled={submitting} style={{
                background: submitting ? '#334155' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border:'none', borderRadius:12, color:'#fff',
                padding:'0 18px', cursor:'pointer', fontWeight:600, fontSize:14, transition:'all .2s'
              }}>إرسال</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

export { PostCard }

/* ─── Main Page ───────────────────────────────────────────────────────── */
export default function PostPage() {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin]   = useState(false);
  const navigate = useNavigate();

  const user = (() => {
    try {
      const cookieValue = Cookies.get('DONT-SHARE-THAT-COOKIE') || Cookies.get('user');
      return cookieValue ? JSON.parse(cookieValue) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (user?.role === 'admin') setIsAdmin(true);
  }, [user]);

  const handleLogout = () => {
    Cookies.remove('DONT-SHARE-THAT-COOKIE');
    Cookies.remove('user');
    Cookies.remove('userid');
    localStorage.removeItem('user');
    window.location.href = "/login";
  };

  async function fetchPosts() {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/posts`);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch { setPosts([]); }
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, []);

  const filtered = posts.filter(p =>
    p.title?.includes(search) ||
    p.description?.includes(search) ||
    p.hashtags?.some(t => t.includes(search)) ||
    p.username?.includes(search)
  );

  if (!user) return <div className="loading">جاري الدخول...</div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
        * { box-sizing:border-box; }
        body { margin:0; background:#0a0f1e; font-family:'Tajawal',sans-serif; }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        input:focus { border-color:rgba(99,102,241,.5) !important; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#0a0f1e; }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:3px; }
      `}</style>

      <div className={`nav-overlay ${menuOpen ? "active" : ""}`} onClick={() => setMenuOpen(false)} />
      <button className={`burger-btn ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
        <span></span><span></span><span></span>
      </button>
      <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
        <div className="nav-brand">منصة التعزيز ✨</div>
        <ul className="nav-links">
          <li onClick={() => setMenuOpen(false)}><a href="/home">الرئيسية 🏠</a></li>
          <li onClick={() => setMenuOpen(false)}><a href="/Games">العاب 🎮</a></li>
          <li onClick={() => setMenuOpen(false)}><a href="/posts">منشورات 📭</a></li>
          <li onClick={() => setMenuOpen(false)}><a href="/enrichments">إثراءات 🌟</a></li>
          <li onClick={() => setMenuOpen(false)}><a href="/settings">الإعدادات ⚙️</a></li>
          {isAdmin && <li onClick={() => setMenuOpen(false)}><a href="/Admin/Home">لوحة المشرف 🧑‍💼</a></li>}
        </ul>
        <div className="nav-footer">
          <button onClick={handleLogout} className="btn-logout">تسجيل خروج</button>
        </div>
      </nav>

      <div style={{
        minHeight:'100vh', background:'#0a0f1e',
        backgroundImage:'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,.06) 0%, transparent 50%)',
        padding:'24px 16px', fontFamily:"'Tajawal', sans-serif"
      }}>
        <div style={{ maxWidth:660, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={{
              margin:0, fontSize:24, fontWeight:900, color:'#f1f5f9',
              background:'linear-gradient(135deg, #818cf8, #c084fc)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'
              }}>المنشورات</h1>
              <BlockedPosts />
            </div>
            {user && (
              <button onClick={() => navigate('/Posts/Add')} style={{
                background:'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border:'none', borderRadius:14, color:'#fff',
                padding:'10px 20px', cursor:'pointer', fontWeight:700,
                fontSize:14, fontFamily:"'Tajawal',sans-serif",
                boxShadow:'0 4px 20px rgba(99,102,241,.4)', transition:'transform .2s, box-shadow .2s'
              }}
              onMouseOver={e => {
                const el = e.currentTarget
                if (!el) return
                el.style.transform='translateY(-2px)'
                el.style.boxShadow='0 6px 28px rgba(99,102,241,.55)'
              }}
              onMouseOut={e => {
                const el = e.currentTarget
                if (!el) return
                el.style.transform='translateY(0)'
                el.style.boxShadow='0 4px 20px rgba(99,102,241,.4)'
              }}
              >+ منشور جديد</button>
            )}
          </div>

          <div style={{ position:'relative', marginBottom:24 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث في المنشورات..." dir="rtl"
              style={{
                width:'100%', background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.09)',
                borderRadius:16, padding:'13px 18px',
                color:'#e2e8f0', fontSize:15, outline:'none',
                fontFamily:"'Tajawal',sans-serif", transition:'border-color .2s'
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:60, color:'#475569' }}>
              <div style={{
                width:36, height:36, border:'3px solid #1e293b',
                borderTop:'3px solid #6366f1', borderRadius:'50%',
                animation:'spin 1s linear infinite', margin:'0 auto 12px'
              }} />
              جارٍ التحميل...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'#475569' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
              <p style={{ margin:0, fontSize:16 }}>لا توجد منشورات بعد</p>
            </div>
          ) : (
            filtered.map(post => <PostCard key={post.id} post={post} user={user} onRefresh={fetchPosts} />)
          )}
        </div>
      </div>
    </>
  );
}