import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../CSS/Login.css";

const API_BASE = "/api";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const handleReset = async () => {
        setError("");

        if (!password) return setError("Please enter a new password.");
        if (password !== confirm) return setError("Passwords don't match.");
        if (!token) return setError("Invalid or missing reset token.");

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ResetToken: token, Password: password })
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                setDone(true);
            }
        } catch (e) {
            setError("Something went wrong. Is the backend running?");
        }
        setLoading(false);
    };

    return (
        <div className="pg">
            <div className="form-side">
                <div className="brand">Our<em>Place</em></div>
                <div className="sub">Reset your password</div>

                {done ? (
                    <>
                        <div style={{ fontSize: "48px", textAlign: "center", margin: "20px 0" }}>✅</div>
                        <div className="sub" style={{ textAlign: "center", marginBottom: "20px" }}>
                            Password updated! You can now sign in.
                        </div>
                        <button className="btn-main" onClick={() => navigate("/")}>
                            Back to Sign In
                        </button>
                    </>
                ) : (
                    <>
                        <label className="lbl">New Password</label>
                        <input
                            className="inp"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleReset()}
                        />

                        <label className="lbl">Confirm Password</label>
                        <input
                            className="inp"
                            type="password"
                            placeholder="••••••••"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleReset()}
                        />

                        {error && (
                            <div style={{ color: "#c0392b", fontSize: "14px", marginTop: "8px" }}>
                                {error}
                            </div>
                        )}

                        <button className="btn-main" onClick={handleReset} disabled={loading} style={{ marginTop: "16px" }}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>

                        <button className="btn-sec" onClick={() => navigate("/")} style={{ marginTop: "10px" }}>
                            Back to Sign In
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
