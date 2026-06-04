import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import "./App.css";

const BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.almaharat2.com";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [mailEnabled, setMailEnabled] = useState(false);
  const [twoFA, setTwoFA] = useState(false);

  const [activeModal, setActiveModal] = useState(null);

  const [email, setEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  // ================= LOAD USER =================
  useEffect(() => {
    const stored = Cookies.get("DONT-SHARE-THAT-COOKIE");

    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setIsAdmin(parsed.role === "admin");
      loadSettings(parsed.userid);
    }
  }, []);

  const loadSettings = async (userid) => {
    try {
      const res = await fetch(`${BASE}/api/get-settings/${userid}`);
      const data = await res.json();

      if (res.ok) {
        setMailEnabled(data.mailEnabled);
        setTwoFA(data.twoFA);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    document.body.style.overflow = activeModal ? "hidden" : "auto";
  }, [activeModal]);

  // ================= NAV =================
  const handleLogout = () => {
    Cookies.remove("user");
    window.location.href = "/";
  };

  // ================= API =================
  const updateSetting = async (key, value) => {
    await fetch(`${BASE}/api/update-setting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userid: user.userid,
        key,
        value,
      }),
    });
  };

  // ================= EMAIL =================
  const saveEmail = async () => {
    await fetch(`${BASE}/api/save-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        userid: user.userid,
      }),
    });

    setMailEnabled(true);
    updateSetting("mailEnabled", true);
    setActiveModal(null);
  };

  // ================= USERNAME =================
  const changeUsername = async () => {
    await fetch(`${BASE}/api/change-username`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userid: user.userid,
        newUsername,
      }),
    });

    setActiveModal(null);
  };

  // ================= PASSWORD =================
  const changePassword = async () => {
    await fetch(`${BASE}/api/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userid: user.userid,
        oldPassword: oldPass,
        newPassword: newPass,
      }),
    });

    setActiveModal(null);
  };

  // ================= DELETE =================
  const deleteAccount = async () => {
    await fetch(`${BASE}/api/delete-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userid: user.userid }),
    });

    Cookies.remove("user");
    window.location.href = "/";
  };

  return (
    <div className="home-layout">

      {/* NAV */}
      <div className={`nav-overlay ${menuOpen ? "active" : ""}`} onClick={() => setMenuOpen(false)} />

      <button className={`burger-btn ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
        <span></span><span></span><span></span>
      </button>

      <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
        <div className="nav-brand">منصة التعزيز ✨</div>

        <ul className="nav-links">
          <li><a href="/home">الرئيسية 🏠</a></li>
          <li><a href="/Games">العاب 🎮</a></li>
          <li><a href="/posts">منشورات 📭</a></li>
          <li><a href="/enrichments">إثراءات 🌟</a></li>
          <li><a href="/settings">الإعدادات ⚙️</a></li>
          <li><a href="/Rank">مستوى 🏅</a></li>
          <li><a href={user ? `/Stats/${user.userid}` : '/Stats/'}>أحصائيات 🎯</a></li>
        </ul>

        {isAdmin && (
            <li onClick={() => setMenuOpen(false)}>
              <a href="/Admin/Home">لوحة المشرف 🧑‍💼</a>
            </li>
          )}

        <div className="nav-footer">
          <button onClick={handleLogout}>تسجيل خروج</button>
        </div>
      </nav>

      {/* SETTINGS */}
      <section className="settings-section">
        <h2 className="section-title">الإعدادات ⚙️</h2>

        <div className="settings-box">

          <p>مرحباً {user ? user.name : "بك"}!</p>

          {/* EMAIL */}
          <div className="settings-item" onClick={() => setActiveModal("email")}>
            <div>
              <h3>البريد الإلكتروني</h3>
              <p>الإشعارات</p>
            </div>
          </div>

          {/* 2FA */}
          <div className="settings-item">
            <div>
              <h3>التحقق الثنائي</h3>
            </div>

            {/* 🔥 SWITCH (زي ما هو بدون تغيير) */}
            <label className="switch">
              <input
                type="checkbox"
                checked={twoFA}
                onChange={(e) => {
                  setTwoFA(e.target.checked);
                  updateSetting("twoFA", e.target.checked);
                }}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* USERNAME */}
          <div className="settings-item" onClick={() => setActiveModal("username")}>
            <h3>تغيير اسم المستخدم</h3>
          </div>

          {/* PASSWORD */}
          <div className="settings-item" onClick={() => setActiveModal("password")}>
            <h3>تغيير كلمة المرور</h3>
          </div>

          {/* DELETE */}
          <div className="settings-item danger" onClick={deleteAccount}>
            <h3>حذف الحساب</h3>
          </div>

        </div>
      </section>

      {/* MODAL */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>

            {activeModal === "email" && (
              <>
                <h3>📧 البريد</h3>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
                <button onClick={saveEmail}>حفظ</button>
              </>
            )}

            {activeModal === "username" && (
              <>
                <h3>👤 اسم المستخدم</h3>
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                <button onClick={changeUsername}>تغيير</button>
              </>
            )}

            {activeModal === "password" && (
              <>
                <h3>🔒 كلمة المرور</h3>
                <input placeholder="القديم" onChange={(e) => setOldPass(e.target.value)} />
                <input placeholder="الجديد" onChange={(e) => setNewPass(e.target.value)} />
                <button onClick={changePassword}>تغيير</button>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}