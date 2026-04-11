import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Login.css";

const API_BASE = "/api";

type PasswordCheck = {
    label: string;
    passed: boolean;
};

function getPasswordChecks(password: string): PasswordCheck[] {
    return [
        { label: "At least 8 characters", passed: password.length >= 8 },
        { label: "72 characters or fewer", passed: password.length <= 72 },
        { label: "At least one uppercase letter", passed: /[A-Z]/.test(password) },
        { label: "At least one lowercase letter", passed: /[a-z]/.test(password) },
        { label: "At least one number", passed: /\d/.test(password) },
        { label: "At least one special character", passed: /[^A-Za-z0-9]/.test(password) },
        { label: "No spaces", passed: !/\s/.test(password) },
    ];
}

export default function Register() {
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [householdName, setHouseholdName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);

    const handleRegister = async () => {
        if (!firstName || !username || !email || !password) {
            alert("Please fill in all required fields.");
            return;
        }

        if (password !== confirm) {
            alert("Passwords do not match.");
            return;
        }

        const hasFailedCheck = passwordChecks.some((check) => !check.passed);
        if (hasFailedCheck) {
            alert("Password does not meet all requirements.");
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
                    HouseholdName: householdName,
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

            alert("Account created! Please verify your email before logging in.");
            navigate("/");
        } catch (e) {
            alert("Something went wrong. Is the backend running?");
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
                    <div className="dot" /> Create your account
                </div>

                <div className="brand">Our<em>Place</em></div>
                <div className="sub">Sign up, verify your email, then log in to continue</div>

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

                <label className="lbl">Household Name</label>
                <input
                    className="inp"
                    placeholder="The Lee Household"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
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

                        <div style={{ marginTop: "10px" }}>
                            {passwordChecks.map((check, index) => (
                                <div
                                    key={index}
                                    style={{
                                        color: check.passed ? "#1e8e3e" : "#c0392b",
                                        fontSize: "13px",
                                        marginTop: "4px",
                                        lineHeight: "1.3"
                                    }}
                                >
                                    {check.passed ? "✓" : "✗"} {check.label}
                                </div>
                            ))}
                        </div>
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

                <button
                    className="btn-main"
                    onClick={handleRegister}
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
                            navigate("/join");
                        }}
                    >
                        Have an invite code?
                    </a>
                </div>
            </div>
        </div>
    );
}