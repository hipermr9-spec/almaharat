import React, { useEffect, useState } from 'react';
import InWorkingPages from './In_WorkingPages';
import BlockedPages from './BlockedPages';

const API = "https://api.almaharat2.com";

export default function OwnerHome() {
  const [onlineCount, setOnlineCount] = useState(0);
  const [path, setPath] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('in_working');

  useEffect(() => { fetchCount(); const t = setInterval(fetchCount, 5000); return () => clearInterval(t); }, []);

  async function fetchCount() {
    try {
      const res = await fetch(`${API}/api/online_count`);
      if (res.ok) {
        const d = await res.json();
        setOnlineCount(d.count || 0);
      }
    } catch (e) { setOnlineCount(0); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!path.trim()) return alert('الرجاء إدخال مسار الصفحة');
    try {
      await fetch(`${API}/api/pages/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path.trim(), title: title.trim(), type })
      });
      setPath(''); setTitle('');
      // reload handled in child components
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="home-content" style={{ padding: 40 }}>
      <div className="welcome-box" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20 }}>لوحة المالك</h1>
        <div style={{ marginTop: 8, color: '#94a3b8' }}>المستخدمون المتصلون الآن: <strong style={{ color: '#fff' }}>{onlineCount}</strong></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        <div>
          <form onSubmit={handleAdd} style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={path} onChange={e => setPath(e.target.value)} placeholder="مسار الصفحة (مثال: /Posts)" style={{ flex:1, padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }} />
            <select value={type} onChange={e => setType(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }}>
              <option value="in_working">قيد العمل</option>
              <option value="blocked">محظورة</option>
            </select>
            <button type="submit" style={{ padding: '10px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}>إضافة</button>
          </form>

          <InWorkingPages />
          <BlockedPages />
        </div>

        <div>
          <div className="preview-card">
            <h3 className="section-title" style={{ fontSize: 18, color: '#e2e8f0' }}>حالة الموقع</h3>
            <div style={{ marginTop: 8, color: '#94a3b8' }}>المستخدمون المتصلون خلال آخر 10 دقائق:</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{onlineCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
