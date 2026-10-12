import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Overview from './pages/Overview';
import UploadAnalyze from './pages/UploadAnalyze';
import WaterMonitoring from './pages/WaterMonitoring';
import ElectricityMonitoring from './pages/ElectricityMonitoring';
import GarbageMonitoring from './pages/GarbageMonitoring';
import DeviceIssues from './pages/DeviceIssues';
import Alerts from './pages/Alerts';
import About from './pages/About';

import api from './services/api';

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState({ alerts: 0, issues: 0 });
  const [isHealthy, setIsHealthy] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();

  // Get current page title based on pathname
  const getPageTitle = (path) => {
    switch (path) {
      case '/':
        return 'Campus Resource Overview';
      case '/upload':
        return 'Upload Documents & AI Resource Analysis';
      case '/water':
        return 'Water Flow Monitoring';
      case '/electricity':
        return 'Electricity & Power Loads';
      case '/garbage':
        return 'Garbage Bin Fill Monitoring';
      case '/devices':
        return 'Defective Device & Resource Waste';
      case '/alerts':
        return 'Campus Alerts & Action Items';
      case '/about':
        return 'About AAVARAN Platform';
      default:
        return 'AAVARAN Dashboard';
    }
  };

  const fetchBadgeCounts = async () => {
    try {
      const [healthRes, alertsRes, summaryRes] = await Promise.all([
        api.getHealth(),
        api.getAlerts({ status: 'Active' }),
        api.getDeviceSummary(),
      ]);
      setIsHealthy(healthRes.status === 'healthy');
      setCounts({
        alerts: alertsRes.length,
        issues: (summaryRes.open_issues || 0) + (summaryRes.in_progress_issues || 0),
      });
    } catch (err) {
      console.warn('Backend polling error:', err);
      setIsHealthy(false);
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 15000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="app-container">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        counts={counts}
        isHealthy={isHealthy}
      />

      <div className="main-content">
        <Navbar
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          title={getPageTitle(location.pathname)}
          onRefresh={handleRefresh}
        />

        <main className="content-body" key={refreshKey}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/upload" element={<UploadAnalyze />} />
            <Route path="/water" element={<WaterMonitoring />} />
            <Route path="/electricity" element={<ElectricityMonitoring />} />
            <Route path="/garbage" element={<GarbageMonitoring />} />
            <Route path="/devices" element={<DeviceIssues />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
