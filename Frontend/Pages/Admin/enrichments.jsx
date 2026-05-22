import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; 
import "../App.css";

const API_BASE    = import.meta.env.VITE_API_URL  || "http://localhost:5000";
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || "changeme";

const TYPE_META = {
  video: { icon: "🎬", label: "فيديو",  color: "#8b5cf6" },
  pdf:   { icon: "📄", label: "PDF",    color: "#ef4444" },
  image: { icon: "🖼️", label: "صورة",  color: "#06b6d4" },
  audio: { icon: "🎵", label: "صوت",   color: "#10b981" },
  link:  { icon: "🔗", label: "رابط",  color: "#f59e0b" },
};

const ALL_TYPES = [
  { value: "video", label: "فيديو",  icon: "🎬" },
  { value: "pdf",   label: "PDF",    icon: "📄" },
  { value: "image", label: "صورة",  icon: "🖼️" },
  { value: "audio", label: "صوت",   icon: "🎵" },
  { value: "link",  label: "رابط",  icon: "🔗" },
];

/* ───── Helpers ───── */
function TypeBadge({ type }) {
  const m = TYPE_META[type] || { icon: "📦", label: type, color: "#6b7280" };
  return (
    <span className="ae-badge" style={{ "--c": m.color }}>
      {m.icon} {m.label}
    </span>
  );
}

function ContentPreview({ type, content }) {
  if (type === "image") return <img src={content} alt="preview" className="ae-thumb" />;
  if (type === "video") return (
    <div className="ae-media-wrap">
      <video src={content} controls className="ae-media-video" />
    </div>
  );
  if (type === "pdf") return (
    <a href={content} target="_blank" rel="noreferrer" className="ae-content-link">
      📄 فتح الملف
    </a>
  );
  if (type === "audio") return (
    <audio src={content} controls className="ae-audio" />
  );
  return (
    <a href={content} target="_blank" rel="noreferrer" className="ae-content-link">
      🔗 {content}
    </a>
  );
}

