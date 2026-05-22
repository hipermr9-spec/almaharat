import { useState } from "react";
import "./App.css";

const BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://almaharat.ngrok.app";

export default function Register() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptTerms) {
      alert("⚠️ يجب قبول شروط الاستخدام لإنشاء حساب");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        alert("🎉 مبروك! تم إنشاء حسابك التعليمي بنجاح");
        window.location.href = "/login";
      } else {
        alert("⚠️ " + data.error);
      }
    } catch {
      alert("❌ السيرفر طافي! شغل ملف app.py أولاً");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">منصتي التعليمية ✨</div>
        <h2 className="auth-title">انضمي إلينا اليوم!</h2>
        <p className="auth-sub">ابدئي رحلة التعلم واجمعي النقاط</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>اسم الطالبة</label>
            <input
              type="text"
              placeholder="أدخلي اسمك الرباعي"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="input-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              placeholder="اختاري كلمة مرور قوية"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="terms-group">
            <input
              type="checkbox"
              id="accept-terms-register"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <label htmlFor="accept-terms-register">
              أوافق على{" "}
              <span
                className="terms-link"
                onClick={() => (window.location.href = "/terms")}
              >
                شروط الاستخدام
              </span>
            </label>
          </div>
          <button
            type="submit"
            className="btn-main"
            disabled={loading || !acceptTerms}
          >
            {loading ? "جاري التسجيل..." : "إنشاء حساب طالبة 👩‍🎓"}
          </button>
        </form>
        <p className="auth-switch">
          لديك حساب بالفعل؟{" "}
          <span onClick={() => (window.location.href = "/login")}>سجلي دخولك</span>
        </p>
      </div>
    </div>
  );
}