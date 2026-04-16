import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

const API_BASE = "/api";

export default function Assigned() {
    const navigate = useNavigate();

    const userId = localStorage.getItem("userId");
    const householdId = localStorage.getItem("householdId");

    const [assignedChores, setAssignedChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [currentUser, setCurrentUser] = useState("");

    // ── Modal state ──
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedChore, setSelectedChore] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);

    const [form, setForm] = useState({
        Title: "",
        Description: "",
        DueDate: "",
        Priority: "medium",
        AssignedToUserID: "",
        RepeatFrequency: "weekly"
    });

    const markChoresUpdated = () => {
        localStorage.setItem("choresLastUpdated", Date.now().toString());
        window.dispatchEvent(new Event("choresUpdated"));
    };

    // ================= FETCH =================

    const fetchAssigned = async () => {
        if (!householdId) return;
        try {
            const res = await fetch(`${API_BASE}/chores/assigned?HouseholdID=${householdId}`);
            const data = await res.json();
            if (data.error === "") {
                setAssignedChores(data.results || []);
            }
        } catch (e) {
            console.log("Failed to load assigned chores:", e);
        }
    };

    const fetchHousemates = async () => {
        if (!householdId) return;
        try {
            const res = await fetch(`${API_BASE}/users/household/${householdId}`);
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
            const res = await fetch(`${API_BASE}/users/${userId}`);
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
            const res = await fetch(`${API_BASE}/households/${householdId}`);
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
        fetchAssigned();
        fetchHousemates();
        fetchCurrentUser();
        fetchHousehold();
    }, [userId, householdId]);

    useEffect(() => {
        const handleStorage = (e?: StorageEvent) => {
            if (!e || e.key === "choresLastUpdated") {
                fetchAssigned();
            }
        };

        const handleCustomUpdate = () => {
            fetchAssigned();
        };

        const handleFocus = () => {
            fetchAssigned();
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener("choresUpdated", handleCustomUpdate);
        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("choresUpdated", handleCustomUpdate);
            window.removeEventListener("focus", handleFocus);
        };
    }, [userId, householdId]);

    // ================= HELPERS =================

    const getDisplayNameById = (id: number | null) => {
        if (!id) return "Unassigned";
        const mate = housemates.find((u: any) => Number(u.UserID) === Number(id));
        if (!mate) return `User #${id}`;
        return mate.FirstName
            ? `${mate.FirstName} ${mate.LastName || ""}`.trim()
            : mate.Login || `User #${id}`;
    };

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

    // ================= MODAL HANDLERS =================

    const handleChange = (e: any) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const resetModal = () => {
        setShowModal(false);
        setIsEdit(false);
        setSelectedChore(null);
        setShowDeleteConfirm(false);
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

    const handleOpenCreate = () => {
        setIsEdit(false);
        setShowModal(true);
    };

    const handleOpenEdit = (chore: any) => {
        setIsEdit(true);
        setSelectedChore(chore);
        setShowDeleteConfirm(false);
        setIsRecurring(chore.IsRecurring || false);
        setForm({
            Title: chore.Title || "",
            Description: chore.Description || "",
            DueDate: chore.DueDate || "",
            Priority: chore.Priority || "medium",
            AssignedToUserID: chore.AssignedToUserID || "",
            RepeatFrequency: chore.RepeatFrequency || "weekly"
        });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.Title.trim()) {
            alert("Please enter a chore title.");
            return;
        }

        try {
            if (isEdit && selectedChore) {
                await fetch(`${API_BASE}/chores/${selectedChore.ChoreID}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        Title: form.Title,
                        Description: form.Description,
                        DueDate: form.DueDate || null,
                        Priority: form.Priority,
                        AssignedToUserID: form.AssignedToUserID ? Number(form.AssignedToUserID) : null,
                        Status: form.AssignedToUserID ? "assigned" : "open"
                    })
                });
            } else {
                if (isRecurring) {
                    await fetch(`${API_BASE}/recurring-chores`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            Title: form.Title,
                            Description: form.Description,
                            HouseholdID: Number(householdId),
                            CreatedByUserID: Number(userId),
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
                    await fetch(`${API_BASE}/chores`, {
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
                            HouseholdID: Number(householdId),
                            CreatedByUserID: Number(userId)
                        })
                    });
                }
            }

            markChoresUpdated();
            resetModal();
            fetchAssigned();
        } catch (e) {
            console.log("Submit failed:", e);
        }
    };

    const handleDelete = async () => {
        if (!selectedChore) return;

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/chores/${selectedChore.ChoreID}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await res.json();
            if (data.error === "" || !data.error) {
                markChoresUpdated();
                resetModal();
                fetchAssigned();
            } else {
                alert(`Failed to delete: ${data.error}`);
            }
        } catch (e) {
            console.log("Delete failed:", e);
            alert("Failed to delete chore");
        }
    };

    const handleComplete = async (choreId: number) => {
        if (!userId) return;
        try {
            const res = await fetch(`${API_BASE}/chores/${choreId}/complete`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ CompletedByUserID: Number(userId) })
            });
            const data = await res.json();
            if (data.error === "") {
                markChoresUpdated();
                await fetchAssigned();
            } else {
                alert(data.error);
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

                <div className="sb-item" onClick={() => navigate("/dashboard")}>
                    📋 Open Chores
                </div>

                <div className="sb-item active">
                    📌 Assigned
                </div>

                <div className="sb-item" onClick={() => navigate("/my-chores")}>
                    ✅ My Chores
                </div>

                <div className="sb-item" onClick={() => navigate("/completed")}>
                    🏁 Completed
                </div>

                <div className="sb-item" onClick={() => navigate("/recurring")}>
                    🔁 Recurring
                </div>

                <div className="sb-item" onClick={() => navigate("/settings")}>
                    ⚙️ Settings
                </div>

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
                            Hello{currentUser ? `, ${currentUser}` : ""} 👋
                        </div>
                        <div className="topbar-sub">
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric"
                            })}
                        </div>
                    </div>
                    <button className="tb-btn" onClick={handleOpenCreate}>
                        + Create Chore
                    </button>
                </div>

                <div className="content">
                    <div className="section-label">ASSIGNED TO: HOUSEMATES</div>

                    {assignedChores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📌</div>
                            <div className="empty-text">No chores assigned yet.</div>
                        </div>
                    ) : (
                        <div className="cards">
                            {assignedChores.map((chore: any) => (
                                <div className="card" key={chore.ChoreID}>
                                    <div className="card-body">
                                        <div className="card-title">{chore.Title}</div>
                                        <div className="card-meta">
                                            {chore.Description || "No description"}
                                            <br />
                                            Assigned to: {getDisplayNameById(chore.AssignedToUserID)}
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

                                        <button
                                            className="claim-btn"
                                            onClick={() => handleOpenEdit(chore)}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="done-btn"
                                            style={{ color: "#c0392b", borderColor: "#e4a7a1" }}
                                            onClick={() => {
                                                setSelectedChore(chore);
                                                setShowDeleteConfirm(true);
                                            }}
                                        >
                                            Delete
                                        </button>

                                        <button
                                            className="done-btn"
                                            onClick={() => handleComplete(chore.ChoreID)}
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

            {/* ── Modal (Create + Edit) ── */}
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

                            {!isEdit && (
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
                            )}

                            {isRecurring && !isEdit && (
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
                            {isEdit && selectedChore && (
                                <button
                                    className="modal-cancel"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    style={{
                                        background: "#fff0f0",
                                        color: "#c0392b",
                                        border: "1.5px solid #f5c0c0",
                                        marginRight: "auto"
                                    }}
                                >
                                    🗑️ Delete
                                </button>
                            )}
                            <button className="modal-cancel" onClick={resetModal}>
                                Cancel
                            </button>
                            <button className="modal-submit" onClick={handleSubmit}>
                                {isEdit ? "💾 Save Changes" : "🏡 Publish Chore"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {showDeleteConfirm && selectedChore && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
                        <div className="modal-header">
                            <div className="modal-title">🗑️ Delete Chore?</div>
                            <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginTop: 0 }}>
                                Are you sure you want to delete <strong>{selectedChore.Title}</strong>?
                            </p>
                            <p style={{ fontSize: "14px", opacity: 0.7 }}>
                                This will remove the chore from your household.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button
                                className="modal-submit"
                                onClick={handleDelete}
                                style={{ background: "#c0392b", borderColor: "#c0392b" }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
