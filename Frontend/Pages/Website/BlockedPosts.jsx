import React, { useEffect, useState } from 'react';

const API = "https://api.almaharat2.com";

export default function BlockedPosts() {
  const [blockedPages, setBlockedPages] = useState([]);
  const ownerToken = localStorage.getItem('OWNER_TOKEN') || '';

  useEffect(() => { fetchBlocked(); }, []);

  async function fetchBlocked() {
    try {
      const res = await fetch(`${API}/api/owner/pages/list?type=blocked`, { headers: { 'X-Owner-Token': ownerToken }, credentials: 'include' });
      const d = await res.json();
      setBlockedPages(Array.isArray(d) ? d : []);
    } catch (e) {
      setBlockedPages([]);
    }
  }

  // This component is intentionally lightweight: it informs users that blocked content is hidden.
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#94a3b8', fontSize: 13 }}>المحتوى المحظور مخفي</div>
        <div style={{ color: '#ef4444', fontWeight: 700 }}>{blockedPages.length} محجوز</div>
      </div>
    </div>
  );
}
