import { useMemo, useState } from "react";
import { useEffect } from "react";
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

export default function JoinHousehold() {
    const navigate = useNavigate();
    const [entryMode, setEntryMode] = useState<"existing" | "register">("existing");

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [loading, setLoading] = useState(false);
    const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
            setInviteCode(code.toUpperCase());
        }
    }, []);

    const handleJoin = async () => {
        if (!firstName || !username || !email || !password || !inviteCode) {
            alert("Please fill in all required fields including the invite code.");
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
                    Login: username,
                    Email: email,
                    Password: password,
                    InviteCode: inviteCode
                })
            });

            const regData = await regRes.json();

            if (!regRes.ok || regData.error !== "") {
                alert(regData.error || "Registration failed.");
                setLoading(false);
                return;
            }

            alert("Account created! Please verify your email before logging in.");
            navigate(`/?code=${inviteCode}`);
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
                <div className="sub">Use an invite code to log in or create your account</div>

                <label className="lbl">Invite Code *</label>
                <input
                    className="inp invite-code-inp"
                    placeholder="e.g. ABC123"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                />

                <div style={{ display: "flex", gap: "10px", marginTop: "8px", marginBottom: "12px" }}>
                    <button
                        className={entryMode === "existing" ? "btn-main" : "btn-sec"}
                        onClick={() => {
                            if (!inviteCode.trim()) {
                                alert("Please enter an invite code first.");
                                return;
                            }
                            navigate(`/?code=${inviteCode.trim().toUpperCase()}`);
                        }}
                        type="button"
                        style={{ flex: 1 }}
                    >
                        Existing Account
                    </button>
                    <button
                        className={entryMode === "register" ? "btn-main" : "btn-sec"}
                        onClick={() => setEntryMode("register")}
                        type="button"
                        style={{ flex: 1 }}
                    >
                        Register New Account
                    </button>
                </div>

                {entryMode === "register" && (
                    <>
                        <div className="household-divider">
                            <span>📝 Create Your Account</span>
                        </div>

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

                        <button
                            className="btn-main"
                            onClick={handleJoin}
                            disabled={loading}
                            style={{ marginTop: "8px" }}
                        >
                            {loading ? "Creating..." : "Create Account"}
                        </button>
                    </>
                )}

                <div className="links-row" style={{ marginTop: "16px" }}>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(`/?code=${inviteCode.trim().toUpperCase()}`);
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