import React from 'react';
import { Menu, RefreshCw, Activity, ExternalLink } from 'lucide-react';

export function Navbar({ onToggleMobile, title = 'Dashboard', onRefresh, isRefreshing = false }) {
  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          className="mobile-menu-btn"
          onClick={onToggleMobile}
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} />
        </button>
        <div className="page-title-section">
          <h2 className="page-title">{title}</h2>
        </div>
      </div>

      <div className="top-actions">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.82rem',
            color: '#94a3b8',
            background: 'rgba(30, 41, 59, 0.5)',
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid #1e293b',
          }}
        >
          <Activity size={14} style={{ color: '#10b981' }} />
          <span>Campus IoT Simulator Active</span>
        </div>

        {onRefresh && (
          <button
            className="btn btn-outline btn-sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spinner' : ''} />
            <span style={{ display: 'none' }}>Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default Navbar;
