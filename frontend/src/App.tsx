import './CSS/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import Overview from './pages/Overview.tsx';
import MyChores from './pages/MyChores.tsx';
import Completed from './pages/Completed.tsx';
import LoginPage from './pages/LoginPage.tsx';
import Assigned from './pages/Assigned.tsx';
import Register from './pages/Register.tsx';
import JoinHousehold from './pages/JoinHousehold.tsx';
import Recurring from './pages/Recurring.tsx';
import Settings from './pages/Settings.tsx';
import VerifyEmail from './pages/VerifyEmail.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import VerifyEmailChange from './pages/VerifyEmailChange.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-chores" element={<MyChores />} />
        <Route path="/completed" element={<Completed />} />
        <Route path="/assigned" element={<Assigned />} />
        <Route path="/register" element={<Register />} />
        <Route path="/join" element={<JoinHousehold />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email-change" element={<VerifyEmailChange />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;