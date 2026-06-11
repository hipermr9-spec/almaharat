import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";

// Define your CSS as a string constant
const styles = `
  .chat-page { display: flex; flex-direction: column; height: 100vh; font-family: sans-serif; }
  .chat-nav { background: #333; color: white; padding: 1rem; display: flex; justify-content: space-between; }
  .chat-nav-links { list-style: none; display: flex; gap: 15px; }
  .chat-nav-links a { color: white; text-decoration: none; }
  .chat-wrapper { flex: 1; display: flex; flex-direction: column; padding: 20px; overflow: hidden; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 20px; }
  .message-row { display: flex; margin-bottom: 15px; }
  .message-bubble { background: #f0f0f0; padding: 10px; border-radius: 10px; }
  .message-row.user { justify-content: flex-end; }
  .message-row.user .message-bubble { background: #007bff; color: white; }
  .chat-input-area { padding: 20px; border-top: 1px solid #ccc; }
  .chat-input-box { display: flex; gap: 10px; }
  .chat-textarea { flex: 1; resize: none; padding: 10px; }
  .chat-send-btn { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
  .suggestion-chip { margin: 5px; padding: 10px; border: 1px solid #007bff; background: white; cursor: pointer; }
`;

const SUGGESTIONS = [
  "ما هي المشتقات؟ 📐",
  "اشرح لي نظرية فيثاغورس ✏️",
  "كيف أحل المعادلات التربيعية؟",
  "ما هو المتكامل؟ 🔢",
];

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const sessionUser = Cookies.get("user");
    if (!sessionUser) {
      window.location.href = "/login";
      return;
    }
    setUser(JSON.parse(sessionUser));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const sendMessage = async (text) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setLoading(true);

    try {
      const res = await fetch("https://api.almaharat2.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await res.json();
      const reply = data.response || data.error || "عذراً، حدث خطأ في معالجة طلبك.";
      
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "⚠️ تعذّر الاتصال بخادم Gorta AI." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
            <li><a href="/Games">العاب 🎮</a></li>
            <li><a href="/posts">منشورات 📭</a></li>
            <li><a href="/enrichments">إثراءات 🌟</a></li>
            <li><a href="/chat">المحادثة 🤖</a></li>
            <li><a href="/settings">الإعدادات ⚙️</a></li>
          </ul>
        </nav>

        <div className="chat-wrapper">
          <div className="chat-header">
            <h2>Gorta AI</h2>
            <p>مساعدك الذكي للرياضيات</p>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && !loading && (
              <div className="chat-empty">
                <p>اسأل Gorta أي سؤال رياضي!</p>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>
                      {s}
                    </button>
                  ))}
                </div>
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
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder="اكتب سؤالك هنا..."
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResize(); }}
                onKeyDown={handleKey}
                rows={1}
              />
              <button className="chat-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>➤</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}