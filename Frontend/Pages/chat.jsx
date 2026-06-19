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

// NOTE: removed "gemini-embedding-1/2", "imagen-4-fast", "imagen-4-ultra",
// "veo-3-fast", "veo-3" — embedding / image-gen / video-gen models, they
// don't support generate_content() text chat at all.
// Also removed "gemini-2-flash" / "gemini-2-flash-lite" — deprecated/being
// shut down by Google in 2026.
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

// How fast the typewriter effect reveals AI replies.
const TYPE_STEP_DIVISOR = 250; // longer replies reveal more chars per tick
const TYPE_INTERVAL_MS = 14;

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permission blocked — fail silently, selection still works
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Typewriter effect for the most recent AI message. Runs as an interval
  // that reveals more of `text` into `displayed` until it catches up.
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

  const pushAiMessage = (text, isError) => {
    setMessages((p) => [
      ...p,
      { role: "ai", text, displayed: "", done: false, isError: !!isError },
    ]);
  };

  const sendMessage = async (text) => {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;

    setInput("");
    setMessages((p) => [
      ...p,
      { role: "user", text: prompt, displayed: prompt, done: true },
    ]);
    setLoading(true);

    try {
      const res = await fetch("https://api.almaharat2.com/api/chat", {
        method: "POST",
        body: new URLSearchParams({ prompt, model }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

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
  );
}