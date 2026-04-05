import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

export default function Recurring() {
    const [activeSideItem, setActiveSideItem] = useState("Recurring");
    const navigate = useNavigate();

    const [recurringChores, setRecurringChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [currentUser, setCurrentUser] = useState("");

    const HOUSEHOLD_ID = 1; // ⚠️ Replace later with real user household

    // 🔹 Fetch recurring chores
    useEffect(() => {
        const fetchRecurringChores = async () => {
            try {
                const res = await fetch(
                    `http://localhost:5000/api/recurring-chores?HouseholdID=${HOUSEHOLD_ID}`
                );
                const data = await res.json();

                if (!data.error) {
                    setRecurringChores(data.results);
                }
            } catch (err) {
                console.error("Error fetching recurring chores:", err);
            }
        };

        fetchRecurringChores();
    }, []);

    // 🔹 Format frequency text
    const formatFrequency = (freq: string, interval: number) => {
        if (!freq) return "";

        const label =
            interval > 1
                ? `${freq} (every ${interval})`
                : freq;

        return label.charAt(0).toUpperCase() + label.slice(1);
    };

    return (
        <div className="dash">

            {/* ── Sidebar ── */}
            <div className="sidebar">
                <div className="sb-brand">Our<em>Place</em></div>

                <div className="sb-house">
                    🏠 {houseName || "Your Household"}
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

                <div
                    className="sb-item"
                    onClick={() => {
                        setActiveSideItem("Assigned");
                        navigate("/assigned");
                    }}
                >
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

                <div className="sb-item active">
                    🔁 Recurring
                </div>

                <div className="sb-item">
                    ⚙️ Settings
                </div>

                <div className="sb-mates">
                    <div className="sb-mates-label">Housemates</div>

                    {housemates.length === 0 ? (
                        <div className="sb-empty-mates">No housemates yet</div>
                    ) : (
                        housemates.map((mate: any) => (
                            <div className="mate" key={mate.id}>
                                <div
                                    className="avatar"
                                    style={{
                                        background: mate.avatarBg,
                                        color: mate.avatarColor
                                    }}
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
                            })} • Recurring chores
                        </div>
                    </div>

                    <button className="tb-btn">
                        + Create Chore
                    </button>
                </div>

                {/* Content */}
                <div className="content">

                    <div className="section-label" style={{ fontSize: "20px", marginBottom: "16px" }}>
                        Recurring Chores
                    </div>

                    {/* Chores */}
                    {recurringChores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔁</div>
                            <div className="empty-text">
                                No recurring chores yet.
                            </div>
                        </div>
                    ) : (
                        <div className="cards">
                            {recurringChores.map((chore: any) => (
                                <div className="card" key={chore.RecurringTemplateID}>

                                    <div className="card-body">
                                        <div className="card-title">
                                            {chore.Title}
                                        </div>

                                        <div className="card-meta">
                                            Assigned to: User {chore.DefaultAssignedUserID || "None"}
                                            <br />
                                            Occurrence: {formatFrequency(
                                                chore.RepeatFrequency,
                                                chore.RepeatInterval
                                            )}
                                            <br />
                                            Next Due: {chore.NextDueDate}
                                        </div>
                                    </div>

                                    <div className="card-right">

                                        <span className="priority p-med">
                                            Medium
                                        </span>

                                        <button className="claim-btn">
                                            Edit
                                        </button>

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