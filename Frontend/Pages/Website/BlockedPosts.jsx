import React, { useEffect, useState } from 'react';

// const API = "https://api.almaharat2.com";
const API = "http://localhost:5000";

export default function BlockedPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const ownerToken = localStorage.getItem('OWNER_TOKEN') || '';

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/posts`, {
        credentials: 'include'
      });
      if (!res.ok) { setPosts([]); setLoading(false); return; }
      const d = await res.json();
      setPosts(Array.isArray(d) ? d : []);
    } catch (e) {
      setPosts([]);
    }
    setLoading(false);
  }

  async function handleBlock(id) {
    try {
      await fetch(`${API}/api/owner/posts/${id}/block`, {
        method: 'POST',
        headers: { 'X-Owner-Token': ownerToken },
        credentials: 'include'
      });
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUnblock(id) {
    try {
      await fetch(`${API}/api/owner/posts/${id}/unblock`, {
        method: 'POST',
        headers: { 'X-Owner-Token': ownerToken },
        credentials: 'include'
      });
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
  }

  const blockedCount = posts.filter(p => p.blocked).length;

  return (
    <div className="preview-card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="section-title" style={{ fontSize: 18, color: '#e2e8f0', margin: 0 }}>
          كل المنشورات
        </h3>
        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>
          {blockedCount} محظور
        </div>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>...جاري التحميل</div>}

      {!loading && posts.length === 0 && (
        <div style={{ color: '#94a3b8' }}>لا توجد منشورات.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {posts.map(p => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
              background: p.blocked ? 'rgba(239,68,68,0.08)' : 'transparent'
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.title || '(بدون عنوان)'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                {p.username || 'مجهول'} • {p.visibility}
                {p.blocked && <span style={{ color: '#ef4444', marginInlineStart: 8 }}>• محظور</span>}
              </div>
            </div>

            {p.blocked ? (
              <button
                onClick={() => handleUnblock(p.id)}
                style={{ background: '#dcfce7', color: '#15803d', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}
              >
                إلغاء الحظر
              </button>
            ) : (
              <button
                onClick={() => handleBlock(p.id)}
                style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}
              >
                حظر
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}