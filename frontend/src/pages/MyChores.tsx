import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

export default function MyChores() {
    const navigate = useNavigate();

    const userId = Number(localStorage.getItem("userId"));
    const householdId = Number(localStorage.getItem("householdId"));

    const [myChores, setMyChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [houseName, setHouseName] = useState("");
    const [currentUser, setCurrentUser] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedChore, setSelectedChore] = useState<any>(null);

    const [form, setForm] = useState({
        Title: "",
        Description: "",
        DueDate: "",
        Priority: "medium",
        AssignedToUserID: ""
    });

    // ================= FETCH =================

    const fetchMyChores = async () => {
        const res = await fetch(
            `http://localhost:5000/api/chores/my?UserID=${userId}&HouseholdID=${householdId}`
        );
        const data = await res.json();
        if (data.error === "") setMyChores(data.results || []);
    };

    const fetchHousemates = async () => {
        const res = await fetch(
            `http://localhost:5000/api/users/household/${householdId}`
        );
        const data = await res.json();
        if (data.error === "") setHousemates(data.results || []);
    };

    const fetchUser = async () => {
        const res = await fetch(`http://localhost:5000/api/users/${userId}`);
        const data = await res.json();
        if (data.error === "") {
            setCurrentUser(data.result?.FirstName || "");
        }
    };

    useEffect(() => {
        fetchMyChores();
        fetchHousemates();
        fetchUser();
    }, []);

    // ================= HANDLERS =================

    const handleChange = (e: any) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        try {
            if (isEdit) {
                await fetch(
                    `http://localhost:5000/api/chores/${selectedChore.ChoreID}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(form)
                    }
                );
            } else {
                await fetch("http://localhost:5000/api/chores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...form,
                        HouseholdID: householdId,
                        CreatedByUserID: userId
                    })
                });
            }

            resetModal();
            fetchMyChores();
        } catch (e) {
            console.log(e);
        }
    };

    const handleEdit = (chore: any) => {
        setIsEdit(true);
        setSelectedChore(chore);

        setForm({
            Title: chore.Title,
            Description: chore.Description,
            DueDate: chore.DueDate,
            Priority: chore.Priority,
            AssignedToUserID: chore.AssignedToUserID || ""
        });

        setShowModal(true);
    };

    const handleComplete = async (id: number) => {
        await fetch(`http://localhost:5000/api/chores/${id}/complete`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ CompletedByUserID: userId })
        });

        fetchMyChores();
    };

    // ================= STATS =================
    const stats = [
        { num: myChores.length, label: "Open chores" },
        {
            num: myChores.filter(
                (c: any) =>
                    c.DueDate === new Date().toISOString().split("T")[0]).length,
                label: "Mine today"
            },
            
            {
                num: myChores.filter(
                    (c: any) =>
                        c.DueDate && new Date(c.DueDate) < new Date()).length,
                    label: "Overdue"
                },
                
                { num: 0, label: "Done this month" } 
            ];

    const resetModal = () => {
        setShowModal(false);
        setIsEdit(false);
        setSelectedChore(null);

        setForm({
            Title: "",
            Description: "",
            DueDate: "",
            Priority: "medium",
            AssignedToUserID: ""
        });
    };

    // ================= UI =================

    return (
        <div className="dash">

            {/* Sidebar */}
            <div className="sidebar">
                <div className="sb-brand">Our<em>Place</em></div>

                <div className="sb-house">🏠 {houseName || "Your Household"}</div>

                <div className="sb-item" onClick={() => navigate("/dashboard")}>
                    📋 Open Chores
                </div>

                <div className="sb-item" onClick={() => navigate("/assigned")}>
                    📌 Assigned
                </div>

                <div className="sb-item active">✅ My Chores</div>

                <div className="sb-item" onClick={() => navigate("/recurring")}>
                    🔁 Recurring
                </div>

                <div className="sb-item">⚙️ Settings</div>
                
                <div className="sb-mates">
                    <div className="sb-mates-label">Housemates</div>
                    {housemates.length === 0 ? (
                        <div className="sb-empty-mates">No housemates yet</div>
                ) : (
                    housemates.map((mate: any) => (
                    <div className="mate" key={mate.UserID}>
                        <div className="avatar">
                            {(mate.FirstName?.[0] || "") + (mate.LastName?.[0] || "")}
                            </div>
                            <span className="mate-name">
                                {mate.FirstName} {mate.LastName}
                            </span>
                            </div>
                        ))
                    )}
                    </div>
                    </div>

            {/* Main */}
            <div className="main">

                {/* Topbar */}
                <div className="topbar">
                    <div>
                        <div className="topbar-greet">
                            Good morning, {currentUser} 👋
                        </div>
                    </div>

                    <button className="tb-btn" onClick={() => setShowModal(true)}>
                        + Create Chore
                    </button>
                </div>

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
                        <div className="tab" onClick={() => navigate("/dashboard")}>Open</div>
                        <div className="tab" onClick={() => navigate("/assigned")}>Assigned</div>
                        <div className="tab active">My Chores</div>
                        <div className="tab" onClick={() => navigate("/dashboard")}>Completed</div>
                    </div>

                    {/* List */}
                    {myChores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <div>You have no chores.</div>
                        </div>
                    ) : (
                        <div className="cards">
                            {myChores.map((chore: any) => (
                                <div className="card" key={chore.ChoreID}>
                                    <div className="card-body">
                                        <div className="card-title">{chore.Title}</div>
                                        <div className="card-meta">
                                            {chore.Description}
                                            <br />
                                            Due: {chore.DueDate}
                                        </div>
                                    </div>

                                    <div className="card-right">
                                        <span className={`priority p-${chore.Priority}`}>
                                            {chore.Priority}
                                        </span>

                                        <button
                                            className="claim-btn"
                                            onClick={() => handleEdit(chore)}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="done-btn"
                                            onClick={() => handleComplete(chore.ChoreID)}
                                        >
                                            Complete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">

                        <div className="modal-header">
                            <div className="modal-title">
                                {isEdit ? "Edit Chore" : "New Chore"}
                            </div>
                            <button className="modal-close" onClick={resetModal}>✕</button>
                        </div>

                        <div className="modal-body">

                            <label className="modal-lbl">Title</label>
                            <input className="modal-inp" name="Title" value={form.Title} onChange={handleChange} />

                            <label className="modal-lbl">Description</label>
                            <textarea className="modal-inp modal-textarea" name="Description" value={form.Description} onChange={handleChange} />

                            <label className="modal-lbl">Due Date</label>
                            <input type="date" className="modal-inp" name="DueDate" value={form.DueDate} onChange={handleChange} />

                            <label className="modal-lbl">Assign User</label>
                            <select
                                className="modal-inp"
                                name="AssignedToUserID"
                                value={form.AssignedToUserID}
                                onChange={handleChange}
                            >
                                <option value="">None</option>
                                {housemates.map((mate: any) => (
                                    <option key={mate.UserID} value={mate.UserID}>
                                        {mate.FirstName}
                                    </option>
                                ))}
                            </select>

                        </div>

                        <div className="modal-footer">
                            <button className="modal-cancel" onClick={resetModal}>Cancel</button>
                            <button className="modal-submit" onClick={handleSubmit}>
                                {isEdit ? "Save" : "Publish Chore"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
