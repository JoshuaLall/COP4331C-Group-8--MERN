import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";
import { readApiResponse } from "../utils/api";

const API_BASE = "/api";

export default function Completed() {
    const navigate = useNavigate();

    const userId = Number(localStorage.getItem("userId"));
    const householdId = Number(localStorage.getItem("householdId"));

    const [completedChores, setCompletedChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [currentUser, setCurrentUser] = useState("");
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

    const markChoresUpdated = () => {
        localStorage.setItem("choresLastUpdated", Date.now().toString());
        window.dispatchEvent(new Event("choresUpdated"));
    };

    const fetchCompleted = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/chores/completed?HouseholdID=${householdId}&UserID=${userId}`
            );
            const data = await res.json();
            if (data.error === "" || !data.error) setCompletedChores(data.results || []);
        } catch (e) {
            console.log("Failed to fetch completed chores:", e);
        }
    };

    const fetchHousemates = async () => {
        try {
            const res = await fetch(`${API_BASE}/users/household/${householdId}`);
            const data = await res.json();
            if (data.error === "") setHousemates(data.results || []);
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

    useEffect(() => {
        if (!userId || !householdId) return;
        fetchCompleted();
        fetchHousemates();
        fetchUser();
        fetchHousehold();
    }, [userId, householdId]);

    useEffect(() => {
        const handleStorage = (e?: StorageEvent) => {
            if (!e || e.key === "choresLastUpdated") {
                fetchCompleted();
            }
        };

        const handleCustomUpdate = () => {
            fetchCompleted();
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener("choresUpdated", handleCustomUpdate);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("choresUpdated", handleCustomUpdate);
        };
    }, [userId, householdId]);

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
        mate.FirstName ? `${mate.FirstName} ${mate.LastName || ""}`.trim() : mate.Login || "Unknown";

    const getDisplayNameById = (id: number | null) => {
        if (!id) return "Unknown";
        const mate = housemates.find((u: any) => Number(u.UserID) === Number(id));
        return mate ? getDisplayName(mate) : `User #${id}`;
    };

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
                const res = await fetch(`${API_BASE}/recurring-chores`, {
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
                        DefaultAssignedUserID: form.AssignedToUserID ? Number(form.AssignedToUserID) : null,
                        Priority: form.Priority
                    })
                });
                await readApiResponse<{ error: string }>(res);
            } else {
                const res = await fetch(`${API_BASE}/chores`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        Title: form.Title,
                        Description: form.Description,
                        DueDate: form.DueDate || null,
                        Priority: form.Priority,
                        AssignedToUserID: form.AssignedToUserID ? Number(form.AssignedToUserID) : null,
                        HouseholdID: householdId,
                        CreatedByUserID: userId
                    })
                });
                await readApiResponse<{ error: string }>(res);
            }

            markChoresUpdated();
            resetModal();
        } catch (e) {
            console.log("Error creating chore:", e);
            alert(e instanceof Error ? e.message : "Failed to create chore");
        }
    };

    return (
        <div className="dash" role="main" aria-label="Completed chores">
            <div className="sidebar" role="navigation" aria-label="Primary navigation">
                <div className="sb-brand">Our<em>Place</em></div>

                <div className="sb-house">🏠 {houseName || "Your Household"}</div>

                <div className="sb-item" onClick={() => navigate("/overview")}>📊 Overview</div>
                <div className="sb-item" onClick={() => navigate("/dashboard")}>📋 Open Chores</div>
                <div className="sb-item" onClick={() => navigate("/assigned")}>📌 Assigned</div>
                <div className="sb-item" onClick={() => navigate("/my-chores")}>✅ My Chores</div>
                <div className="sb-item active">🏁 Completed</div>
                <div className="sb-item" onClick={() => navigate("/recurring")}>🔁 Recurring</div>
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
                    <button
                        type="button"
                        className="tb-btn"
                        onClick={() => setShowModal(true)}
                    >
                        + Create Chore
                    </button>
                </div>

                <div className="content">
                    <div className="section-label">COMPLETED CHORES</div>

                    {completedChores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🏁</div>
                            <div className="empty-text">No completed chores yet.</div>
                        </div>
                    ) : (
                        <div className="cards">
                            {completedChores.map((chore: any) => (
                                <div className="card" key={chore.ChoreID}>
                                    <div className="card-body">
                                        <div className="card-title">{chore.Title}</div>
                                        <div className="card-meta">
                                            {chore.Description || "No description"}
                                            {chore.CompletedAt && (
                                                <>
                                                    <br />
                                                    Completed: {new Date(chore.CompletedAt).toLocaleString()}
                                                </>
                                            )}
                                            {chore.CompletedByUserID && (
                                                <>
                                                    <br />
                                                    Completed by: {getDisplayNameById(chore.CompletedByUserID)}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-right">
                                        <span className="priority p-low">Completed</span>
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
                            <button type="button" className="modal-close" onClick={resetModal}>✕</button>
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
                            <button type="button" className="modal-cancel" onClick={resetModal}>
                                Cancel
                            </button>
                            <button type="button" className="modal-submit" onClick={handleSubmitChore}>
                                🏡 Publish Chore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
