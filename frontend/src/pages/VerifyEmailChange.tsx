import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "/api";

export default function VerifyEmailChange() {
    const [message, setMessage] = useState("Verifying your new email...");
    const navigate = useNavigate();

    useEffect(() => {
        const verify = async () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get("token");

            if (!token) {
                setMessage("Missing verification token.");
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/users/verify-email-change`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token })
                });

                const data = await res.json();

                if (!res.ok || data.error) {
                    setMessage(data.error || "Email verification failed.");
                    return;
                }

                setMessage("Your new email has been verified successfully.");

                setTimeout(() => {
                    navigate("/settings");
                }, 2000);
            } catch {
                setMessage("Something went wrong while verifying your email.");
            }
        };

        verify();
    }, [navigate]);

    return (
        <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
            <h2>{message}</h2>
        </div>
    );
}