import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Login.css";

const API_BASE = "/api";

export default function JoinHousehold() {
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!firstName || !username || !email || !password || !inviteCode) {
            alert("Please fill in all required fields including the invite code.");
            return;
        }

        if (password !== confirm) {
            alert("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const regRes = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    FirstName: firstName,
                    LastName: lastName,
                    Login: username,
                    Email: email,
                    Password: password
                })
            });

            const regData = await regRes.json();

            if (!regRes.ok || regData.error !== "") {
                alert(regData.error || "Registration failed.");
                setLoading(false);
                return;
            }

            localStorage.setItem("pendingInviteCode", inviteCode.toUpperCase());

            alert("Account created! Please verify your email before logging in. After you log in, you can use your invite code to join the household.");
            navigate("/");
        } catch (e) {
            alert("Something went wrong. Is the backend running?");
            console.log(e);
        }

        setLoading(false);
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
                    <div className="dot" /> Join your home
                </div>

                <div className="brand">Our<em>Place</em></div>
                <div className="sub">Create your account, verify your email, then log in to join with your invite code</div>

                <div className="inp-row">
                    <div className="inp-col">
                        <label className="lbl">First Name *</label>
                        <input
                            className="inp"
                            placeholder="Jamie"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </div>
                    <div className="inp-col">
                        <label className="lbl">Last Name</label>
                        <input
                            className="inp"
                            placeholder="Lee"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                </div>

                <label className="lbl">Username *</label>
                <input
                    className="inp"
                    placeholder="jamielee"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <label className="lbl">Email *</label>
                <input
                    className="inp"
                    type="email"
                    placeholder="jamie@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <div className="inp-row">
                    <div className="inp-col">
                        <label className="lbl">Password *</label>
                        <input
                            className="inp"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="inp-col">
                        <label className="lbl">Confirm *</label>
                        <input
                            className="inp"
                            type="password"
                            placeholder="••••••••"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="household-divider">
                    <span>🔑 Your Invite Code</span>
                </div>

                <label className="lbl">Invite Code *</label>
                <input
                    className="inp invite-code-inp"
                    placeholder="e.g. ABC123"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                />

                <button
                    className="btn-main"
                    onClick={handleJoin}
                    disabled={loading}
                    style={{ marginTop: "8px" }}
                >
                    {loading ? "Creating..." : "Create Account"}
                </button>

                <div className="links-row" style={{ marginTop: "16px" }}>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate("/");
                        }}
                    >
                        ← Back to sign in
                    </a>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate("/register");
                        }}
                    >
                        Create a new household instead
                    </a>
                </div>
            </div>
        </div>
    );
}