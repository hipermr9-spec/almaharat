import { useState, useEffect, useRef } from "react";

/* ─── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  bg:        "#080B18",
  surface:   "#0F1324",
  card:      "#161B30",
  cardHover: "#1C2340",
  border:    "#242944",
  purple:    "#7C6BF8",
  purpleGlow:"rgba(124,107,248,0.18)",
  mint:      "#3EEAB0",
  mintGlow:  "rgba(62,234,176,0.14)",
  amber:     "#F5A623",
  red:       "#F06B6B",
  textPrimary:   "#EDF0FF",
  textSecondary: "#7A82AA",
  textMuted:     "#49516B",
};

/* ─── Section data ────────────────────────────────────────────────────────── */
const SECTIONS = [
  { id: "overview",    label: "Overview",            icon: "◈" },
  { id: "collect",     label: "Data We Collect",     icon: "⊕" },
  { id: "use",         label: "How We Use It",       icon: "⊙" },
  { id: "storage",     label: "Storage & Security",  icon: "⊛" },
  { id: "thirdparty",  label: "Third Parties",       icon: "⊗" },
  { id: "rights",      label: "Your Rights",         icon: "⊜" },
  { id: "children",    label: "Children",            icon: "⊝" },
  { id: "changes",     label: "Policy Changes",      icon: "⊞" },
  { id: "contact",     label: "Contact",             icon: "⊟" },
];

const DATA_POINTS = [
  { name: "Email Address",       purpose: "Account auth",         stored: "Encrypted", required: true  },
  { name: "App Usage Patterns",  purpose: "Improve features",     stored: "Anonymised",required: false },
  { name: "Subscription Names",  purpose: "Core functionality",   stored: "On-device", required: true  },
  { name: "Billing Amounts",     purpose: "Spending insights",    stored: "On-device", required: true  },
  { name: "Renewal Dates",       purpose: "Core functionality",   stored: "On-device", required: true  },
  { name: "Device Identifiers",  purpose: "Crash diagnostics",    stored: "Anonymised",required: false },
];

const RIGHTS = [
  { right: "Access",  desc: "Request a copy of all data we hold about you",       color: T.mint   },
  { right: "Rectify", desc: "Correct inaccurate or incomplete data at any time",   color: T.purple },
  { right: "Erase",   desc: "Delete your account and all associated data",         color: T.amber  },
  { right: "Restrict",desc: "Limit how we process your data in certain scenarios", color: "#B06BF8"},
  { right: "Portability", desc: "Export your subscription data in JSON format",    color: T.mint   },
  { right: "Object",  desc: "Opt out of analytics and non-essential processing",   color: T.red    },
];

/* ─── Tiny hook: track active section ────────────────────────────────────── */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map(id => document.getElementById(id)).filter(Boolean);
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return [active, setActive];
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function Tag({ children, color = T.purple }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      background: color + "22",
      color: color,
      border: `1px solid ${color}44`,
    }}>{children}</span>
  );
}

