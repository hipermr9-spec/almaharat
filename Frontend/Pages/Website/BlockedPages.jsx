import React, { useEffect, useState } from 'react';

const API = "https://api.almaharat2.com";

export default function BlockedPages({ onDeleted }) {
  const [pages, setPages] = useState([]);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    try {
      const res = await fetch(`${API}/api/pages/list?type=blocked`);
      const d = await res.json();
      setPages(Array.isArray(d) ? d : []);
    } catch (e) {
      setPages([]);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('هل تريد حذف الصفحة من المحظورة؟')) return;
    await fetch(`${API}/api/pages/delete/blocked/${id}`, { method: 'DELETE' });
    fetchList();
    if (onDeleted) onDeleted();
  }

  return (
    <div className="preview-card" style={{ marginBottom: 12 }}>
      <h3 className="section-title" style={{ fontSize: 18, color: '#e2e8f0' }}>الصفحات المحظورة</h3>
      <div style={{ marginTop: 12 }}>
        {pages.length === 0 && <div style={{ color: '#94a3b8' }}>لا توجد صفحات محظورة.</div>}
        {pages.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ color: '#e2e8f0' }}>{p.path}{p.title ? ` — ${p.title}` : ''}</div>
            <button onClick={() => handleDelete(p.id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}
