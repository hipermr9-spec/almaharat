import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import cookies from "js-cookie";
import "./App.css";

export default function Enrichments() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // جلب البيانات من السيرفر
  useEffect(() => {
    fetch("https://api.almaharat2.com/api/enrichments")
      .then(res => res.json())
      .then(res => {
        if (Array.isArray(res)) {
          setData(res);
        }
      })
      .catch(err => console.error("Error fetching data:", err));
  }, []);

  // التحقق من الجلسة والصلاحيات
  useEffect(() => {
    const sessionUser = Cookies.get("DONT-SHARE-THAT-COOKIE");
    if (!sessionUser) {
      navigate("/login");
      return;
    }
    
    try {
      const parsed = JSON.parse(sessionUser);
      setUser(parsed);
      if (parsed.role === "admin") {
        setIsAdmin(true);
      }
    } catch (e) {
      console.error("Error parsing user session");
    }
  }, [navigate]);

  const handleLogout = () => {
    Cookies.remove("DONT-SHARE-THAT-COOKIE");
    navigate("/login");
  };

  return (
    <div className="enrichments-page">
      {/* 🍔 زر البرجر - يظهر فقط في الشاشات الصغيرة */}
      <button 
        className={`burger-btn ${menuOpen ? "open" : ""}`} 
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle Menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* 🧭 القائمة الجانبية */}
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

      {/* 📦 المحتوى الرئيسي */}
      <main className="container">
        <h1 className="title">Enrichments</h1>

        <div className="grid">
          {data.length > 0 ? (
            data.map(item => (
              <div
                key={item.id}
                className="card"
                onClick={() => navigate(`/enrichments/${item.id}`)}
              >
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <span className="type">{item.type}</span>
              </div>
            ))
          ) : (
            <div className="no-data-container">
              <p className="no-data">لا توجد إثراءات متاحة حالياً. يرجى العودة لاحقاً! 🌟</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}