import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../CSS/Login.css";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);

    const handleLogin = async () => {
        const res = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Login: username, Password: password })
        });
        const data = await res.json();
        if (data.error === "") {
            localStorage.setItem("userId", data.UserID);
            localStorage.setItem("householdId", data.HouseholdID);
            navigate("/dashboard");
        } else {
            alert(data.error);
        }
    };

    const handleForgotPassword = async () => {
        if (!forgotEmail) {
            alert("Please enter your email address.");
            return;
        }
        setForgotLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Email: forgotEmail })
            });
            const data = await res.json();
            if (data.error === "") {
                setForgotSent(true);
            } else {
                alert(data.error);
            }
        } catch (e) {
            alert("Something went wrong. Is the backend running?");
        }
        setForgotLoading(false);
    };

    const closeForgot = () => {
        setShowForgot(false);
        setForgotEmail("");
        setForgotSent(false);
    };

    return (
        <div className="pg">

            <div className="scene">
                <div className="cloud c1" />
                <div className="cloud c2" />
                <div className="tree">
                    <div className="tree-top" />
                    <div className="tree-trunk" />
                </div>
                <div className="mailbox">
                    <div className="mb-box"><div className="mb-flag" /></div>
                    <div className="mb-post" />
                </div>
                <div className="house-wrap">
                    <div className="roof-section">
                        <div className="chimney">
                            <div className="smoke"><span /><span /><span /></div>
                        </div>
                        <div className="roof" />
                    </div>
                    <div className="house-body">
                        <div className="shutters">
                            <div className="shutter" /><div className="shutter" />
                            <div className="shutter" /><div className="shutter" />
                        </div>
                        <div className="windows-row">
                            <div className="win"><div className="win-light" /></div>
                            <div className="win"><div className="win-light" /></div>
                        </div>
                        <div className="door-wrap">
                            <div className="door">
                                <div className="door-glass" />
                                <div className="door-knob" />
                            </div>
                            <div className="steps" />
                            <div className="steps2" />
                            <div className="path" />
                        </div>
                    </div>
                </div>
                <div className="ground" />
                <div className="grass-row">
                    {Array.from({ length: 30 }).map((_, i) => (
                        <div className="blade" key={i} />
                    ))}
                </div>
            </div>

            <div className="form-side">
                <div className="welcome-badge">
                    <div className="dot" /> Welcome home
                </div>

                <div className="brand">Our<em>Place</em></div>
                <div className="sub">Your shared home, organized together</div>

                <label className="lbl">Username</label>
                <input
                    className="inp"
                    type="text"
                    placeholder="your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />

                <label className="lbl">Password</label>
                <input
                    className="inp"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />

                <button className="btn-main" onClick={handleLogin}>
                    Sign in
                </button>

                <div className="divider">or</div>

                <button className="btn-sec" onClick={() => navigate("/register")}>
                    🏠 Create a new household
                </button>

                <div className="links-row">
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowForgot(true); }}>
                        Forgot password?
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate("/join"); }}>
                        Need an invite?
                    </a>
                </div>
            </div>

            {showForgot && (
                <div className="fp-overlay" onClick={closeForgot}>
                    <div className="fp-modal" onClick={(e) => e.stopPropagation()}>

                        {!forgotSent ? (
                            <>
                                <div className="fp-icon">🔑</div>
                                <div className="fp-title">Forgot your password?</div>
                                <div className="fp-sub">
                                    Enter your email and we'll send you a reset link.
                                </div>

                                <label className="lbl" style={{ textAlign: "left", width: "100%" }}>
                                    Email
                                </label>
                                <input
                                    className="inp"
                                    type="email"
                                    placeholder="you@email.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                                    style={{ marginBottom: "16px" }}
                                />

                                <button
                                    className="btn-main"
                                    onClick={handleForgotPassword}
                                    disabled={forgotLoading}
                                >
                                    {forgotLoading ? "Sending..." : "Send reset link"}
                                </button>

                                <button
                                    className="fp-cancel"
                                    onClick={closeForgot}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="fp-icon">📬</div>
                                <div className="fp-title">Check your email!</div>
                                <div className="fp-sub">
                                    We sent a password reset link to <strong>{forgotEmail}</strong>.
                                    Check your inbox and follow the link to reset your password.
                                </div>
                                <button className="btn-main" onClick={closeForgot}>
                                    Back to sign in
                                </button>
                            </>
                        )}

                    </div>
                </div>
            )}

        </div>
    );
}