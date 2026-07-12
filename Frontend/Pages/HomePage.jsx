import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import "./App.css";

const ADMIN_TOKEN = "changeme"; // ✅ must match ADMIN_TOKEN env var on server

export default function Home() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pointsAnimating, setPointsAnimating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const prevPointsRef = useRef(null);

  useEffect(() => {
    const sessionUser = Cookies.get("user") || Cookies.get("DONT-SHARE-THAT-COOKIE");
    if (!sessionUser) {
      window.location.href = "/login";
      return;
    }
    
    try {
      const parsed = JSON.parse(sessionUser);
      setUser(parsed);
      if (parsed?.userid) {
        fetchLivePoints(parsed.userid);
      }
      if (parsed?.role === "admin") {
        setIsAdmin(true);
        loadAllUsers();
      }
    } catch (err) {
      console.error("Error parsing user session:", err);
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!user?.userid) return;
    const interval = setInterval(() => {
      fetchLivePoints(user.userid);
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.userid]);

  useEffect(() => {
    if (prevPointsRef.current !== null && prevPointsRef.current !== user?.points) {
      setPointsAnimating(true);
      setTimeout(() => setPointsAnimating(false), 600);
    }
    prevPointsRef.current = user?.points;
  }, [user?.points]);

  // ✅ X-Admin-Token header added with proper error handling
  const fetchLivePoints = async (userid) => {
    if (!userid) {
      console.error("No userid provided");
      return;
    }
    try {
      const res = await fetch(
        `https://api.almaharat2.com/api/admin/get_points/${userid}`,
        { 
          headers: { "X-Admin-Token": ADMIN_TOKEN },
          credentials: 'include'
        }
      );
      
      if (!res.ok) {
        console.error(`Failed to fetch points: ${res.status} ${res.statusText}`);
        return;
      }
      
      const data = await res.json();
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, points: data.points };
        Cookies.set("user", JSON.stringify(updated), { expires: 7 });
        Cookies.set("DONT-SHARE-THAT-COOKIE", JSON.stringify(updated), { expires: 7 });
        return updated;
      });
    } catch (err) {
      console.error("Error fetching points:", err.message);
    }
  };

  // ✅ X-Admin-Token header added with proper error handling
  const loadAllUsers = async () => {
    try {
      const res = await fetch("https://api.almaharat2.com/api/admin/users", {
        headers: { "X-Admin-Token": ADMIN_TOKEN },
        credentials: 'include'
      });
      
      if (!res.ok) {
        console.error(`Failed to load users: ${res.status} ${res.statusText}`);
        return;
      }
      
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllUsers(data);
      }
    } catch (err) {
      console.error("Error loading users:", err.message);
    }
  };

  const handlePointChange = (userid, value) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.userid === userid ? { ...u, points: value } : u))
    );
  };

  // ✅ X-Admin-Token header added with proper error handling
  const savePoints = async (userid, points) => {
    if (!userid || points === null || points === undefined) {
      console.error("Invalid userid or points");
      alert("خطأ: بيانات غير صحيحة");
      return;
    }

    try {
      const res = await fetch("https://api.almaharat2.com/api/admin/update_points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": ADMIN_TOKEN,
        },
        credentials: 'include',
        body: JSON.stringify({ userid, points: parseInt(points) }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        console.error(`Failed to save points: ${res.status}`, errData);
        alert(errData.error || "فشل حفظ النقاط");
        return;
      }
      
      alert("تم حفظ النقاط بنجاح ✅");
      if (user?.userid === userid) {
        fetchLivePoints(userid);
      }
      loadAllUsers();
    } catch (err) {
      console.error("Error saving points:", err.message);
      alert("خطأ في الاتصال بالخادم");
    }
  };

  const handleLogout = () => {
    Cookies.remove("user");
    Cookies.remove("userid");
    Cookies.remove("DONT-SHARE-THAT-COOKIE");
    window.location.href = "/login";
  };

  if (!user) {
    return (
      <div className="loading">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-layout">
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
          <li onClick={() => setMenuOpen(false)}><a href="/Games">العاب 🎮</a></li>
          <li onClick={() => setMenuOpen(false)}><a href="/posts">منشورات 📭</a></li>
          <li onClick={() => setMenuOpen(false)}><a href="/enrichments">إثراءات 🌟</a></li>
          <li onClick={() => setMenuOpen(false)}><a href="/settings">الإعدادات ⚙️</a></li>
          {isAdmin && (
            <li onClick={() => setMenuOpen(false)}>
              <a href="/Admin/Home">لوحة المشرف 🧑‍💼</a>
            </li>
          )}
        </ul>
        <div className="nav-footer">
          <button onClick={handleLogout} className="btn-logout">تسجيل خروج</button>
        </div>
      </nav>

      <main className="home-content">
        <header className="welcome-box">
          <h1>مرحباً {user.username} 👋</h1>
          <div className="stat-card">
            <h3>نقاطك</h3>
            <div className="points-wrapper">
              <p className={`points-display ${pointsAnimating ? "points-flip" : ""}`}>
                {user.points} 🏆
              </p>
            </div>
          </div>
        </header>

        {isAdmin && (
          <section className="admin-dashboard">
            <h2>لوحة التحكم</h2>
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>اسم</th>
                  <th>نقاط</th>
                  <th>حفظ</th>
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
                      <button className="btn-save" onClick={() => savePoints(u.userid, u.points)}>
                        حفظ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}