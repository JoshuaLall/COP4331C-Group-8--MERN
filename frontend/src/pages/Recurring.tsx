import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Dashboard.css";

export default function Recurring() {
    const navigate = useNavigate();

    const [recurringChores, setRecurringChores] = useState<any[]>([]);
    const [housemates, setHousemates] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedChore, setSelectedChore] = useState<any>(null);

    const USER_ID = Number(localStorage.getItem("userId"));
    const HOUSEHOLD_ID = Number(localStorage.getItem("householdId"));

    const [form, setForm] = useState({
        Title: "",
        Description: "",
        RepeatFrequency: "weekly",
        RepeatInterval: 1,
        NextDueDate: "",
        DefaultAssignedUserID: ""
    });

    // ================= FETCH DATA =================

    const fetchRecurring = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/recurring-chores?HouseholdID=${HOUSEHOLD_ID}`
            );
            const data = await res.json();
            if (!data.error) setRecurringChores(data.results);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchHousemates = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/users/household/${HOUSEHOLD_ID}`
            );
            const data = await res.json();
            if (!data.error) setHousemates(data.results);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchRecurring();
        fetchHousemates();
    }, []);

    // ================= HANDLERS =================

    const handleChange = (e: any) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        try {
            if (isEdit) {
                await fetch(
                    `http://localhost:5000/api/recurring-chores/${selectedChore.RecurringTemplateID}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(form)
                    }
                );
            } else {
                await fetch("http://localhost:5000/api/recurring-chores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...form,
                        HouseholdID: HOUSEHOLD_ID,
                        CreatedByUserID: USER_ID
                    })
                });
            }

            resetModal();
            fetchRecurring();
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (chore: any) => {
        setIsEdit(true);
        setSelectedChore(chore);

        setForm({
            Title: chore.Title,
            Description: chore.Description,
            RepeatFrequency: chore.RepeatFrequency,
            RepeatInterval: chore.RepeatInterval,
            NextDueDate: chore.NextDueDate,
            DefaultAssignedUserID: chore.DefaultAssignedUserID || ""
        });

        setShowModal(true);
    };

    const resetModal = () => {
        setShowModal(false);
        setIsEdit(false);
        setSelectedChore(null);
        setForm({
            Title: "",
            Description: "",
            RepeatFrequency: "weekly",
            RepeatInterval: 1,
            NextDueDate: "",
            DefaultAssignedUserID: ""
        });
    };

    // ================= UI =================

    return (
        <div className="dash">

            {/* Sidebar */}
            <div className="sidebar">
                <div className="sb-brand">Our<em>Place</em></div>

                <div className="sb-house">🏠 Your Household</div>

                <div className="sb-item" onClick={() => navigate("/dashboard")}>📋 Open Chores</div>
                <div className="sb-item" onClick={() => navigate("/assigned")}>📌 Assigned</div>
                <div className="sb-item" onClick={() => navigate("/my-chores")}>✅ My Chores</div>
                <div className="sb-item active">🔁 Recurring</div>
                <div className="sb-item">⚙️ Settings</div>

                {/* Housemates */}
                <div className="sb-mates">
                    <div className="sb-mates-label">Housemates</div>

                    {housemates.length === 0 ? (
                        <div className="sb-empty-mates">No housemates yet</div>
                    ) : (
                        housemates.map((mate: any) => (
                            <div className="mate" key={mate.UserID}>
                                <div className="avatar">
                                    {mate.FirstName[0]}
                                </div>
                                <span className="mate-name">
                                    {mate.FirstName}
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
                        <div className="topbar-greet">Recurring Chores</div>
                        <div className="topbar-sub">Manage templates</div>
                    </div>

                    <button
                        className="tb-btn"
                        onClick={() => setShowModal(true)}
                    >
                        + Create Chore
                    </button>
                </div>

                {/* Content */}
                <div className="content">

                    <div className="section-label">RECURRING CHORES</div>

                    {recurringChores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔁</div>
                            <div>No recurring chores yet.</div>
                        </div>
                    ) : (
                        <div className="cards">
                            {recurringChores.map((chore: any) => (
                                <div className="card" key={chore.RecurringTemplateID}>

                                    <div className="card-body">
                                        <div className="card-title">{chore.Title}</div>

                                        <div className="card-meta">
                                            Assigned to: {chore.DefaultAssignedUserID || "None"} <br />
                                            Frequency: {chore.RepeatFrequency} <br />
                                            Next Due: {chore.NextDueDate}
                                        </div>
                                    </div>

                                    <div className="card-right">
                                        <button
                                            className="claim-btn"
                                            onClick={() => handleEdit(chore)}
                                        >
                                            Edit
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

                        {/* Header */}
                        <div className="modal-header">
                            <div className="modal-title">
                                {isEdit ? "Edit Chore" : "New Chore"}
                            </div>

                            <button className="modal-close" onClick={resetModal}>
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="modal-body">

                            <label className="modal-lbl">Chore Title *</label>
                            <input
                                className="modal-inp"
                                name="Title"
                                value={form.Title}
                                onChange={handleChange}
                                placeholder="e.g. Take out trash"
                            />

                            <label className="modal-lbl">Description</label>
                            <textarea
                                className="modal-inp modal-textarea"
                                name="Description"
                                value={form.Description}
                                onChange={handleChange}
                                placeholder="Any extra details..."
                            />

                            <div className="modal-row">
                                <div className="modal-col">
                                    <label className="modal-lbl">Next Due</label>
                                    <input
                                        type="date"
                                        className="modal-inp"
                                        name="NextDueDate"
                                        value={form.NextDueDate}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="modal-col">
                                    <label className="modal-lbl">Frequency</label>
                                    <select
                                        className="modal-inp modal-select"
                                        name="RepeatFrequency"
                                        onChange={handleChange}
                                        value={form.RepeatFrequency}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                            </div>

                            <label className="modal-lbl">Repeat Interval</label>
                            <input
                                className="modal-inp"
                                type="number"
                                name="RepeatInterval"
                                value={form.RepeatInterval}
                                onChange={handleChange}
                            />

                            {/* Assign User */}
                            <label className="modal-lbl">
                                Assign To <span className="modal-lbl-hint">(optional)</span>
                            </label>

                            {housemates.length === 0 ? (
                                <div className="modal-no-mates">
                                    No housemates yet
                                </div>
                            ) : (
                                <select
                                    className="modal-inp modal-select"
                                    name="DefaultAssignedUserID"
                                    value={form.DefaultAssignedUserID}
                                    onChange={handleChange}
                                >
                                    <option value="">None</option>
                                    {housemates.map((mate: any) => (
                                        <option key={mate.UserID} value={mate.UserID}>
                                            {mate.FirstName}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button className="modal-cancel" onClick={resetModal}>
                                Cancel
                            </button>

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