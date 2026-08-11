import { useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';

const API = import.meta.env.VITE_API_URL ?? 'https://api.almaharat2.com';

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function FriendChat() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const raw = Cookies.get('user');
    if (!raw) {
      window.location.href = '/login';
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setUser(parsed);
    } catch {
      Cookies.remove('user');
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    if (!user?.userid) return;
    const loadFriends = async () => {
      try {
        const res = await fetch(`${API}/api/friends/${user.userid}`);
        if (res.ok) {
          const data = await res.json();
          setFriends(Array.isArray(data) ? data : []);
          if (data?.length) {
            setSelectedFriendId((prev) => prev || data[0].userid);
          }
        }
      } catch {
        setFriends([]);
      }
    };
    loadFriends();
  }, [user?.userid]);

  useEffect(() => {
    if (!user?.userid || !selectedFriendId) return;
    const loadMessages = async () => {
      try {
        const res = await fetch(`${API}/api/friends/messages?userid=${user.userid}&friend_id=${selectedFriendId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data.messages) ? data.messages.map((m) => ({ ...m, mine: m.from === user.userid })) : []);
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      }
    };
    loadMessages();
  }, [selectedFriendId, user?.userid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedFriend = useMemo(() => friends.find((f) => f.userid === selectedFriendId) || null, [friends, selectedFriendId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user?.userid || !selectedFriendId || loading) return;

    setLoading(true);
    setInput('');
    try {
      const res = await fetch(`${API}/api/friends/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: user.userid, friend_id: selectedFriendId, message: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { id: data.id, from: user.userid, text: data.text, created_at: data.created_at, mine: true }]);
      }
    } catch {
      // ignore and let the user retry
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(140deg, #07111f 0%, #101d33 100%)', color: '#e2e8f0', fontFamily: 'Cairo, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20, display: 'flex', gap: 16, minHeight: '100vh' }}>
        <aside style={{ width: 300, background: 'rgba(15,23,42,0.78)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>دردشة الأصدقاء</div>
          {friends.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>لم يتم العثور على أصدقاء بعد</div>
          ) : friends.map((friend) => (
            <button
              key={friend.userid}
              onClick={() => setSelectedFriendId(friend.userid)}
              style={{
                border: selectedFriendId === friend.userid ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                background: selectedFriendId === friend.userid ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.04)',
                color: '#f8fafc',
                borderRadius: 12,
                padding: '10px 12px',
                textAlign: 'right',
                cursor: 'pointer',
              }}
            >
              {friend.username}
            </button>
          ))}
        </aside>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.7)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 13, color: '#38bdf8', marginBottom: 4 }}>محادثة مباشرة</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedFriend?.username || 'اختر صديقاً'}</div>
          </div>

          <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>ابدأ المحادثة بالكتابة أدناه</div>
            ) : messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '75%', padding: '10px 12px', borderRadius: 14, background: msg.mine ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>{msg.text}</div>
                  {msg.created_at && <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 6 }}>{formatTime(msg.created_at)}</div>}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="اكتب رسالتك..."
                rows={2}
                style={{ flex: 1, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a', color: '#f8fafc', padding: '10px 12px', resize: 'none' }}
              />
              <button onClick={sendMessage} disabled={loading || !input.trim() || !selectedFriendId} style={{ border: 'none', borderRadius: 12, padding: '0 16px', background: loading ? '#1e3a8a' : '#2563eb', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
                إرسال
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
