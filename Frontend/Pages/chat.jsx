import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

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
  z-index: 10;
}

.chat-nav-brand {
  font-weight: 700;
}

/* WRAPPER AND SIDEBAR */
.chat-wrapper {
  flex: 1;
  max-width: 1600px;
  width: 100%;
  margin: auto;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

.chat-sidebar {
  width: 300px;
  background: rgba(15, 23, 42, 0.6);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 15px;
}

.new-chat-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  text-align: center;
}

.new-chat-btn:hover {
  opacity: 0.9;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-item:hover {
  background: rgba(30, 41, 59, 0.8);
}

.chat-item.active {
  background: rgba(37, 99, 235, 0.15);
  border-color: rgba(37, 99, 235, 0.4);
}

.chat-item-title {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 8px;
}

.chat-item-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  transition: color 0.15s ease;
}

.action-btn:hover {
  color: #f8fafc;
}

.action-btn.delete:hover {
  color: #ef4444;
}

/* MAIN CHAT AREA */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 70px);
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
  animation: slideInUser .25s ease-out;
}

.message-row.ai .message-bubble {
  animation: fadeInAI .3s ease-out;
}

.message-bubble.error {
  background: rgba(239,68,68,.15);
  border: 1px solid rgba(239,68,68,.4);
}

@keyframes slideInUser {
  from { opacity: 0; transform: translateY(10px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes fadeInAI {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  0%, 50%      { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}

.type-cursor {
  display: inline-block;
  width: 7px;
  height: 1em;
  margin-inline-start: 3px;
  background: #93c5fd;
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;
}

/* CODE BLOCKS */
.inline-code {
  background: rgba(255,255,255,.08);
  padding: 2px 6px;
  border-radius: 6px;
  font-family: "Fira Code", Consolas, monospace;
  font-size: .9em;
}

.code-block {
  margin: 10px 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.08);
  background: #0d1422;
}

.code-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(255,255,255,.04);
  border-bottom: 1px solid rgba(255,255,255,.06);
  font-family: Consolas, monospace;
  font-size: 12px;
  color: #94a3b8;
  text-transform: lowercase;
}

.code-block-copy {
  background: rgba(255,255,255,.08);
  border: none;
  color: #e2e8f0;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background .15s ease;
}

.code-block-copy:hover {
  background: rgba(255,255,255,.18);
}

.code-block-pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  font-family: "Fira Code", Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #e2e8f0;
}

/* MATH (KaTeX) */
.katex {
  color: #f8fafc;
  direction: ltr;
  unicode-bidi: embed;
  font-size: 1.05em;
}

.katex-display {
  margin: 12px 0;
  overflow-x: auto;
  overflow-y: hidden;
  direction: ltr;
}

/* THINKING INDICATOR */
.thinking-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-dots {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.thinking-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #93c5fd;
  animation: thinkingBounce 1.2s ease-in-out infinite;
}

.thinking-dots span:nth-child(2) { animation-delay: .15s; }
.thinking-dots span:nth-child(3) { animation-delay: .3s; }

@keyframes thinkingBounce {
  0%, 80%, 100% { transform: scale(.6); opacity: .4; }
  40%           { transform: scale(1);  opacity: 1; }
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
  transition: transform .12s ease, background .15s ease;
}

.chat-send-btn:active {
  transform: scale(.88);
}

.chat-send-btn:disabled {
  background: #1e3a8a;
  cursor: not-allowed;
  opacity: .6;
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
  margin-bottom: 5px;
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
];

const SUGGESTIONS = [
  "ما هي المشتقات؟ 📐",
  "اشرح فيثاغورس",
  "كيف أحل المعادلات التربيعية؟",
  "ما هو التكامل؟ 🔢"
];

const TYPE_STEP_DIVISOR = 250;
const TYPE_INTERVAL_MS = 14;

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clip-board error fallback
    }
  };

  return (
    <div className="code-block" dir="ltr">
      <div className="code-block-header">
        <span>{language}</span>
        <button className="code-block-copy" onClick={handleCopy}>
          {copied ? "✅ Copied" : "Copy"}
        </button>
      </div>
      <pre className="code-block-pre"><code>{code}</code></pre>
    </div>
  );
}

