import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";

// ... (Keep your existing `styles` constant here)

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
      // Pointing to your local Flask backend
      const res = await fetch("http://localhost:5000/api/chat", {
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
        {/* Navbar */}
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
            <div className="chat-avatar">🤖</div>
            <div className="chat-header-info">
              <h2>Gorta AI</h2>
              <p>مساعدك الذكي للرياضيات</p>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && !loading && (
              <div className="chat-empty">
                <div className="chat-empty-icon">🧮</div>
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
                <div className="message-icon">{msg.role === "ai" ? "🤖" : "👤"}</div>
                <div className="message-bubble">{msg.text}</div>
              </div>
            ))}

            {loading && (
              <div className="message-row ai">
                <div className="message-icon">🤖</div>
                <div className="message-bubble">
                  <div className="typing-dots"><span/><span/><span/></div>
                </div>
              </div>
            )}
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
              <button
                className="chat-send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
              >
                ➤
              </button>
            </div>
            <p className="chat-hint">اضغط Enter للإرسال • Shift+Enter لسطر جديد</p>
          </div>
        </div>
      </div>
    </>
  );
}