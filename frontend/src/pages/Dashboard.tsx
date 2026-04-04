import { useState } from "react";
import "../CSS/Dashboard.css";

const tabs = ["Open", "Assigned", "My Chores", "Completed"] as const;
type Tab = typeof tabs[number];

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>("Open");
    const [activeSideItem, setActiveSideItem] = useState("Open Chores");

    // ── TODO: replace with real data from API ──
    const chores: any[] = [];
    const housemates: any[] = [];
    const houseName = "";
    const currentUser = "";
    const stats = [
        { num: 0, label: "Open chores" },
        { num: 0, label: "Mine today" },
        { num: 0, label: "Overdue" },
        { num: 0, label: "Done this month" },
    ];

    const emptyMessages: Record<Tab, { icon: string; text: string }> = {
        Open: { icon: "🎉", text: "No open chores right now!" },
        Assigned: { icon: "📌", text: "No chores assigned yet." },
        "My Chores": { icon: "✅", text: "You have no chores assigned to you." },
        Completed: { icon: "🏡", text: "No completed chores yet this month." },
    };

    const sideItems = [
        { icon: "📋", label: "Open Chores" },
        { icon: "📌", label: "Assigned" },
        { icon: "✅", label: "My Chores" },
        { icon: "🔁", label: "Recurring" },
        { icon: "⚙️", label: "Settings" },
    ];

    return (
        <div className="dash">

            {/* ── Sidebar ── */}
            <div className="sidebar">
                <div className="sb-brand">Our<em>Place</em></div>

                {/* TODO: replace with real household name from API */}
                <div className="sb-house">
                    🏠 {houseName || "Your Household"}
                </div>

                {sideItems.map(({ icon, label }) => (
                    <div
                        key={label}
                        className={`sb-item ${activeSideItem === label ? "active" : ""}`}
                        onClick={() => setActiveSideItem(label)}
                    >
                        <span>{icon}</span>
                        {label}
                    </div>
                ))}

                <div className="sb-mates">
                    <div className="sb-mates-label">Housemates</div>

                    {/* TODO: replace with real housemates from API */}
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
                        {/* TODO: replace with real user name from API */}
                        <div className="topbar-greet">
                            Welcome back{currentUser ? `, ${currentUser}` : ""} 👋
                        </div>
                        <div className="topbar-sub">
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long", month: "long", day: "numeric"
                            })}
                        </div>
                    </div>
                    <button className="tb-btn">+ Create Chore</button>
                </div>

                {/* Content */}
                <div className="content">

                    {/* Stats — TODO: replace nums with real API data */}
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
                        {tabs.map((tab) => (
                            <div
                                key={tab}
                                className={`tab ${activeTab === tab ? "active" : ""}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>

                    {/* Chore list — TODO: replace with real chores from API */}
                    {chores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">{emptyMessages[activeTab].icon}</div>
                            <div className="empty-text">{emptyMessages[activeTab].text}</div>
                            {activeTab === "Open" && (
                                <button className="tb-btn" style={{ marginTop: "16px" }}>
                                    + Create the first chore
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="cards">
                            {chores.map((chore: any) => (
                                <div
                                    className={`card ${chore.overdue ? "overdue" : ""}`}
                                    key={chore._id}
                                >
                                    <div className="card-body">
                                        <div className="card-title">{chore.title}</div>
                                        <div className="card-meta">{chore.description}</div>
                                    </div>
                                    <div className="card-right">
                                        <span className={`priority p-${chore.priority?.toLowerCase()}`}>
                                            {chore.priority}
                                        </span>
                                        {activeTab === "Open" && (
                                            <button className="claim-btn">Claim</button>
                                        )}
                                        {activeTab === "My Chores" && (
                                            <button className="done-btn">Mark done</button>
                                        )}
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