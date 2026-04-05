import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; //M: added for navigation
import "../CSS/Dashboard.css";

const tabs = ["Open", "Assigned", "My Chores", "Completed"] as const;
type Tab = typeof tabs[number];

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>("Open");
    const [activeSideItem, setActiveSideItem] = useState("Open Chores");
    const navigate = useNavigate(); //M: added for navigation

    // get the logged-in user's id that we saved during login
    const userId = localStorage.getItem("userId");

    // stores chores assigned to this user (from backend)
    const [myChores, setMyChores] = useState<any[]>([]);

    // stores chores that are still unassigned
    const [openChores, setOpenChores] = useState<any[]>([]);

    // stores completed chores
    const [completedChores, setCompletedChores] = useState<any[]>([]);

    // stores all actively assigned chores in household
    const [assignedChores, setAssignedChores] = useState<any[]>([]);

    const refreshAll = async () => {
        const householdId = localStorage.getItem("householdId");

        if (!householdId) return;

        try {
            const [openRes, assignedRes, myRes, completedRes] = await Promise.all([
                fetch(`http://localhost:5000/api/chores/open?HouseholdID=${householdId}`),
                fetch(`http://localhost:5000/api/chores/assigned?HouseholdID=${householdId}`),
                fetch(`http://localhost:5000/api/chores/my?UserID=${userId}&HouseholdID=${householdId}`),
                fetch(`http://localhost:5000/api/chores/completed?UserID=${userId}&HouseholdID=${householdId}`)
            ]);

            const openData = await openRes.json();
            const assignedData = await assignedRes.json();
            const myData = await myRes.json();
            const completedData = await completedRes.json();

            if (openData.error === "") setOpenChores(openData.results);
            if (assignedData.error === "") setAssignedChores(assignedData.results);
            if (myData.error === "") setMyChores(myData.results);
            if (completedData.error === "") setCompletedChores(completedData.results);

        } catch (e) {
            console.log(e);
        }
    };
    
    useEffect(() => {
        if (userId) {
            refreshAll();
        }
    }, [userId]);

    const handleCreateChore = async () => {
        const Title = prompt("Enter chore title:");
        if (!Title) return;

        const Description = prompt("Enter description:") || "";
        const DueDate = prompt("Enter due date (YYYY-MM-DD):") || "";
        const Priority = prompt("Enter priority (low, medium, high):") || "medium";

        try {
            const householdId = localStorage.getItem("householdId");
            const createdByUserId = localStorage.getItem("userId");

            const res = await fetch("http://localhost:5000/api/chores", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    HouseholdID: Number(householdId),
                    Title,
                    Description,
                    DueDate,
                    Priority,
                    CreatedByUserID: Number(createdByUserId)
                })
            });

            const data = await res.json();

            if (data.error === "") {
                await refreshAll();
                setActiveTab("Open");
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.log(e);
        }
    };

    // sends a request to backend to claim a chore for current user
    const handleClaim = async (choreId: number) => {
        try {
            const res = await fetch(`http://localhost:5000/api/chores/${choreId}/claim`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    AssignedToUserID: Number(userId)
                })
            });

            const data = await res.json();

            if (data.error === "") {
                await refreshAll();
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.log(e);
        }
    };

    // marks a chore as completed for current user
    const handleComplete = async (choreId: number) => {
        try {
            const res = await fetch(`http://localhost:5000/api/chores/${choreId}/complete`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    CompletedByUserID: Number(userId)
                })
            });

            const data = await res.json();

            if (data.error === "") {
                await refreshAll();
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.log(e);
        }
    };


    // ── TODO: replace with real data from API ──
    // choose which list to show based on the active tab
    const chores =
        activeTab === "Open"
            ? openChores
            : activeTab === "Assigned"
            ? assignedChores
            : activeTab === "My Chores"
            ? myChores
            : activeTab === "Completed"
            ? completedChores
            : [];
    const housemates: any[] = [];
    const houseName = "";
    const currentUser = "";
    const stats = [
        { num: openChores.length, label: "Open chores" },
        { num: myChores.length, label: "My chores" },
        { num: 0, label: "Overdue" }, // leave for now
        { num: completedChores.length, label: "Done this month" },
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
                        onClick={() => {
                            setActiveSideItem(label);

                            // switch tabs on the dashboard page
                            if (label === "My Chores") {
                                setActiveTab("My Chores");
                                navigate("/dashboard");
                            }

                            if (label === "Open Chores") {
                                setActiveTab("Open");
                                navigate("/dashboard");
                            }

                            if (label === "Assigned") {
                                setActiveTab("Assigned");
                                navigate("/dashboard");
                            }
                        }}
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
                    <button className="tb-btn" onClick={handleCreateChore}>
                    + Create Chore
                    </button>
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
                                        <div className="card-title">{chore.Title}</div>
                                        <div className="card-meta">{chore.Description}</div>

                                        {chore.DueDate && (
                                            <div className="card-meta">Due: {chore.DueDate}</div>
                                        )}

                                        {chore.IsRecurring && (
                                            <div className="card-meta">🔁 Repeats</div>
                                        )}
                                    </div>
                                    <div className="card-right">
                                        <span className={`priority p-${chore.Priority?.toLowerCase()}`}>
                                            {chore.Priority}
                                        </span>
                                        {activeTab === "Open" && (
                                            <button
                                                className="claim-btn"
                                                onClick={() => handleClaim(chore.ChoreID)}
                                            >
                                                Claim
                                            </button>
                                        )}
                                        {activeTab === "My Chores" && (
                                            <button
                                                className="done-btn"
                                                onClick={() => handleComplete(chore.ChoreID)}
                                            >
                                                Mark done
                                            </button>
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