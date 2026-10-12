import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Droplets,
  Zap,
  Trash2,
  Wrench,
  Bell,
  Info,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';

export function Sidebar({ mobileOpen, onClose, counts = { alerts: 0, issues: 0 }, isHealthy = true }) {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload & Analyze', icon: UploadCloud },
    { to: '/water', label: 'Water Monitoring', icon: Droplets },
    { to: '/electricity', label: 'Electricity Monitoring', icon: Zap },
    { to: '/garbage', label: 'Garbage Monitoring', icon: Trash2 },
    { to: '/devices', label: 'Device Issues', icon: Wrench, count: counts.issues },
    { to: '/alerts', label: 'Alerts', icon: Bell, count: counts.alerts },
    { to: '/about', label: 'About AAVARAN', icon: Info },
  ];

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="brand-wrapper">
            <div className="brand-icon-box">
              <ShieldCheck size={24} />
            </div>
            <div className="brand-text">
              <h1>AAVARAN</h1>
              <span className="brand-tagline">Smarter Resources • Campus</span>
            </div>
          </div>
          {mobileOpen && (
            <button className="btn-outline btn-sm" onClick={onClose} aria-label="Close Menu">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (mobileOpen) onClose();
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span className="badge-count">{item.count}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status-indicator">
          <span className={`status-dot ${isHealthy ? '' : 'degraded'}`}></span>
          <span>{isHealthy ? 'Backend Connected' : 'Connecting / Degraded'}</span>
        </div>
        <p style={{ fontSize: '0.74rem', color: '#64748b' }}>
          Campus Sustainability Network v1.0
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
