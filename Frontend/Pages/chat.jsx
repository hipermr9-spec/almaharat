import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const styles = `
.chat-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  color: #f8fafc;
  font-family: Inter, Segoe UI, sans-serif;

  background:
    radial-gradient(circle at top right,#1d4ed855,transparent 30%),
    radial-gradient(circle at bottom left,#0891b255,transparent 30%),
    #0b1120;

  overflow: hidden;
}

/* ========================= NAVBAR ========================= */

.chat-nav {
  height: 70px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 24px;

  background: rgba(15,23,42,.85);

  backdrop-filter: blur(18px);

  border-bottom: 1px solid rgba(255,255,255,.06);

  flex-shrink: 0;
}

.chat-nav-brand {
  font-size: 1.15rem;
  font-weight: 700;
}

.chat-nav-links {
  display: flex;
  gap: 12px;
  list-style: none;
}

.chat-nav-links a {
  color: #cbd5e1;

  text-decoration: none;

  padding: 10px 14px;

  border-radius: .5rem;

  transition: .2s;
}

.chat-nav-links a:hover {
  background: rgba(255,255,255,.06);
}

/* ========================= MAIN ========================= */

.chat-wrapper {
  flex: 1;

  width: 100%;

  max-width: 1200px;

  margin: 0 auto;

  display: flex;
  flex-direction: column;

  min-height: 0;
}

/* ========================= MESSAGES ========================= */

.chat-messages {
  flex: 1;

  overflow-y: auto;

  min-height: 0;

  padding: 24px;

  display: flex;
  flex-direction: column;

  gap: 18px;
}

/* SCROLLBAR */

.chat-messages::-webkit-scrollbar {
  width: 10px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,.15);

  border-radius: 999px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,.3);
}

/* ========================= MESSAGE ROW ========================= */

.message-row {
  display: flex;

  width: 100%;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.ai {
  justify-content: flex-start;
}

/* ========================= BUBBLE ========================= */

.message-bubble {
  max-width: min(850px, 80%);

  padding: 16px 18px;

  border-radius: 18px;

  line-height: 1.8;

  word-break: break-word;

  animation: fadeIn .25s ease;

  border: 1px solid rgba(255,255,255,.05);

  backdrop-filter: blur(18px);
}

.message-row.ai .message-bubble {
  background:
    linear-gradient(
      135deg,
      rgba(51,65,85,.95),
      rgba(30,41,59,.95)
    );
}

.message-row.user .message-bubble {
  background:
    linear-gradient(
      135deg,
      #3b82f6,
      #2563eb
    );
}

/* ========================= MARKDOWN ========================= */

.message-bubble h1,
.message-bubble h2,
.message-bubble h3 {
  margin-top: 14px;
  margin-bottom: 10px;
}

.message-bubble p {
  margin: 10px 0;
}

.message-bubble ul,
.message-bubble ol {
  padding-right: 20px;
}

.message-bubble blockquote {
  border-right: 4px solid #60a5fa;

  padding-right: 12px;

  margin: 12px 0;
}

.message-bubble code {
  background: #111827;

  padding: 3px 8px;

  border-radius: .4rem;

  border: 1px solid rgba(255,255,255,.08);
}

.message-bubble pre {
  background: #020617;

  padding: 16px;

  border-radius: 12px;

  overflow-x: auto;

  border: 1px solid rgba(255,255,255,.08);
}

.message-bubble pre code {
  background: transparent;
  border: none;
  padding: 0;
}

/* ========================= SUGGESTIONS ========================= */

.suggestions-container {
  display: flex;

  flex-wrap: wrap;

  gap: 10px;
}

.suggestion-chip {
  background: #1e293b;

  border: 1px solid #334155;

  color: white;

  padding: 10px 16px;

  border-radius: .5rem;

  cursor: pointer;

  transition: .2s;
}

.suggestion-chip:hover {
  background: #334155;

  transform: translateY(-2px);
}

/* ========================= INPUT ========================= */

.chat-input-area {
  padding: 20px;

  flex-shrink: 0;
}

.chat-input-box {
  display: flex;

  align-items: flex-end;

  gap: 12px;

  background: rgba(30,41,59,.95);

  border: 1px solid rgba(255,255,255,.06);

  border-radius: 18px;

  padding: 12px;

  backdrop-filter: blur(18px);
}

.chat-textarea {
  flex: 1;

  background: transparent;

  border: none;

  color: white;

  resize: none;

  outline: none;

  font-size: 15px;

  min-height: 28px;

  max-height: 180px;

  line-height: 1.6;
}

.chat-textarea::placeholder {
  color: #94a3b8;
}

.chat-send-btn {
  width: 48px;
  height: 48px;

  border: none;

  border-radius: 12px;

  background: #2563eb;

  color: white;

  cursor: pointer;

  flex-shrink: 0;

  transition: .2s;
}

.chat-send-btn:hover {
  background: #1d4ed8;
}

.chat-send-btn:active {
  transform: scale(.95);
}

.chat-send-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* ========================= TYPING ========================= */

.typing {
  display: flex;
  gap: 6px;
}

.typing span {
  width: 8px;
  height: 8px;

  border-radius: 999px;

  background: white;

  animation: bounce 1s infinite;
}

.typing span:nth-child(2) {
  animation-delay: .15s;
}

.typing span:nth-child(3) {
  animation-delay: .3s;
}

@keyframes bounce {
  0%,80%,100% {
    transform: translateY(0);
  }

  40% {
    transform: translateY(-6px);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

const SUGGESTIONS = [
  "ما هي المشتقات؟ 📐",
  "اشرح لي نظرية فيثاغورس ✏️",
  "كيف أحل المعادلات التربيعية؟",
  "ما هو التكامل؟ 🔢"
];

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  // التأكد من تسجيل الدخول وقراءة الكوكيز بأمان
  useEffect(() => {
    const sessionUser = Cookies.get("user");

    if (!sessionUser) {
      window.location.href = "/login";
      return;
    }

    try {
      setUser(JSON.parse(sessionUser));
    } catch (error) {
      console.error("خطأ في قراءة بيانات المستخدم:", error);
      Cookies.remove("user");
      window.location.href = "/login";
    }
  }, []);

  // التمرير التلقائي لأسفل
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const prompt = (text || input).trim();

    if (!prompt || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", text: prompt }]);
    setLoading(true);

    try {
      const res = await fetch("https://api.almaharat2.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) throw new Error("استجابة السيرفر غير ناجحة");

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: data.response || data.message || data.reply || data.error || "خطأ غير معروف"
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: "⚠️ تعذّر الاتصال بالخادم. يرجى المحاولة لاحقاً."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <style>{styles}</style>

      <div className="chat-page" dir="rtl"> {/* إضافة اتجاه النص العربي */}
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
              <div className="suggestions-container">
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
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role}`}>
                <div className="message-bubble">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="message-row ai">
                <div className="message-bubble">
                  <div className="typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="chat-input-area">
            <div className="chat-input-box">
              <textarea
                className="chat-textarea"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك هنا..."
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                className="chat-send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                aria-label="إرسال الرسالة"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}