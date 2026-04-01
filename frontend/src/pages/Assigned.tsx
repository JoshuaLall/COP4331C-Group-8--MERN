import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

export default function Assigned() {
    const [activeSideItem, setActiveSideItem] = useState("Assigned");
    const navigate = useNavigate();

    // ── STATE (ready for API later) ──
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
                    🏠 {houseName}
                </div>

                <div
                    className="sb-item"
                    onClick={() => {
                        setActiveSideItem("Open Chores");
                        navigate("/dashboard");
                    }}
                >
                    📋 Open Chores
                </div>

                <div className="sb-item active">
                    📌 Assigned
                </div>

                <div
                    className="sb-item"
                    onClick={() => {
                        setActiveSideItem("My Chores");
                        navigate("/my-chores");
                    }}
                >
                    ✅ My Chores
                </div>

                <div className="sb-item">🔁 Recurring</div>
                <div className="sb-item">⚙️ Settings</div>

                <div className="sb-mates">
                    <div className="sb-mates-label">Housemates</div>

                    {housemates.map((mate: any) => (
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
                    ))}
                </div>
            </div>

            {/* ── Main ── */}
            <div className="main">

                {/* Topbar */}
                <div className="topbar">
                    <div>
                        <div className="topbar-greet">
                            Good morning, {currentUser} 👋
                        </div>
                        <div className="topbar-sub">
                            Tuesday, March 31 • 5 chores due today
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

                    {/* Tabs */}
                    <div className="tabs">
                        <div className="tab">Open</div>
                        <div className="tab active">Assigned</div>
                        <div className="tab">My Chores</div>
                        <div className="tab">Completed</div>
                    </div>

                    {/* Section Label */}
                    <div className="section-label">
                        ASSIGNED TO: HOUSEMATES
                    </div>

                    {/* Chores */}
                    {chores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📌</div>
                            <div className="empty-text">
                                No chores assigned yet.
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