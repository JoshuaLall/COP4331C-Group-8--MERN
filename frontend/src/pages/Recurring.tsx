import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

const API_BASE = "/api";

export default function Recurring() {
    const navigate = useNavigate();

    const userId = Number(localStorage.getItem("userId"));
    const householdId = Number(localStorage.getItem("householdId"));

    const [recurringChores, setRecurringChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [currentUser, setCurrentUser] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedChore, setSelectedChore] = useState<any>(null);
    const [isRecurring, setIsRecurring] = useState(true); // always true on this page

    const [form, setForm] = useState({
        Title: "",
        Description: "",
        DueDate: "",
        Priority: "medium",
        AssignedToUserID: "",
        RepeatFrequency: "weekly"
    });

    // ================= FETCH =================

    const fetchRecurring = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/recurring-chores?HouseholdID=${householdId}`
            );
            const data = await res.json();
            if (data.error === "" || !data.error) setRecurringChores(data.results || []);
        } catch (e) {
            console.log("Failed to fetch recurring chores:", e);
        }
    };

    const fetchHousemates = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/users/household/${householdId}`
            );
            const data = await res.json();
            if (data.error === "" || !data.error) setHousemates(data.results || []);
        } catch (e) {
            console.log("Failed to fetch housemates:", e);
        }
    };

    const fetchUser = async () => {
        try {
            const res = await fetch(`${API_BASE}/users/${userId}`);
            const data = await res.json();
            if (data.error === "") setCurrentUser(data.result?.FirstName || data.result?.Login || "");
        } catch (e) {
            console.log("Failed to fetch user:", e);
        }
    };

    const fetchHousehold = async () => {
        try {
            const res = await fetch(`${API_BASE}/households/${householdId}`);
            const data = await res.json();
            if (data.error === "") setHouseName(data.result?.HouseholdName || "");
        } catch (e) {
            console.log("Failed to fetch household:", e);
        }
    };

    const fetchAll = () => {
        fetchRecurring();
        fetchHousemates();
        fetchUser();
        fetchHousehold();
    };

    useEffect(() => {
        if (!userId || !householdId) return;
        fetchAll();
    }, []);

    // ================= HELPERS =================

    const getAvatarStyle = (name: string) => {
        const colors = [
            { bg: "#C9DDED", color: "#185FA5" },
            { bg: "#FBEAF0", color: "#993556" },
            { bg: "#EAF3DE", color: "#3B6D11" },
            { bg: "#FDF3DC", color: "#9A7010" },
            { bg: "#FAECE7", color: "#8C4A3C" },
        ];
        return colors[(name?.charCodeAt(0) || 0) % colors.length];
    };

    const getInitials = (mate: any) => {
        const f = mate.FirstName?.[0] || "";
        const l = mate.LastName?.[0] || "";
        return (f + l).toUpperCase() || mate.Login?.[0]?.toUpperCase() || "?";
    };

    const getDisplayName = (mate: any) =>
        mate.FirstName ? `${mate.FirstName} ${mate.LastName || ""}`.trim() : mate.Login || "Unknown";

    const getDisplayNameById = (id: number | null) => {
        if (!id) return "Unassigned";
        const mate = housemates.find((u: any) => Number(u.UserID) === Number(id));
        return mate ? getDisplayName(mate) : `User #${id}`;
    };

    // ================= MODAL HANDLERS =================

    const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

    const resetModal = () => {
        setShowModal(false);
        setIsEdit(false);
        setSelectedChore(null);
        setIsRecurring(true);
        setForm({
            Title: "",
            Description: "",
            DueDate: "",
            Priority: "medium",
            AssignedToUserID: "",
            RepeatFrequency: "weekly"
        });
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSelectedChore(null);
        setIsRecurring(true);
        setForm({
            Title: "",
            Description: "",
            DueDate: "",
            Priority: "medium",
            AssignedToUserID: "",
            RepeatFrequency: "weekly"
        });
        setShowModal(true);
    };

    const handleOpenEdit = (chore: any) => {
        setIsEdit(true);
        setSelectedChore(chore);
        setForm({
            Title: chore.Title || "",
            Description: chore.Description || "",
            DueDate: chore.NextDueDate || "",
            Priority: chore.Priority || "medium",
            AssignedToUserID: chore.DefaultAssignedUserID ? String(chore.DefaultAssignedUserID) : "",
            RepeatFrequency: chore.RepeatFrequency || "weekly"
        });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.Title.trim()) { alert("Please enter a chore title."); return; }
        try {
            if (isEdit && selectedChore) {
                await fetch(
                    `${API_BASE}/recurring-chores/${selectedChore.RecurringTemplateID}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            Title: form.Title,
                            Description: form.Description,
                            RepeatFrequency: form.RepeatFrequency,
                            RepeatInterval: 1,
                            NextDueDate: form.DueDate || null,
                            DefaultAssignedUserID: form.AssignedToUserID
                                ? Number(form.AssignedToUserID)
                                : null,
                            Priority: form.Priority
                        })
                    }
                );
            } else {
                await fetch(`${API_BASE}/recurring-chores`, {
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
            }
            resetModal();
            fetchRecurring();
        } catch (e) {
            console.log("Submit failed:", e);
        }
    };

    // Mark the most recent active chore instance as complete
    const handleComplete = async (chore: any) => {
        try {
            // Find the active chore instance linked to this recurring template
            const res = await fetch(
                `${API_BASE}/chores?HouseholdID=${householdId}`
            );
            const data = await res.json();
            if (data.error !== "") return;

            const pickActiveInstance = (all: any[]) => {
                const matches = all
                    .filter((c: any) =>
                        Number(c.RecurringTemplateID) === Number(chore.RecurringTemplateID) &&
                        c.Status !== "completed"
                    )
                    .sort((a: any, b: any) => {
                        const dueA = a.DueDate ? new Date(a.DueDate).getTime() : Number.MAX_SAFE_INTEGER;
                        const dueB = b.DueDate ? new Date(b.DueDate).getTime() : Number.MAX_SAFE_INTEGER;
                        if (dueA !== dueB) return dueA - dueB;

                        const createdA = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
                        const createdB = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
                        return createdA - createdB;
                    });

                return matches[0] || null;
            };

            let instance = pickActiveInstance(data.results || []);

            // Recovery path: force generation once, then try to locate active instance again.
            if (!instance) {
                await fetch(`${API_BASE}/recurring-chores/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });

                const retryRes = await fetch(
                    `${API_BASE}/chores?HouseholdID=${householdId}`
                );
                const retryData = await retryRes.json();
                if (retryData.error === "") {
                    instance = pickActiveInstance(retryData.results || []);
                }
            }

            if (!instance) {
                alert("No active chore instance found for this recurring chore.");
                return;
            }

            const completeRes = await fetch(
                `${API_BASE}/chores/${instance.ChoreID}/complete`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ CompletedByUserID: userId })
                }
            );
            const completeData = await completeRes.json();
            if (completeData.error === "") {
                await fetch(`${API_BASE}/recurring-chores/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });
                fetchAll();
            } else {
                alert(completeData.error);
            }
        } catch (e) {
            console.log("Failed to complete chore:", e);
        }
    };

    // ================= UI =================

    return (
        <div className="dash">

            {/* Sidebar */}
            <div className="sidebar">
                <div className="sb-brand">Our<em>Place</em></div>
                <div className="sb-house">🏠 {houseName || "Your Household"}</div>

                <div className="sb-item" onClick={() => navigate("/overview")}>
                    📊 Overview
                </div>

                <div className="sb-item" onClick={() => navigate("/dashboard")}>📋 Open Chores</div>
                <div className="sb-item" onClick={() => navigate("/assigned")}>📌 Assigned</div>
                <div className="sb-item" onClick={() => navigate("/my-chores")}>✅ My Chores</div>
                <div className="sb-item" onClick={() => navigate("/completed")}>🏁 Completed</div>
                <div className="sb-item active">🔁 Recurring</div>
                <div className="sb-item" onClick={() => navigate("/settings")}>⚙️ Settings</div>

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

            {/* Main */}
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
                    <button className="tb-btn" onClick={handleOpenCreate}>+ Create Chore</button>
                </div>

                <div className="content">
                    <div className="section-label">RECURRING CHORES</div>

                    {recurringChores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔁</div>
                            <div className="empty-text">No recurring chores yet.</div>
                        </div>
                    ) : (
                        <div className="cards">
                            {recurringChores.map((chore: any) => (
                                <div className="card" key={chore.RecurringTemplateID}>
                                    <div className="card-body">
                                        <div className="card-title">{chore.Title}</div>
                                        <div className="card-meta">
                                            {chore.Description || "No description"}
                                            <br />
                                            Assigned to: {getDisplayNameById(chore.DefaultAssignedUserID)}
                                            <br />
                                            Frequency: {chore.RepeatFrequency}
                                            {chore.NextDueDate && (
                                                <><br />Next due: {chore.NextDueDate}</>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-right">
                                        <span className={`priority p-${(chore.Priority || "medium").toLowerCase()}`}>
                                            {chore.Priority || "medium"}
                                        </span>

                                        <button
                                            className="claim-btn"
                                            onClick={() => handleOpenEdit(chore)}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="done-btn"
                                            onClick={() => handleComplete(chore)}
                                        >
                                            Mark as Complete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal (Create + Edit) — identical to all other pages ── */}
            {showModal && (
                <div className="modal-overlay" onClick={resetModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>

                        <div className="modal-header">
                            <div className="modal-title">
                                {isEdit ? "✏️ Edit Chore" : "🏡 New Chore"}
                            </div>
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
                                <span style={{ fontWeight: 400, textTransform: "none", opacity: 0.6 }}>
                                    (leave blank for open list)
                                </span>
                            </label>
                            {housemates.length === 0 ? (
                                <div className="modal-inp" style={{ color: "#aaa", cursor: "default" }}>
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

                            {/* Recurring toggle — always on for this page, shown on create only */}
                            {!isEdit && (
                                <div className="modal-toggle-row">
                                    <label className="modal-lbl" style={{ margin: 0 }}>
                                        RECURRING CHORE?
                                    </label>
                                    <div className={`toggle ${isRecurring ? "on" : ""}`} onClick={() => setIsRecurring(!isRecurring)}>
                                        <div className="toggle-thumb" />
                                    </div>
                                </div>
                            )}

                            {/* Repeat frequency — always shown since this is the Recurring page */}
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
                        </div>

                        <div className="modal-footer">
                            <button className="modal-cancel" onClick={resetModal}>Cancel</button>
                            <button className="modal-submit" onClick={handleSubmit}>
                                {isEdit ? "💾 Save Changes" : "🏡 Publish Chore"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
