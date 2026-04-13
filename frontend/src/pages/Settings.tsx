import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

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

export default function Settings() {
    const navigate = useNavigate();
    const [activeSideItem, setActiveSideItem] = useState("Settings");
    const token = localStorage.getItem("token");

    const userId = Number(localStorage.getItem("userId"));
    const householdId = Number(localStorage.getItem("householdId"));

    // USER
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [login, setLogin] = useState("");
    const [email, setEmail] = useState("");
    const [initialEmail, setInitialEmail] = useState("");
    const [saveMessage, setSaveMessage] = useState("");

    // PASSWORD
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [pwMessage, setPwMessage] = useState("");

    // HOUSEHOLD
    const [inviteEmail, setInviteEmail] = useState("");
    const [members, setMembers] = useState<any[]>([]);
    const [inviteCode, setInviteCode] = useState("");
    const [inviteMode, setInviteMode] = useState<"email" | "code">("email");
    const [inviteMessage, setInviteMessage] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [deleteMessage, setDeleteMessage] = useState("");
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [transferInviteCode, setTransferInviteCode] = useState("");
    const [transferMessage, setTransferMessage] = useState("");
    const [isTransferring, setIsTransferring] = useState(false);
    const [newHouseholdName, setNewHouseholdName] = useState("");
    const [createHouseholdMessage, setCreateHouseholdMessage] = useState("");
    const [isCreatingHousehold, setIsCreatingHousehold] = useState(false);

    const passwordChecks = getPasswordChecks(newPassword);

    const sideItems = [
        { icon: "📊", label: "Overview" },
        { icon: "📋", label: "Open Chores" },
        { icon: "📌", label: "Assigned" },
        { icon: "✅", label: "My Chores" },
        { icon: "🏁", label: "Completed" },
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

    useEffect(() => {
        if (!userId) return;
        if (!token) {
            navigate("/");
            return;
        }

        fetch(`${API_BASE}/users/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then((res) => res.json())
            .then((data) => {
                if (!data.error) {
                    setFirstName(data.result.FirstName || "");
                    setLastName(data.result.LastName || "");
                    setLogin(data.result.Login || "");
                    setEmail(data.result.Email || "");
                    setInitialEmail(data.result.Email || "");

                    const hId = data.result.HouseholdID;
                    if (hId) {
                        localStorage.setItem("householdId", String(hId));

                        fetch(`${API_BASE}/households/${hId}`, {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        })
                            .then((res) => res.json())
                            .then((hData) => {
                                if (!hData.error) setHouseName(hData.result.HouseholdName || "");
                            });

                        fetch(`${API_BASE}/users/household/${hId}`, {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        })
                            .then((res) => res.json())
                            .then((mData) => {
                                if (!mData.error) {
                                    setMembers(mData.results || []);
                                    setHousemates(mData.results || []);
                                }
                            });
                    }
                }
            })
            .catch((err) => console.log(err));
    }, [navigate, token, userId]);

    const handleSave = async () => {
        try {
            const token = localStorage.getItem("token");

            const res = await fetch(`${API_BASE}/users/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    FirstName: firstName,
                    LastName: lastName,
                    Login: login,
                    Email: email
                })
            });

            const data = await res.json();
            const emailChanged = email.trim().toLowerCase() !== initialEmail.trim().toLowerCase();

            if (data.error) {
                setSaveMessage("❌ " + data.error);
            } else {
                setMembers((prev) =>
                    prev.map((m) =>
                        m.UserID === userId
                            ? { ...m, FirstName: firstName, LastName: lastName, Login: login, Email: email }
                            : m
                    )
                );

                setHousemates((prev) =>
                    prev.map((m) =>
                        m.UserID === userId
                            ? { ...m, FirstName: firstName, LastName: lastName, Login: login, Email: email }
                            : m
                    )
                );

                setSaveMessage("Check your inbox to verify your new email. Your profile will update once verification is complete.");
                if (emailChanged) {
                    setInitialEmail(email);
                }

                setTimeout(() => setSaveMessage(""), 10000);
            }
        } catch (err) {
            console.log(err);
            setSaveMessage("❌ Something went wrong.");
        }
    };

    const handleChangePassword = async () => {
        setPwMessage("");

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPwMessage("❌ Fill all password fields.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPwMessage("❌ New passwords do not match.");
            return;
        }

        const hasFailed = passwordChecks.some((check) => !check.passed);
        if (hasFailed) {
            setPwMessage("❌ Password does not meet all requirements.");
            return;
        }

        try {
            const token = localStorage.getItem("token");

            const res = await fetch(`${API_BASE}/auth/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    CurrentPassword: currentPassword,
                    NewPassword: newPassword
                })
            });

            const data = await res.json();

            if (data.error) {
                setPwMessage("❌ " + data.error);
                return;
            }

            setPwMessage("✅ Password updated.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setTimeout(() => setPwMessage(""), 3000);
        } catch (err) {
            console.log(err);
            setPwMessage("❌ Something went wrong.");
        }
    };

    const handleRenameHousehold = async () => {
        try {
            const token = localStorage.getItem("token");

            const res = await fetch(`${API_BASE}/households/${householdId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ HouseholdName: houseName })
            });

            const data = await res.json();
            if (data.error) {
                alert(data.error);
            }
        } catch (err) {
            console.log(err);
        }
    };

    const handleInvite = async (modeOverride?: "email" | "code") => {
        const mode = modeOverride ?? inviteMode;
        setInviteMessage("");

        if (mode === "email" && !inviteEmail.trim()) {
            setInviteMessage("Enter an email first.");
            return;
        }

        try {
            setIsInviting(true);
            const token = localStorage.getItem("token");
            const body = mode === "email" ? { Email: inviteEmail.trim() } : {};

            const res = await fetch(`${API_BASE}/households/${householdId}/invite`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

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

    const handleRemove = async () => {
        const isOnlyMember = members.length === 1;
        const confirmMessage = isOnlyMember
            ? "You are the only member in this household. Leaving will delete this household and its chores.\n\nPress OK to leave, or Cancel to stay."
            : "Are you sure you want to leave this household?\n\nPress OK to leave, or Cancel to stay.";

        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const currentUserId = localStorage.getItem("userId");

            const res = await fetch(`${API_BASE}/users/${currentUserId}/remove-from-household`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (data.error) {
                alert(data.error);
                return;
            }

            localStorage.setItem("householdId", "");
            alert("You left the household");
            window.location.href = "/";
        } catch (e) {
            alert("Something went wrong");
        }
    };

    const handleSignOut = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("householdId");
        navigate("/");
    };

    const handleCreateHousehold = async () => {
        if (!newHouseholdName.trim()) {
            setCreateHouseholdMessage("❌ Please enter a household name");
            return;
        }

        setIsCreatingHousehold(true);
        setCreateHouseholdMessage("");

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/households`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    HouseholdName: newHouseholdName,
                    UserID: userId
                })
            });

            const data = await res.json();

            if (data.error) {
                setCreateHouseholdMessage(`❌ ${data.error}`);
            } else {
                localStorage.setItem("householdId", String(data.HouseholdID));
                setCreateHouseholdMessage(`✅ Household "${newHouseholdName}" created!`);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
            setCreateHouseholdMessage("❌ Failed to create household");
        } finally {
            setIsCreatingHousehold(false);
        }
    };

    const handleTransferHousehold = async () => {
        setTransferMessage("");

        const inviteCode = transferInviteCode.trim().toUpperCase();
        if (!inviteCode) {
            setTransferMessage("❌ Enter an invite code first.");
            return;
        }

        const confirmed = window.confirm(
            "Transfer to a new household?\n\nYou will leave your current household, and any chores assigned to you there will become unassigned/open."
        );
        if (!confirmed) {
            return;
        }

        try {
            setIsTransferring(true);
            const token = localStorage.getItem("token");
            const currentUserId = Number(localStorage.getItem("userId"));

            const res = await fetch(`${API_BASE}/households/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    InviteCode: inviteCode,
                    UserID: currentUserId
                })
            });

            const data = await res.json();

            if (data.error) {
                setTransferMessage("❌ " + data.error);
                return;
            }

            if (data.HouseholdID) {
                localStorage.setItem("householdId", String(data.HouseholdID));
            }

            setTransferMessage("✅ Household transferred.");
            setTransferInviteCode("");
            window.location.href = "/overview";
        } catch (err) {
            console.log(err);
            setTransferMessage("❌ Something went wrong.");
        } finally {
            setIsTransferring(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            "Delete your account permanently?\n\nThis will remove your account and you will leave your household. This action cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        try {
            setIsDeletingAccount(true);
            setDeleteMessage("");

            const token = localStorage.getItem("token");
            const currentUserId = localStorage.getItem("userId");

            const res = await fetch(`${API_BASE}/users/${currentUserId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (data.error) {
                setDeleteMessage("❌ " + data.error);
                return;
            }

            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            localStorage.removeItem("householdId");
            alert("Your account has been deleted.");
            navigate("/");
        } catch (err) {
            console.log(err);
            setDeleteMessage("❌ Something went wrong.");
        } finally {
            setIsDeletingAccount(false);
        }
    };

    return (
        <div className="dash">
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
                            if (label === "Overview") navigate("/overview");
                            if (label === "Open Chores") navigate("/dashboard");
                            if (label === "Assigned") navigate("/assigned");
                            if (label === "My Chores") navigate("/my-chores");
                            if (label === "Completed") navigate("/completed");
                            if (label === "Recurring") navigate("/recurring");
                            if (label === "Settings") navigate("/settings");
                        }}
                    >
                        {icon}{" "}{label}
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

            <div className="main">
                <div className="topbar">
                    <div>
                        <div className="topbar-greet">⚙️ Settings</div>
                        <div className="topbar-sub">Manage your account & household</div>
                    </div>
                </div>

                <div className="content">
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
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                placeholder="Username"
                                style={{ marginTop: "10px", width: "100%" }}
                            />

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

                    {/* CREATE HOUSEHOLD SECTION - Only show when user is NOT in a household */}
                    {!householdId && (
                        <div className="card" style={{ marginBottom: "20px", borderColor: "#d4edda" }}>
                            <div className="card-body">
                                <div className="card-title" style={{ color: "#155724" }}>🏠 Create a Household</div>
                                <p style={{ fontSize: "14px", opacity: 0.78, marginBottom: "14px", marginTop: "4px" }}>
                                    You're not in a household yet. Create one to start managing chores with others.
                                </p>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <input
                                        className="modal-inp"
                                        value={newHouseholdName}
                                        onChange={(e) => setNewHouseholdName(e.target.value)}
                                        placeholder="Enter household name"
                                        style={{ flex: 1 }}
                                        onKeyDown={(e) => e.key === "Enter" && handleCreateHousehold()}
                                    />
                                    <button
                                        onClick={handleCreateHousehold}
                                        disabled={isCreatingHousehold}
                                        className="tb-btn"
                                        type="button"
                                    >
                                        {isCreatingHousehold ? "Creating..." : "Create"}
                                    </button>
                                </div>
                                {createHouseholdMessage && (
                                    <div style={{ marginTop: "10px", fontSize: "14px", opacity: 0.9 }}>
                                        {createHouseholdMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* HOUSEHOLD SECTIONS - Only show when user IS in a household */}
                    {householdId && (
                        <>
                    <div className="card" style={{ marginBottom: "20px" }}>
                        <div className="card-body">
                            <div className="card-title">🏠 Household Name</div>
                            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                <input
                                    className="modal-inp"
                                    value={houseName}
                                    onChange={(e) => setHouseName(e.target.value)}
                                    placeholder="Household name..."
                                    style={{ flex: 1 }}
                                />
                                <button className="tb-btn" onClick={handleRenameHousehold}>
                                    Rename
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: "20px" }}>
                        <div className="card-body">
                            <div className="card-title">🔐 Change Password</div>

                            <input
                                className="modal-inp"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Current Password"
                                style={{ width: "100%" }}
                            />

                            <input
                                className="modal-inp"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New Password"
                                style={{ marginTop: "10px", width: "100%" }}
                            />

                            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                {passwordChecks.map((check, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            color: check.passed ? "#0e5823" : "#9e2618",
                                            fontSize: "13px",
                                            fontWeight: 500
                                        }}
                                    >
                                        {check.passed ? "✓" : "✗"} {check.label}
                                    </div>
                                ))}
                            </div>

                            <input
                                className="modal-inp"
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="Confirm New Password"
                                style={{ marginTop: "10px", width: "100%" }}
                            />

                            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "15px" }}>
                                <button className="tb-btn" onClick={handleChangePassword}>
                                    Update Password
                                </button>
                                {pwMessage && (
                                    <span style={{ fontSize: "14px", opacity: 0.85 }}>{pwMessage}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: "20px" }}>
                        <div className="card-body">
                            <div className="card-title">🏠 Invite a Housemate</div>

                            <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                                <button
                                    className={inviteMode === "email" ? "tb-btn" : "modal-cancel"}
                                    onClick={() => {
                                        setInviteMode("email");
                                        setInviteMessage("");
                                        setInviteCode("");
                                    }}
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
                                    <button className="tb-btn" onClick={() => handleInvite()} disabled={isInviting}>
                                        {isInviting ? "Sending…" : "Send Invite"}
                                    </button>
                                </div>
                            )}

                            {inviteMode === "code" && inviteCode && (
                                <div
                                    style={{
                                        padding: "14px 16px",
                                        borderRadius: "10px",
                                        background: "#f6f2e3",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: "12px",
                                        border: "1px solid #d9cfc4"
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                                opacity: 0.8,
                                                marginBottom: "4px"
                                            }}
                                        >
                                            Invite Code
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "20px",
                                                fontWeight: 700,
                                                letterSpacing: "3px",
                                                fontFamily: "monospace"
                                            }}
                                        >
                                            {inviteCode}
                                        </div>
                                    </div>
                                    <button className="tb-btn" onClick={handleCopyInviteCode}>
                                        Copy
                                    </button>
                                </div>
                            )}

                            {inviteMessage && (
                                <div style={{ marginTop: "10px", fontSize: "14px", opacity: 0.8 }}>
                                    {inviteMessage}
                                </div>
                            )}
                        </div>
                    </div>

                    {members.length > 0 && (
                        <div className="card" style={{ marginBottom: "20px" }}>
                            <div className="card-body">
                                <div className="card-title">👥 Household Members</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                                    {members.map((m) => (
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
                                                    onClick={() => handleRemove()}
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
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ marginBottom: "20px", borderColor: "#f0dfc7" }}>
                        <div className="card-body">
                            <div className="card-title" style={{ color: "#7b4f18" }}>🔄 Transfer Household</div>
                            <p style={{ fontSize: "14px", opacity: 0.78, marginBottom: "14px", marginTop: "4px" }}>
                                Enter another household invite code to move your account there.
                            </p>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                <input
                                    className="modal-inp"
                                    value={transferInviteCode}
                                    onChange={(e) => setTransferInviteCode(e.target.value.toUpperCase())}
                                    placeholder="Enter invite code"
                                    style={{ flex: 1 }}
                                    onKeyDown={(e) => e.key === "Enter" && handleTransferHousehold()}
                                    maxLength={12}
                                />
                                <button
                                    onClick={handleTransferHousehold}
                                    disabled={isTransferring}
                                    className="tb-btn"
                                    type="button"
                                >
                                    {isTransferring ? "Transferring..." : "Transfer"}
                                </button>
                            </div>
                            {transferMessage && (
                                <div style={{ marginTop: "10px", fontSize: "14px", opacity: 0.9 }}>
                                    {transferMessage}
                                </div>
                            )}
                        </div>
                    </div>
                        </>
                    )}

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

                    <div className="card" style={{ marginBottom: "20px", borderColor: "#f5c0c0" }}>
                        <div className="card-body">
                            <div className="card-title" style={{ color: "#b0302a" }}>🗑️ Delete Account</div>
                            <p style={{ fontSize: "14px", opacity: 0.78, marginBottom: "14px", marginTop: "4px" }}>
                                Permanently delete your account. You will also be removed from your household.
                            </p>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeletingAccount}
                                style={{
                                    background: "#fff0f0",
                                    color: "#b0302a",
                                    border: "1.5px solid #efb1b1",
                                    borderRadius: "8px",
                                    padding: "8px 20px",
                                    fontWeight: 700,
                                    cursor: isDeletingAccount ? "not-allowed" : "pointer",
                                    fontSize: "14px",
                                    opacity: isDeletingAccount ? 0.7 : 1
                                }}
                            >
                                {isDeletingAccount ? "Deleting..." : "Delete Account"}
                            </button>
                            {deleteMessage && (
                                <div style={{ marginTop: "10px", fontSize: "14px", opacity: 0.9 }}>
                                    {deleteMessage}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}