const markdownComponents = {
  pre: ({ children }) => <>{children}</>,
  code(props) {
    const { className, children } = props;
    const match = /language-(\w+)/.exec(className || "");
    const codeText = String(children).replace(/\n$/, "");

    if (!match) {
      return <code className="inline-code">{children}</code>;
    }
    return <CodeBlock language={match[1]} code={codeText} />;
  },
};

export default function Chat() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(MODELS[0]);

  const bottomRef = useRef(null);

  useEffect(() => {
    const session = Cookies.get("user");
    if (!session) {
      window.location.href = "/login";
      return;
    }
    try {
      setUser(JSON.parse(session));
    } catch {
      Cookies.remove("user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    if (!user || !activeChatId) {
      setMessages([]);
      return;
    }
    fetchChatMessages(activeChatId);
  }, [activeChatId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const idx = messages.length - 1;
    const last = messages[idx];
    if (!last || last.role !== "ai" || last.done) return;

    const step = Math.max(1, Math.ceil(last.text.length / TYPE_STEP_DIVISOR));

    const interval = setInterval(() => {
      setMessages((prev) => {
        const i = prev.length - 1;
        const msg = prev[i];
        if (!msg || msg.role !== "ai" || msg.done) return prev;

        const nextLen = Math.min(msg.text.length, msg.displayed.length + step);
        const done = nextLen >= msg.text.length;
        const next = [...prev];
        next[i] = { ...msg, displayed: msg.text.slice(0, nextLen), done };
        return next;
      });
    }, TYPE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [messages.length]);

  const fetchChats = async () => {
    try {
      const username = user?.username || user?.name;
      const params = new URLSearchParams();
      params.append("username", username);

      const res = await fetch("https://api.almaharat2.com/api/chats", {
        method: "POST",
        body: params,
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        if (data.length > 0 && !activeChatId) {
          setActiveChatId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  };

  const fetchChatMessages = async (chatId) => {
    try {
      const username = user?.username || user?.name;
      const res = await fetch(
        `https://api.almaharat2.com/api/chats/${chatId}?username=${encodeURIComponent(username)}`
      );
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.messages || []).map((m) => ({
          role: m.role === "assistant" ? "ai" : "user",
          text: m.content,
          displayed: m.content,
          done: true,
        }));
        setMessages(mapped);
      }
    } catch (err) {
      console.error("Error fetching chat details:", err);
    }
  };

  const handleCreateNewChat = async () => {
    try {
      const username = user?.username || user?.name;
      const params = new URLSearchParams();
      params.append("username", username);

      const res = await fetch("https://api.almaharat2.com/api/chats/create", {
        method: "POST",
        body: params,
      });
      const data = await res.json();
      if (data.success && data.chat_id) {
        setActiveChatId(data.chat_id);
        await fetchChats();
      }
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذه المحادثة؟")) return;

    try {
      const username = user?.username || user?.name;
      const params = new URLSearchParams();
      params.append("username", username);

      const res = await fetch(`https://api.almaharat2.com/api/chats/${chatId}/delete`, {
        method: "POST",
        body: params,
      });

      if (res.ok) {
        if (activeChatId === chatId) {
          setActiveChatId(null);
        }
        await fetchChats();
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  const handleRenameChat = async (e, chatId, currentTitle) => {
    e.stopPropagation();
    const newTitle = window.prompt("أدخل العنوان الجديد للمحادثة:", currentTitle);
    if (!newTitle || !newTitle.trim()) return;

    try {
      const username = user?.username || user?.name;
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("title", newTitle.trim());

      const res = await fetch(`https://api.almaharat2.com/api/chats/${chatId}/rename`, {
        method: "POST",
        body: params,
      });

      if (res.ok) {
        await fetchChats();
      }
    } catch (err) {
      console.error("Error renaming chat:", err);
    }
  };

  const pushAiMessage = (text, isError) => {
    setMessages((p) => [
      ...p,
      { role: "ai", text, displayed: "", done: false, isError: !!isError },
    ]);
  };

  const sendMessage = async (text) => {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;

    let targetChatId = activeChatId;
    const username = user?.username || user?.name;

    if (!targetChatId) {
      try {
        const params = new URLSearchParams();
        params.append("username", username);
        const createRes = await fetch("https://api.almaharat2.com/api/chats/create", {
          method: "POST",
          body: params,
        });
        const createData = await createRes.json();
        if (createData.success && createData.chat_id) {
          targetChatId = createData.chat_id;
          setActiveChatId(targetChatId);
        } else {
          pushAiMessage("❌ تعذر تهيئة محادثة جديدة تلقائياً", true);
          return;
        }
      } catch {
        pushAiMessage("❌ تعذر الاتصال بالخادم لتهيئة المحادثة", true);
        return;
      }
    }

    setInput("");
    setMessages((p) => [
      ...p,
      { role: "user", text: prompt, displayed: prompt, done: true },
    ]);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("prompt", prompt);
      params.append("model", model);
      params.append("username", username);
      params.append("chat_id", targetChatId);

      const res = await fetch("https://api.almaharat2.com/api/chat", {
        method: "POST",
        body: params,
      });

      let data = {};
      try { data = await res.json(); } catch { data = {}; }

      if (!res.ok) {
        if (data.limited === true) {
          pushAiMessage(`⏳ ${model} الحد الأقصى انتهى، جرّب موديل آخر`, true);
        } else if (data.limited === null || data.limited === undefined) {
          pushAiMessage(`❓ تحقق من حد ${model}`, true);
        } else {
          pushAiMessage(`❌ ${data.error || `خطأ في الخادم (${res.status})`}`, true);
        }
      } else {
        pushAiMessage(data.response || "لم يصل رد من الخادم", false);
        fetchChats();
      }
    } catch {
      pushAiMessage("❌ تعذر الاتصال بالخادم", true);
    }

    setLoading(false);
  };

  if (!user) return null;

  return (
    <div dir="rtl" className="chat-page">
      <style>{styles}</style>

      {/* NAVBAR */}
      <div className="chat-nav">
        <div className="chat-nav-brand">منصة تعزيز المهارات ✨</div>
      </div>

      <div className="chat-wrapper">
        
        {/* SIDEBAR */}
        <div className="chat-sidebar">
          <button className="new-chat-btn" onClick={handleCreateNewChat}>
            + شات جديد
          </button>
          
          <div className="chat-list">
            {chats.map((c) => (
              <div 
                key={c.id} 
                className={`chat-item ${activeChatId === c.id ? "active" : ""}`}
                onClick={() => setActiveChatId(c.id)}
              >
                <span className="chat-item-title">{c.title || "شات جديد"}</span>
                <div className="chat-item-actions">
                  <button 
                    className="action-btn" 
                    title="تعديل الاسم"
                    onClick={(e) => handleRenameChat(e, c.id, c.title || "شات جديد")}
                  >
                    ✏️
                  </button>
                  <button 
                    className="action-btn delete" 
                    title="حذف"
                    onClick={(e) => handleDeleteChat(e, c.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CHAT WINDOW */}
        <div className="chat-main">
          
          {/* MESSAGES */}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`message-row ${m.role}`}>
                <div className={`message-bubble ${m.isError ? "error" : ""}`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
                    components={markdownComponents}
                  >
                    {m.displayed}
                  </ReactMarkdown>
                  {m.role === "ai" && !m.done && <span className="type-cursor" />}
                </div>
              </div>
            ))}

            {loading && (
              <div className="message-row ai">
                <div className="message-bubble thinking-bubble">
                  <span>جاري التفكير</span>
                  <span className="thinking-dots">
                    <span></span><span></span><span></span>
                  </span>
                </div>
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

          {/* INPUT AREA */}
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
                disabled={loading || !input.trim()}
              >
                ➤
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}