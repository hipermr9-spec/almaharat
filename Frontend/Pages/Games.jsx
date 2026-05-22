import { useState, useEffect } from "react";
import "./App.css";
import { useNavigate } from "react-router-dom";

export default function Games() {
  const navigate = useNavigate();
  const [user, setUser]         = useState(null);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setIsAdmin(parsed.role === "admin");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

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
              <a href="/admin/admin_home">لوحة المشرف 🧑‍💼</a>
            </li>
          )}
        </ul>
        <div className="nav-footer">
          <button onClick={handleLogout} className="btn-logout">تسجيل خروج</button>
        </div>
      </nav>

      <main className="home-content">
        <header className="welcome-box">
          <h1>مرحبا بك في قسم الألعاب 🎮</h1>
        </header>

        {/* ── Section: Geometric Games ── */}
        <h2 className="games-title">العاب الأشكال الهندسية</h2>
        <div className="games-grid">
          <div className="game-card">
            <h2>لعبة الثنائي الأبعاد و ثلاثي الأبعاد 🧩</h2>
            <p>اكتشف عالم الأشكال الهندسية من خلال لعبتنا الممتعة! قم بتحليل الأشكال وحل التحديات لتعزيز مهاراتك.</p>
            <button className="btn-play" onClick={() => window.location.href = "https://learn-geo-arabic.lovable.app"}>
              ابدأ اللعب ▶
            </button>
          </div>

          <div className="game-card">
            <h2>🧩 لعبة تفاعلية على شبكة المربعات</h2>
            <p>اكتشف عالم الأشكال الهندسية من خلال لعبتنا الممتعة! قم بتحليل الأشكال وحل التحديات لتعزيز مهاراتك.</p>
            <button className="btn-play" onClick={() => window.location.href = "https://symmetry-sketch-play.lovable.app"}>
              ابدأ اللعب ▶
            </button>
          </div>
        </div> {/* ✅ closed before the next section */}

        {/* ── Section: Fractions Games ── */}
        <h2 className="games-title">العاب الكسور الأعتيادية</h2>
        <div className="games-grid">
          <div className="game-card">
            <h2>لعبة الكسور الأعتيادية فراشة 🧩</h2>
            <p>اكتشف عالم الكسور الأعتيادية من خلال لعبتنا الممتعة! قم بتحليل الكسور وحل التحديات لتعزيز مهاراتك.</p>
            <button className="btn-play" onClick={() => window.location.href = "https://butterfly-fractions-game.lovable.app/"}>
              ابدأ اللعب ▶
            </button>
          </div>
          <div className="game-card">
            <h2>جمع وطرح الكسور المتشابهة 🧩</h2>
            <p>اكتشف عالم الكسور الأعتيادية من خلال لعبتنا الممتعة! قم بتحليل الكسور وحل التحديات لتعزيز مهاراتك.</p>
            <button className="btn-play" onClick={() => window.location.href = "https://colorful-fractions-game.lovable.app/"}>
              ابدأ اللعب ▶
            </button>
          </div>
          <div className="game-card">
            <h2>تحويل العدد الكسري إلى كسر غير فعلي 🧩</h2>
            <p>اكتشف عالم الكسور الأعتيادية من خلال لعبتنا الممتعة! قم بتحليل الكسور وحل التحديات لتعزيز مهاراتك.</p>
            <button className="btn-play" onClick={() => window.location.href = "https://fraction-magic-play.lovable.app/"}>
              ابدأ اللعب ▶
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}