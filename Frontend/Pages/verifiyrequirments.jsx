import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import "./App.css";

// Map each card to the key returned by the Flask API in `checks`
const requirementsData = [
  {
    key: "has_email",
    step: "يجب أن يكون لديكِ بريد إلكتروني مرتبط بحسابك.",
    desc: "للتأكد من إمكانية استرجاع حسابك في حال نسيان كلمة المرور أو وجود أي مشكلة أخرى.",
  },
  {
    key: "has_10_followers",
    step: "يجب أن يكون لديكِ 10 متابعين أو أكثر.",
    desc: "للتأكد من أن حسابك نشط ومستخدم بشكل فعّال في المنصة.",
  },
  {
    key: "is_active_learner",
    step: "يجب أن تكوني مستمرة في استخدام المنصة ومتابعة دروسك.",
    desc: "للتأكد من أنكِ تستفيدين من المنصة وتحققين تقدمًا في دراستك.",
  },
  {
    key: "has_enough_points",
    step: "يجب أن يكون لديكِ نقاط كافية في حسابك.",
    desc: "للتأكد من أنكِ تساهمين في المجتمع وتستفيدين من الموارد المتاحة.",
  },
  {
    key: "positive_interaction",
    step: "يجب أن يكون لديكِ تفاعل إيجابي مع المجتمع.",
    desc: "للتأكد من أنكِ تساهمين في بيئة تعليمية إيجابية وتستفيدين من دعم الآخرين.",
  },
  {
    key: "follows_policies",
    step: "يجب أن تكوني ملتزمة بسياسات المنصة.",
    desc: "للتأكد من أنكِ تحترمين قواعد المنصة وتساهمين في بيئة تعليمية آمنة.",
  },
  {
    key: "no_policy_violations",
    step: "يجب ألّا تنتهكي أي سياسة، وإلا سيتم إلغاء التحقق.",
    desc: "للتأكد من أنكِ تحترمين قواعد المنصة وتساهمين في بيئة تعليمية آمنة وممتعة للجميع.",
  },
];

export default function VerifyRequirements() {
  // BUG FIX 1: removed unused `requirements` state.
  // BUG FIX 2: added `userData` to store the API response so `userid` is accessible.
  // check user id from localstorage.
  const [userid] = useState(localStorage.getItem("userid"));
  const [userData, setUserData] = useState(null);
  const [hadRequired, setHadRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

useEffect(() => {
  const fetchRequirements = async () => {
    try {
      const res = await fetch(
        `https://api.almaharat2.com/api/checkrequirements?userid=${encodeURIComponent(userid)}`,
        {
          method: "GET",
        }
      );

      const data = await res.json();

      if (data.already_verified) {
        setError(data.message);
        setUserData(data);
        setHadRequired(false);
        return;
      }

      if (res.ok) {
        setUserData(data);
        setHadRequired(data.requirements_met);
      } else {
        setError(data.error || "حدث خطأ أثناء جلب البيانات.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "تعذّر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  if (userid) {
    fetchRequirements();
  } else {
    setError("لم يتم العثور على userid.");
    setLoading(false);
  }
}, [userid]);
      

  const metCount = userData?.checks
    ? Object.values(userData.checks).filter(Boolean).length
    : 0;

  const progressPct = (metCount / requirementsData.length) * 100;

  return (
    <div className="vr-page" dir="rtl">
      <div className="vr-container">

        {/* ── Header ── */}
        <header className="vr-header">
          <div className="vr-badge">التحقق من الحساب</div>
          <h1 className="vr-title">متطلبات التحقق</h1>
          <p className="vr-subtitle">
            للتأكد من أنكِ تستفيدين من المنصة بشكل كامل، يجب أن تفي بجميع
            المتطلبات التالية قبل تقديم طلب التحقق.
          </p>
        </header>

        {/* ── Loading ── */}
        {loading && (
          <div className="vr-loading">
            <div className="vr-spinner" />
            <p>جاري التحقق من متطلباتك…</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="vr-error">
            <span className="vr-error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !error && (
          <>
            {/* Progress bar */}
            <div className="vr-progress-wrap">
              <div className="vr-progress-labels">
                <span>تقدمك نحو التحقق</span>
                <span className="vr-progress-count">
                  {metCount} / {requirementsData.length}
                </span>
              </div>
              <div className="vr-progress-track">
                <div
                  className="vr-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Cards */}
            <div className="vr-list">
              {requirementsData.map((req, idx) => {
                const isMet = userData?.checks?.[req.key] ?? false;
                return (
                  <div
                    key={idx}
                    className={`vr-card ${isMet ? "vr-card--met" : "vr-card--unmet"}`}
                  >
                    <div className="vr-card-icon" aria-hidden="true">
                      {isMet ? "✓" : "✗"}
                    </div>
                    <div className="vr-card-body">
                      <h2 className="vr-card-title">{req.step}</h2>
                      <p className="vr-card-desc">{req.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="vr-note">
              إذا كنتِ تفين بجميع المتطلبات، يرجى الضغط على زر الطلب أدناه.
              قد تستغرق المراجعة بضعة أيام.
            </p>
          </>
        )}

        {/* ── Actions ── */}
        <div className="vr-actions">
          {/* BUG FIX 3: `data` was not in scope — replaced with `userData?.userid` */}
          <button
            className="vr-btn-primary"
            disabled={!hadRequired || loading}
            onClick={() =>
              (href="/port/Helpers/Verify/Request/" + userData?.userid) // navigate to request page with userid
            }
          >
            طلب التحقق
          </button>
          <a href="/home" className="vr-btn-secondary">
            العودة للصفحة الرئيسية
          </a>
        </div>

      </div>
    </div>
  );
}