import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import "./App.css";

const BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.almaharat2.com";

// Arabic labels for each requirement key returned by the backend's
// _check_requirements(), so a failed submission can show exactly what's missing.
const REQUIREMENT_LABELS = {
  has_email:            "ربط بريد إلكتروني بالحساب",
  has_10_followers:     "الحصول على 10 متابعين على الأقل",
  is_active_learner:    "إكمال 5 دروس على الأقل",
  has_enough_points:    "الحصول على 50 نقطة على الأقل",
  positive_interaction: "عدم وجود مخالفات مؤكدة",
  follows_policies:     "عدم حظر الحساب",
  no_policy_violations: "عدم وجود مخالفات نشطة",
};

export default function SendRequest({ userData }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking"); // checking | idle | already | pending_check | submitting | sent | error
  const [pageMessage, setPageMessage] = useState("");
  const [failedChecks, setFailedChecks] = useState([]);

  useEffect(() => {
    const stored = Cookies.get("user") || Cookies.get("DONT-SHARE-THAT-COOKIE");
    const currentUser = userData || (stored ? JSON.parse(stored) : null);
    setUser(currentUser);

    if (!currentUser) {
      setStatus("error");
      setPageMessage("لم يتم العثور على المستخدم. الرجاء تسجيل الدخول.");
      return;
    }

    // Check current verification status / requirements up front, so the
    // page can show "already verified" or a list of missing requirements
    // before the person even tries to submit.
    const checkStatus = async () => {
      try {
        const res = await fetch(
          `${BASE}/api/checkrequirements?userid=${encodeURIComponent(currentUser.userid)}`
        );
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setPageMessage(data.error || "تعذر التحقق من الحالة.");
          return;
        }

        if (data.already_verified) {
          setStatus("already");
          setPageMessage(data.message || "حسابك موثق بالفعل ✅");
          return;
        }

        if (!data.requirements_met) {
          const missing = Object.entries(data.checks || {})
            .filter(([, ok]) => !ok)
            .map(([key]) => REQUIREMENT_LABELS[key] || key);
          setFailedChecks(missing);
          setStatus("pending_check");
          return;
        }

        setStatus("idle");
      } catch (err) {
        console.error(err);
        setStatus("error");
        setPageMessage("تعذر الاتصال بالخادم.");
      }
    };

    checkStatus();
  }, [userData]);

  const sendRequest = async () => {
    if (!user?.userid) return;

    setStatus("submitting");
    setPageMessage("");

    try {
      const res = await fetch(
        `${BASE}/api/submit/verificationrequest/${encodeURIComponent(user.userid)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userid: user.userid }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setStatus("sent");
        setPageMessage(data.message || "تم إرسال طلب التحقق بنجاح ✅");
        return;
      }

      // Backend re-validates requirements at submit time too — if something
      // changed between the initial check and now, show what's missing.
      if (data.checks) {
        const missing = Object.entries(data.checks)
          .filter(([, ok]) => !ok)
          .map(([key]) => REQUIREMENT_LABELS[key] || key);
        setFailedChecks(missing);
        setStatus("pending_check");
        return;
      }

      setStatus("idle");
      setPageMessage(data.error || "حدث خطأ أثناء إرسال الطلب.");
    } catch (err) {
      console.error(err);
      setStatus("idle");
      setPageMessage("تعذر الاتصال بالخادم.");
    }
  };

  // ── Render states ──────────────────────────────────────────────
  if (status === "checking") {
    return (
      <div className="sendrequest-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="sendrequest-container">
        <h1 className="sendrequest-title">طلب التحقق</h1>
        <p className="sendrequest-message">{pageMessage}</p>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="sendrequest-container">
        <h1 className="sendrequest-title">حساب موثق</h1>
        <p className="sendrequest-desc">{pageMessage}</p>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="sendrequest-container">
        <h1 className="sendrequest-title">تم إرسال الطلب</h1>
        <p className="sendrequest-desc">{pageMessage}</p>
      </div>
    );
  }

  if (status === "pending_check") {
    return (
      <div className="sendrequest-container">
        <h1 className="sendrequest-title">طلب التحقق</h1>
        <p className="sendrequest-desc">
          لا تستوفي جميع المتطلبات اللازمة للتحقق بعد. المتطلبات الناقصة:
        </p>
        <ul className="sendrequest-requirements">
          {failedChecks.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>
    );
  }

  // status === "idle" | "submitting"
  return (
    <div className="sendrequest-container">
      <h1 className="sendrequest-title">طلب التحقق</h1>
      <p className="sendrequest-desc">
        أنتِ تستوفين جميع المتطلبات. يمكنكِ الآن إرسال طلب التحقق إلى الإدارة.
      </p>

      {status === "submitting" ? (
        <div className="spinner"></div>
      ) : (
        <button className="sendrequest-btn" onClick={sendRequest}>
          إرسال الطلب
        </button>
      )}

      {pageMessage && <p className="sendrequest-message">{pageMessage}</p>}
    </div>
  );
}