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
  const [emailVerified, setEmailVerified] = useState(false);
  const [savedEmail, setSavedEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [message, setMessage] = useState("");

  const [activeModal, setActiveModal] = useState(null);

  const [email, setEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  // ================= LOAD USER =================
  useEffect(() => {
    const stored = Cookies.get("user") || Cookies.get("DONT-SHARE-THAT-COOKIE");

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
        setSavedEmail(data.email || "");
        setEmail(data.email || "");
        setEmailVerified(data.emailVerified);
        setProfilePicture(data.profile_picture || "");
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

  const updateSetting = async (key, value) => {
    try {
      const res = await fetch(`${BASE}/api/update-setting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userid: user.userid,
          key,
          value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Update setting failed:', data.error);
        alert(data.error || "فشل حفظ الإعداد");
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error updating setting:', err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
      return false;
    }
  };

  // ================= EMAIL =================
  const saveEmail = async () => {
    if (!user?.userid) {
      alert("لم يتم العثور على المستخدم؛ يرجى تسجيل الدخول مجددًا.");
      return;
    }
    
    if (!email.includes('@')) {
      alert("الرجاء إدخال بريد إلكتروني صحيح");
      return;
    }

    try {
      const res = await fetch(`${BASE}/api/save-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          userid: user.userid,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "حدث خطأ أثناء حفظ البريد الإلكتروني.");
        return;
      }

      setMailEnabled(true);
      setSavedEmail(data.email || email);
      setEmailVerified(false);
      updateSetting("mailEnabled", true);
      setMessage("تم إرسال رمز التحقق إلى بريدك. الرجاء إدخاله للتحقق.");
      alert("تم حفظ البريد بنجاح ✅");
    } catch (err) {
      console.error('Error saving email:', err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  const verifyEmail = async () => {
    if (!verificationCode.trim()) {
      alert("الرجاء إدخال رمز التحقق");
      return;
    }

    try {
      const res = await fetch(`${BASE}/api/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userid: user.userid,
          code: verificationCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشل التحقق من البريد الإلكتروني.");
        return;
      }

      setEmailVerified(true);
      setMailEnabled(true);
      setMessage("تم التحقق من البريد الإلكتروني بنجاح ✅");
      setActiveModal(null);
      alert("تم التحقق من البريد الإلكتروني بنجاح ✅");
    } catch (err) {
      console.error('Error verifying email:', err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  const uploadProfilePicture = async () => {
    if (!user?.userid) {
      alert("لم يتم العثور على المستخدم؛ يرجى تسجيل الدخول مجددًا.");
      return;
    }
    if (!profileFile) {
      alert("اختر ملف صورة أولاً.");
      return;
    }

    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append("userid", user.userid);
      formData.append("file", profileFile);

      const res = await fetch(`${BASE}/api/upload-profile-picture`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "حدث خطأ أثناء رفع الصورة.");
        return;
      }

      setProfilePicture(data.profile_picture);
      setProfileFile(null);
      setMessage("تم رفع صورة الملف الشخصي بنجاح ✅");
      alert("تم رفع صورة الملف الشخصي بنجاح ✅");
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setUploadingPicture(false);
    }
  };

  // ================= USERNAME =================
  const changeUsername = async () => {
    if (!newUsername.trim()) {
      alert("الرجاء إدخال اسم مستخدم جديد");
      return;
    }

    try {
      const res = await fetch(`${BASE}/api/change-username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userid: user.userid,
          newUsername,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشل تغيير اسم المستخدم");
        return;
      }

      alert("تم تغيير اسم المستخدم بنجاح ✅");
      setActiveModal(null);
    } catch (err) {
      console.error('Error changing username:', err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  // ================= PASSWORD =================
  const changePassword = async () => {
    if (!oldPass.trim()) {
      alert("الرجاء إدخال كلمة المرور القديمة");
      return;
    }
    
    if (!newPass.trim()) {
      alert("الرجاء إدخال كلمة المرور الجديدة");
      return;
    }
    
    if (newPass.length < 6) {
      alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    try {
      const res = await fetch(`${BASE}/api/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userid: user.userid,
          oldPassword: oldPass,
          newPassword: newPass,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشل تغيير كلمة المرور");
        return;
      }

      alert("تم تغيير كلمة المرور بنجاح ✅");
      setActiveModal(null);
    } catch (err) {
      console.error('Error changing password:', err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  // ================= DELETE =================
  const deleteAccount = async () => {
    if (!window.confirm('هل أنتِ متأكدة من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه!')) {
      return;
    }

    try {
      const res = await fetch(`${BASE}/api/delete-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: user.userid }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "فشل حذف الحساب");
        return;
      }

      Cookies.remove("user");
      alert("تم حذف حسابك بنجاح");
      window.location.href = "/";
    } catch (err) {
      console.error('Error deleting account:', err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
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
          <li><a href="/Chat">دردشة 👥</a></li>
          <li><a href="/Ranks">مستوى 🏅</a></li>
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
              <p>{savedEmail ? savedEmail : "لم يتم تعيين البريد بعد"}</p>
              <p>{emailVerified ? "مؤكد" : mailEnabled ? "بانتظار التحقق" : "غير مفعل"}</p>
            </div>
          </div>

          <div className="settings-item">
            <div>
              <h3>صورة الملف الشخصي</h3>
              <p>{profilePicture ? "تم رفع صورة" : "لم يتم رفع صورة"}</p>
            </div>
            <div className="profile-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={uploadProfilePicture}
                disabled={uploadingPicture}
              >
                {uploadingPicture ? "جاري الرفع..." : "رفع"}
              </button>
            </div>
          </div>

          {/* 2FA */}
          <div className="settings-item">
            <div>
              <h3>التحقق الثنائي</h3>
              <p>{emailVerified ? "يمكنك تفعيل / تعطيل" : "يتطلب بريدًا مؤكدًا"}</p>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={twoFA}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  setTwoFA(enabled);
                  const result = await updateSetting("twoFA", enabled);
                  if (!result) {
                    setTwoFA((prev) => !prev);
                  }
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
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" />
                <button onClick={saveEmail}>حفظ</button>
                {savedEmail && !emailVerified && (
                  <>
                    <p style={{ marginTop: 12 }}>أدخل رمز التحقق المرسل إلى بريدك</p>
                    <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="رمز التحقق" />
                    <button onClick={verifyEmail}>تحقق</button>
                  </>
                )}
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