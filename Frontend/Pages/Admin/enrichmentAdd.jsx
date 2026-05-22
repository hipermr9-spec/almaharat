import { useState, useRef } from "react";
import "../App.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || "changeme";

const TYPES = [
  { value: "video",  label: "فيديو",    icon: "🎬" },
  { value: "pdf",    label: "PDF",       icon: "📄" },
  { value: "image",  label: "صورة",     icon: "🖼️" },
  { value: "audio",  label: "صوت",      icon: "🎵" },
  { value: "link",   label: "رابط",     icon: "🔗" },
];

export default function AdminAddEnrichment() {
  const [form, setForm] = useState({ title: "", description: "", type: "video", link: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  const isLinkType = form.type === "link";

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (name === "type" && value !== "link") {
      setFile(null);
      setPreview(null);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast("العنوان مطلوب", false);
    if (isLinkType && !form.link.trim()) return showToast("الرابط مطلوب", false);
    if (!isLinkType && !file) return showToast("الملف مطلوب", false);

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("type", form.type);
      if (isLinkType) fd.append("link", form.link);
      else fd.append("file", file);

      const res = await fetch(`${API_BASE}/api/admin/enrichments/add`, {
        method: "POST",
        headers: { "X-Admin-Token": ADMIN_TOKEN },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showToast("✅ تمت الإضافة بنجاح");
      setForm({ title: "", description: "", type: "video", link: "" });
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aae-root" dir="rtl">
      {/* ── Toast ── */}
      {toast && (
        <div className={`aae-toast ${toast.ok ? "aae-toast--ok" : "aae-toast--err"}`}>
          {toast.msg}
        </div>
      )}

      <div className="aae-card">
        {/* Header */}
        <div className="aae-header">
          <span className="aae-header-icon">✦</span>
          <h1 className="aae-title">إضافة إثراء جديد</h1>
          <p className="aae-subtitle">أضف محتوى تعليمياً للطلاب</p>
        </div>

        <form className="aae-form" onSubmit={handleSubmit} encType="multipart/form-data">

          {/* Type Selector */}
          <div className="aae-field">
            <label className="aae-label">نوع المحتوى</label>
            <div className="aae-type-grid">
              {TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  className={`aae-type-btn ${form.type === t.value ? "aae-type-btn--active" : ""}`}
                  onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                >
                  <span className="aae-type-icon">{t.icon}</span>
                  <span className="aae-type-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="aae-field">
            <label className="aae-label" htmlFor="title">العنوان <span className="aae-req">*</span></label>
            <input
              id="title"
              className="aae-input"
              name="title"
              placeholder="عنوان الإثراء..."
              value={form.title}
              onChange={handleChange}
            />
          </div>

          {/* Description */}
          <div className="aae-field">
            <label className="aae-label" htmlFor="description">الوصف</label>
            <textarea
              id="description"
              className="aae-input aae-textarea"
              name="description"
              placeholder="وصف مختصر للمحتوى..."
              value={form.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Link or File */}
          {isLinkType ? (
            <div className="aae-field">
              <label className="aae-label" htmlFor="link">الرابط <span className="aae-req">*</span></label>
              <input
                id="link"
                className="aae-input"
                name="link"
                placeholder="https://..."
                value={form.link}
                onChange={handleChange}
              />
            </div>
          ) : (
            <div className="aae-field">
              <label className="aae-label">الملف <span className="aae-req">*</span></label>
              <div
                className={`aae-drop-zone ${file ? "aae-drop-zone--filled" : ""}`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} className="aae-preview-img" alt="preview" />
                ) : file ? (
                  <div className="aae-file-info">
                    <span className="aae-file-icon">
                      {form.type === "pdf" ? "📄" : form.type === "video" ? "🎬" : "🎵"}
                    </span>
                    <span className="aae-file-name">{file.name}</span>
                  </div>
                ) : (
                  <div className="aae-drop-prompt">
                    <span className="aae-drop-icon">⬆</span>
                    <p>اسحب وأفلت الملف هنا</p>
                    <p className="aae-drop-sub">أو انقر للاختيار</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  onChange={handleFile}
                  accept={
                    form.type === "video" ? "video/*" :
                    form.type === "pdf"   ? ".pdf"    :
                    form.type === "image" ? "image/*" :
                    form.type === "audio" ? "audio/*" : "*"
                  }
                />
              </div>
              {file && (
                <button
                  type="button"
                  className="aae-clear-file"
                  onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                >
                  ✕ إزالة الملف
                </button>
              )}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="aae-submit" disabled={loading}>
            {loading ? <span className="aae-spinner" /> : "✦ إضافة الإثراء"}
          </button>
        </form>
      </div>

      <style>{`
        .aae-root {
          min-height: 100vh;
          background: #0d0f14;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 40px 16px 80px;
          font-family: 'Tajawal', 'Cairo', sans-serif;
        }
        .aae-toast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          padding: 12px 28px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 600;
          animation: slideDown .3s ease;
          box-shadow: 0 8px 32px #0007;
        }
        .aae-toast--ok  { background: #1a3a2a; color: #4ade80; border: 1px solid #4ade8044; }
        .aae-toast--err { background: #3a1a1a; color: #f87171; border: 1px solid #f8717144; }
        @keyframes slideDown { from { opacity:0; top:8px } to { opacity:1; top:24px } }

        .aae-card {
          width: 100%;
          max-width: 600px;
          background: #13161e;
          border: 1px solid #ffffff0f;
          border-radius: 24px;
          overflow: hidden;
        }
        .aae-header {
          background: linear-gradient(135deg, #1c2230, #111420);
          padding: 36px 32px 28px;
          text-align: center;
          border-bottom: 1px solid #ffffff0a;
        }
        .aae-header-icon { font-size: 24px; color: #f59e0b; display: block; margin-bottom: 8px; }
        .aae-title { margin: 0 0 6px; font-size: 26px; font-weight: 800; color: #f0f4ff; }
        .aae-subtitle { margin: 0; font-size: 14px; color: #6b7280; }

        .aae-form { padding: 32px; display: flex; flex-direction: column; gap: 24px; }

        .aae-field { display: flex; flex-direction: column; gap: 8px; }
        .aae-label { font-size: 14px; font-weight: 600; color: #9ca3af; }
        .aae-req { color: #f59e0b; }

        .aae-input {
          background: #0d0f14;
          border: 1.5px solid #ffffff12;
          border-radius: 12px;
          color: #f0f4ff;
          font-family: inherit;
          font-size: 15px;
          padding: 13px 16px;
          outline: none;
          transition: border-color .2s;
          width: 100%;
          box-sizing: border-box;
        }
        .aae-input:focus { border-color: #f59e0b88; }
        .aae-input::placeholder { color: #374151; }
        .aae-textarea { resize: vertical; min-height: 80px; }

        .aae-type-grid {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .aae-type-btn {
          flex: 1 1 80px;
          min-width: 80px;
          background: #0d0f14;
          border: 1.5px solid #ffffff12;
          border-radius: 12px;
          color: #6b7280;
          padding: 12px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: all .2s;
          font-family: inherit;
        }
        .aae-type-btn:hover { border-color: #f59e0b55; color: #d1d5db; }
        .aae-type-btn--active {
          border-color: #f59e0b;
          background: #f59e0b14;
          color: #f59e0b;
        }
        .aae-type-icon { font-size: 22px; }
        .aae-type-label { font-size: 12px; font-weight: 600; }

        .aae-drop-zone {
          border: 2px dashed #ffffff18;
          border-radius: 16px;
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color .2s, background .2s;
          overflow: hidden;
        }
        .aae-drop-zone:hover { border-color: #f59e0b55; background: #f59e0b06; }
        .aae-drop-zone--filled { border-style: solid; border-color: #f59e0b44; }

        .aae-drop-prompt { text-align: center; color: #4b5563; }
        .aae-drop-icon { font-size: 36px; display: block; margin-bottom: 10px; }
        .aae-drop-prompt p { margin: 0; font-size: 14px; }
        .aae-drop-sub { font-size: 12px !important; margin-top: 4px !important; color: #374151 !important; }

        .aae-preview-img { width: 100%; max-height: 220px; object-fit: contain; }
        .aae-file-info { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #d1d5db; }
        .aae-file-icon { font-size: 40px; }
        .aae-file-name { font-size: 13px; color: #9ca3af; word-break: break-all; text-align: center; padding: 0 16px; }

        .aae-clear-file {
          background: none;
          border: none;
          color: #ef4444;
          font-family: inherit;
          font-size: 13px;
          cursor: pointer;
          align-self: flex-start;
          padding: 0;
        }
        .aae-clear-file:hover { color: #f87171; }

        .aae-submit {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          border-radius: 12px;
          color: #0d0f14;
          font-family: inherit;
          font-size: 16px;
          font-weight: 800;
          padding: 15px;
          cursor: pointer;
          transition: opacity .2s, transform .15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
        }
        .aae-submit:hover:not(:disabled) { transform: translateY(-1px); opacity: .92; }
        .aae-submit:disabled { opacity: .5; cursor: not-allowed; }

        .aae-spinner {
          width: 20px; height: 20px;
          border: 3px solid #0d0f1466;
          border-top-color: #0d0f14;
          border-radius: 50%;
          animation: spin .7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}