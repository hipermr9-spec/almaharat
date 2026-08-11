import { useEffect, useState } from "react";
import { subscribeToToast } from "./toastService";
import "./toast.css";

const TYPE_STYLES = {
  success: "toast-card--success",
  warning: "toast-card--warning",
  error: "toast-card--error",
};

export default function ToastContainer() {
  const [toast, setToast] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToToast((payload) => {
      setToast({ ...payload, id: Date.now() });
      setIsVisible(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!toast) return;
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!toast || isVisible) return;
    const cleanupTimer = setTimeout(() => {
      setToast(null);
    }, 300);
    return () => clearTimeout(cleanupTimer);
  }, [toast, isVisible]);

  if (!toast) return null;

  return (
    <div className="toast-root" aria-live="polite" aria-atomic="true">
      <div className={`toast-card ${TYPE_STYLES[toast.type] || TYPE_STYLES.success} ${isVisible ? "toast-card--show" : "toast-card--hide"}`}>
        <div className="toast-header">
          <div>
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => setIsVisible(false)} aria-label="Close notification">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
