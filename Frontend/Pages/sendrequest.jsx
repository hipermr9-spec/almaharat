import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import "./App.css";

const BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.almaharat2.com";

export default function SendRequest({ userData }) {
  const [email, setEmail] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = Cookies.get("user") || Cookies.get("DONT-SHARE-THAT-COOKIE");
    const currentUser = userData || (stored ? JSON.parse(stored) : null);
    setUser(currentUser);

    if (!currentUser) {
      setPageMessage("لم يتم العثور على المستخدم. الرجاء تسجيل الدخول.");
      return;
    }

    if (currentUser.email) {
      setEmail(currentUser.email);
      setPageMessage("");
      return;
    }

    const fetchSavedEmail = async () => {
      try {
        const res = await fetch(`${BASE}/api/get-settings/${currentUser.userid}`);
        const data = await res.json();
        if (res.ok) {
          setEmail(data.email || "");
          setPageMessage(data.email ? "" : "لا يوجد بريد مرتبط بحسابك. أضفه في الإعدادات أولاً.");
        } else {
          setPageMessage(data.error || "فشل تحميل البريد المرتبط.");
        }
      } catch (err) {
        console.error(err);
        setPageMessage("تعذر الاتصال بالخادم لتحميل البريد.");
      }
    };

    fetchSavedEmail();
  }, [userData]);

  const sendRequest = async () => {
    if (!email) {
      setPageMessage("لا يوجد بريد إلكتروني مرتبط. أضفه في الإعدادات أولاً.");
      return;
    }

    setLoading(true);

    const message = {
      title: "طلب جديد من " + (user?.username || userData?.username || "User"),
      content:
        "طلب جديد للتحقق. البريد: " +
        email +
        " - تم الإرسال من صفحة التحقق.",
      styleandhtml: `
        <div style="color:#333;font-family:Arial">
          <h2>طلب تحقق جديد</h2>
          <p>المستخدم: ${user?.username || userData?.username || "User"}</p>
          <p>البريد: ${email}</p>
        </div>
      `,
      useremail: email,
    };

    try {
      const res = await fetch(`${BASE}/api/sendemail`, {
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