/* ───── Edit Modal ───── */
function EditModal({ enrichment, onClose, onSave }) {
  const [form, setForm] = useState({
    title:       enrichment.title,
    description: enrichment.description || "",
    type:         enrichment.type,
    link:         enrichment.type === "link" ? enrichment.content : "",
  });
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const fileRef = useRef();

  const isLink = form.type === "link";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("type", form.type);
      if (isLink) fd.append("link", form.link);
      else if (file) fd.append("file", file);

      const res = await fetch(`${API_BASE}/api/admin/enrichments/edit/${enrichment.id}`, {
        method: "PUT",
        headers: { "X-Admin-Token": ADMIN_TOKEN },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطأ");
      onSave(data.enrichment);
    } catch (err) {
      setErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ae-modal-overlay" onClick={onClose}>
      <div className="ae-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="ae-modal-header">
          <h2>✏️ تعديل الإثراء</h2>
          <button className="ae-modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="ae-modal-form" onSubmit={handleSubmit}>
          {err && <p className="ae-modal-err">{err}</p>}

          <label className="ae-label">نوع المحتوى</label>
          <div className="ae-type-row">
            {ALL_TYPES.map((t) => (
              <button type="button" key={t.value}
                className={`ae-type-chip ${form.type === t.value ? "ae-type-chip--on" : ""}`}
                onClick={() => setForm((p) => ({ ...p, type: t.value }))}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <label className="ae-label">العنوان *</label>
          <input className="ae-input" value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />

          <label className="ae-label">الوصف</label>
          <textarea className="ae-input ae-textarea" rows={3} value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />

          {isLink ? (
            <>
              <label className="ae-label">الرابط *</label>
              <input className="ae-input" value={form.link}
                onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} placeholder="https://..." />
            </>
          ) : (
            <>
              <label className="ae-label">ملف جديد (اختياري)</label>
              <div className="ae-file-row">
                <button type="button" className="ae-file-btn"
                  onClick={() => fileRef.current?.click()}>
                  📂 اختر ملفاً
                </button>
                {file && <span className="ae-file-chosen">{file.name}</span>}
                <input ref={fileRef} type="file" hidden onChange={(e) => setFile(e.target.files[0])} />
              </div>
            </>
          )}

          <button type="submit" className="ae-modal-save" disabled={loading}>
            {loading ? "جاري الحفظ..." : "💾 حفظ التعديلات"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ───── Main Component ───── */
export default function AdminEnrichments() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting,setDeleting]= useState(null);
  const [toast,   setToast]   = useState(null);
  const [search,  setSearch]  = useState("");

  // States للـ Nav
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/enrichments`);
      const data = await res.json();
      setItems(data);
    } catch {
      showToast("فشل تحميل البيانات", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // التحقق من المستخدم والـ Nav
    const sessionUser = localStorage.getItem("user");
    if (!sessionUser) {
      window.location.href = "/login";
      return;
    }
    const parsed = JSON.parse(sessionUser);
    setUser(parsed);
    if (parsed.role === "admin") {
      setIsAdmin(true);
    } else {
      navigate("/home"); // حماية: لو مو أدمن طرده
    }

    fetchItems(); 
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/enrichments/delete/${deleting}`, {
        method: "DELETE",
        headers: { "X-Admin-Token": ADMIN_TOKEN },
      });
      if (!res.ok) throw new Error();
      setItems((p) => p.filter((e) => e.id !== deleting));
      showToast("تم الحذف");
    } catch {
      showToast("فشل الحذف", false);
    } finally {
      setDeleting(null);
    }
  };

  const handleSaved = (updated) => {
    setItems((p) => p.map((e) => (e.id === updated.id ? updated : e)));
    setEditing(null);
    showToast("تم الحفظ");
  };

  const filtered = items.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="ae-root" dir="rtl">
      
      {/* ── Nav & Sidebar ── */}
       <div
        className={`nav-overlay ${menuOpen ? "active" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <button
        className={`burger-btn ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
        <div className="nav-brand">منصة التعزيز ✨</div>
        <ul className="nav-links">
          <li onClick={() => setMenuOpen(false)}><a href="/admin/admin_home">الرئيسية 🏠</a></li>
          <li onClick={() => setMenuOpen(false)}><a href="/admin/enrichments">إثراءات 🌟</a></li>
        </ul>
        <div className="nav-footer">
          <button onClick={handleLogout} className="btn-logout">تسجيل خروج</button>
        </div>
      </nav>


      {/* ── Page Content Wrapper ── */}
      <div className="ae-main-container">
        {toast && (
          <div className={`ae-toast ${toast.ok ? "ae-toast--ok" : "ae-toast--err"}`}>
            {toast.msg}
          </div>
        )}

        {editing && (
          <EditModal
            enrichment={editing}
            onClose={() => setEditing(null)}
            onSave={handleSaved}
          />
        )}

        {deleting !== null && (
          <div className="ae-modal-overlay" onClick={() => setDeleting(null)}>
            <div className="ae-confirm" onClick={(e) => e.stopPropagation()}>
              <p className="ae-confirm-txt">هل تريد حذف هذا الإثراء؟</p>
              <div className="ae-confirm-btns">
                <button className="ae-btn-cancel" onClick={() => setDeleting(null)}>إلغاء</button>
                <button className="ae-btn-delete" onClick={handleDelete}>🗑️ حذف</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="ae-page-header">
          <div>
            <h1 className="ae-page-title">📚 الإثراءات</h1>
            <p className="ae-page-sub">{items.length} عنصر مضاف</p>
          </div>
          <a href="/admin/enrichments/add" className="ae-add-btn">+ إضافة إثراء</a>
        </div>

        {/* Search */}
        <div className="ae-search-wrap">
          <input
            className="ae-search"
            placeholder="🔍 ابحث عن إثراء..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="ae-loading">
            {[1, 2, 3].map((i) => <div key={i} className="ae-skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ae-empty">
            <span>📭</span>
            <p>لا توجد إثراءات</p>
          </div>
        ) : (
          <div className="ae-grid">
            {filtered.map((e) => (
              <div key={e.id} className="ae-card">
                <div className="ae-card-top">
                  <TypeBadge type={e.type} />
                  <span className="ae-card-id">#{e.id}</span>
                </div>

                <div className="ae-card-preview">
                  <ContentPreview type={e.type} content={e.content} />
                </div>

                <div className="ae-card-info">
                  <h3 className="ae-card-title">{e.title}</h3>
                  {e.description && <p className="ae-card-desc">{e.description}</p>}
                </div>

                <div className="ae-card-actions">
                  <button className="ae-btn-edit" onClick={() => setEditing(e)}>✏️ تعديل</button>
                  <button className="ae-btn-del"  onClick={() => setDeleting(e.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .ae-root {
          min-height: 100vh;
          background: #0d0f14;
          display: flex;
          font-family: 'Tajawal', sans-serif;
          color: #f0f4ff;
        }

        /* حاوية المحتوى الأساسية مع هامش للـ Sidebar */
        .ae-main-container {
          flex: 1;
          padding: 32px 24px 80px;
          margin-right: 260px; /* نفس عرض الـ Sidebar */
          transition: margin-right 0.3s ease;
        }

        @media (max-width: 1024px) {
          .ae-main-container {
            margin-right: 0;
            padding-top: 80px;
          }
        }

        .ae-toast {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
          z-index: 9999; padding: 11px 28px; border-radius: 100px;
          font-weight: 600; font-size: 14px;
        }
        .ae-toast--ok  { background: #1a3a2a; color: #4ade80; }
        .ae-toast--err { background: #3a1a1a; color: #f87171; }

        .ae-page-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 28px; flex-wrap: wrap; gap: 12px;
        }
        .ae-page-title { margin: 0; font-size: 28px; font-weight: 800; }
        .ae-page-sub   { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
        .ae-add-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #0d0f14; border: none; border-radius: 12px;
          padding: 12px 22px; font-weight: 800; cursor: pointer; text-decoration: none;
        }

        .ae-search {
          width: 100%; max-width: 400px; background: #13161e;
          border: 1.5px solid #ffffff12; border-radius: 12px; color: #f0f4ff;
          padding: 12px 16px; outline: none;
        }

        .ae-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .ae-card {
          background: #13161e; border: 1px solid #ffffff0c;
          border-radius: 20px; overflow: hidden; display: flex; flex-direction: column;
        }
        .ae-badge {
          background: color-mix(in srgb, var(--c) 15%, transparent);
          color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
          border-radius: 100px; padding: 4px 12px; font-size: 12px; font-weight: 700;
        }

        /* Modal Styles */
        .ae-modal-overlay {
          position: fixed; inset: 0; background: #000000cc;
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
        }
        .ae-modal {
          background: #13161e; border: 1px solid #ffffff12;
          border-radius: 20px; width: 100%; max-width: 520px;
          max-height: 90vh; overflow-y: auto;
        }
      `}</style>
    </div>
  );
}