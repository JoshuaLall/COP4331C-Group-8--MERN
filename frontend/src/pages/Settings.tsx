import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

export default function Settings() {
    const navigate = useNavigate();
    const [activeSideItem, setActiveSideItem] = useState("Settings");

    const userId = Number(localStorage.getItem("userId"));
    const householdId = Number(localStorage.getItem("householdId"));

    // ── USER ──
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [saveMessage, setSaveMessage] = useState("");

    // ── HOUSEHOLD ──
    const [inviteEmail, setInviteEmail] = useState("");
    const [members, setMembers] = useState<any[]>([]);
    const [inviteCode, setInviteCode] = useState("");
    const [inviteMode, setInviteMode] = useState<"email" | "code">("email");
    const [inviteMessage, setInviteMessage] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");

    const sideItems = [
        { icon: "📋", label: "Open Chores" },
        { icon: "📌", label: "Assigned" },
        { icon: "✅", label: "My Chores" },
        { icon: "🔁", label: "Recurring" },
        { icon: "⚙️", label: "Settings" },
    ];

    const memberColors = [
        { bg: "#C9DDED", color: "#185FA5" },
        { bg: "#FBEAF0", color: "#993556" },
        { bg: "#EAF3DE", color: "#3B6D11" },
        { bg: "#FDF3DC", color: "#9A7010" },
        { bg: "#FAECE7", color: "#8C4A3C" },
    ];

    const getInitials = (mate: any) =>
        ((mate.FirstName?.[0] || "") + (mate.LastName?.[0] || "")).toUpperCase() ||
        (mate.Login?.[0] || "?").toUpperCase();

    const getDisplayName = (mate: any) =>
        mate.FirstName ? `${mate.FirstName} ${mate.LastName || ""}`.trim() : mate.Login;

    // ─────────────────────────────
    // 🔹 LOAD USER + MEMBERS
    // ─────────────────────────────
    useEffect(() => {
        if (!userId) return;

        fetch(`http://localhost:5000/api/users/${userId}`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setFirstName(data.result.FirstName);
                    setLastName(data.result.LastName);
                    setEmail(data.result.Email);

                    const hId = data.result.HouseholdID;
                    if (hId) {
                        localStorage.setItem("householdId", hId);

                        fetch(`http://localhost:5000/api/households/${hId}`)
                            .then(res => res.json())
                            .then(hData => {
                                if (!hData.error) setHouseName(hData.result.HouseholdName);
                            });

                        fetch(`http://localhost:5000/api/users/household/${hId}`)
                            .then(res => res.json())
                            .then(mData => {
                                if (!mData.error) {
                                    setMembers(mData.results);
                                    setHousemates(mData.results);
                                }
                            });
                    }
                }
            });
    }, [userId]);

    // ─────────────────────────────
    // 🔹 UPDATE USER
    // ─────────────────────────────
    const handleSave = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ FirstName: firstName, LastName: lastName, Email: email })
            });
            const data = await res.json();
            if (data.error) {
                setSaveMessage("❌ " + data.error);
            } else {
                setSaveMessage("✅ Profile updated!");
                setTimeout(() => setSaveMessage(""), 3000);
            }
        } catch (err) {
            console.log(err);
            setSaveMessage("❌ Something went wrong.");
        }
    };

    // ─────────────────────────────
    // 🔹 INVITE USER
    // ─────────────────────────────
    const handleInvite = async (modeOverride?: "email" | "code") => {
        const mode = modeOverride ?? inviteMode;
        setInviteMessage("");

        if (mode === "email" && !inviteEmail.trim()) {
            setInviteMessage("Enter an email first.");
            return;
        }

        try {
            setIsInviting(true);
            const body = mode === "email" ? { Email: inviteEmail.trim() } : {};

            const res = await fetch(
                `http://localhost:5000/api/households/${householdId}/invite`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                }
            );

            const data = await res.json();

            if (data.error) {
                setInviteMessage(data.error);
                return;
            }

            if (data.InviteCode) {
                setInviteCode(data.InviteCode);
                if (mode === "email") {
                    setInviteMessage(`Invite sent to ${inviteEmail.trim()}.`);
                    setInviteEmail("");
                }
            } else {
                setInviteMessage("Invite created, but no code was returned.");
            }
        } catch (err) {
            console.log(err);
            setInviteMessage("Something went wrong.");
        } finally {
            setIsInviting(false);
        }
    };

    const handleCopyInviteCode = async () => {
        if (!inviteCode) return;
        try {
            await navigator.clipboard.writeText(inviteCode);
            setInviteMessage("✅ Code copied to clipboard!");
        } catch {
            setInviteMessage("Could not copy code.");
        }
    };

    // ─────────────────────────────
    // 🔹 REMOVE USER (UI ONLY)
    // ─────────────────────────────
    const handleRemove = (id: number) => {
        alert("Leave Household endpoint not implemented yet");
    };

    // ─────────────────────────────
    // 🔹 SIGN OUT
    // ─────────────────────────────
    const handleSignOut = () => {
        localStorage.removeItem("userId");
        localStorage.removeItem("householdId");
        navigate("/");
    };

    return (
        <div className="dash">

            {/* ───────── SIDEBAR ───────── */}
            <div className="sidebar">
                <div className="sb-brand">Our<em>Place</em></div>

                <div className="sb-house">
                    🏠 {houseName || "Your Household"}
                </div>

                {sideItems.map(({ icon, label }) => (
                    <div
                        key={label}
                        className={`sb-item ${activeSideItem === label ? "active" : ""}`}
                        onClick={() => {
                            setActiveSideItem(label);
                            if (label === "Open Chores") navigate("/dashboard");
                            if (label === "Assigned") navigate("/assigned");
                            if (label === "My Chores") navigate("/my-chores");
                            if (label === "Recurring") navigate("/recurring");
                            if (label === "Settings") navigate("/settings");
                        }}
                    >
                        <span>{icon}</span>
                        {label}
                    </div>
                ))}

                <div className="sb-mates">
                    <div className="sb-mates-label">Housemates</div>
                    {housemates.length === 0 ? (
                        <div className="sb-empty-mates">No housemates yet</div>
                    ) : (
                        housemates.map((mate: any) => {
                            const name = mate.FirstName || mate.Login || "?";
                            const style = memberColors[(name.charCodeAt(0) || 0) % memberColors.length];
                            return (
                                <div className="mate" key={mate.UserID}>
                                    <div className="avatar" style={{ background: style.bg, color: style.color }}>
                                        {getInitials(mate)}
                                    </div>
                                    <span className="mate-name">{getDisplayName(mate)}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ───────── MAIN ───────── */}
            <div className="main">

                <div className="topbar">
                    <div>
                        <div className="topbar-greet">⚙️ Settings</div>
                        <div className="topbar-sub">Manage your account & household</div>
                    </div>
                </div>

                <div className="content">

                    {/* ── SECTION: PROFILE ── */}
                    <div className="card" style={{ marginBottom: "20px" }}>
                        <div className="card-body">
                            <div className="card-title">👤 Profile</div>

                            <div style={{ display: "flex", gap: "10px" }}>
                                <input
                                    className="modal-inp"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="First Name"
                                    style={{ flex: 1 }}
                                />
                                <input
                                    className="modal-inp"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Last Name"
                                    style={{ flex: 1 }}
                                />
                            </div>

                            <input
                                className="modal-inp"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                style={{ marginTop: "10px", width: "100%" }}
                            />

                            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "15px" }}>
                                <button className="tb-btn" onClick={handleSave}>
                                    Save Changes
                                </button>
                                {saveMessage && (
                                    <span style={{ fontSize: "14px", opacity: 0.8 }}>{saveMessage}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION: INVITE ── */}
                    <div className="card" style={{ marginBottom: "20px" }}>
                        <div className="card-body">
                            <div className="card-title">🏠 Invite a Housemate</div>

                            {/* Mode toggle */}
                            <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                                <button
                                    className={inviteMode === "email" ? "tb-btn" : "modal-cancel"}
                                    onClick={() => { setInviteMode("email"); setInviteMessage(""); setInviteCode(""); }}
                                    type="button"
                                >
                                    ✉️ Invite by Email
                                </button>
                                <button
                                    className={inviteMode === "code" ? "tb-btn" : "modal-cancel"}
                                    onClick={() => {
                                        setInviteMode("code");
                                        setInviteMessage("");
                                        setInviteCode("");
                                        handleInvite("code");
                                    }}
                                    disabled={isInviting}
                                    type="button"
                                >
                                    🔗 Get Invite Code
                                </button>
                            </div>

                            {/* Email input row (code mode has no extra UI — code appears below) */}
                            {inviteMode === "email" && (
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <input
                                        className="modal-inp"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="housemate@email.com"
                                        style={{ flex: 1 }}
                                        onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                                    />
                                    <button className="tb-btn" onClick={handleInvite} disabled={isInviting}>
                                        {isInviting ? "Sending…" : "Send Invite"}
                                    </button>
                                </div>
                            )}

                            {/* Invite code reveal */}
                            {inviteMode === "code" && inviteCode && (
                                <div style={{
                                    padding: "14px 16px",
                                    borderRadius: "10px",
                                    background: "#fff",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "12px",
                                    border: "1px solid #d9cfc4"
                                }}>
                                    <div>
                                        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.5, marginBottom: "4px" }}>
                                            Invite Code
                                        </div>
                                        <div style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "3px", fontFamily: "monospace" }}>
                                            {inviteCode}
                                        </div>
                                    </div>
                                    <button className="tb-btn" onClick={handleCopyInviteCode}>
                                        Copy
                                    </button>
                                </div>
                            )}

                            {/* Status message */}
                            {inviteMessage && (
                                <div style={{ marginTop: "10px", fontSize: "14px", opacity: 0.8 }}>
                                    {inviteMessage}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── SECTION: MEMBERS ── */}
                    {members.length > 0 && (
                        <div className="card" style={{ marginBottom: "20px" }}>
                            <div className="card-body">
                                <div className="card-title">👥 Household Members</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                                    {members.map((m) => {
                                        return (
                                            <div
                                                key={m.UserID}
                                                className="modal-inp"
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                }}
                                            >
                                                <span style={{ fontWeight: 500, flex: 1 }}>{getDisplayName(m)}</span>
                                                {m.UserID === userId && (
                                                    <button
                                                        onClick={() => handleRemove(m.UserID)}
                                                        style={{
                                                            fontSize: "13px",
                                                            padding: "4px 12px",
                                                            background: "none",
                                                            border: "none",
                                                            color: "#c0392b",
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        Leave Household
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SIGN OUT ── */}
                    <div className="card" style={{ marginBottom: "20px", borderColor: "#fde8e8" }}>
                        <div className="card-body">
                            <div className="card-title" style={{ color: "#c0392b" }}>🚪 Sign Out</div>
                            <p style={{ fontSize: "14px", opacity: 0.7, marginBottom: "14px", marginTop: "4px" }}>
                                You'll be returned to the login screen.
                            </p>
                            <button
                                onClick={handleSignOut}
                                style={{
                                    background: "#fff0f0",
                                    color: "#c0392b",
                                    border: "1.5px solid #f5c0c0",
                                    borderRadius: "8px",
                                    padding: "8px 20px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontSize: "14px"
                                }}
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}