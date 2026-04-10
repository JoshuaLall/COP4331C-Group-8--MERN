import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const API_BASE = "/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Verifying...");
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setMessage("Missing verification token.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (data.error === "") {
          setMessage("Email verified successfully! Redirecting to login...");
          setTimeout(() => navigate("/"), 2000);
        } else {
          setMessage(data.error);
        }
      } catch (e) {
        setMessage("Verification failed.");
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>{message}</h2>
    </div>
  );
}
