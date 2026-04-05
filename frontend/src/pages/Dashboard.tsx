import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

const tabs = ["Open", "Assigned", "My Chores", "Completed"] as const;
type Tab = typeof tabs[number];

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>("Open");
    const [activeSideItem, setActiveSideItem] = useState("Open Chores");
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const userId = localStorage.getItem("userId");
    const householdId = localStorage.getItem("householdId");

    const [myChores, setMyChores] = useState<any[]>([]);
    const [openChores, setOpenChores] = useState<any[]>([]);
    const [completedChores, setCompletedChores] = useState<any[]>([]);
    const [assignedChores, setAssignedChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [currentUser, setCurrentUser] = useState("");

    const [choreTitle, setChoreTitle] = useState("");
    const [choreDesc, setChoreDesc] = useState("");
    const [choreDue, setChoreDue] = useState("");
    const [chorePriority, setChorePriority] = useState("medium");
    const [choreAssignees, setChoreAssignees] = useState<number[]>([]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [repeatFrequency, setRepeatFrequency] = useState("weekly");
    const [repeatInterval, setRepeatInterval] = useState("1");
    const [submitting, setSubmitting] = useState(false);

    const fetchHousemates = async () => {
        if (!householdId) return;
        try {
            const res = await fetch(
                `http://localhost:5000/api/users/household/${householdId}`
            );
            const data = await res.json();
            if (data.error === "") {
                const others = data.results.filter(
                    (u: any) => String(u.UserID) !== String(userId)
                );
                setHousemates(others);
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
            const res = await fetch(
                `http://localhost:5000/api/households/${householdId}`
            );
            const data = await res.json();
            if (data.error === "") {
                setHouseName(data.result?.HouseholdName || "");
            }
        } catch (e) {
            console.log("Failed to fetch household:", e);
        }
    };

    const refreshAll = async () => {
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
            console.log("Failed to refresh chores:", e);
        }
    };

    useEffect(() => {
        if (userId && householdId) {
            refreshAll();
            fetchHousemates();
            fetchCurrentUser();
            fetchHousehold();
        }
    }, [userId, householdId]);

    const resetModal = () => {
        setChoreTitle("");
        setChoreDesc("");
        setChoreDue("");
        setChorePriority("medium");
        setChoreAssignees([]);
        setIsRecurring(false);
        setRepeatFrequency("weekly");
        setRepeatInterval("1");
        setShowModal(false);
    };

    const toggleAssignee = (id: number) => {
        setChoreAssignees(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmitChore = async () => {
        if (!choreTitle.trim()) {
            alert("Please enter a chore title.");
            return;
        }
        setSubmitting(true);
        try {
            if (isRecurring) {
                const res = await fetch("http://localhost:5000/api/recurring-chores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        HouseholdID: Number(householdId),
                        Title: choreTitle,
                        Description: choreDesc,
                        DefaultAssignedUserID: choreAssignees[0] || null,
                        RepeatFrequency: repeatFrequency,
                        RepeatInterval: Number(repeatInterval),
                        NextDueDate: choreDue || null,
                        CreatedByUserID: Number(userId)
                    })
                });
                const data = await res.json();
                if (data.error === "") {
                    await refreshAll();
                    resetModal();
                    setActiveTab("Assigned");
                } else {
                    alert(data.error);
                }
            } else {
                const res = await fetch("http://localhost:5000/api/chores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        HouseholdID: Number(householdId),
                        Title: choreTitle,
                        Description: choreDesc,
                        DueDate: choreDue || null,
                        Priority: chorePriority,
                        AssignedToUserID: choreAssignees[0] || null,
                        CreatedByUserID: Number(userId)
                    })
                });
                const data = await res.json();
                if (data.error === "") {
                    await refreshAll();
                    resetModal();
                    setActiveTab(choreAssignees.length > 0 ? "Assigned" : "Open");
                } else {
                    alert(data.error);
                }
            }
        } catch (e) {
            console.log("Failed to create chore:", e);
            alert("Something went wrong. Is the backend running?");
        }
        setSubmitting(false);
    };

    const handleClaim = async (choreId: number) => {
        try {
            const res = await fetch(`http://localhost:5000/api/chores/${choreId}/claim`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ AssignedToUserID: Number(userId) })
            });
            const data = await res.json();
            if (data.error === "") await refreshAll();
            else alert(data.error);
        } catch (e) { console.log(e); }
    };

    const handleComplete = async (choreId: number) => {
        try {
            const res = await fetch(`http://localhost:5000/api/chores/${choreId}/complete`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ CompletedByUserID: Number(userId) })
            });
            const data = await res.json();
            if (data.error === "") await refreshAll();
            else alert(data.error);
        } catch (e) { console.log(e); }
    };

    const chores =
        activeTab === "Open" ? openChores
            : activeTab === "Assigned" ? assignedChores
                : activeTab === "My Chores" ? myChores
                    : completedChores;

    const stats = [
        { num: openChores.length, label: "Open chores" },
        { num: myChores.length, label: "My chores" },
        { num: 0, label: "Overdue" },
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
        return (first + last).toUpperCase() || mate.Username?.[0]?.toUpperCase() || "?";
    };

    const getDisplayName = (mate: any) =>
        mate.FirstName
            ? `${mate.FirstName} ${mate.LastName || ""}`.trim()
            : mate.Username || "Unknown";

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
                            if (label === "Open Chores") { setActiveTab("Open"); navigate("/dashboard"); }
                            if (label === "Assigned") { setActiveTab("Assigned"); navigate("/dashboard"); }
                            if (label === "My Chores") { setActiveTab("My Chores"); navigate("/dashboard"); }
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
                            Welcome back{currentUser ? `, ${currentUser}` : ""} 👋
                        </div>
                        <div className="topbar-sub">
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long", month: "long", day: "numeric"
                            })}
                        </div>
                    </div>
                    <button className="tb-btn" onClick={() => setShowModal(true)}>
                        + Create Chore
                    </button>
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
                        {(["Open", "Assigned", "My Chores", "Completed"] as Tab[]).map((tab) => (
                            <div
                                key={tab}
                                className={`tab ${activeTab === tab ? "active" : ""}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>

                    {chores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">{emptyMessages[activeTab].icon}</div>
                            <div className="empty-text">{emptyMessages[activeTab].text}</div>
                            {activeTab === "Open" && (
                                <button
                                    className="tb-btn"
                                    style={{ marginTop: "16px" }}
                                    onClick={() => setShowModal(true)}
                                >
                                    + Create the first chore
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="cards">
                            {chores.map((chore: any) => (
                                <div
                                    className={`card ${chore.overdue ? "overdue" : ""}`}
                                    key={chore.ChoreID}
                                >
                                    <div className="card-body">
                                        <div className="card-title">{chore.Title}</div>
                                        {chore.Description && (
                                            <div className="card-meta">{chore.Description}</div>
                                        )}
                                        {chore.DueDate && (
                                            <div className="card-meta">📅 Due: {chore.DueDate}</div>
                                        )}
                                        {chore.IsRecurring && (
                                            <div className="card-meta">
                                                🔁{" "}
                                                {chore.RepeatInterval > 1
                                                    ? `Every ${chore.RepeatInterval} ${chore.RepeatFrequency === "daily" ? "days"
                                                        : chore.RepeatFrequency === "weekly" ? "weeks"
                                                            : "months"
                                                    }`
                                                    : `${chore.RepeatFrequency}`}
                                            </div>
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

            {showModal && (
                <div className="modal-overlay" onClick={resetModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>

                        <div className="modal-header">
                            <div className="modal-title">🏡 New Chore</div>
                            <button className="modal-close" onClick={resetModal}>✕</button>
                        </div>

                        <div className="modal-body">

                            <label className="modal-lbl">Chore Title *</label>
                            <input
                                className="modal-inp"
                                placeholder="e.g. Take out the trash"
                                value={choreTitle}
                                onChange={(e) => setChoreTitle(e.target.value)}
                            />

                            <label className="modal-lbl">Description</label>
                            <textarea
                                className="modal-inp modal-textarea"
                                placeholder="Any extra details..."
                                value={choreDesc}
                                onChange={(e) => setChoreDesc(e.target.value)}
                            />

                            <div className="modal-row">
                                <div className="modal-col">
                                    <label className="modal-lbl">Due Date</label>
                                    <input
                                        className="modal-inp"
                                        type="date"
                                        value={choreDue}
                                        onChange={(e) => setChoreDue(e.target.value)}
                                    />
                                </div>
                                <div className="modal-col">
                                    <label className="modal-lbl">Priority</label>
                                    <select
                                        className="modal-inp modal-select"
                                        value={chorePriority}
                                        onChange={(e) => setChorePriority(e.target.value)}
                                    >
                                        <option value="low">🟢 Low</option>
                                        <option value="medium">🟡 Medium</option>
                                        <option value="high">🔴 High</option>
                                    </select>
                                </div>
                            </div>

                            <label className="modal-lbl">
                                Assign To{" "}
                                <span className="modal-lbl-hint">(leave blank for open list)</span>
                            </label>
                            {housemates.length === 0 ? (
                                <div className="modal-no-mates">
                                    No housemates in this household yet — chore will go to Open list
                                </div>
                            ) : (
                                <div className="modal-mates-row">
                                    {housemates.map((mate: any) => {
                                        const style = getAvatarStyle(getDisplayName(mate));
                                        const selected = choreAssignees.includes(mate.UserID);
                                        return (
                                            <div
                                                key={mate.UserID}
                                                className={`modal-mate-chip ${selected ? "selected" : ""}`}
                                                style={selected ? {} : { borderColor: style.bg }}
                                                onClick={() => toggleAssignee(mate.UserID)}
                                            >
                                                <span
                                                    className="chip-avatar"
                                                    style={{
                                                        background: selected ? "rgba(255,255,255,0.25)" : style.bg,
                                                        color: selected ? "#F2EBD9" : style.color
                                                    }}
                                                >
                                                    {getInitials(mate)}
                                                </span>
                                                {getDisplayName(mate)}
                                                {selected && <span className="chip-check">✓</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="modal-toggle-row">
                                <label className="modal-lbl" style={{ margin: 0 }}>
                                    Recurring chore?
                                </label>
                                <div
                                    className={`toggle ${isRecurring ? "on" : ""}`}
                                    onClick={() => setIsRecurring(!isRecurring)}
                                >
                                    <div className="toggle-thumb" />
                                </div>
                            </div>

                            {isRecurring && (
                                <div className="modal-recurring">
                                    <div className="modal-row">
                                        <div className="modal-col">
                                            <label className="modal-lbl">Repeat every</label>
                                            <input
                                                className="modal-inp"
                                                type="number"
                                                min="1"
                                                value={repeatInterval}
                                                onChange={(e) => setRepeatInterval(e.target.value)}
                                            />
                                        </div>
                                        <div className="modal-col">
                                            <label className="modal-lbl">Period</label>
                                            <select
                                                className="modal-inp modal-select"
                                                value={repeatFrequency}
                                                onChange={(e) => setRepeatFrequency(e.target.value)}
                                            >
                                                <option value="daily">Day(s)</option>
                                                <option value="weekly">Week(s)</option>
                                                <option value="monthly">Month(s)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="modal-recurring-preview">
                                        🔁 Repeats every {repeatInterval}{" "}
                                        {repeatFrequency === "daily" ? "day" : repeatFrequency === "weekly" ? "week" : "month"}
                                        {Number(repeatInterval) > 1 ? "s" : ""}
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="modal-footer">
                            <button className="modal-cancel" onClick={resetModal}>
                                Cancel
                            </button>
                            <button
                                className="modal-submit"
                                onClick={handleSubmitChore}
                                disabled={submitting}
                            >
                                {submitting ? "Publishing..." : "🏡 Publish Chore"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}