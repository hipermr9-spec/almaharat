import { useState, useEffect } from "react";
import "../App.css"; // التأكد من الرجوع لمجلد الـ CSS الرئيسي

const ADMIN_TOKEN = "changeme"; // ✅ must match ADMIN_TOKEN env var on server

export default function AdminHome() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sessionUser = localStorage.getItem("user");
    if (sessionUser) {
      const parsedUser = JSON.parse(sessionUser);
      setUser(parsedUser);
      
      // جلب النقاط الحية للعداد العلوي فوراً
      fetchLivePoints(parsedUser.userid);
      // جلب قائمة المستخدمين للجدول
      loadAllUsers();
    } else {
      window.location.href = "/login";
    }
  }, []);

  // دالة تحديث العداد العلوي من السيرفر مباشرة
  const fetchLivePoints = async (userid) => {
    try {
      const res = await fetch(`https://api.almaharat2.com/api/admin/get_points/${userid}`, {
        headers: { "X-Admin-Token": ADMIN_TOKEN },
      });
      const data = await res.json();
      if (res.ok) {
        setUser(prev => {
          const updated = { ...prev, points: data.points };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error("خطأ في تحديث العداد");
    }
  };

  // جلب كل الحسابات للجدول
  const loadAllUsers = async () => {
    try {
      const res = await fetch("https://api.almaharat2.com/api/admin/users", {
        headers: { "X-Admin-Token": ADMIN_TOKEN },
      });
      const data = await res.json();
      if (res.ok) setAllUsers(data);
    } catch (err) {
      console.error("خطأ في جلب بيانات الجدول");
    }
  };

  // تغيير النقاط في الواجهة قبل الحفظ
  const handlePointChange = (userid, value) => {
    setAllUsers(allUsers.map(u => 
      u.userid === userid ? { ...u, points: value } : u
    ));
  };

  // حفظ النقاط في ملف JSON وتحديث العداد
  const savePoints = async (userid, points) => {
    try {
      const res = await fetch("https://api.almaharat2.com/api/admin/update_points", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN },
        body: JSON.stringify({ userid, points })
      });

      if (res.ok) {
        alert("✅ تم تحديث البيانات بنجاح!");
        // إذا عدلت نقاطك، حدث العداد العلوي حياً
        if (user.userid === userid) {
          fetchLivePoints(userid);
        }
        loadAllUsers(); // تحديث الجدول
      }
    } catch (err) {
      console.error("فشل الاتصال بالسيرفر");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (!user) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="home-layout">
      {/* القائمة الجانبية */}
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
          <li onClick={() => setMenuOpen(false)}><a href="/home">الرئيسية 🏠</a></li>
          <li onClick={() => setMenuOpen(false)}><a href="/admin/enrichments">إثراءات 🌟</a></li>
        </ul>
        <div className="nav-footer">
          <button onClick={handleLogout} className="btn-logout">تسجيل خروج</button>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="home-content">
        <header className="welcome-box">
          <h1>مرحباً بك، {user.username} 👋</h1>
          <div className="stat-card">
            <h3>نقاطك الحالية</h3>
            <p className="points-display">{user.points} 🏆</p>
          </div>
        </header>

        <section className="admin-dashboard">
          <div className="dashboard-header">
            <h2>🛠️ لوحة تحكم المشرف (تعديل النقاط)</h2>
          </div>
          
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>اسم الطالبة</th>
                <th>النقاط</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.userid}>
                  <td>#{u.userid}</td>
                  <td>{u.username}</td>
                  <td>
                    <input 
                      type="number" 
                      value={u.points} 
                      onChange={(e) => handlePointChange(u.userid, e.target.value)}
                      className="points-input"
                    />
                  </td>
                  <td>
                    <button 
                      onClick={() => savePoints(u.userid, u.points)}
                      className="btn-save"
                    >
                      حفظ 💾
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}