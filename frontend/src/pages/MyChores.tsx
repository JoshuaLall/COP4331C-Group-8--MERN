import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

export default function MyChores() {
    const navigate = useNavigate();
    const [activeSideItem, setActiveSideItem] = useState("My Chores");

    const userId = localStorage.getItem("userId");
    const householdId = localStorage.getItem("householdId");

    const [myChores, setMyChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [currentUser, setCurrentUser] = useState("");

    const fetchMyChores = async () => {
        if (!userId || !householdId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/chores/my?UserID=${userId}&HouseholdID=${householdId}`);
            const data = await res.json();
            if (data.error === "") {
                setMyChores(data.results || []);
            }
        } catch (e) {
            console.log("Failed to load my chores:", e);
        }
    };

    const fetchHousemates = async () => {
        if (!householdId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/users/household/${householdId}`);
            const data = await res.json();
            if (data.error === "") {
                setHousemates(data.results || []);
            }
        } catch (e) {
            console.log("Failed to fetch housemates:", e);
        }
    };

    const fetchCurrentUser = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/users/${userId}`);
            const data = await res.json();
            if (data.error === "") {
                setCurrentUser(data.result?.FirstName || data.result?.Login || "");
            }
        } catch (e) {
            console.log("Failed to fetch user:", e);
        }
    };

    const fetchHousehold = async () => {
        if (!householdId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/households/${householdId}`);
            const data = await res.json();
            if (data.error === "") {
                setHouseName(data.result?.HouseholdName || "");
            }
        } catch (e) {
            console.log("Failed to fetch household:", e);
        }
    };

    useEffect(() => {
        if (!userId || !householdId) return;
        fetchMyChores();
        fetchHousemates();
        fetchCurrentUser();
        fetchHousehold();
    }, [userId, householdId]);

    const getAvatarStyle = (name: string) => {
        const colors = [
            { bg: "#C9DDED", color: "#185FA5" },
            { bg: "#FBEAF0", color: "#993556" },
            { bg: "#EAF3DE", color: "#3B6D11" },
            { bg: "#FDF3DC", color: "#9A7010" },
            { bg: "#FAECE7", color: "#8C4A3C" },
        ];
        const idx = name.charCodeAt(0) % colors.length;
        return colors[idx];
    };

    const getInitials = (mate: any) => {
        const first = mate.FirstName?.[0] || "";
        const last = mate.LastName?.[0] || "";
        return (first + last).toUpperCase() || mate.Login?.[0]?.toUpperCase() || "?";
    };

    const getDisplayName = (mate: any) =>
        mate.FirstName
            ? `${mate.FirstName} ${mate.LastName || ""}`.trim()
            : mate.Login || "Unknown";

    const handleComplete = async (choreId: number) => {
        if (!userId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/chores/${choreId}/complete`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ CompletedByUserID: Number(userId) })
            });
            const data = await res.json();
            if (data.error === "") {
                await fetchMyChores();
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.log("Failed to complete chore:", e);
        }
    };

    const stats = [
        { num: myChores.length, label: "My chores" },
        { num: myChores.filter((c: any) => c.DueDate === new Date().toISOString().split("T")[0]).length, label: "Due today" },
        { num: 0, label: "Overdue" },
        { num: 0, label: "Done this month" },
    ];

    return (
        <div className="dash">
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

                <div className="sb-item active">
                    ✅ My Chores
                </div>

                <div className="sb-item">🔁 Recurring</div>
                <div className="sb-item">⚙️ Settings</div>

                <div className="sb-mates">
                    <div className="sb-mates-label">Housemates</div>

                    {housemates.length === 0 ? (
                        <div className="sb-empty-mates">No housemates yet</div>
                    ) : (
                        housemates.map((mate: any) => {
                            const style = getAvatarStyle(getDisplayName(mate));
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
                        <div className="topbar-greet">
                            Good morning{currentUser ? `, ${currentUser}` : ""} 👋
                        </div>
                        <div className="topbar-sub">
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric"
                            })}
                        </div>
                    </div>
                    <button className="tb-btn" onClick={() => navigate("/dashboard")}>+ Create Chore</button>
                </div>

                <div className="content">
                    <div className="stats-row">
                        {stats.map(({ num, label }) => (
                            <div className="stat" key={label}>
                                <div className="stat-num">{num}</div>
                                <div className="stat-lbl">{label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="tabs">
                        <div className="tab" onClick={() => navigate("/dashboard")}>Open</div>
                        <div className="tab" onClick={() => navigate("/assigned")}>Assigned</div>
                        <div className="tab active">My Chores</div>
                        <div className="tab" onClick={() => navigate("/dashboard")}>Completed</div>
                    </div>

                    <div className="section-label">
                        MY CHORES TODAY & UPCOMING
                    </div>

                    {myChores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <div className="empty-text">
                                You have no chores assigned to you.
                            </div>
                        </div>
                    ) : (
                        <div className="cards">
                            {myChores.map((chore: any) => (
                                <div className="card" key={chore.ChoreID}>
                                    <div className="card-body">
                                        <div className="card-title">{chore.Title}</div>
                                        <div className="card-meta">
                                            {chore.Description || "No description"}
                                            {chore.DueDate && (
                                                <>
                                                    <br />
                                                    Due: {chore.DueDate}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-right">
                                        <span className={`priority p-${chore.Priority?.toLowerCase()}`}>
                                            {chore.Priority}
                                        </span>

                                        <button className="done-btn" onClick={() => handleComplete(chore.ChoreID)}>
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
