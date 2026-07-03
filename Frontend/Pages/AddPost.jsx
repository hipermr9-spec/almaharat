import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from "js-cookie";
import './App.css';

const API = import.meta.env.VITE_API_URL ?? "https://api.almaharat2.com";

const VISIBILITY_OPTIONS = [
  { value:'public',  label:'عام 🌍',        desc:'يراه الجميع' },
  { value:'private', label:'خاص 🔒',        desc:'أنت فقط' },
  { value:'link',    label:'برابط 🔗',       desc:'من يملك الرابط' },
];

function UploadZone({ files, onAdd, onRemove }) {
  const inputRef = useRef();
  const [drag, setDrag]= useState(false);

  function handleDrop(e) {
    e.preventDefault(); setDrag(false);
    addFiles(Array.from(e.dataTransfer.files));
  }
  function addFiles(list) {
    const allowed = list.filter(f => /\.(png|jpg|jpeg|gif|webp|mp4|webm|mov)$/i.test(f.name));
    onAdd(allowed);
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${drag ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
          borderRadius:16, padding:'32px 24px', textAlign:'center',
          cursor:'pointer', transition:'all .25s',
          background: drag ? 'rgba(99,102,241,.08)' : 'rgba(255,255,255,0.02)',
        }}
        onMouseOver={e => e.currentTarget.style.borderColor='#6366f1'}
        onMouseOut={e => { if (!drag) e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}
      >
        <div style={{ fontSize:36, marginBottom:8 }}>📎</div>
        <p style={{ margin:0, color:'#64748b', fontSize:14 }}>
          اسحب الصور أو الفيديوهات هنا أو <span style={{ color:'#818cf8', fontWeight:700 }}>اضغط للاختيار</span>
        </p>
        <p style={{ margin:'6px 0 0', color:'#334155', fontSize:12 }}>
          PNG · JPG · GIF · WEBP · MP4 · WEBM · MOV
        </p>
        <input
          ref={inputRef} type="file" multiple
          accept="image/*,video/*"
          style={{ display:'none' }}
          onChange={e => addFiles(Array.from(e.target.files))}
        />
      </div>

      {/* Preview strip */}
      {files.length > 0 && (
        <div style={{
          display:'flex', gap:8, marginTop:12, flexWrap:'wrap'
        }}>
          {files.map((f, i) => (
            <div key={i} style={{
              position:'relative', width:80, height:80,
              borderRadius:12, overflow:'hidden',
              border:'2px solid rgba(99,102,241,.3)',
              flexShrink:0
            }}>
              {f.type.startsWith('video')
                ? <div style={{
                    width:'100%', height:'100%', background:'#1e293b',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:28
                  }}>🎬</div>
                : <img src={URL.createObjectURL(f)} alt=""
                    style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              }
              <button onClick={() => onRemove(i)} style={{
                position:'absolute', top:3, right:3,
                background:'rgba(0,0,0,.7)', border:'none',
                borderRadius:'50%', width:20, height:20,
                color:'#fff', cursor:'pointer', fontSize:11,
                display:'flex', alignItems:'center', justifyContent:'center',
                lineHeight:1
              }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddPost() {
  const navigate = useNavigate();
  const user     = (() => { try { return JSON.parse(Cookies.get('DONT-SHARE-THAT-COOKIE')); } catch { return null; } })();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [hashtag,     setHashtag]     = useState('');
  const [hashtags,    setHashtags]    = useState([]);
  const [visibility,  setVisibility]  = useState('public');
  const [files,       setFiles]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  if (!user) {
    navigate('/login');
    return null;
  }

  function addHashtag() {
    const t = hashtag.trim().replace(/^#/, '');
    if (t && !hashtags.includes(t)) setHashtags(h => [...h, t]);
    setHashtag('');
  }
  function onHashtagKey(e) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault(); addHashtag();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('العنوان مطلوب'); return; }

    setLoading(true);
    const form = new FormData();
    form.append('userid',      user.userid);
    form.append('username',    user.username);
    form.append('title',       title.trim());
    form.append('description', description.trim());
    form.append('hashtags',    hashtags.join(','));
    form.append('visibility',  visibility);
    files.forEach(f => form.append('files[]', f));

    try {
      const res  = await fetch(`${API}/api/posts/add`, { method:'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'حدث خطأ'); setLoading(false); return; }
      if (data.post?.linkToken) {
        navigate(`/Posts/link/${data.post.linkToken}`);
        return;
      }
      navigate('/posts');
    } catch {
      setError('تعذّر الاتصال بالخادم');
      setLoading(false);
    }
  }

  const charLeft = 500 - description.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
        * { box-sizing:border-box; }
        body { margin:0; background:#0a0f1e; font-family:'Tajawal',sans-serif; }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        textarea:focus, input:focus { outline:none; border-color:rgba(99,102,241,.55) !important; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:3px; }
      `}</style>

      <div style={{
        minHeight:'100vh', background:'#0a0f1e',
        backgroundImage:'radial-gradient(ellipse at 10% 80%, rgba(99,102,241,.08) 0%, transparent 55%), radial-gradient(ellipse at 90% 10%, rgba(139,92,246,.06) 0%, transparent 50%)',
        padding:'32px 16px', fontFamily:"'Tajawal',sans-serif"
      }}>
        <div style={{
          maxWidth:620, margin:'0 auto',
          animation:'slideUp .4s ease'
        }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
            <button onClick={() => navigate(-1)} style={{
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)',
              borderRadius:12, color:'#94a3b8', padding:'8px 16px',
              cursor:'pointer', fontSize:14, fontFamily:"'Tajawal',sans-serif"
            }}>→ رجوع</button>
            <h1 style={{
              margin:0, fontSize:22, fontWeight:900, color:'#f1f5f9',
              background:'linear-gradient(135deg,#818cf8,#c084fc)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'
            }}>منشور جديد</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <Card>
              {/* User pill */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <UserAvatar name={user.username} />
                <div style={{ direction:'rtl' }}>
                  <div style={{ fontWeight:700, fontSize:15, color:'#e2e8f0' }}>{user.username}</div>
                  <div style={{ fontSize:12, color:'#475569' }}>ينشر الآن</div>
                </div>
              </div>

              {/* Title */}
              <Field label="العنوان *">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="عنوان المنشور..."
                  dir="rtl"
                  maxLength={120}
                  style={inputStyle}
                />
              </Field>

              {/* Description */}
              <Field label="الوصف">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0,500))}
                  placeholder="ما الذي تريد مشاركته؟"
                  dir="rtl"
                  rows={4}
                  style={{ ...inputStyle, resize:'none', lineHeight:1.7 }}
                />
                <div style={{ textAlign:'left', fontSize:11, color: charLeft < 50 ? '#ef4444' : '#475569', marginTop:4 }}>
                  {charLeft} حرف متبقٍ
                </div>
              </Field>

              {/* Hashtags */}
              <Field label="الوسوم">
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    value={hashtag}
                    onChange={e => setHashtag(e.target.value)}
                    onKeyDown={onHashtagKey}
                    placeholder="اكتب وسمًا ثم Enter..."
                    dir="rtl"
                    style={{ ...inputStyle, flex:1 }}
                  />
                  <button type="button" onClick={addHashtag} style={{
                    background:'rgba(99,102,241,.2)', border:'1px solid rgba(99,102,241,.3)',
                    borderRadius:12, color:'#818cf8', padding:'0 16px',
                    cursor:'pointer', fontSize:14, fontFamily:"'Tajawal',sans-serif", fontWeight:700
                  }}>+</button>
                </div>
                {hashtags.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
                    {hashtags.map(t => (
                      <span key={t} style={{
                        background:'rgba(99,102,241,.15)', color:'#818cf8',
                        borderRadius:20, padding:'3px 12px', fontSize:13,
                        border:'1px solid rgba(99,102,241,.25)',
                        display:'flex', alignItems:'center', gap:6
                      }}>
                        #{t}
                        <button type="button" onClick={() => setHashtags(h => h.filter(x=>x!==t))}
                          style={{ background:'none', border:'none', color:'#6366f1',
                            cursor:'pointer', padding:0, fontSize:12, lineHeight:1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              {/* Visibility */}
              <Field label="الخصوصية">
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {VISIBILITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => setVisibility(opt.value)}
                      style={{
                        flex:1, minWidth:120,
                        background: visibility === opt.value
                          ? 'linear-gradient(135deg,rgba(99,102,241,.25),rgba(139,92,246,.25))'
                          : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${visibility===opt.value ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius:14, padding:'12px 8px', cursor:'pointer',
                        textAlign:'center', fontFamily:"'Tajawal',sans-serif",
                        transition:'all .2s'
                      }}
                    >
                      <div style={{ fontSize:16, marginBottom:3 }}>{opt.label}</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </Field>

              {/* Media */}
              <Field label="الوسائط">
                <UploadZone
                  files={files}
                  onAdd={newFiles => setFiles(f => [...f, ...newFiles])}
                  onRemove={i => setFiles(f => f.filter((_,idx) => idx!==i))}
                />
              </Field>

              {/* Error */}
              {error && (
                <div style={{
                  background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)',
                  borderRadius:12, padding:'12px 16px', color:'#f87171',
                  fontSize:14, textAlign:'right', direction:'rtl', marginTop:8
                }}>{error}</div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                width:'100%', marginTop:20,
                background: loading
                  ? '#1e293b'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border:'none', borderRadius:16, color:'#fff',
                padding:'16px', fontSize:17, fontWeight:800,
                fontFamily:"'Tajawal',sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(99,102,241,.45)',
                transition:'all .2s', display:'flex', alignItems:'center',
                justifyContent:'center', gap:10
              }}>
                {loading && (
                  <div style={{
                    width:18, height:18, border:'2px solid rgba(255,255,255,.3)',
                    borderTop:'2px solid #fff', borderRadius:'50%',
                    animation:'spin 1s linear infinite'
                  }} />
                )}
                {loading ? 'جارٍ النشر...' : 'نشر المنشور 🚀'}
              </button>
            </Card>
          </form>
        </div>
      </div>
    </>
  );
}

/* ─── Mini components ────────────────────────────────────────────────── */
function Card({ children }) {
  return (
    <div style={{
      background:'linear-gradient(145deg,#1e293b,#0f172a)',
      border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:22, padding:'26px 24px',
      boxShadow:'0 8px 40px rgba(0,0,0,.4)'
    }}>{children}</div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{
        display:'block', marginBottom:8, fontSize:13, fontWeight:700,
        color:'#64748b', textAlign:'right', direction:'rtl'
      }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width:'100%', background:'rgba(255,255,255,0.05)',
  border:'1px solid rgba(255,255,255,0.09)',
  borderRadius:14, padding:'12px 16px',
  color:'#e2e8f0', fontSize:15,
  fontFamily:"'Tajawal',sans-serif",
  transition:'border-color .2s'
};

function UserAvatar({ name }) {
  const colors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6'];
  const bg = colors[name?.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width:44, height:44, borderRadius:'50%',
      background:`linear-gradient(135deg,${bg},${bg}99)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight:800, fontSize:18, color:'#fff',
      boxShadow:`0 0 0 2px ${bg}44`
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}