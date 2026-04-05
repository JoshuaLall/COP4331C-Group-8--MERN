import './CSS/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import MyChores from './pages/MyChores';
import LoginPage from './pages/LoginPage';
import Assigned from './pages/Assigned';
import Register from './pages/Register';
import JoinHousehold from './pages/JoinHousehold';

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;