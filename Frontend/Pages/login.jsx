import { useState } from "react";
import "./App.css";
import Cookies from "js-cookie";

const BASE = "https://api.almaharat2.com";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [twoFAState, setTwoFAState] = useState({ required: false, userid: "", code: "" });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const user = Cookies.get("user") || Cookies.get("DONT-SHARE-THAT-COOKIE");

  if (user) window.location.href = "/home";

  const completeLogin = async () => {
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/login-2fa`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: twoFAState.userid, code: twoFAState.code }),
      });
      const data = await res.json();
      if (res.ok) {
        const { chats, ...userData } = data.user;
        Cookies.set("user", JSON.stringify(userData));
        Cookies.set("userid", userData.userid);
        Cookies.set("DONT-SHARE-THAT-COOKIE", JSON.stringify(userData));
        if (userData.role === "owner") {
          Cookies.set("OWNER_TOKEN", "OWNER_TOKEN_2026");
        }
        window.location.href = "/home";
      } else {
        setErrorMessage(data.error || "فشل التحقق من الكود");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("❌ تعذر الاتصال بالمنصة!");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.username.trim()) {
      setErrorMessage("⚠️ الرجاء إدخال اسم المستخدم");
      return;
    }

    if (!form.password.trim()) {
      setErrorMessage("⚠️ الرجاء إدخال كلمة المرور");
      return;
    }

    if (form.password.length < 6) {
      setErrorMessage("⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/login`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.twoFA_required) {
          setTwoFAState({ required: true, userid: data.userid, code: "" });
          return;
        }
        const { chats, ...userData } = data.user;
        Cookies.set("user", JSON.stringify(userData));
        Cookies.set("userid", userData.userid);
        Cookies.set("DONT-SHARE-THAT-COOKIE", JSON.stringify(userData));
        if (userData.role === "owner") {
          Cookies.set("OWNER_TOKEN", "OWNER_TOKEN_2026");
        }
        window.location.href = "/home";
      } else {
        setErrorMessage("⚠️ " + (data.error || "فشل تسجيل الدخول"));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("❌ تعذر الاتصال بالمنصة!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">منصتي التعليمية ✨</div>
        <h2 className="auth-title">مرحباً بكِ مجدداً!</h2>
        <p className="auth-sub">سجلي دخولك لمتابعة دروسك</p>
        {errorMessage && (
          <div className="error-banner" role="alert" style={{ marginBottom: 16 }}>
            {errorMessage}
          </div>
        )}

        {!twoFAState.required ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label>اسم الطالبة</label>
              <input
                type="text"
                placeholder="اسمك المستخدم"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>كلمة المرور</label>
              <input
                type="password"
                placeholder="كلمة المرور الخاصة بك"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-main"
              disabled={loading}
            >
              {loading ? "جاري التحقق..." : "دخول للمنصة 🚀"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); completeLogin(); }}>
            <div className="input-group">
              <label>كود التحقق</label>
              <input
                type="text"
                placeholder="أدخل الكود المرسل إلى بريدك"
                value={twoFAState.code}
                onChange={(e) => setTwoFAState({ ...twoFAState, code: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-main"
              disabled={loading}
            >
              {loading ? "التحقق..." : "تأكيد الكود"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setTwoFAState({ required: false, userid: "", code: "" })}
            >
              رجوع
            </button>
          </form>
        )}

        {!twoFAState.required && (
          <>
            <p className="auth-switch">
              مستخدمة جديدة؟{" "}
              <span onClick={() => (window.location.href = "/register")}>أنشئي حسابك</span>
            </p>
            <div className="terms-group">
              <span
                className="terms-link"
                onClick={() => (window.location.href = "/Change/Password")}
              >
                نسيت كلمة المرور؟
              </span>
            </div>
          </>
        )}
      </div>

    </div>
  );
}