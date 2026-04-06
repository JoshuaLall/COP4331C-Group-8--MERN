import { useState } from "react";
import { useNavigate } from "react-router-dom"; //M: added for navigation
import "../CSS/Dashboard.css";

const tabs = ["Open", "Assigned", "My Chores", "Completed"] as const;
type Tab = typeof tabs[number];

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>("Open");
    const [activeSideItem, setActiveSideItem] = useState("Open Chores");
    const [choreTitle, setChoreTitle] = useState("");
    const [choreDesc, setChoreDesc] = useState("");
    const [choreDue, setChoreDue] = useState("");
    const [chorePriority, setChorePriority] = useState("medium");
    const [choreAssignees, setChoreAssignees] = useState<number[]>([]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate(); //M: added for navigation

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

    const resetModal = () => {
        setShowModal(false);
        setChoreTitle("");
        setChoreDesc("");
        setChoreDue("");
        setChorePriority("medium");
        setChoreAssignees([]);
        setIsRecurring(false);
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
        
        try {
            await fetch("http://localhost:5000/api/chores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                Title: choreTitle,
                Description: choreDesc,
                DueDate: choreDue || null,
                Priority: chorePriority,
                AssignedToUserID: choreAssignees[0] || null
            })
         });
        
         resetModal();
         navigate(0);
    } catch (e) {
        console.log("Error creating chore:", e);
    }
};

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
                            if (label === "Open Chores") navigate("/dashboard");
                            if (label === "Assigned") navigate("/assigned");
                            if (label === "My Chores") navigate("/my-chores");
                            if (label === "Recurring") navigate("/recurring");
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
                    <button className="tb-btn" onClick={() => setShowModal(true)}>
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
                                onClick={() => {
                                    setActiveTab(tab);
                                    if (tab === "Open") navigate("/dashboard");
                                    if (tab === "Assigned") navigate("/assigned");
                                    if (tab === "My Chores") navigate("/my-chores");
                                    if (tab === "Completed") navigate("/dashboard"); //M: no completed page yet, so just stay on dashboard for now
                                    }}
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
                    Assign To <span className="modal-lbl-hint">(leave blank for open list)</span>
                </label>

                {housemates.length === 0 ? (
                    <div className="modal-no-mates">
                        No housemates yet — goes to Open list
                    </div>
                ) : (
                    <div className="modal-mates-row">
                        {housemates.map((mate: any) => {
                            const selected = choreAssignees.includes(mate.UserID);
                            return (
                                <div
                                    key={mate.UserID}
                                    className={`modal-mate-chip ${selected ? "selected" : ""}`}
                                    onClick={() => toggleAssignee(mate.UserID)}
                                >
                                    {mate.FirstName}
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
            </div>

            <div className="modal-footer">
                <button className="modal-cancel" onClick={resetModal}>
                    Cancel
                </button>
                <button
                    className="modal-submit"
                    onClick={handleSubmitChore}
                >
                    🏡 Publish Chore
                </button>
                </div>
                </div>
                </div>
            )}
        </div>
    );
}