import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import {
  IoArrowBack,
  IoTrash,
  IoCheckmarkDone,
  IoNotifications,
  IoRefresh,
} from "react-icons/io5";

import "./Notifications.css";

const API = "http://localhost:5000/api/notifications";

export default function Notifications() {
  const navigate = useNavigate();

  const userid = Cookies.get("userid");

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function loadNotifications() {
    if (!userid) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/get/${userid}`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حدث خطأ.");
        return;
      }

      const sorted = [...data].sort((a, b) => {
        const da = new Date(a.created_at || 0);
        const db = new Date(b.created_at || 0);
        return db - da;
      });

      setNotifications(sorted);
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAsRead(id) {
    try {
      setWorking(true);

      const res = await fetch(`${API}/read/${id}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                read: true,
              }
            : n
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setWorking(false);
    }
  }

  async function markAllRead() {
    try {
      setWorking(true);

      const res = await fetch(`${API}/read_all`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setWorking(false);
    }
  }

  async function deleteNotification(id) {
    if (!window.confirm("حذف هذا الإشعار؟")) return;

    try {
      setWorking(true);

      const res = await fetch(`${API}/delete/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      setNotifications((prev) =>
        prev.filter((n) => n.id !== id)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setWorking(false);
    }
  }

  async function deleteAll() {
    if (!window.confirm("حذف جميع الإشعارات؟")) return;

    try {
      setWorking(true);

      const res = await fetch(`${API}/delete_all`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      setNotifications([]);
    } catch (err) {
      console.error(err);
    } finally {
      setWorking(false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications-page" dir="rtl">

      <div className="notifications-header">

        <button
          className="back-btn"
          onClick={() => navigate("/home")}
        >
          <IoArrowBack />
          رجوع
        </button>

        <div className="header-center">
          <IoNotifications className="header-icon" />

          <div>
            <h1>الإشعارات</h1>

            <p>
              لديك <span>{unreadCount}</span> إشعار غير مقروء
            </p>
          </div>
        </div>

      </div>

      <div className="toolbar">

        <button
          className="toolbar-btn"
          disabled={working}
          onClick={loadNotifications}
        >
          <IoRefresh />
          تحديث
        </button>

        <button
          className="toolbar-btn success"
          disabled={
            working ||
            notifications.length === 0 ||
            unreadCount === 0
          }
          onClick={markAllRead}
        >
          <IoCheckmarkDone />
          قراءة الكل
        </button>

        <button
          className="toolbar-btn danger"
          disabled={
            working ||
            notifications.length === 0
          }
          onClick={deleteAll}
        >
          <IoTrash />
          حذف الكل
        </button>

      </div>

      {loading ? (
        <div className="loading-box">
          جاري تحميل الإشعارات...
        </div>
      ) : error ? (
        <div className="error-box">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-box">

          <IoNotifications className="empty-icon" />

          <h2>لا توجد إشعارات</h2>

          <p>
            عندما يصلك إشعار جديد سيظهر هنا.
          </p>

        </div>
) : (

  <div className="notifications-list">

    {notifications.map((notification) => (
      <div
        key={notification.id}
        className={`notification-card ${
          notification.read ? "read" : "unread"
        }`}
      >
        <div className="notification-top">

          <div className="notification-title">
            <span
              className={`status-dot ${
                notification.read ? "read" : "unread"
              }`}
            />

            <h3>{notification.title}</h3>
          </div>

          <span className="notification-date">
            {notification.created_at}
          </span>

        </div>

        <div className="notification-body">
          <p>{notification.message}</p>
        </div>

        <div className="notification-actions">

          {!notification.read && (
            <button
              className="read-btn"
              disabled={working}
              onClick={() => markAsRead(notification.id)}
            >
              <IoCheckmarkDone />
              تمّت القراءة
            </button>
          )}

          <button
            className="delete-btn"
            disabled={working}
            onClick={() => deleteNotification(notification.id)}
          >
            <IoTrash />
            حذف
          </button>

        </div>
      </div>
    ))}

  </div>

)}

    </div>
  );
}