import React, { useEffect, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Check,
  RotateCcw,
  Wrench,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DemoBanner from '../components/DemoBanner';

export function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAlerts({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        resource_type: resourceFilter || undefined,
      });
      setAlerts(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load alerts from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter, resourceFilter]);

  const handleResolveAlert = async (alertId) => {
    try {
      await api.resolveAlert(alertId, 'Resolved via Alerts dashboard action.');
      showToast(`Alert #${alertId} marked as Resolved.`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
      alert('Failed to resolve alert.');
    }
  };

  const handleReopenAlert = async (alertId) => {
    try {
      await api.reopenAlert(alertId);
      showToast(`Alert #${alertId} reopened as Active.`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
      alert('Failed to reopen alert.');
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const text = searchTerm.toLowerCase();
    return (
      a.title.toLowerCase().includes(text) ||
      a.building.toLowerCase().includes(text) ||
      a.location.toLowerCase().includes(text) ||
      a.description.toLowerCase().includes(text)
    );
  });

  const activeCount = alerts.filter((a) => a.status === 'Active').length;
  const highActive = alerts.filter((a) => a.status === 'Active' && a.severity === 'High').length;
  const resolvedCount = alerts.filter((a) => a.status === 'Resolved').length;

  return (
    <div>
      <DemoBanner message="Resource and device maintenance alerts are coordinated here. Changes directly persist in the SQLite database." />

      {toastMessage && (
        <div className="toast-container">
          <div className="toast toast-success">
            <CheckCircle size={18} style={{ color: '#10b981' }} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>High Severity Active</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f43f5e' }}>{highActive}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Active Alerts</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{activeCount}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Resolved Alerts</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{resolvedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search alerts by title or building..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="form-select"
            style={{ padding: '8px 12px', fontSize: '0.84rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            className="form-select"
            style={{ padding: '8px 12px', fontSize: '0.84rem' }}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            className="form-select"
            style={{ padding: '8px 12px', fontSize: '0.84rem' }}
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
          >
            <option value="">All Resources</option>
            <option value="Water">Water</option>
            <option value="Electricity">Electricity</option>
            <option value="Garbage">Garbage</option>
            <option value="Device">Device Issues</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Resource</th>
                <th>Title &amp; Location</th>
                <th>Description</th>
                <th>Recommended Action</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>#{alert.id}</td>
                    <td>
                      <StatusBadge status={alert.resource_type} type="resource" />
                      {alert.linked_device_issue_id && (
                        <div style={{ marginTop: 4 }}>
                          <Link
                            to="/devices"
                            style={{
                              fontSize: '0.72rem',
                              color: '#38bdf8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <Wrench size={10} /> Issue #{alert.linked_device_issue_id}
                          </Link>
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{alert.title}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {alert.building} — {alert.location}
                      </div>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <p style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{alert.description}</p>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{alert.recommended_action}</p>
                    </td>
                    <td>
                      <StatusBadge status={alert.severity} />
                    </td>
                    <td>
                      <StatusBadge status={alert.status} />
                    </td>
                    <td>
                      {alert.status === 'Active' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleResolveAlert(alert.id)}
                          id={`btn-resolve-alert-${alert.id}`}
                        >
                          <Check size={14} /> Resolve
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleReopenAlert(alert.id)}
                          id={`btn-reopen-alert-${alert.id}`}
                        >
                          <RotateCcw size={14} /> Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: '#64748b' }}>
                    No alerts found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Alerts;
