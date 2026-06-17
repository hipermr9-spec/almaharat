import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const styles = `
.chat-page {
  min-height: 100vh;
  color: #f8fafc;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background:
    radial-gradient(circle at top right, #2563eb22, transparent 40%),
    radial-gradient(circle at bottom left, #06b6d422, transparent 40%),
    #0f172a;
}

.chat-nav {
  background: #1e293b;
  border-bottom: 1px solid #334155;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-nav-brand {
  font-weight: bold;
  font-size: 1.2rem;
}

.chat-nav-links {
  list-style: none;
  display: flex;
  gap: 20px;
}

.chat-nav-links a {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s;
}

.chat-nav-links a:hover {
  color: #3b82f6;
}

.chat-wrapper {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 35px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message-row {
  display: flex;
}

.message-row.user {
  justify-content: flex-end;
  animation: userMessage .25s ease forwards;
}

.message-row.ai {
  animation: aiMessage .35s ease forwards;
}

.message-bubble {
  max-width: 80%;
  padding: 14px 18px;
  border-radius: 16px;
  line-height: 1.8;
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
}

.message-row.ai .message-bubble {
  background: linear-gradient(135deg, #334155, #1e293b);
}

.message-row.user .message-bubble {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.message-bubble pre {
  overflow-x: auto;
  background: #020617;
  padding: 12px;
  border-radius: 10px;
}

.message-bubble code {
  background: #020617;
  padding: 2px 6px;
  border-radius: 6px;
}

.chat-input-area {
  padding: 20px;
  background: #1e293b;
  border-top: 1px solid #334155;
}

.chat-input-box {
  display: flex;
  gap: 10px;
  align-items: flex-end; /* ليتناسب مع زيادة أسطر حقل النص */
}

.chat-textarea {
  flex: 1;
  background: #0f172a;
  border: 1px solid #475569;
  color: white;
  border-radius: 10px;
  padding: 12px;
  resize: none;
  outline: none;
  max-height: 150px; /* تحديد أقصى ارتفاع للـ Textarea */
}

.chat-send-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.chat-send-btn:hover {
  background: #2563eb;
}

.chat-send-btn:disabled {
  background: #475569;
  cursor: not-allowed;
}

.typing {
  display: flex;
  gap: 6px;
  align-items: center;
  height: 24px;
}

.typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: bounce 1s infinite;
}

.typing span:nth-child(2) { animation-delay: .15s; }
.typing span:nth-child(3) { animation-delay: .3s; }

.suggestions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.suggestion-chip {
  background: #1e293b;
  color: white;
  border: 1px solid #475569;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-chip:hover {
  background: #3b82f6;
  border-color: #3b82f6;
}

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

@keyframes userMessage {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes aiMessage {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
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