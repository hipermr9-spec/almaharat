import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";

const styles = `
  .chat-page { background-color: #0f172a; color: #f8fafc; min-height: 100vh; font-family: 'Segoe UI', sans-serif; }
  .chat-nav { background: #1e293b; border-bottom: 1px solid #334155; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
  .chat-nav-brand { font-weight: bold; font-size: 1.2rem; }
  .chat-nav-links { list-style: none; display: flex; gap: 20px; }
  .chat-nav-links a { color: #94a3b8; text-decoration: none; transition: 0.3s; }
  .chat-nav-links a:hover { color: #f8fafc; }
  
  .chat-wrapper { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; height: calc(100vh - 80px); }
  .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
  
  .message-bubble { padding: 12px 16px; border-radius: 12px; max-width: 80%; line-height: 1.5; font-size: 0.95rem; }
  .message-row.ai .message-bubble { background: #334155; color: #e2e8f0; border-bottom-left-radius: 2px; align-self: flex-start; }
  .message-row.user { justify-content: flex-end; display: flex; }
  .message-row.user .message-bubble { background: #3b82f6; color: white; border-bottom-right-radius: 2px; }

  .chat-input-area { padding: 20px; background: #1e293b; border-top: 1px solid #334155; }
  .chat-input-box { display: flex; gap: 10px; }
  .chat-textarea { background: #0f172a; border: 1px solid #475569; color: white; border-radius: 8px; padding: 12px; width: 100%; resize: none; outline: none; }
  .chat-send-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
  
  .suggestion-chip { background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 5px; border: none; }
  .suggestion-chip:hover { background: #334155; }
`;

const SUGGESTIONS = ["ما هي المشتقات؟ 📐", "اشرح لي نظرية فيثاغورس ✏️", "كيف أحل المعادلات التربيعية؟", "ما هو المتكامل؟ 🔢"];

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const sessionUser = Cookies.get("user");
    if (!sessionUser) { window.location.href = "/login"; return; }
    setUser(JSON.parse(sessionUser));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setLoading(true);

    try {
      // REPLACE WITH YOUR ACTUAL RAILWAY DOMAIN
      const res = await fetch("https://api.almaharat2.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.response || "عذراً، حدث خطأ." }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "⚠️ تعذّر الاتصال بخادم Gorta AI." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <style>{styles}</style>
      <div className="chat-page">
        <nav className="chat-nav">
          <div className="chat-nav-brand">منصة المهارات ✨</div>
          <ul className="chat-nav-links">
            <li><a href="/home">الرئيسية 🏠</a></li>
            <li><a href="/chat">المحادثة 🤖</a></li>
          </ul>
        </nav>

        <div className="chat-wrapper">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                {SUGGESTIONS.map((s) => <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>)}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role}`}>
                <div className="message-bubble">{msg.text}</div>
              </div>
            ))}
            {loading && <div className="message-row ai"><div className="message-bubble">جاري التفكير...</div></div>}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-area">
            <div className="chat-input-box">
              <textarea className="chat-textarea" value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب سؤالك هنا..." rows={1} />
              <button className="chat-send-btn" onClick={() => sendMessage()}>➤</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}