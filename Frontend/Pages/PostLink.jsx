import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'
import './App.css'

const API = import.meta.env.VITE_API_URL ?? 'https://api.almaharat2.com'

export default function PostLink() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/posts/link/${token}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'حدث خطأ أثناء جلب المنشور')
          return
        }
        setPost(data)
      } catch (err) {
        setError('تعذّر الاتصال بالخادم')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const user = (() => {
    try {
      const cookieValue = Cookies.get('DONT-SHARE-THAT-COOKIE') || Cookies.get('user')
      return cookieValue ? JSON.parse(cookieValue) : null
    } catch {
      return null
    }
  })()

  if (loading) {
    return <div className="loading">جارٍ تحميل المنشور...</div>
  }

  if (error) {
    return (
      <div className="loading" style={{ color: '#f87171', textAlign: 'center' }}>
        <p>{error}</p>
        <button onClick={() => navigate('/posts')} style={{ marginTop: 16 }}>
          العودة إلى المنشورات
        </button>
      </div>
    )
  }

  if (!post) {
    return <div className="loading">المنشور غير موجود</div>
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: '#0a0f1e', color: '#e2e8f0', fontFamily: "'Tajawal', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={() => navigate('/posts')} style={{
          marginBottom: 20,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          color: '#e2e8f0',
          padding: '10px 16px',
          cursor: 'pointer'
        }}>
          ← العودة
        </button>

        <div style={{ background: '#111827', borderRadius: 24, padding: 24, boxShadow: '0 16px 60px rgba(0,0,0,.45)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
              {post.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{post.username}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>رابط خاص بالمشاركة</div>
            </div>
          </div>

          <h1 style={{ fontSize: 28, margin: '0 0 14px', color: '#fff' }}>{post.title}</h1>
          <p style={{ color: '#cbd5e1', lineHeight: 1.8, marginBottom: 18 }}>{post.description}</p>

          {post.hashtags?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {post.hashtags.map(tag => (
                <span key={tag} style={{
                  background: 'rgba(99,102,241,.15)',
                  color: '#818cf8',
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 13
                }}>#{tag}</span>
              ))}
            </div>
          )}

          {post.media?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: post.media.length === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
              {post.media.map((m, index) => (
                <div key={index} style={{ position: 'relative', paddingTop: post.media.length === 1 ? '56.25%' : '75%', background: '#0f172a', borderRadius: 18, overflow: 'hidden' }}>
                  {m.type === 'video'
                    ? <video src={m.url} controls style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={m.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  }
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>رابط المشاركة:</span>
            <code style={{ background: '#111827', padding: '8px 12px', borderRadius: 12, color: '#fff' }}>
              {window.location.origin}/Posts/link/{token}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
