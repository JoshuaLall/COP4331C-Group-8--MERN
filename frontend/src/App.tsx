import './CSS/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard.tsx';
import MyChores from './pages/MyChores.tsx';
import LoginPage from './pages/LoginPage.tsx';
import Assigned from './pages/Assigned.tsx';
import Recurring from './pages/Recurring.tsx';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-chores" element={<MyChores />} />
        <Route path="/assigned" element={<Assigned />} />
        <Route path="/recurring" element={<Recurring />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;