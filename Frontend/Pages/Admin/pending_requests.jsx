import React, { useEffect, useState, useCallback } from "react";

/**
 * Admin panel: pending account verification requests.
 *
 * Talks to:
 *   GET  /api/admin/verificationrequests
 *   POST /api/admin/verificationrequests/<id>/approve
 *   POST /api/admin/verificationrequests/<id>/reject
 *
 * Drop <VerificationRequests /> anywhere in an authenticated admin route.
 * CSS is scoped with a "vr-" prefix and injected once via <style>, so this
 * file has no external stylesheet dependency.
 */

const API_BASE = "/api/admin/verificationrequests";
const ADMIN_TOKEN = "changeme"; // must match ADMIN_TOKEN on your Flask server

// Consistent "random" color per username, so the same person always gets
// the same fallback avatar color.
const AVATAR_COLORS = [
  "#5b8def", "#2fb673", "#e5595f", "#e5a15b", "#a06be0",
  "#3fb0c9", "#e05b9c", "#8bbf3f", "#e5c25b", "#6b7ae0",
];
function colorForName(name) {
  const str = (name || "?").toString();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Safely reads a response body as JSON. If the server returned HTML (a 404
// page, a login redirect, a 500 error page, etc.) this throws a clear error
// instead of letting `.json()` blow up with "Unexpected token '<'".
async function readJsonSafely(res) {
  const raw = await res.text();
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const looksLikeHtml = /^\s*</.test(raw);
    throw new Error(
      looksLikeHtml
        ? `الخادم أعاد صفحة HTML بدل JSON (كود ${res.status}). تأكد أن رابط الـ API صحيح وأن الجلسة مسجّلة دخول.`
        : `استجابة غير متوقعة من الخادم (كود ${res.status}).`
    );
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("تعذّر قراءة استجابة الخادم كـ JSON.");
  }
}

export default function VerificationRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // request_id -> "approve" | "reject" (tracks in-flight action per row)
  const [pendingAction, setPendingAction] = useState({});
  const [toast, setToast] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Admin-Token": ADMIN_TOKEN,
        },
      });
      const data = await readJsonSafely(res);
      if (!res.ok) {
        throw new Error(data?.error || `فشل التحميل (${res.status})`);
      }
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "تعذر تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDecision = async (requestId, decision) => {
    const endpoint = decision === "approve" ? "approve" : "reject";
    setPendingAction((prev) => ({ ...prev, [requestId]: decision }));
    try {
      const res = await fetch(`${API_BASE}/${requestId}/${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Admin-Token": ADMIN_TOKEN,
        },
      });
      const data = await readJsonSafely(res).catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء تنفيذ العملية");
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setToast({
        type: decision === "approve" ? "success" : "info",
        message:
          decision === "approve"
            ? "تم قبول الطلب وتوثيق الحساب."
            : "تم رفض الطلب.",
      });
    } catch (err) {
      setToast({ type: "error", message: err.message || "فشلت العملية" });
    } finally {
      setPendingAction((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    }
  };

  return (
    <div className="vr-root" dir="rtl">
      <VRStyles />

      <header className="vr-header">
        <div>
          <h1 className="vr-title">طلبات التوثيق</h1>
          <p className="vr-subtitle">
            راجع طلبات توثيق الحسابات المعلّقة واتخذ إجراءً بشأنها
          </p>
        </div>
        <button
          className="vr-refresh"
          onClick={fetchRequests}
          disabled={loading}
          aria-label="تحديث القائمة"
        >
          <RefreshIcon spinning={loading} />
          تحديث
        </button>
      </header>

      {error && (
        <div className="vr-banner vr-banner-error" role="alert">
          <span>{error}</span>
          <button className="vr-banner-retry" onClick={fetchRequests}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading && requests.length === 0 && !error ? (
        <div className="vr-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="vr-skeleton" key={i} />
          ))}
        </div>
      ) : !loading && requests.length === 0 && !error ? (
        <div className="vr-empty">
          <CheckAllIcon />
          <p className="vr-empty-title">لا توجد طلبات معلّقة</p>
          <p className="vr-empty-sub">
            جميع طلبات التوثيق تمت مراجعتها. عد لاحقًا للاطلاع على الجديد.
          </p>
        </div>
      ) : (
        <ul className="vr-list">
          {requests.map((req) => {
            const action = pendingAction[req.id];
            const isBusy = Boolean(action);
            const displayName = req.username || `مستخدم #${req.userid}`;
            return (
              <li className="vr-card" key={req.id}>
                <div className="vr-card-main">
                  <Avatar
                    name={displayName}
                    src={req.profile_picture}
                    userId={req.userid}
                  />
                  <div className="vr-info">
                    <p className="vr-name">{displayName}</p>
                    <p className="vr-meta">
                      رقم المستخدم: {req.userid}
                      {req.submitted_at ? ` · ${formatDate(req.submitted_at)}` : ""}
                    </p>
                    {req.email && <p className="vr-email">{req.email}</p>}
                    {req.note && <p className="vr-note">{req.note}</p>}
                  </div>
                </div>

                <div className="vr-actions">
                  <button
                    className="vr-btn vr-btn-reject"
                    onClick={() => handleDecision(req.id, "reject")}
                    disabled={isBusy}
                  >
                    {action === "reject" ? <Spinner /> : "رفض"}
                  </button>
                  <button
                    className="vr-btn vr-btn-accept"
                    onClick={() => handleDecision(req.id, "approve")}
                    disabled={isBusy}
                  >
                    {action === "approve" ? <Spinner /> : "قبول"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toast && (
        <div className={`vr-toast vr-toast-${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}

/**
 * Profile avatar: shows the user's picture when `profile_picture` is a
 * non-empty path/URL. If it's missing/empty, or the image fails to load,
 * falls back to a colored circle with the first character of the username.
 * Clicking it navigates to /<userId>.
 */
function Avatar({ name, src, userId }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = Boolean(src) && !imgFailed;
  const initial = (name || "?").toString().trim().charAt(0).toUpperCase();

  const goToProfile = () => {
    if (userId === undefined || userId === null) return;
    window.location.href = `/${userId}`;
  };

  const commonProps = {
    className: `vr-avatar${hasImage ? " vr-avatar-img" : ""} vr-avatar-clickable`,
    onClick: goToProfile,
    role: "button",
    tabIndex: 0,
    "aria-label": `عرض الملف الشخصي لـ ${name}`,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goToProfile();
      }
    },
  };

  if (hasImage) {
    return (
      <img
        {...commonProps}
        src={src}
        alt={name}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div {...commonProps} style={{ background: colorForName(name) }}>
      {initial}
    </div>
  );
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function Spinner() {
  return <span className="vr-spinner" aria-hidden="true" />;
}

function RefreshIcon({ spinning }) {
  return (
    <svg
      className={`vr-icon${spinning ? " vr-icon-spin" : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function CheckAllIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7.5 7.5L13 16" />
    </svg>
  );
}

function VRStyles() {
  return (
    <style>{`
      .vr-root {
        --vr-bg: #0f1115;
        --vr-surface: #171a21;
        --vr-surface-2: #1e222b;
        --vr-border: #2a2f3a;
        --vr-text: #e8eaed;
        --vr-text-dim: #9aa1ac;
        --vr-accent: #5b8def;
        --vr-accept: #2fb673;
        --vr-accept-hover: #27a065;
        --vr-reject: #e5595f;
        --vr-reject-hover: #d24851;
        --vr-radius: 14px;
        font-family: "Segoe UI", Tahoma, "IBM Plex Sans Arabic", system-ui, sans-serif;
        background: var(--vr-bg);
        color: var(--vr-text);
        min-height: 100%;
        padding: 32px 24px 80px;
        box-sizing: border-box;
      }
      .vr-root * { box-sizing: border-box; }

      .vr-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        max-width: 760px;
        margin: 0 auto 28px;
      }
      .vr-title {
        margin: 0 0 4px;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .vr-subtitle {
        margin: 0;
        color: var(--vr-text-dim);
        font-size: 14px;
      }
      .vr-refresh {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--vr-surface);
        border: 1px solid var(--vr-border);
        color: var(--vr-text);
        padding: 9px 14px;
        border-radius: 10px;
        font-size: 13px;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
        white-space: nowrap;
      }
      .vr-refresh:hover:not(:disabled) {
        background: var(--vr-surface-2);
        border-color: #394152;
      }
      .vr-refresh:disabled { opacity: 0.6; cursor: default; }

      .vr-icon { display: block; }
      .vr-icon-spin { animation: vr-spin 0.9s linear infinite; }

      .vr-banner {
        max-width: 760px;
        margin: 0 auto 20px;
        padding: 12px 16px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 14px;
      }
      .vr-banner-error {
        background: rgba(229, 89, 95, 0.12);
        border: 1px solid rgba(229, 89, 95, 0.35);
        color: #f3a6a9;
      }
      .vr-banner-retry {
        background: transparent;
        border: 1px solid currentColor;
        color: inherit;
        border-radius: 8px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
      }

      .vr-list {
        list-style: none;
        margin: 0 auto;
        padding: 0;
        max-width: 760px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .vr-card {
        background: var(--vr-surface);
        border: 1px solid var(--vr-border);
        border-radius: var(--vr-radius);
        padding: 16px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        transition: border-color 0.15s ease, transform 0.15s ease;
      }
      .vr-card:hover { border-color: #394152; }

      .vr-card-main {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }
      .vr-avatar {
        flex: none;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
        color: #0f1115;
        object-fit: cover;
      }
      .vr-avatar-img {
        color: transparent;
        background: var(--vr-surface-2);
        border: 1px solid var(--vr-border);
      }
      .vr-avatar-clickable {
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .vr-avatar-clickable:hover {
        transform: scale(1.06);
        box-shadow: 0 0 0 3px rgba(91, 141, 239, 0.35);
      }
      .vr-avatar-clickable:focus-visible {
        outline: 2px solid var(--vr-accent);
        outline-offset: 2px;
      }
      .vr-info { min-width: 0; }
      .vr-name {
        margin: 0 0 2px;
        font-size: 15px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .vr-meta {
        margin: 0;
        font-size: 12.5px;
        color: var(--vr-text-dim);
      }
      .vr-email {
        margin: 3px 0 0;
        font-size: 12.5px;
        color: var(--vr-accent);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 320px;
      }
      .vr-note {
        margin: 6px 0 0;
        font-size: 12.5px;
        color: var(--vr-text-dim);
        background: var(--vr-surface-2);
        border-radius: 8px;
        padding: 6px 10px;
        max-width: 420px;
      }

      .vr-actions {
        display: flex;
        gap: 8px;
        flex: none;
      }
      .vr-btn {
        min-width: 84px;
        padding: 9px 16px;
        border-radius: 10px;
        border: 1px solid transparent;
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, transform 0.05s ease;
        color: #0b0d11;
      }
      .vr-btn:active:not(:disabled) { transform: scale(0.97); }
      .vr-btn:disabled { opacity: 0.7; cursor: default; }
      .vr-btn:focus-visible {
        outline: 2px solid var(--vr-accent);
        outline-offset: 2px;
      }

      .vr-btn-accept { background: var(--vr-accept); }
      .vr-btn-accept:hover:not(:disabled) { background: var(--vr-accept-hover); }

      .vr-btn-reject { background: var(--vr-reject); }
      .vr-btn-reject:hover:not(:disabled) { background: var(--vr-reject-hover); }

      .vr-spinner {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(11, 13, 17, 0.35);
        border-top-color: #0b0d11;
        animation: vr-spin 0.7s linear infinite;
      }

      .vr-loading {
        max-width: 760px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .vr-skeleton {
        height: 74px;
        border-radius: var(--vr-radius);
        background: linear-gradient(
          100deg,
          var(--vr-surface) 30%,
          var(--vr-surface-2) 50%,
          var(--vr-surface) 70%
        );
        background-size: 200% 100%;
        animation: vr-shimmer 1.4s ease-in-out infinite;
        border: 1px solid var(--vr-border);
      }

      .vr-empty {
        max-width: 420px;
        margin: 48px auto 0;
        text-align: center;
        color: var(--vr-text-dim);
      }
      .vr-empty svg { color: var(--vr-accept); margin-bottom: 12px; }
      .vr-empty-title {
        margin: 0 0 6px;
        color: var(--vr-text);
        font-size: 16px;
        font-weight: 600;
      }
      .vr-empty-sub { margin: 0; font-size: 13.5px; line-height: 1.6; }

      .vr-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 11px 20px;
        border-radius: 10px;
        font-size: 13.5px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        z-index: 50;
        animation: vr-toast-in 0.2s ease-out;
      }
      .vr-toast-success { background: var(--vr-accept); color: #0b0d11; }
      .vr-toast-info { background: var(--vr-surface-2); color: var(--vr-text); border: 1px solid var(--vr-border); }
      .vr-toast-error { background: var(--vr-reject); color: #fff; }

      @keyframes vr-spin { to { transform: rotate(360deg); } }
      @keyframes vr-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @keyframes vr-toast-in {
        from { opacity: 0; transform: translate(-50%, 8px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .vr-icon-spin, .vr-spinner, .vr-skeleton, .vr-toast { animation: none; }
      }

      @media (max-width: 520px) {
        .vr-card { flex-direction: column; align-items: stretch; }
        .vr-actions { justify-content: flex-end; }
      }
    `}</style>
  );
}