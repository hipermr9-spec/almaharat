import { useState, useEffect } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL ?? "https://api.almaharat2.com";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (    
    <div className="home">
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-logo">تعزيز المهارات ✨</div>
        <div className="nav-buttons">
          <button className="btn-login" onClick={() => window.location.href="/login"}>تسجيل الدخول</button>
          <button className="btn-signup" onClick={() => window.location.href="/register"}>إنشاء حساب</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge">🚀 منصة تعليمية متكاملة</div>
        <h1 className="hero-title">طريقك نحو <span>التميز</span><br />وتطوير المهارات</h1>
        <p className="hero-desc">منصة تفاعلية تساعدك على تعزيز مهاراتك من خلال أسئلة متنوعة ومحتوى تعليمي مميز</p>
        <div className="hero-cta">
          <button className="btn-main" onClick={() => window.location.href="/register"}>ابدأي الآن 🎯</button>
          <button className="btn-outline" onClick={() => window.location.href="/login"}>سجلي دخولك</button>
        </div>
      </section>

      <div className="stats">
        {[
          { num: "500+", label: "سؤال تفاعلي" },
          { num: "1000+", label: "طالبة مسجلة" },
          { num: "98%", label: "نسبة الرضا" },
          { num: "24/7", label: "متاح دائماً" },
        ].map((s, i) => (
          <div className="stat" key={i}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="features">
        <h2 className="section-title">لماذا <span>تعزيز المهارات؟</span></h2>
        <div className="features-grid">
          {[
            { icon: "❓", title: "بنك الأسئلة", desc: "أسئلة تفاعلية مصنفة حسب المستوى والصعوبة" },
            { icon: "📚", title: "محتوى تعليمي", desc: "مقالات وشروحات تعليمية متجددة" },
            { icon: "🏆", title: "مسابقات", desc: "تحديات دورية وجوائز خاصة" },
            { icon: "📊", title: "تتبع التقدم", desc: "إحصائيات تعرض تقدمك بشكل واضح" },
            { icon: "💬", title: "منشورات", desc: "تفاعلي مع زميلاتك بالتعليقات" },
            { icon: "🌙", title: "وضع ليلي", desc: "تصفحي براحة في أي وقت" },
          ].map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="about">
        <div className="about-img-container">
          <div className="about-img">📖</div>
          <div className="about-floating">
            <strong>+500</strong>
            <span>سؤال متاح الآن</span>
          </div>
        </div>
        <div className="about-text">
          <h2>منصة صُممت <span className="gradient-text">خصيصاً</span> لك</h2>
          <p>تعزيز المهارات منصة تعليمية تفاعلية تهدف لمساعدة الطالبات على تطوير قدراتهن.</p>
          <p>بيئة تعلم ممتعة وفعّالة من خلال أسئلة ومحتوى متنوع.</p>
          <button className="btn-main" onClick={() => window.location.href="/login"}>انضمي الآن 🚀</button>
        </div>
      </section>

      <div className="cta-section">
        <h2>جاهزة للبدء؟ 🎯</h2>
        <p>انضمي لآلاف الطالبات وابدأي رحلتك اليوم</p>
        <button className="btn-main" onClick={() => window.location.href="/register"}>أنشئي حسابك مجاناً ✨</button>
      </div>

      <footer className="footer">
        <p>© 2026 تعزيز المهارات أ/شيخه حامد — صُنع بـ ❤️</p>
      </footer>
    </div>
  );
}