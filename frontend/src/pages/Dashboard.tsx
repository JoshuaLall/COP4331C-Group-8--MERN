import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

const tabs = ["Open", "Assigned", "My Chores", "Completed"] as const;
type Tab = typeof tabs[number];

export default function Dashboard() {
    const navigate = useNavigate();

    const userId = Number(localStorage.getItem("userId"));
    const householdId = Number(localStorage.getItem("householdId"));

    const [activeTab, setActiveTab] = useState<Tab>("Open");
    const [activeSideItem, setActiveSideItem] = useState("Open Chores");

    // ── Data state ──
    const [openChores, setOpenChores] = useState<any[]>([]);
    const [assignedChores, setAssignedChores] = useState<any[]>([]);
    const [myChores, setMyChores] = useState<any[]>([]);
    const [completedChores, setCompletedChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [currentUser, setCurrentUser] = useState("");

    // ── Modal state ──
    const [showModal, setShowModal] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);
    const [form, setForm] = useState({
        Title: "",
        Description: "",
        DueDate: "",
        Priority: "medium",
        AssignedToUserID: "",
        RepeatFrequency: "weekly"
    });

    // ================= FETCH =================

    const fetchOpenChores = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/chores/open?HouseholdID=${householdId}`
            );
            const data = await res.json();
            if (data.error === "") setOpenChores(data.results || []);
        } catch (e) {
            console.log("Failed to fetch open chores:", e);
        }
    };

    const fetchAssignedChores = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/chores/assigned?HouseholdID=${householdId}`
            );
            const data = await res.json();
            if (data.error === "") setAssignedChores(data.results || []);
        } catch (e) {
            console.log("Failed to fetch assigned chores:", e);
        }
    };

    const fetchMyChores = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/chores/my?UserID=${userId}&HouseholdID=${householdId}`
            );
            const data = await res.json();
            if (data.error === "") setMyChores(data.results || []);
        } catch (e) {
            console.log("Failed to fetch my chores:", e);
        }
    };

    const fetchCompletedChores = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/chores/completed?HouseholdID=${householdId}&UserID=${userId}`
            );
            const data = await res.json();
            if (data.error === "") setCompletedChores(data.results || []);
        } catch (e) {
            console.log("Failed to fetch completed chores:", e);
        }
    };

    const fetchHousemates = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/users/household/${householdId}`
            );
            const data = await res.json();
            if (data.error === "") setHousemates(data.results || []);
        } catch (e) {
            console.log("Failed to fetch housemates:", e);
        }
    };

    const fetchUser = async () => {
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

    const fetchAll = () => {
        fetchOpenChores();
        fetchAssignedChores();
        fetchMyChores();
        fetchCompletedChores();
        fetchHousemates();
        fetchUser();
        fetchHousehold();
    };

    useEffect(() => {
        if (!userId || !householdId) return;
        fetchAll();
    }, []);

    // ================= STATS =================

    const overdueCount = [...openChores, ...assignedChores].filter((c: any) =>
        c.DueDate && new Date(c.DueDate) < new Date() && c.Status !== "completed"
    ).length;

    const doneThisMonth = completedChores.filter((c: any) => {
        if (!c.CompletedAt) return false;
        const d = new Date(c.CompletedAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const stats = [
        { num: openChores.length + assignedChores.length, label: "Open chores" },
        {
            num: myChores.filter((c: any) => {
                if (!c.DueDate) return false;
                const due = new Date(c.DueDate);
                const now = new Date();
                return due.getDate() === now.getDate() &&
                due.getMonth() === now.getMonth() &&
                due.getFullYear() === now.getFullYear();
        }).length,
        label: "Mine today"
    },
    { num: overdueCount, label: "Overdue" },
    { num: doneThisMonth, label: "Done this month" }
  ];

    // ================= HELPERS =================

    const getAvatarStyle = (name: string) => {
        const colors = [
            { bg: "#C9DDED", color: "#185FA5" },
            { bg: "#FBEAF0", color: "#993556" },
            { bg: "#EAF3DE", color: "#3B6D11" },
            { bg: "#FDF3DC", color: "#9A7010" },
            { bg: "#FAECE7", color: "#8C4A3C" },
        ];
        const idx = (name?.charCodeAt(0) || 0) % colors.length;
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

    const getDisplayNameById = (id: number | null) => {
        if (!id) return "Unassigned";
        const mate = housemates.find((u: any) => Number(u.UserID) === Number(id));
        if (!mate) return `User #${id}`;
        return getDisplayName(mate);
    };

    // ================= MODAL =================

    const handleChange = (e: any) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const resetModal = () => {
        setShowModal(false);
        setIsRecurring(false);
        setForm({
            Title: "",
            Description: "",
            DueDate: "",
            Priority: "medium",
            AssignedToUserID: "",
            RepeatFrequency: "weekly"
        });
    };

    const handleSubmitChore = async () => {
        if (!form.Title.trim()) {
            alert("Please enter a chore title.");
            return;
        }

        try {
            if (isRecurring) {
                await fetch("http://localhost:5000/api/recurring-chores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        Title: form.Title,
                        Description: form.Description,
                        HouseholdID: householdId,
                        CreatedByUserID: userId,
                        RepeatFrequency: form.RepeatFrequency,
                        RepeatInterval: 1,
                        NextDueDate: form.DueDate || null,
                        DefaultAssignedUserID: form.AssignedToUserID
                            ? Number(form.AssignedToUserID)
                            : null,
                        Priority: form.Priority
                    })
                });
            } else {
                await fetch("http://localhost:5000/api/chores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        Title: form.Title,
                        Description: form.Description,
                        DueDate: form.DueDate || null,
                        Priority: form.Priority,
                        AssignedToUserID: form.AssignedToUserID
                            ? Number(form.AssignedToUserID)
                            : null,
                        HouseholdID: householdId,
                        CreatedByUserID: userId
                    })
                });
            }

            resetModal();
            fetchAll();
        } catch (e) {
            console.log("Error creating chore:", e);
        }
    };

    // ================= CLAIM / COMPLETE =================

    const handleClaim = async (choreId: number) => {
        try {
            await fetch(`http://localhost:5000/api/chores/${choreId}/claim`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ AssignedToUserID: userId })
            });
            fetchAll();
        } catch (e) {
            console.log("Failed to claim chore:", e);
        }
    };

    const handleComplete = async (choreId: number) => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/chores/${choreId}/complete`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ CompletedByUserID: userId })
                }
            );
            const data = await res.json();
            if (data.error === "") {
                fetchAll();
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.log("Failed to complete chore:", e);
        }
    };

    // ================= ACTIVE CHORE LIST =================

    const emptyMessages: Record<Tab, { icon: string; text: string }> = {
        Open: { icon: "🎉", text: "No open chores right now!" },
        Assigned: { icon: "📌", text: "No chores assigned yet." },
        "My Chores": { icon: "✅", text: "You have no chores assigned to you." },
        Completed: { icon: "🏡", text: "No completed chores yet this month." }
    };

    const activeChores: any[] =
        activeTab === "Open"
            ? openChores
            : activeTab === "Assigned"
            ? assignedChores
            : activeTab === "My Chores"
            ? myChores
            : completedChores;

    // ================= UI =================

    return (
        <div className="dash">

            {/* ── Sidebar ── */}
            <div className="sidebar">
                <div className="sb-brand">Our<em>Place</em></div>

                <div className="sb-house">🏠 {houseName || "Your Household"}</div>

                {[
                    { icon: "📋", label: "Open Chores", path: "/dashboard" },
                    { icon: "📌", label: "Assigned", path: "/assigned" },
                    { icon: "✅", label: "My Chores", path: "/my-chores" },
                    { icon: "🔁", label: "Recurring", path: "/recurring" },
                    { icon: "⚙️", label: "Settings", path: "/settings" }
                ].map(({ icon, label, path }) => (
                    <div
                        key={label}
                        className={`sb-item ${activeSideItem === label ? "active" : ""}`}
                        onClick={() => {
                            setActiveSideItem(label);
                            if (label === "Open Chores") {
                                setActiveTab("Open");
                            } else {
                                navigate(path);
                            }
                        }}
                    >
                        <span>{icon}</span> {label}
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
                                    <div
                                        className="avatar"
                                        style={{ background: style.bg, color: style.color }}
                                    >
                                        {getInitials(mate)}
                                    </div>
                                    <span className="mate-name">{getDisplayName(mate)}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Main ── */}
            <div className="main">

                {/* Topbar */}
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
                    <button className="tb-btn" onClick={() => setShowModal(true)}>
                        + Create Chore
                    </button>
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

                    {/* Completed section label */}
                    {activeTab === "Completed" && (
                        <div className="section-label">COMPLETED CHORES</div>
                    )}

                    {/* Chore list */}
                    {activeChores.length === 0 ? (
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
                            {activeChores.map((chore: any) => {
                                const isOverdue =
                                    chore.DueDate &&
                                    new Date(chore.DueDate) < new Date() &&
                                    chore.Status !== "completed";

                                return (
                                    <div
                                        className={`card ${isOverdue ? "overdue" : ""}`}
                                        key={chore.ChoreID}
                                    >
                                        <div className="card-body">
                                            <div className="card-title">{chore.Title}</div>
                                            <div className="card-meta">
                                                {chore.Description || "No description"}
                                                {activeTab === "Assigned" && (
                                                    <>
                                                        <br />
                                                        Assigned to:{" "}
                                                        {getDisplayNameById(chore.AssignedToUserID)}
                                                    </>
                                                )}
                                                {activeTab === "Completed" && chore.CompletedAt && (
                                                    <>
                                                        <br />
                                                        Completed:{" "}
                                                        {new Date(chore.CompletedAt).toLocaleDateString(
                                                            "en-US",
                                                            {
                                                                month: "short",
                                                                day: "numeric",
                                                                year: "numeric"
                                                            }
                                                        )}
                                                        {chore.CompletedByUserID && (
                                                            <> by {getDisplayNameById(chore.CompletedByUserID)}</>
                                                        )}
                                                    </>
                                                )}
                                                {chore.DueDate && activeTab !== "Completed" && (
                                                    <>
                                                        <br />
                                                        Due: {chore.DueDate}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="card-right">
                                            <span
                                                className={`priority p-${chore.Priority?.toLowerCase()}`}
                                            >
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

                                            {(activeTab === "Assigned" ||
                                                activeTab === "My Chores") && (
                                                <button
                                                    className="done-btn"
                                                    onClick={() => handleComplete(chore.ChoreID)}
                                                >
                                                    Mark as Complete
                                                </button>
                                            )}

                                            {activeTab === "Completed" && (
                                                <span className="priority p-low">✓ Done</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal ── */}
            {showModal && (
                <div className="modal-overlay" onClick={resetModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>

                        <div className="modal-header">
                            <div className="modal-title">🏡 New Chore</div>
                            <button className="modal-close" onClick={resetModal}>✕</button>
                        </div>

                        <div className="modal-body">

                            <label className="modal-lbl">CHORE TITLE *</label>
                            <input
                                className="modal-inp"
                                name="Title"
                                placeholder="e.g. Take out the trash"
                                value={form.Title}
                                onChange={handleChange}
                            />

                            <label className="modal-lbl">DESCRIPTION</label>
                            <textarea
                                className="modal-inp modal-textarea"
                                name="Description"
                                placeholder="Any extra details..."
                                value={form.Description}
                                onChange={handleChange}
                            />

                            <div className="modal-row">
                                <div className="modal-col">
                                    <label className="modal-lbl">DUE DATE</label>
                                    <input
                                        type="date"
                                        className="modal-inp"
                                        name="DueDate"
                                        value={form.DueDate}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="modal-col">
                                    <label className="modal-lbl">PRIORITY</label>
                                    <select
                                        className="modal-inp"
                                        name="Priority"
                                        value={form.Priority}
                                        onChange={handleChange}
                                    >
                                        <option value="low">🟢 Low</option>
                                        <option value="medium">🟡 Medium</option>
                                        <option value="high">🔴 High</option>
                                    </select>
                                </div>
                            </div>

                            <label className="modal-lbl">
                                ASSIGN TO{" "}
                                <span
                                    style={{
                                        fontWeight: 400,
                                        textTransform: "none",
                                        opacity: 0.6
                                    }}
                                >
                                    (leave blank for open list)
                                </span>
                            </label>

                            {housemates.length === 0 ? (
                                <div
                                    className="modal-inp"
                                    style={{ color: "#aaa", cursor: "default" }}
                                >
                                    No housemates yet — goes to Open list
                                </div>
                            ) : (
                                <select
                                    className="modal-inp"
                                    name="AssignedToUserID"
                                    value={form.AssignedToUserID}
                                    onChange={handleChange}
                                >
                                    <option value="">None</option>
                                    {housemates.map((mate: any) => (
                                        <option key={mate.UserID} value={mate.UserID}>
                                            {getDisplayName(mate)}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <div className="modal-toggle-row">
                                <label className="modal-lbl" style={{ margin: 0 }}>
                                    RECURRING CHORE?
                                </label>
                                <div
                                    className={`toggle ${isRecurring ? "on" : ""}`}
                                    onClick={() => setIsRecurring(!isRecurring)}
                                >
                                    <div className="toggle-thumb" />
                                </div>
                            </div>

                            {isRecurring && (
                                <>
                                    <label className="modal-lbl">REPEAT FREQUENCY</label>
                                    <select
                                        className="modal-inp"
                                        name="RepeatFrequency"
                                        value={form.RepeatFrequency}
                                        onChange={handleChange}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="modal-cancel" onClick={resetModal}>
                                Cancel
                            </button>
                            <button className="modal-submit" onClick={handleSubmitChore}>
                                🏡 Publish Chore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}