import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const styles = `
/* =========================
   GLOBAL
========================= */

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  height: 100%;
}

::selection {
  background: #475569;
  color: white;
}

/* =========================
   CHAT
========================= */

.chat-page {
  min-height: 100vh;

  background:
    radial-gradient(circle at top right,#2563eb22,transparent 40%),
    radial-gradient(circle at bottom left,#06b6d422,transparent 40%),
    #0f172a;

  color: white;
}

/* =========================
   NAVBAR
========================= */

.chat-nav {
  background: rgba(30,41,59,.9);

  backdrop-filter: blur(20px);

  border-bottom: 1px solid rgba(255,255,255,.06);
}

.chat-nav-links a {
  padding: 8px 12px;

  border-radius: .4rem;

  transition: .2s;
}

.chat-nav-links a:hover {
  background: rgba(255,255,255,.06);
}

/* =========================
   MESSAGES
========================= */

.chat-messages {
  direction: ltr;

  flex: 1;

  overflow-y: auto;

  padding: 20px;
}

/* RIGHT SCROLLBAR */

.chat-messages::-webkit-scrollbar {
  width: 8px;
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

/* ARABIC CONTENT */

.message-row,
.message-bubble {
  direction: rtl;
}

/* =========================
   MESSAGE BUBBLES
========================= */

.message-bubble {
  max-width: 80%;

  padding: 14px 18px;

  border-radius: .8rem;

  line-height: 1.8;

  backdrop-filter: blur(16px);

  border: 1px solid rgba(255,255,255,.05);

  box-shadow:
    0 8px 25px rgba(0,0,0,.25);
}

.message-row.ai .message-bubble {
  background:
    linear-gradient(
      135deg,
      #334155,
      #1e293b
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

/* =========================
   MARKDOWN
========================= */

.message-bubble h1,
.message-bubble h2,
.message-bubble h3 {
  margin-top: 12px;
  margin-bottom: 12px;
}

.message-bubble p {
  margin: 10px 0;
}

.message-bubble ul,
.message-bubble ol {
  padding-right: 24px;
}

.message-bubble blockquote {
  border-right: 4px solid #60a5fa;

  padding-right: 12px;

  margin: 12px 0;
}

/* INLINE CODE */

.message-bubble code {
  background: #374151;

  border: 1px solid rgba(255,255,255,.08);

  color: #f8fafc;

  padding: 3px 8px;

  border-radius: .4rem;

  font-family:
    Consolas,
    monospace;
}

/* CODE BLOCK */

.message-bubble pre {
  background: #111827;

  border: 1px solid rgba(255,255,255,.08);

  border-radius: .8rem;

  padding: 16px;

  overflow-x: auto;
}

.message-bubble pre code {
  background: transparent;

  border: none;

  padding: 0;
}

/* =========================
   SUGGESTIONS
========================= */

.suggestion-chip {
  background: #374151;

  border: 1px solid rgba(255,255,255,.08);

  border-radius: .4rem;

  color: white;

  transition: .2s;
}

.suggestion-chip:hover {
  background: #4b5563;

  transform: translateY(-2px);
}

/* =========================
   INPUT
========================= */

.chat-input-area {
  background: rgba(30,41,59,.95);

  backdrop-filter: blur(20px);

  border-top: 1px solid rgba(255,255,255,.06);
}

.chat-textarea {
  background: #374151;

  border: 1px solid #4b5563;

  border-radius: .4rem;

  color: white;

  padding: 12px;

  transition: .2s;
}

.chat-textarea:focus {
  border-color: #60a5fa;

  box-shadow:
    0 0 0 3px rgba(96,165,250,.15);
}

/* =========================
   SEND BUTTON
========================= */

.chat-send-btn {
  background: #2563eb;

  border-radius: .4rem;

  transition: .2s;
}

.chat-send-btn:hover {
  background: #1d4ed8;

  transform: translateY(-2px);
}

.chat-send-btn:active {
  transform: scale(.96);
}

/* =========================
   TYPING
========================= */

.typing span {
  width: 8px;
  height: 8px;

  border-radius: 50%;

  background: white;
}

/* =========================
   ANIMATIONS
========================= */

.message-row.user {
  animation: userMessage .25s ease;
}

.message-row.ai {
  animation: aiMessage .35s ease;
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