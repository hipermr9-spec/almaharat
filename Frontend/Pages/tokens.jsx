import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API = "https://api.almaharat2.com";

export default function Tokens() {
  const { userid, token } = useParams();

  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const res = await fetch(
        `${API}/users/user/${userid}/${token}`
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setPassword(data.password);
      } else {
        setError(data.error || "Invalid token");
      }
    } catch {
      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Checking token...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {password ? (
          <>
            <h2>New Password</h2>
            <p>{password}</p>

            <a href="/login" className="btn-main">
              Login
            </a>
          </>
        ) : (
          <>
            <h2>Invalid Link</h2>
            <p>{error}</p>

            <a href="/forgotpassword" className="btn-main">
              Request New Link
            </a>
          </>
        )}
      </div>
    </div>
  );
}