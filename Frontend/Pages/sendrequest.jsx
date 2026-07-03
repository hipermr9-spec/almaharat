import React, { useEffect, useState } from "react";
import "./App.css";

export default function SendRequest({ userData }) {
  const [email, setEmail] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setEmail(userData?.email || "");

    if (!userData?.email) {
      setPageMessage("لم يتم العثور على بريدك الإلكتروني. الرجاء تسجيل الدخول.");
    }
  }, [userData]);

  const sendRequest = async () => {
    if (!email) {
      setPageMessage("لا يوجد بريد إلكتروني.");
      return;
    }

    setLoading(true);

    const message = {
      title: "طلب جديد من " + (userData?.username || "User"),
      content:
        "طلب جديد للتحقق. البريد: " +
        email +
        " - تم الإرسال من صفحة التحقق.",
      styleandhtml: `
        <div style="color:#333;font-family:Arial">
          <h2>طلب تحقق جديد</h2>
          <p>المستخدم: ${userData?.username}</p>
          <p>البريد: ${email}</p>
        </div>
      `,
      useremail: email,
    };

    try {
      const res = await fetch("https://api.almaharat2.com/api/sendemail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
        setPageMessage("تم إرسال طلبك بنجاح ✅ سيتم الرد خلال يومين.");
      } else {
        setPageMessage(data.error || "حدث خطأ أثناء الإرسال.");
      }
    } catch (err) {
      console.error(err);
      setPageMessage("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sendrequest-container">
      {!sent ? (
        <>
          <h1 className="sendrequest-title">طلب التحقق</h1>

          <p className="sendrequest-desc">
            إرسال طلب التحقق إلى الإدارة
          </p>

          {loading ? (
            <div className="spinner"></div>
          ) : (
            <button className="sendrequest-btn" onClick={sendRequest}>
              إرسال الطلب
            </button>
          )}

          {pageMessage && (
            <p className="sendrequest-message">{pageMessage}</p>
          )}
        </>
      ) : (
        <>
          <h1 className="sendrequest-title">تم إرسال الطلب</h1>
          <p className="sendrequest-desc">
            شكراً لك، سيتم مراجعة طلبك خلال من يوم إلى يومين.
          </p>
        </>
      )}
    </div>
  );
}