function SectionCard({ id, accent = T.purple, title, children }) {
  return (
    <section id={id} style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 20,
      position: "relative",
      scrollMarginTop: 100,
    }}>
      {/* left accent rail */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        background: `linear-gradient(180deg, ${accent}, ${accent}44)`,
      }} />
      <div style={{ padding: "32px 36px 32px 44px" }}>
        <h2 style={{
          margin: "0 0 24px",
          fontSize: 20,
          fontWeight: 700,
          color: T.textPrimary,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: accent + "22",
            border: `1px solid ${accent}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, color: accent,
          }}>
            {SECTIONS.find(s => s.id === id)?.icon}
          </span>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function P({ children, style }) {
  return (
    <p style={{
      margin: "0 0 16px",
      fontSize: 15,
      lineHeight: 1.75,
      color: T.textSecondary,
      ...style,
    }}>{children}</p>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function PrivacyPolicy() {
  const ids = SECTIONS.map(s => s.id);
  const [active, setActive] = useActiveSection(ids);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: T.bg,
      minHeight: "100vh",
      color: T.textPrimary,
      overflowX: "hidden",
    }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── Top nav bar ─────────────────────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(8,11,24,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? `1px solid ${T.border}` : "1px solid transparent",
        transition: "all 0.3s ease",
        padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.purple}, #B06BF8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#fff",
            boxShadow: `0 4px 20px ${T.purpleGlow}`,
          }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>SubTrack</span>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 99,
          padding: "5px 14px",
        }}>
          <span style={{ fontSize: 12, color: T.mint }}>●</span>
          <span style={{ fontSize: 13, color: T.textSecondary, fontWeight: 500 }}>Privacy Policy</span>
        </div>

        <div style={{ fontSize: 12, color: T.textMuted }}>
          Effective: January 1, 2025
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        paddingTop: 140,
        paddingBottom: 80,
        textAlign: "center",
        overflow: "hidden",
      }}>
        {/* radial glow behind hero */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400,
          background: `radial-gradient(ellipse at 50% 0%, ${T.purpleGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Shield icon */}
        <div style={{
          width: 90, height: 90, borderRadius: 24,
          background: `linear-gradient(145deg, ${T.purple}33, ${T.purpleGlow})`,
          border: `1px solid ${T.purple}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40, margin: "0 auto 28px",
          boxShadow: `0 0 60px ${T.purpleGlow}, 0 0 120px ${T.purpleGlow}`,
          animation: "pulse 3s ease-in-out infinite",
        }}>🛡️</div>

        <div style={{ marginBottom: 12 }}>
          <Tag color={T.mint}>Privacy Policy</Tag>
        </div>

        <h1 style={{
          fontSize: "clamp(32px, 5vw, 56px)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          margin: "16px auto",
          lineHeight: 1.1,
          maxWidth: 700,
          background: `linear-gradient(135deg, ${T.textPrimary} 0%, ${T.textSecondary} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Your data stays<br />
          <span style={{
            background: `linear-gradient(90deg, ${T.purple}, ${T.mint})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>exactly where you put it.</span>
        </h1>

        <p style={{
          fontSize: 17, color: T.textSecondary, maxWidth: 520,
          margin: "0 auto 36px", lineHeight: 1.7,
        }}>
          SubTrack is built on a simple principle: your subscriptions are your business.
          We collect only what we need, store it securely, and never sell it.
        </p>

        {/* Stats row */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 16,
          flexWrap: "wrap", padding: "0 24px",
        }}>
          {[
            { val: "0",     label: "Data sold",      color: T.mint   },
            { val: "AES-256", label: "Encryption",   color: T.purple },
            { val: "GDPR",  label: "Compliant",       color: T.amber  },
            { val: "0",     label: "Third-party ads", color: T.mint  },
          ].map(s => (
            <div key={s.val} style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: "14px 22px",
              textAlign: "center",
              minWidth: 110,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: "-0.02em" }}>
                {s.val}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body: sidebar + content ──────────────────────────────────────── */}
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: "0 24px 80px",
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: 32,
        alignItems: "start",
      }}>
        {/* Sidebar nav */}
        <nav style={{
          position: "sticky", top: 80,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          padding: "16px 12px",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted,
            letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 8px 10px" }}>
            Sections
          </div>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 10px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontSize: 13,
              fontWeight: active === s.id ? 600 : 400,
              color: active === s.id ? T.purple : T.textSecondary,
              background: active === s.id ? T.purpleGlow : "transparent",
              transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 12 }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ paddingTop: 0 }}>

          {/* 1. Overview */}
          <SectionCard id="overview" accent={T.purple} title="Overview">
            <P>
              This Privacy Policy explains how <strong style={{ color: T.textPrimary }}>SubTrack</strong> ("<strong style={{ color: T.textPrimary }}>we</strong>", "<strong style={{ color: T.textPrimary }}>our</strong>") collects, uses, and protects your personal information when you use our Android application.
            </P>
            <P>
              We are committed to transparency. This document tells you exactly what data we touch, why we touch it, and how we keep it safe. If you have questions, our contact details are at the bottom.
            </P>
            <div style={{
              background: T.purpleGlow,
              border: `1px solid ${T.purple}44`,
              borderRadius: 12, padding: "16px 20px",
              fontSize: 14, color: T.textSecondary, lineHeight: 1.7,
            }}>
              💡 <strong style={{ color: T.textPrimary }}>TL;DR:</strong> SubTrack works primarily on-device. Your subscription data never leaves your phone unless you explicitly use cloud backup. We do not show ads, sell data, or profile you.
            </div>
          </SectionCard>

          {/* 2. Data We Collect */}
          <SectionCard id="collect" accent={T.mint} title="Data We Collect">
            <P>We collect the minimum data necessary to run SubTrack. Here is every data point — no small print.</P>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Data Point", "Purpose", "Where Stored", "Required"].map(h => (
                      <th key={h} style={{
                        textAlign: "left", fontSize: 11,
                        fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: T.textMuted,
                        padding: "0 12px 12px 0",
                        borderBottom: `1px solid ${T.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DATA_POINTS.map((d, i) => (
                    <tr key={i} style={{
                      borderBottom: `1px solid ${T.border}22`,
                    }}>
                      <td style={{ padding: "14px 12px 14px 0", fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
                        {d.name}
                      </td>
                      <td style={{ padding: "14px 12px 14px 0", fontSize: 13, color: T.textSecondary }}>
                        {d.purpose}
                      </td>
                      <td style={{ padding: "14px 12px 14px 0" }}>
                        <Tag color={d.stored === "On-device" ? T.mint : d.stored === "Encrypted" ? T.purple : T.amber}>
                          {d.stored}
                        </Tag>
                      </td>
                      <td style={{ padding: "14px 0 14px 0" }}>
                        <span style={{ color: d.required ? T.textMuted : T.mint, fontSize: 13 }}>
                          {d.required ? "Yes" : "Optional"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* 3. How We Use It */}
          <SectionCard id="use" accent="#B06BF8" title="How We Use It">
            <P>We use your data only for purposes you would expect from a subscription tracker:</P>
            {[
              ["Core app functionality", "Displaying your subscriptions, tracking renewal dates, and calculating spending totals.", "#B06BF8"],
              ["Account authentication", "Verifying your identity when you sign in so only you can access your data.", T.purple],
              ["Spending analytics", "Generating on-device reports and insights about your subscription spend.", T.mint],
              ["App improvement", "Anonymised, aggregated crash reports help us fix bugs. We cannot identify you from this data.", T.amber],
            ].map(([title, desc, color]) => (
              <div key={title} style={{
                display: "flex", gap: 14, marginBottom: 16,
                padding: "14px 16px",
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
              }}>
                <div style={{ width: 6, minWidth: 6, borderRadius: 99, background: color, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
            <P style={{ marginTop: 8 }}>We will <strong style={{ color: T.textPrimary }}>never</strong> use your data for advertising profiling, sell it to third parties, or share it with employers or financial institutions.</P>
          </SectionCard>

          {/* 4. Storage & Security */}
          <SectionCard id="storage" accent={T.amber} title="Storage & Security">
            <P>
              Subscription data is stored locally on your device using Android's encrypted datastore. If you enable cloud backup, data is synced to your personal Google Drive or our encrypted cloud (your choice), protected with AES-256 encryption at rest and TLS 1.3 in transit.
            </P>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "20px 0" }}>
              {[
                { icon: "🔒", title: "AES-256 Encryption", desc: "All stored data is encrypted at rest." },
                { icon: "🔐", title: "TLS 1.3 Transit",    desc: "Data in transit uses modern protocols only." },
                { icon: "🗄️", title: "Minimal Retention",  desc: "Deleted data is purged within 30 days." },
                { icon: "🔑", title: "Your Keys",          desc: "Cloud backups are encrypted with your credentials." },
              ].map(c => (
                <div key={c.title} style={{
                  background: T.bg, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: "16px",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              ))}
            </div>
            <P>We retain account data for as long as your account is active. If you delete your account, all server-side data is permanently removed within 30 days.</P>
          </SectionCard>

          {/* 5. Third Parties */}
          <SectionCard id="thirdparty" accent={T.red} title="Third Parties">
            <P>SubTrack uses a small number of carefully selected third-party services. We do not share identifiable personal data beyond what is necessary for each service to function.</P>
            {[
              { name: "Firebase Crashlytics", role: "Crash reporting", data: "Anonymised device info", link: "https://firebase.google.com/docs/crashlytics" },
              { name: "Google Play Billing",  role: "In-app purchases", data: "Purchase tokens only",  link: "https://developer.android.com/google/play/billing" },
              { name: "Google Drive (opt-in)",role: "Cloud backup",    data: "Your encrypted backup", link: "https://policies.google.com/privacy" },
            ].map(tp => (
              <div key={tp.name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px", marginBottom: 10,
                background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12,
                flexWrap: "wrap", gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>{tp.name}</div>
                  <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>{tp.role} · {tp.data}</div>
                </div>
                <Tag color={T.textMuted}>Privacy Policy ↗</Tag>
              </div>
            ))}
            <P style={{ marginTop: 8 }}>
              We do not integrate any advertising SDKs, social media trackers, or data broker APIs.
            </P>
          </SectionCard>

          {/* 6. Your Rights */}
          <SectionCard id="rights" accent={T.mint} title="Your Rights">
            <P>Depending on your region, you have the following rights under GDPR, CCPA, and similar regulations:</P>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {RIGHTS.map(r => (
                <div key={r.right} style={{
                  background: T.bg, border: `1px solid ${r.color}33`,
                  borderRadius: 12, padding: "16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: r.color + "22",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: r.color,
                    }}>
                      {r.right[0]}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>Right to {r.right}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              ))}
            </div>
            <P style={{ marginTop: 20 }}>
              To exercise any of these rights, contact us at <strong style={{ color: T.purple }}>privacy@subtrack.app</strong>. We respond to all requests within 30 days.
            </P>
          </SectionCard>

          {/* 7. Children */}
          <SectionCard id="children" accent={T.amber} title="Children's Privacy">
            <P>
              SubTrack is not directed at children under the age of 13. We do not knowingly collect personal information from anyone under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <strong style={{ color: T.purple }}>privacy@subtrack.app</strong>.
            </P>
            <P>
              Upon verification, we will delete any such information from our systems within 14 days.
            </P>
          </SectionCard>

          {/* 8. Policy Changes */}
          <SectionCard id="changes" accent="#7C6BF8" title="Policy Changes">
            <P>
              We may update this Privacy Policy from time to time. When we make material changes, we will notify you via an in-app notification and update the effective date at the top of this page.
            </P>
            <P>
              Your continued use of SubTrack after changes take effect constitutes acceptance of the revised policy. We encourage you to review this page periodically.
            </P>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: T.purpleGlow, border: `1px solid ${T.purple}33`,
              borderRadius: 12, padding: "14px 18px", fontSize: 13,
            }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <div>
                <div style={{ fontWeight: 600, color: T.textPrimary, marginBottom: 2 }}>Version history</div>
                <div style={{ color: T.textSecondary }}>January 1, 2025 — Initial policy published.</div>
              </div>
            </div>
          </SectionCard>

          {/* 9. Contact */}
          <SectionCard id="contact" accent={T.mint} title="Contact">
            <P>If you have any questions about this Privacy Policy or your data, we want to hear from you.</P>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { icon: "✉️", label: "Privacy inquiries", value: "privacy@subtrack.app",   color: T.purple },
                { icon: "📧", label: "General support",   value: "support@subtrack.app",   color: T.mint   },
                { icon: "🌐", label: "Website",           value: "www.subtrack.app",         color: T.amber  },
                { icon: "📍", label: "Developer",         value: "SubTrack Inc.",            color: T.textSecondary },
              ].map(c => (
                <div key={c.label} style={{
                  background: T.bg, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: "16px",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase",
                    letterSpacing: "0.08em", fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${T.border}`,
        background: T.surface,
        padding: "28px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.purple}, #B06BF8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
          }}>S</div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>SubTrack</span>
          <span style={{ color: T.textMuted, fontSize: 13 }}>Privacy Policy · Effective January 1, 2025</span>
        </div>
        <div style={{ fontSize: 12, color: T.textMuted }}>
          © {new Date().getFullYear()} SubTrack. All rights reserved.
        </div>
      </footer>

      {/* ── Keyframes ───────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 60px ${T.purpleGlow}, 0 0 120px ${T.purpleGlow}; }
          50%       { box-shadow: 0 0 80px ${T.purple}44, 0 0 160px ${T.purple}22; }
        }

        /* Responsive: collapse sidebar on small screens */
        @media (max-width: 760px) {
          div[style*="grid-template-columns: 220px"] {
            grid-template-columns: 1fr !important;
          }
          nav[style*="sticky"] {
            display: none !important;
          }
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}