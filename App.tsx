import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { LiveSessionReport } from './pages/LiveSessionReport';
import { VideoParameterReport } from './pages/VideoParameterReport';
import { Personnel } from './pages/Personnel';
import { StoreManager } from './pages/StoreManager';
import { Login } from './pages/Login';

const ProtectedLayout: React.FC = () => {
  const user = localStorage.getItem('currentUser');
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<LiveSessionReport />} />
          <Route path="/video-report" element={<VideoParameterReport />} />
          <Route path="/stores" element={<StoreManager />} />
          <Route path="/personnel" element={<Personnel />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;