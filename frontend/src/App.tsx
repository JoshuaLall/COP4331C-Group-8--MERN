import './CSS/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MyChores from './pages/MyChores';
import LoginPage from './pages/LoginPage';
import Assigned from './pages/Assigned';
import Register from './pages/Register';
import JoinHousehold from './pages/JoinHousehold';
import Recurring from './pages/Recurring';
import Settings from './pages/Settings';
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/my-chores" element={<MyChores />} />
                <Route path="/assigned" element={<Assigned />} />
                <Route path="/register" element={<Register />} />
                <Route path="/join" element={<JoinHousehold />} />
                <Route path="/recurring" element={<Recurring />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;