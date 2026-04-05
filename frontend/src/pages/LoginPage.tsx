import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../CSS/Login.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        const res = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                Login: email,
                Password: password
            })
        });

        const data = await res.json();

        if (data.error === "") {
            navigate("/dashboard");
        } else {
            alert(data.error);
        }
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
                            <div className="smoke">
                                <span /><span /><span />
                            </div>
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

            {/* RIGHT — login form */}
            <div className="form-side">
                <div className="welcome-badge">
                    <div className="dot" /> Welcome home
                </div>

                <div className="brand">Our<em>Place</em></div>
                <div className="sub">Your shared home, organized together</div>

                <label className="lbl">Email</label>
                <input
                    className="inp"
                    type="email"
                    placeholder="you@ourplace.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <label className="lbl">Password</label>
                <input
                    className="inp"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button className="btn-main" onClick={handleLogin}>
                    Sign in
                </button>

                <div className="divider">or</div>

                <button className="btn-sec">Create a new household</button>

                <div className="links-row">
                    <a href="#">Forgot password?</a>
                    <a href="#">Need an invite?</a>
                </div>
            </div>

        </div>
    );
}