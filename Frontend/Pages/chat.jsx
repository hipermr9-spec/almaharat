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
}

/* NAVBAR */
.chat-nav {
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background: rgba(15,23,42,.85);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(255,255,255,.06);
}

.chat-nav-brand {
  font-weight: 700;
}

/* WRAPPER */
.chat-wrapper {
  flex: 1;
  max-width: 1200px;
  margin: auto;
  display: flex;
  flex-direction: column;
}

/* MESSAGES */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-row {
  display: flex;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.ai {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 14px;
  border-radius: 14px;
  background: rgba(30,41,59,.9);
  border: 1px solid rgba(255,255,255,.05);
  line-height: 1.7;
}

.message-row.user .message-bubble {
  background: linear-gradient(135deg,#3b82f6,#2563eb);
}

/* INPUT */
.chat-input-area {
  padding: 15px;
}

.chat-input-box {
  display: flex;
  gap: 10px;
  background: rgba(30,41,59,.95);
  padding: 10px;
  border-radius: 14px;
}

.chat-textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  outline: none;
  resize: none;
}

.chat-send-btn {
  background: #2563eb;
  border: none;
  color: white;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
}

/* SELECT */
.model-select {
  margin-bottom: 10px;
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  background: #1e293b;
  color: white;
  border: 1px solid #334155;
}

/* SUGGESTIONS */
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 20px;
}

.suggestion-chip {
  background: #1e293b;
  border: 1px solid #334155;
  color: white;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
}
`;

const MODELS = [
  "gemini-3.5-flash",
  "gemini-3-flash",
  "gemini-3.1-pro",
  "gemini-3.1-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2-flash",
  "gemini-2-flash-lite",
  "gemini-embedding-1",
  "gemini-embedding-2",
  "imagen-4-fast",
  "imagen-4-ultra",
  "veo-3-fast",
  "veo-3",
];

const SUGGESTIONS = [
  "ما هي المشتقات؟ 📐",
  "اشرح فيثاغورس",
  "كيف أحل المعادلات التربيعية؟",
  "ما هو التكامل؟ 🔢"
];

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("gemini-3.5-flash");

  const bottomRef = useRef(null);

  useEffect(() => {
    const session = Cookies.get("user");
    if (!session) return (window.location.href = "/login");
    setUser(JSON.parse(session));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;

    setInput("");

    setMessages((p) => [...p, { role: "user", text: prompt }]);
    setLoading(true);

    try {
      const res = await fetch("https://api.almaharat2.com/api/chat", {
        method: "POST",
        body: new URLSearchParams({
          prompt,
          model,
        }),
      });

      const data = await res.json();

      setMessages((p) => [
        ...p,
        { role: "ai", text: data.response || "No response" },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        { role: "ai", text: "❌ Server error" },
      ]);
    }

    setLoading(false);
  };

  if (!user) return null;

  return (
    <div dir="rtl" className="chat-page">
      <style>{styles}</style>

      {/* NAVBAR */}
      <div className="chat-nav">
        <div className="chat-nav-brand">📘 منصة الذكاء</div>
      </div>

      <div className="chat-wrapper">

        {/* MESSAGES */}
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`message-row ${m.role}`}>
              <div className="message-bubble">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row ai">
              <div className="message-bubble">جاري التفكير...</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* SUGGESTIONS */}
        <div className="suggestions">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="suggestion-chip" onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </div>

        {/* INPUT */}
        <div className="chat-input-area">

          <select
            className="model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <div className="chat-input-box">
            <textarea
              className="chat-textarea"
              value={input}
              placeholder="اكتب رسالتك..."
              onChange={(e) => setInput(e.target.value)}
            />

            <button className="chat-send-btn" onClick={() => sendMessage()}>
              ➤
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}