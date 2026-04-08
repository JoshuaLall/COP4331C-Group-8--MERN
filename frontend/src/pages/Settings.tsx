import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

export default function Settings() {
    const navigate = useNavigate();
    const [activeSideItem, setActiveSideItem] = useState("Settings");

    // 🔑 IDs (from your existing app)
    const userId = Number(localStorage.getItem("userId"));
    const householdId = Number(localStorage.getItem("householdId"));

    // ── USER ──
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");

    // ── HOUSEHOLD ──
    const [inviteEmail, setInviteEmail] = useState("");
    const [members, setMembers] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");

    const sideItems = [
        { icon: "📋", label: "Open Chores" },
        { icon: "📌", label: "Assigned" },
        { icon: "✅", label: "My Chores" },
        { icon: "🔁", label: "Recurring" },
        { icon: "⚙️", label: "Settings" },
    ];

    // ─────────────────────────────
    // 🔹 LOAD USER + MEMBERS
    // ─────────────────────────────
    useEffect(() => {
    if (!userId) return;

    // GET USER
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

                    // 🔥 GET HOUSEHOLD NAME
                    fetch(`http://localhost:5000/api/households/${hId}`)
                        .then(res => res.json())
                        .then(hData => {
                            if (!hData.error) {
                                setHouseName(hData.result.HouseholdName);
                            }
                        });

                    // 🔥 GET HOUSEMATES
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
                body: JSON.stringify({
                    FirstName: firstName,
                    LastName: lastName,
                    Email: email
                })
            });

            const data = await res.json();

            if (data.error) {
                alert(data.error);
            } else {
                alert("Profile updated!");
            }
        } catch (err) {
            console.log(err);
        }
    };

    // ─────────────────────────────
    // 🔹 INVITE USER
    // ─────────────────────────────
    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;

        try {
            const res = await fetch(
                `http://localhost:5000/api/households/${householdId}/invite`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ Email: inviteEmail })
                }
            );

            const data = await res.json();

            if (data.error) {
                alert(data.error);
            } else {
                alert(`Invite code: ${data.InviteCode}`);
                setInviteEmail("");
            }
        } catch (err) {
            console.log(err);
        }
    };

    // ─────────────────────────────
    // 🔹 REMOVE USER (UI ONLY — backend missing endpoint)
    // ─────────────────────────────
    const handleRemove = (id: number) => {
        alert("Remove endpoint not implemented yet");
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
            </div>

            {/* ───────── MAIN ───────── */}
            <div className="main">

                <div className="topbar">
                    <div>
                        <div className="topbar-greet">⚙️ Settings</div>
                        <div className="topbar-sub">
                            Manage your account & household
                        </div>
                    </div>
                </div>

                <div className="content">

                    {/* PROFILE */}
                    <div className="card" style={{ marginBottom: "20px" }}>
                        <div className="card-body">
                            <div className="card-title">👤 Profile</div>

                            <input
                                className="modal-inp"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First Name"
                            />

                            <input
                                className="modal-inp"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last Name"
                                style={{ marginTop: "10px" }}
                            />

                            <input
                                className="modal-inp"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                style={{ marginTop: "10px" }}
                            />

                            <button
                                className="tb-btn"
                                onClick={handleSave}
                                style={{ marginTop: "15px" }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* HOUSEHOLD */}
                    <div className="card">
                        <div className="card-body">
                            <div className="card-title">🏠 Household</div>

                            {/* INVITE */}
                            <div style={{ display: "flex", gap: "10px" }}>
                                <input
                                    className="modal-inp"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="Invite by email..."
                                />

                                <button className="tb-btn" onClick={handleInvite}>
                                    Invite
                                </button>
                            </div>

                            {/* MEMBERS */}
                            <div style={{ marginTop: "20px" }}>
                                {members.map((m) => (
                                    <div
                                        key={m.UserID}
                                        className="card"
                                        style={{
                                            marginTop: "10px",
                                            padding: "10px",
                                            display: "flex",
                                            justifyContent: "space-between"
                                        }}
                                    >
                                        <div>
                                            {m.FirstName} {m.LastName}
                                        </div>

                                        <button
                                            className="modal-cancel"
                                            onClick={() => handleRemove(m.UserID)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}