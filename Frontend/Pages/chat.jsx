import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');

  .chat-page {
    min-height: 100vh;
    background: #0a0a0f;
    font-family: 'Tajawal', sans-serif;
    direction: rtl;
    display: flex;
    flex-direction: column;
  }

  /* ── Navbar ── */
  .chat-nav {
    background: rgba(15,15,25,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 0 24px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .chat-nav-brand {
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(135deg, #6ee7f7, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .chat-nav-links {
    display: flex;
    gap: 6px;
    list-style: none;
    margin: 0; padding: 0;
  }

  .chat-nav-links a {
    color: rgba(255,255,255,0.6);
    text-decoration: none;
    font-size: 13px;
    padding: 6px 12px;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .chat-nav-links a:hover {
    color: #fff;
    background: rgba(255,255,255,0.08);
  }

  /* ── Layout ── */
  .chat-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 820px;
    width: 100%;
    margin: 0 auto;
    padding: 0 16px 24px;
    height: calc(100vh - 60px);
  }

  /* ── Header ── */
  .chat-header {
    padding: 24px 0 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .chat-avatar {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: linear-gradient(135deg, #6ee7f7, #a78bfa);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
    box-shadow: 0 0 20px rgba(110,231,247,0.3);
  }

  .chat-header-info h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #f0f0f0;
  }

  .chat-header-info p {
    margin: 2px 0 0;
    font-size: 12px;
    color: #6ee7f7;
  }

  /* ── Messages ── */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
  }

  .chat-messages::-webkit-scrollbar { width: 4px; }
  .chat-messages::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
  }

  /* ── Empty state ── */
  .chat-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: rgba(255,255,255,0.25);
    padding: 40px 0;
  }

  .chat-empty-icon {
    font-size: 48px;
    opacity: 0.4;
  }

  .chat-empty p {
    font-size: 15px;
    margin: 0;
  }

  .chat-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 8px;
  }

  .suggestion-chip {
    background: rgba(110,231,247,0.08);
    border: 1px solid rgba(110,231,247,0.2);
    color: #6ee7f7;
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-family: 'Tajawal', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
  }

  .suggestion-chip:hover {
    background: rgba(110,231,247,0.15);
    transform: translateY(-1px);
  }

  /* ── Message bubbles ── */
  .message-row {
    display: flex;
    gap: 10px;
    animation: msgIn 0.25s ease;
  }

  @keyframes msgIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .message-row.user {
    flex-direction: row-reverse;
  }

  .message-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .message-row.ai .message-icon {
    background: linear-gradient(135deg, #6ee7f7, #a78bfa);
  }

  .message-row.user .message-icon {
    background: rgba(255,255,255,0.1);
  }

  .message-bubble {
    max-width: 72%;
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 14.5px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .message-row.ai .message-bubble {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: #e8e8f0;
    border-radius: 4px 16px 16px 16px;
  }

  .message-row.user .message-bubble {
    background: linear-gradient(135deg, #6ee7f7, #a78bfa);
    color: #0a0a0f;
    font-weight: 500;
    border-radius: 16px 4px 16px 16px;
  }

  /* ── Typing indicator ── */
  .typing-dots {
    display: flex;
    gap: 4px;
    padding: 4px 0;
    align-items: center;
  }

  .typing-dots span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #6ee7f7;
    animation: dot 1.2s infinite;
  }

  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dot {
    0%, 60%, 100% { opacity: 0.2; transform: scale(0.8); }
    30%            { opacity: 1;   transform: scale(1.1); }
  }

  /* ── Input area ── */
  .chat-input-area {
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .chat-input-box {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 10px 10px 10px 14px;
    transition: border-color 0.2s;
  }

  .chat-input-box:focus-within {
    border-color: rgba(110,231,247,0.4);
  }

  .chat-textarea {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #f0f0f0;
    font-size: 14.5px;
    font-family: 'Tajawal', sans-serif;
    resize: none;
    min-height: 24px;
    max-height: 120px;
    line-height: 1.6;
    direction: rtl;
  }

  .chat-textarea::placeholder { color: rgba(255,255,255,0.25); }

  .chat-send-btn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, #6ee7f7, #a78bfa);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
    font-size: 16px;
  }

  .chat-send-btn:hover:not(:disabled) {
    transform: scale(1.07);
    box-shadow: 0 0 16px rgba(110,231,247,0.4);
  }

  .chat-send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .chat-hint {
    text-align: center;
    color: rgba(255,255,255,0.2);
    font-size: 11.5px;
    margin-top: 8px;
  }

  @media (max-width: 600px) {
    .chat-nav-links { display: none; }
    .message-bubble { max-width: 88%; }
  }
`;

const SUGGESTIONS = [
  "ما هي المشتقات؟ 📐",
  "اشرح لي نظرية فيثاغورس ✏️",
  "كيف أحل المعادلات التربيعية؟",
  "ما هو المتكامل؟ 🔢",
];

export default function Chat() {
  const [user, setUser]       = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const sessionUser = Cookies.get("user");
    if (!sessionUser) { window.location.href = "/login"; return; }
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
      const reply = data.response || data.error || "لم أفهم السؤال، حاول مرة أخرى.";
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "⚠️ تعذّر الاتصال بالخادم." }]);
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

          {/* Header */}
          <div className="chat-header">
            <div className="chat-avatar">🤖</div>
            <div className="chat-header-info">
              <h2>Gorta AI</h2>
              <p>مساعدك الذكي للرياضيات</p>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && !loading && (
              <div className="chat-empty">
                <div className="chat-empty-icon">🧮</div>
                <p>اسأل Gorta أي سؤال رياضي!</p>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      className="suggestion-chip"
                      onClick={() => sendMessage(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role}`}>
                <div className="message-icon">
                  {msg.role === "ai" ? "🤖" : "👤"}
                </div>
                <div className="message-bubble">{msg.text}</div>
              </div>
            ))}

            {loading && (
              <div className="message-row ai">
                <div className="message-icon">🤖</div>
                <div className="message-bubble">
                  <div className="typing-dots">
                    <span/><span/><span/>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
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