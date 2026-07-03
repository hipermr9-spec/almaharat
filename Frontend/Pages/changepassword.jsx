import React, { useState } from "react";
import Cookies from "js-cookie";
import "./App.css";

const BASE = "https://api.almaharat2.com/api";

export default function ChangePassword() {
  const [form, setForm] = useState({
    username: "",
    twofacode: "",
    newPassword: "",
    confirmNewPassword: "",
    step: 1, // BUG FIX #1: was missing entirely — nothing ever rendered
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // inline errors instead of alert()

  // ── Step 1: Check if user has an email ─────────────────────────────────────
  const usernamehandlesubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/checkuserhasemail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.hasEmail) {
          setForm((prev) => ({ ...prev, step: 2 }));
        } else {
          setError(
            "لا يوجد بريد إلكتروني مرتبط بحسابك. للمساعدة تواصل مع almaharatsupport@gmail.com"
          );
        }
      } else {
        setError(data.error || "حدث خطأ. يرجى المحاولة مرة أخرى.");
      }
    } catch {
      setError("تعذر الاتصال بالمنصة. تحقق من الاتصال بالإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify the 2FA code sent to email ───────────────────────────────
  const twofacodehandlesubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/sendtogmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // BUG FIX #3: username was missing — backend couldn't identify the user
        body: JSON.stringify({ username: form.username, twofacode: form.twofacode }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.valid) {
          setForm((prev) => ({ ...prev, step: 3 }));
        } else {
          setError("كود التحقق غير صحيح. يرجى المحاولة مرة أخرى.");
        }
      } else {
        setError(data.error || "حدث خطأ. يرجى المحاولة مرة أخرى.");
      }
    } catch {
      setError("تعذر الاتصال بالمنصة. تحقق من الاتصال بالإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Set the new password ────────────────────────────────────────────
  const passwordhandlesubmit = async (e) => {
    e.preventDefault();
    setError("");

    // BUG FIX #4: no client-side password match check existed
    if (form.newPassword !== form.confirmNewPassword) {
      setError("كلمتا المرور غير متطابقتين. يرجى التأكد من إدخالهما بشكل صحيح.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/changepassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // BUG FIX #3 (again): username was missing here too
        body: JSON.stringify({
          username: form.username,
          newPassword: form.newPassword,
          ConfirmNewPassword: form.confirmNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => ({ ...prev, step: 4 })); // success state
      } else {
        setError(data.error || "حدث خطأ أثناء تغيير كلمة المرور.");
      }
    } catch {
      setError("تعذر الاتصال بالمنصة. تحقق من الاتصال بالإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <span className="logo-icon">✦</span>
          منصتي التعليمية
        </div>

        {/* Step Indicator — hidden on success screen */}
        {form.step < 4 && (
          <div className="steps-row">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`step-node ${form.step > s ? "done" : ""} ${form.step === s ? "active" : ""}`}>
                  {form.step > s ? "✓" : s}
                </div>
                {s < 3 && <div className={`step-line ${form.step > s ? "filled" : ""}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Inline error banner */}
        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        {/* ── Step 1 ── */}
        {form.step === 1 && (
          <>
            <h2 className="auth-title">تغيير كلمة المرور</h2>
            <p className="auth-sub">أدخل اسم المستخدم الخاص بك للبدء</p>
            <form onSubmit={usernamehandlesubmit} className="auth-form">
              <div className="input-group">
                <label htmlFor="username">اسم المستخدم</label>
                <input
                  id="username"
                  type="text"
                  placeholder="أدخل اسمك المستخدم"
                  value={form.username} // BUG FIX #2: controlled input
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  autoComplete="username"
                  required
                />
              </div>
              <button type="submit" className="btn-main" disabled={loading}>
                {loading ? <span className="spinner" /> : "التحقق من الحساب"}
              </button>
            </form>
          </>
        )}

        {/* ── Step 2 ── */}
        {form.step === 2 && (
          <>
            <h2 className="auth-title">كود التحقق</h2>
            <p className="auth-sub">تم إرسال كود التحقق إلى بريدك الإلكتروني</p>
            <form onSubmit={twofacodehandlesubmit} className="auth-form">
              <div className="input-group">
                <label htmlFor="twofacode">كود التحقق</label>
                <input
                  id="twofacode"
                  type="text"
                  placeholder="أدخل الكود المرسل إليك"
                  value={form.twofacode} // BUG FIX #2: controlled input
                  onChange={(e) => setForm((prev) => ({ ...prev, twofacode: e.target.value }))}
                  inputMode="numeric"
                  maxLength={8}
                  required
                />
              </div>
              <button type="submit" className="btn-main" disabled={loading}>
                {loading ? <span className="spinner" /> : "تأكيد الكود"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { setError(""); setForm((prev) => ({ ...prev, step: 1 })); }}
              >
                → رجوع
              </button>
            </form>
          </>
        )}

        {/* ── Step 3 ── */}
        {form.step === 3 && (
          <>
            <h2 className="auth-title">كلمة المرور الجديدة</h2>
            <p className="auth-sub">اختر كلمة مرور قوية لا تقل عن 6 أحرف</p>
            <form onSubmit={passwordhandlesubmit} className="auth-form">
              <div className="input-group">
                <label htmlFor="newPassword">كلمة المرور الجديدة</label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="أدخل كلمة المرور الجديدة"
                  value={form.newPassword} // BUG FIX #2: controlled input
                  onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="confirmNewPassword">تأكيد كلمة المرور</label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="أعد إدخال كلمة المرور"
                  value={form.confirmNewPassword} // BUG FIX #2: controlled input
                  onChange={(e) => setForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                  autoComplete="new-password"
                  required
                />
              </div>
              <button type="submit" className="btn-main" disabled={loading}>
                {loading ? <span className="spinner" /> : "حفظ كلمة المرور"}
              </button>
            </form>
          </>
        )}

        {/* ── Step 4: Success ── */}
        {form.step === 4 && (
          <div className="success-screen">
            <div className="success-icon">✓</div>
            <h2 className="auth-title">تم بنجاح!</h2>
            <p className="auth-sub">تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.</p>
            <a href="/login" className="btn-main btn-link">
              الذهاب إلى تسجيل الدخول
            </a>
          </div>
        )}

      </div>
    </div>
  );
}