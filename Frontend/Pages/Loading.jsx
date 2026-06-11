import { useEffect, useRef, useState } from "react";

/* ─────────────── CSS ─────────────── */
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .gpc-overlay {
    position: fixed;
    inset: 0;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: "Google Sans", Roboto, Arial, sans-serif;
    z-index: 9999;
    transition: opacity 0.35s ease;
  }
  .gpc-overlay.fading { opacity: 0; pointer-events: none; }

  /* ── Logo ── */
  .gpc-logo {
    width: 108px;
    height: 108px;
    animation: popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes popIn {
    from { opacity:0; transform:scale(0.5); }
    to   { opacity:1; transform:scale(1); }
  }

  /* ── Track ── */
  .gpc-track {
    margin-top: 28px;
    width: 240px;
    height: 3px;
    border-radius: 3px;
    background: #e8eaed;
    overflow: hidden;
    position: relative;
    opacity: 0;
    animation: fadeIn 0.25s 0.5s ease forwards;
  }

  /* Indeterminate */
  .gpc-ind {
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    width: 30%;
    background: #1a73e8;
    border-radius: 3px;
    animation: ind1 1.6s cubic-bezier(0.65,0.815,0.735,0.395) infinite;
  }
  .gpc-ind::after {
    content: "";
    position: absolute;
    inset: 0;
    background: #1a73e8;
    animation: ind2 1.6s cubic-bezier(0.165,0.84,0.44,1) 0.8s infinite;
  }
  @keyframes ind1 {
    0%  { left:-35%;  width:35%;  }
    60% { left:100%;  width:100%; }
    to  { left:100%;  width:35%;  }
  }
  @keyframes ind2 {
    0%  { left:-200%; width:200%; }
    60% { left:107%;  width:1%; }
    to  { left:107%;  width:1%; }
  }

  /* Determinate */
  .gpc-det {
    position: absolute;
    inset: 0;
    background: #1a73e8;
    border-radius: 3px;
    transform-origin: left center;
    transition: transform 0.2s ease;
  }

  /* ── Label ── */
  .gpc-label {
    margin-top: 18px;
    font-size: 13px;
    color: #5f6368;
    letter-spacing: 0.01em;
    opacity: 0;
    animation: fadeIn 0.25s 0.55s ease forwards;
    min-height: 20px;
  }

  @keyframes fadeIn { to { opacity:1; } }

  /* ── Done screen (demo only) ── */
  .gpc-done {
    position: fixed;
    inset: 0;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-family: "Google Sans", Roboto, Arial, sans-serif;
    animation: fadeIn 0.35s ease;
  }
  .gpc-done h2 { font-size: 15px; font-weight: 500; color: #202124; }
  .gpc-done p  { font-size: 13px; color: #5f6368; }
  .gpc-reset {
    margin-top: 8px;
    padding: 9px 24px;
    border: 1px solid #dadce0;
    border-radius: 8px;
    background: #fff;
    color: #1a73e8;
    font-size: 13px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .gpc-reset:hover { background: #f1f3f4; }
`;

/* ─────────────── Logo ─────────────── */
function Logo() {
  return (
    <svg className="gpc-logo" viewBox="0 0 108 108" fill="none">
      <defs>
        <linearGradient id="gGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#4285f4" />
          <stop offset="100%" stopColor="#1557b0" />
        </linearGradient>
        <filter id="gShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5"
            floodColor="#1a73e8" floodOpacity="0.22" />
        </filter>
      </defs>
      <rect x="6" y="6" width="96" height="96" rx="22"
            fill="url(#gGrad)" filter="url(#gShadow)" />
      <path d="M36 30 L36 78 L78 54 Z" fill="white" opacity="0.95" />
      <rect x="36" y="67" width="42" height="5" rx="2.5"
            fill="white" opacity="0.30" />
    </svg>
  );
}

/* ─────────────── Checkmark ─────────────── */
function Checkmark() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24" fill="#e6f4ea" />
      <path d="M15 26 L23 34 L37 18"
        stroke="#34a853" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="30" strokeDashoffset="30"
        style={{ animation: "draw 0.4s 0.1s ease forwards" }}
      />
      <style>{`@keyframes draw { to { stroke-dashoffset:0; } }`}</style>
    </svg>
  );
}

/* ─────────────────────────────────────────
   How it works:
   ─────────────────────────────────────────
   1. PerformanceObserver watches every browser
      resource entry (scripts, CSS, fonts,
      images, favicon, XHR/fetch, etc.)
   2. document.readyState / window "load" event
      is the definitive "all done" signal.
   3. Estimated total = resources already in the
      DOM on mount (script[src], link[href], img).
   4. Progress bar fills as loaded / estimated.
   5. On window "load" → fade out → navigate "/".
───────────────────────────────────────────── */

const MIN_MS = 600;

export default function PlayConsoleLoader() {
  const [loaded,  setLoaded]  = useState(0);   // resources loaded so far
  const [total,   setTotal]   = useState(0);   // estimated total
  const [phase,   setPhase]   = useState("loading"); // loading | fading | done

  const doneRef   = useRef(false);
  const minRef    = useRef(false);
  const pageRef   = useRef(false);
  const loadedRef = useRef(0);

  /* ── navigate (or show done screen in iframe demo) ── */
  const finish = () => {
    if (doneRef.current) return;
    if (!minRef.current || !pageRef.current) return;
    doneRef.current = true;
    setPhase("fading");
    setTimeout(() => {
      if (window.self !== window.top) {
        setPhase("done");           // demo inside Claude artifact
      } else {
        window.location.href = "/"; // real app
      }
    }, 380);
  };

  useEffect(() => {
    /* ── 1. Minimum display time ── */
    const minTimer = setTimeout(() => {
      minRef.current = true;
      finish();
    }, MIN_MS);

    /* ── 2. Estimate total resources from DOM ── */
    const domResources =
      document.querySelectorAll(
        "script[src], link[rel=stylesheet], link[rel=icon]," +
        "link[rel='shortcut icon'], img[src], source[src]"
      ).length;

    // Add already-buffered performance entries
    const already = performance.getEntriesByType("resource").length;
    const estTotal = Math.max(domResources, already, 1);
    setTotal(estTotal);
    setLoaded(already);
    loadedRef.current = already;

    /* ── 3. PerformanceObserver — every browser resource ── */
    //  This fires for: JS, CSS, fonts, images, favicon,
    //  XHR, fetch, prefetch — everything shown in DevTools.
    let obs;
    try {
      obs = new PerformanceObserver((list) => {
        const n = list.getEntries().length;
        loadedRef.current += n;
        setLoaded(loadedRef.current);
        // Grow the estimated total if more resources appeared
        setTotal(t => Math.max(t, loadedRef.current));
      });
      obs.observe({ type: "resource", buffered: true });
    } catch (_) {
      // Safari < 14 fallback — just use window.load
    }

    /* ── 4. window "load" — fires when ALL resources done ── */
    //  (stylesheets, images, iframes, scripts, fonts…)
    const onLoad = () => {
      const final = performance.getEntriesByType("resource").length;
      loadedRef.current = final;
      setLoaded(final);
      setTotal(final);
      pageRef.current = true;
      finish();
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      clearTimeout(minTimer);
      window.removeEventListener("load", onLoad);
      obs?.disconnect();
    };
  }, []);

  /* ── Derived ── */
  const pct   = total > 0 ? Math.min(loaded / total, 1) : 0;
  const label = total > 0
    ? `Loading… ${loaded} / ${total} resources`
    : "Loading…";

  /* ── Done screen (demo only) ── */
  if (phase === "done") {
    return (
      <>
        <style>{CSS}</style>
        <div className="gpc-done">
          <Checkmark />
          <h2>Page fully loaded</h2>
          <p>{loaded} resources fetched → navigating to /</p>
          <button
            className="gpc-reset"
            onClick={() => {
              doneRef.current = false;
              minRef.current  = false;
              pageRef.current = false;
              loadedRef.current = 0;
              setPhase("loading");
              setLoaded(0);
              setTotal(0);
            }}
          >
            ↺ Replay
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className={`gpc-overlay${phase === "fading" ? " fading" : ""}`}>

        <Logo />

        <div className="gpc-track">
          {total === 0
            ? <div className="gpc-ind" />
            : <div className="gpc-det" style={{ transform: `scaleX(${pct})` }} />
          }
        </div>

        <p className="gpc-label">{label}</p>

      </div>
    </>
  );
}