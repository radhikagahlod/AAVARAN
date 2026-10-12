import React, { useEffect, useState } from 'react';
import {
  Wrench,
  PlusCircle,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  X,
  FileText,
  User,
  MapPin,
  ExternalLink,
} from 'lucide-react';

import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DemoBanner from '../components/DemoBanner';

export function DeviceIssues() {
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Create form state
  const [formData, setFormData] = useState({
    device_name: '',
    device_type: '',
    resource_type: 'Water',
    building: '',
    location: '',
    description: '',
    severity: 'Medium',
    estimated_waste: '',
    waste_unit: 'litres/day',
    reporter_name: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Update modal state
  const [updateStatus, setUpdateStatus] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchIssuesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [issuesRes, summaryRes] = await Promise.all([
        api.getDeviceIssues({
          status: statusFilter || undefined,
          resource_type: resourceFilter || undefined,
          severity: severityFilter || undefined,
        }),
        api.getDeviceSummary(),
      ]);
      setIssues(issuesRes);
      setSummary(summaryRes);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch device issues from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuesData();
  }, [statusFilter, resourceFilter, severityFilter]);

  // Handle Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.device_name.trim()) errors.device_name = 'Device name is required.';
    if (!formData.device_type.trim()) errors.device_type = 'Device type is required (e.g., Tap, Flush Valve, Light).';
    if (!formData.building.trim()) errors.building = 'Building name is required.';
    if (!formData.location.trim()) errors.location = 'Specific location/room is required.';
    if (!formData.description.trim() || formData.description.trim().length < 5) {
      errors.description = 'Please provide a clear description (at least 5 characters).';
    }
    if (formData.estimated_waste && isNaN(Number(formData.estimated_waste))) {
      errors.estimated_waste = 'Estimated waste must be a valid positive number.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit new device issue
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        device_name: formData.device_name.trim(),
        device_type: formData.device_type.trim(),
        resource_type: formData.resource_type,
        building: formData.building.trim(),
        location: formData.location.trim(),
        description: formData.description.trim(),
        severity: formData.severity,
        estimated_waste: formData.estimated_waste ? Number(formData.estimated_waste) : null,
        waste_unit: formData.estimated_waste ? formData.waste_unit : null,
        reporter_name: formData.reporter_name.trim() || null,
      };

      const newIssue = await api.createDeviceIssue(payload);
      showToast(`Device defect "${newIssue.device_name}" reported successfully.`);
      setShowCreateModal(false);
      setFormData({
        device_name: '',
        device_type: '',
        resource_type: 'Water',
        building: '',
        location: '',
        description: '',
        severity: 'Medium',
        estimated_waste: '',
        waste_unit: 'litres/day',
        reporter_name: '',
      });
      fetchIssuesData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to submit device issue.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open details modal
  const handleOpenDetails = (issue) => {
    setSelectedIssue(issue);
    setUpdateStatus(issue.status);
    setRepairNotes(issue.repair_notes || '');
  };

  // Handle issue status / notes update
  const handleUpdateSubmit = async () => {
    if (!selectedIssue) return;
    try {
      setUpdating(true);
      const updated = await api.updateDeviceIssue(selectedIssue.id, {
        status: updateStatus,
        repair_notes: repairNotes,
      });
      setSelectedIssue(updated);
      showToast(`Issue #${updated.id} status updated to ${updated.status}.`);
      fetchIssuesData();
    } catch (err) {
      console.error(err);
      alert('Failed to update issue status.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const text = searchTerm.toLowerCase();
    return (
      issue.device_name.toLowerCase().includes(text) ||
      issue.building.toLowerCase().includes(text) ||
      issue.location.toLowerCase().includes(text) ||
      issue.description.toLowerCase().includes(text)
    );
  });

  return (
    <div>
      <DemoBanner message="Defective device reports directly coordinate corrective repairs. Live issues are persistently recorded in SQLite." />

      {toastMessage && (
        <div className="toast-container">
          <div className="toast toast-success">
            <CheckCircle size={18} style={{ color: '#10b981' }} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* A. Summary Cards */}
      <div className="grid-5" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL ISSUES</span>
            <Wrench size={16} style={{ color: '#94a3b8' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4 }}>
            {summary?.total_issues || 0}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>All tracked campus defects</span>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>OPEN / REPORTED</span>
            <Clock size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4, color: '#38bdf8' }}>
            {summary?.open_issues || 0}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Awaiting technician review</span>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>IN PROGRESS</span>
            <Wrench size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4, color: '#f59e0b' }}>
            {summary?.in_progress_issues || 0}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Technician actively working</span>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>RESOLVED</span>
            <CheckCircle size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4, color: '#10b981' }}>
            {summary?.resolved_issues || 0}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Repairs completed</span>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#f43f5e', fontWeight: 600 }}>HIGH PRIORITY</span>
            <AlertTriangle size={16} style={{ color: '#f43f5e' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4, color: '#f43f5e' }}>
            {summary?.high_priority_issues || 0}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Urgent resource waste</span>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            id="btn-report-device"
          >
            <PlusCircle size={16} /> Report Device Issue
          </button>

          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by device, room, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          {/* Status filter */}
          <select
            className="form-select"
            style={{ padding: '8px 12px', fontSize: '0.84rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Reported">Reported (Open)</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Resource filter */}
          <select
            className="form-select"
            style={{ padding: '8px 12px', fontSize: '0.84rem' }}
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
          >
            <option value="">All Resources</option>
            <option value="Water">Water</option>
            <option value="Electricity">Electricity</option>
            <option value="Other">Other</option>
          </select>

          {/* Severity filter */}
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
        </div>
      </div>

      {/* C. Device Issues List */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Device & Type</th>
                <th>Resource</th>
                <th>Building & Location</th>
                <th>Description</th>
                <th>Est. Waste</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length > 0 ? (
                filteredIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>#{issue.id}</td>
                    <td>
                      <strong>{issue.device_name}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{issue.device_type}</div>
                    </td>
                    <td>
                      <StatusBadge status={issue.resource_type} type="resource" />
                    </td>
                    <td>
                      <div><strong>{issue.building}</strong></div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{issue.location}</div>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <p style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>{issue.description}</p>
                      {issue.reporter_name && (
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Reported by: {issue.reporter_name}
                        </span>
                      )}
                    </td>
                    <td>
                      {issue.estimated_waste ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}>
                          ~{issue.estimated_waste} {issue.waste_unit}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>None specified</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={issue.severity} />
                    </td>
                    <td>
                      <StatusBadge status={issue.status} />
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenDetails(issue)}
                        id={`btn-manage-${issue.id}`}
                      >
                        Manage &amp; Track
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 36, color: '#64748b' }}>
                    No device issues found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* B. Report Device Issue Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Report Defective Device or Resource Leak</h3>
              <button
                className="btn-outline btn-sm"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 18 }}>
                  Log campus fixtures or equipment causing unnecessary resource waste. High and Medium severity reports automatically generate actionable alerts.
                </p>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Device Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Science Quad Flush Valve #3"
                      value={formData.device_name}
                      onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                    />
                    {formErrors.device_name && <span className="form-error">{formErrors.device_name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Device Type *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Tap, Valve, Light Bank, HVAC"
                      value={formData.device_type}
                      onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                    />
                    {formErrors.device_type && <span className="form-error">{formErrors.device_type}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Resource Type *</label>
                    <select
                      className="form-select"
                      value={formData.resource_type}
                      onChange={(e) => {
                        const res = e.target.value;
                        setFormData({
                          ...formData,
                          resource_type: res,
                          waste_unit: res === 'Water' ? 'litres/day' : res === 'Electricity' ? 'kWh/day' : 'units/day',
                        });
                      }}
                    >
                      <option value="Water">Water</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Severity Level *</label>
                    <select
                      className="form-select"
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    >
                      <option value="Low">Low — Minor drip or cosmetic defect</option>
                      <option value="Medium">Medium — Steady waste, needs scheduled fix</option>
                      <option value="High">High — Severe leak or major power waste</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Building *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Engineering Block B"
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    />
                    {formErrors.building && <span className="form-error">{formErrors.building}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Specific Room / Location *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 2nd Floor Men's Restroom Cubicle 1"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                    {formErrors.location && <span className="form-error">{formErrors.location}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Issue Description *</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe the defect, symptoms (dripping, buzzing, staying ON continuously), and observed behavior..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  {formErrors.description && <span className="form-error">{formErrors.description}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Estimated Resource Waste (Optional)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 45"
                      value={formData.estimated_waste}
                      onChange={(e) => setFormData({ ...formData, estimated_waste: e.target.value })}
                    />
                    <span className="form-help">Leave blank if unknown. Do not invent numbers.</span>
                    {formErrors.estimated_waste && (
                      <span className="form-error">{formErrors.estimated_waste}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Measurement Unit</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.waste_unit}
                      onChange={(e) => setFormData({ ...formData, waste_unit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reporter Name or Department (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Hostel Warden or Student Volunteer"
                    value={formData.reporter_name}
                    onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  id="btn-submit-issue"
                >
                  {submitting ? 'Submitting...' : 'Submit Defect Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. Issue Details and Maintenance Tracking Modal */}
      {selectedIssue && (
        <div className="modal-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Device Maintenance Tracker</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Issue #{selectedIssue.id} — {selectedIssue.device_name}
                </span>
              </div>
              <button
                className="btn-outline btn-sm"
                onClick={() => setSelectedIssue(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Status progression indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 10,
                  marginBottom: 20,
                  border: '1px solid #1e293b',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#38bdf8',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 4px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    1
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>Reported</span>
                </div>

                <div style={{ flex: 1, height: 2, background: selectedIssue.status !== 'Reported' ? '#f59e0b' : '#334155', margin: '0 8px' }} />

                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: selectedIssue.status === 'In Progress' || selectedIssue.status === 'Resolved' ? '#f59e0b' : '#334155',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 4px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    2
                  </div>
                  <span style={{ fontSize: '0.75rem', color: selectedIssue.status !== 'Reported' ? '#f59e0b' : '#64748b', fontWeight: 600 }}>In Progress</span>
                </div>

                <div style={{ flex: 1, height: 2, background: selectedIssue.status === 'Resolved' ? '#10b981' : '#334155', margin: '0 8px' }} />

                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: selectedIssue.status === 'Resolved' ? '#10b981' : '#334155',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 4px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    3
                  </div>
                  <span style={{ fontSize: '0.75rem', color: selectedIssue.status === 'Resolved' ? '#10b981' : '#64748b', fontWeight: 600 }}>Resolved</span>
                </div>
              </div>

              {/* Issue Details summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Device Type:</span>
                  <div style={{ fontWeight: 600 }}>{selectedIssue.device_type}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Resource Type:</span>
                  <div><StatusBadge status={selectedIssue.resource_type} type="resource" /></div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Location:</span>
                  <div style={{ fontWeight: 600 }}>{selectedIssue.building} — {selectedIssue.location}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Severity:</span>
                  <div><StatusBadge status={selectedIssue.severity} /></div>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Description:</span>
                <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: 2 }}>{selectedIssue.description}</p>
              </div>

              {selectedIssue.estimated_waste && (
                <div style={{ marginBottom: 18, background: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <span style={{ fontSize: '0.76rem', color: '#f59e0b', fontWeight: 600 }}>Estimated Resource Waste:</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                    ~{selectedIssue.estimated_waste} {selectedIssue.waste_unit}
                  </div>
                </div>
              )}

              {/* Maintenance update controls */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: 16 }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 12 }}>
                  Update Repair Status &amp; Notes
                </h4>

                <div className="form-group">
                  <label className="form-label">Workflow Status</label>
                  <select
                    className="form-select"
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    id="select-update-status"
                  >
                    <option value="Reported">Reported (Reopened / Open)</option>
                    <option value="In Progress">In Progress (Work Dispatched)</option>
                    <option value="Resolved">Resolved (Repair Completed)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Maintenance Notes / Repair History</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Enter technician details, parts replaced (e.g. washer, timer relay), or inspection verification notes..."
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    id="textarea-repair-notes"
                  />
                </div>

                {selectedIssue.resolved_at && (
                  <div style={{ fontSize: '0.76rem', color: '#10b981', marginBottom: 8 }}>
                    ✓ Resolved on {new Date(selectedIssue.resolved_at).toLocaleString()}
                  </div>
                )}

                {/* Honesty Verification Note */}
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: 8 }}>
                  * Honesty Note: Marking this issue "Resolved" records the user-reported repair status. It does not independently verify that resource waste has ceased without a subsequent inspection or sensor confirmation.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedIssue(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpdateSubmit}
                disabled={updating}
                id="btn-save-maintenance"
              >
                {updating ? 'Saving...' : 'Save Maintenance Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceIssues;
