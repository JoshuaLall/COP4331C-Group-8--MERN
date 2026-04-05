import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Login.css";

export default function Register() {
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [householdName, setHouseholdName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!firstName || !username || !email || !password || !householdName) {
            alert("Please fill in all required fields.");
            return;
        }
        if (password !== confirm) {
            alert("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            const regRes = await fetch("http://localhost:5000/api/auth/register", {
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
            if (regData.error !== "") {
                alert(regData.error);
                setLoading(false);
                return;
            }

            const newUserId = regData.UserID;

            const hhRes = await fetch("http://localhost:5000/api/households", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    HouseholdName: householdName,
                    CreatedByUserID: newUserId
                })
            });
            const hhData = await hhRes.json();
            if (hhData.error !== "") {
                alert(hhData.error);
                setLoading(false);
                return;
            }

            alert("Account created! Please check your email to verify your account, then log in.");
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
                    <div className="dot" /> Create your home
                </div>

                <div className="brand">Our<em>Place</em></div>
                <div className="sub">Set up your household and invite your roommates</div>

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
                    <span>🏠 Your Household</span>
                </div>

                <label className="lbl">Household Name *</label>
                <input
                    className="inp"
                    placeholder="e.g. The Maple House"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                />

                <button
                    className="btn-main"
                    onClick={handleRegister}
                    disabled={loading}
                    style={{ marginTop: "8px" }}
                >
                    {loading ? "Creating..." : "🏡 Create Household"}
                </button>

                <div className="links-row" style={{ marginTop: "16px" }}>
                    <a href="#" onClick={() => navigate("/")}>
                        ← Back to sign in
                    </a>
                    <a href="#" onClick={() => navigate("/join")}>
                        Have an invite code?
                    </a>
                </div>
            </div>
        </div>
    );
}