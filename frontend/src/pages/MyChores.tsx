import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import "../CSS/Dashboard.css";

export default function MyChores() {
    const [activeSideItem, setActiveSideItem] = useState("My Chores");
    const navigate = useNavigate();

    const [chores, setChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [currentUser, setCurrentUser] = useState("");
    const stats = [
        { num: 0, label: "Open chores" },
        { num: 0, label: "Mine today" },
        { num: 0, label: "Overdue" },
        { num: 0, label: "Done this month" },
    ];

    return (
        <div className="dash">

            {/* ── Sidebar ── */}
            <div className="sidebar">
                <div className="sb-brand">Our<em>Place</em></div>

                <div className="sb-house">
                    🏠 {houseName || "Your Household"}
                </div>

                <div
                    className={`sb-item ${activeSideItem === "Open Chores" ? "active" : ""}`}
                    onClick={() => {
                        setActiveSideItem("Open Chores");
                        navigate("/dashboard");
                    }}
                >
                    📋 Open Chores
                </div>

                <div
                    className={`sb-item ${activeSideItem === "Assigned" ? "active" : ""}`}
                    onClick={() => {
                        setActiveSideItem("Assigned");
                        navigate("/assigned");
                    }}
                >
                    📌 Assigned
                </div>

                <div
                    className={`sb-item active`}
                >
                    ✅ My Chores
                </div>

                <div className="sb-item">🔁 Recurring</div>
                <div className="sb-item">⚙️ Settings</div>

                <div className="sb-mates">
                    <div className="sb-mates-label">Housemates</div>

                    {housemates.length === 0 ? (
                        <div className="sb-empty-mates">No housemates yet</div>
                    ) : (
                        housemates.map((mate: any) => (
                            <div className="mate" key={mate.id}>
                                <div
                                    className="avatar"
                                    style={{ background: mate.avatarBg, color: mate.avatarColor }}
                                >
                                    {mate.initials}
                                </div>
                                <span className="mate-name">{mate.name}</span>
                                {mate.online && <div className="dot-on" />}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Main ── */}
            <div className="main">

                {/* Topbar */}
                <div className="topbar">
                    <div>
                        <div className="topbar-greet">
                            Good morning{currentUser ? `, ${currentUser}` : ", Jamie"} 👋
                        </div>
                        <div className="topbar-sub">
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric"
                            })}
                        </div>
                    </div>
                    <button className="tb-btn">+ Create Chore</button>
                </div>

                {/* Content */}
                <div className="content">

                    {/* Stats */}
                    <div className="stats-row">
                        {stats.map(({ num, label }) => (
                            <div className="stat" key={label}>
                                <div className="stat-num">{num}</div>
                                <div className="stat-lbl">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs (static highlight on My Chores) */}
                    <div className="tabs">
                        <div className="tab">Open</div>
                        <div className="tab">Assigned</div>
                        <div className="tab active">My Chores</div>
                        <div className="tab">Completed</div>
                    </div>

                    {/* Section Label */}
                    <div className="section-label">
                        MY CHORES TODAY & UPCOMING
                    </div>

                    {/* Chores */}
                    {chores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <div className="empty-text">
                                You have no chores assigned to you.
                            </div>
                        </div>
                    ) : (
                        <div className="cards">
                            {chores.map((chore: any) => (
                                <div className="card" key={chore._id}>

                                    <div className="card-body">
                                        <div className="card-title">{chore.title}</div>
                                        <div className="card-meta">
                                            {chore.description}
                                            <br />
                                            Assigned to: {chore.assignedTo}
                                        </div>
                                    </div>

                                    <div className="card-right">
                                        <span className={`priority p-${chore.priority?.toLowerCase()}`}>
                                            {chore.priority}
                                        </span>

                                        <button className="done-btn">
                                            Mark as Complete
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}