import { useState, useEffect, useRef } from "react";
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
    const sessionUser = localStorage.getItem("user");
    if (!sessionUser) {
      window.location.href = "/login";
      return;
    }
    const parsed = JSON.parse(sessionUser);
    setUser(parsed);
    fetchLivePoints(parsed.userid);
    if (parsed.role === "admin") {
      setIsAdmin(true);
      loadAllUsers();
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

  // ✅ X-Admin-Token header added
  const fetchLivePoints = async (userid) => {
    try {
      const res = await fetch(
        `https://api.almaharat2.com/api/admin/get_points/${userid}`,
        { headers: { "X-Admin-Token": ADMIN_TOKEN } }
      );
      const data = await res.json();
      if (res.ok) {
        setUser((prev) => {
          const updated = { ...prev, points: data.points };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error("error points");
    }
  };

  // ✅ X-Admin-Token header added
  const loadAllUsers = async () => {
    try {
      const res = await fetch("https://api.almaharat2.com/api/admin/users", {
        headers: { "X-Admin-Token": ADMIN_TOKEN },
      });
      const data = await res.json();
      if (res.ok) setAllUsers(data);
    } catch (err) {
      console.error("error users");
    }
  };

  const handlePointChange = (userid, value) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.userid === userid ? { ...u, points: value } : u))
    );
  };

  // ✅ X-Admin-Token header added
  const savePoints = async (userid, points) => {
    try {
      const res = await fetch("https://api.almaharat2.com/api/admin/update_points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": ADMIN_TOKEN,
        },
        body: JSON.stringify({ userid, points }),
      });
      if (res.ok) {
        alert("تم الحفظ");
        if (user?.userid === userid) fetchLivePoints(userid);
        loadAllUsers();
      } else {
        alert("فشل الحفظ");
      }
    } catch (err) {
      console.error("server error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (!user) return <div className="loading">جاري الدخول...</div>;

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