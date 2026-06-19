import { useState } from "react";
import "./App.css";
import Cookies from "js-cookie";

const BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://api.almaharat2.com";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const res = await fetch(`${BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      const { chats, ...userData } = data.user; // ignore chats, keep the rest

      Cookies.set("user", JSON.stringify(userData));
      Cookies.set("userid", userData.userid);

      window.location.href = "/home";
    } else {
      alert("⚠️ " + data.error);
    }
  } catch {
    alert("❌ تعذر الاتصال بالمنصة!");
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
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>اسم الطالبة</label>
            <input
              type="text"
              placeholder="اسمك المستخدم"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="input-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              placeholder="كلمة المرور الخاصة بك"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-main"
          >
            {loading ? "جاري التحقق..." : "دخول للمنصة 🚀"}
          </button>
        </form>
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
      </div>

    </div>
  );
}