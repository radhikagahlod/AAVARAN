import React, { useEffect, useState } from 'react';
import {
  Droplets,
  Zap,
  Trash2,
  AlertTriangle,
  Wrench,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

import api from '../services/api';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import DemoBanner from '../components/DemoBanner';

export function Overview() {
  const [data, setData] = useState(null);
  const [garbageBins, setGarbageBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewRes, binsRes] = await Promise.all([
        api.getOverview(),
        api.getGarbageBins(),
      ]);
      setData(overviewRes);
      setGarbageBins(binsRes);
    } catch (err) {
      console.error('Error fetching overview data:', err);
      setError('Failed to connect to AAVARAN backend. Please ensure the server is running on http://127.0.0.1:8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="state-box">
        <div className="spinner"></div>
        <p className="state-title">Loading Campus Resource Data...</p>
        <p className="state-desc">Fetching live telemetry readings and device records.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderColor: '#ef4444' }}>
        <div className="state-box">
          <AlertTriangle size={36} style={{ color: '#ef4444' }} />
          <p className="state-title" style={{ color: '#ef4444' }}>Backend Connection Error</p>
          <p className="state-desc">{error}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={fetchData}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const {
    current_water_consumption,
    water_unit,
    water_status,
    current_electricity_consumption,
    electricity_unit,
    electricity_status,
    average_garbage_fill_level,
    garbage_unit,
    garbage_status,
    total_active_alerts,
    high_priority_alerts_count,
    total_open_device_issues,
    device_summary,
    high_priority_alerts,
    recent_water_readings,
    recent_electricity_readings,
    recent_device_issues,
    is_synthetic_data,
    data_source_notice,
  } = data;

  // Chart data formatting
  const waterChartData = recent_water_readings.map((r) => ({
    name: r.building.length > 12 ? r.building.substring(0, 11) + '..' : r.building,
    consumption: r.consumption,
    threshold: r.threshold,
    status: r.status,
  }));

  const elecChartData = recent_electricity_readings.map((r) => ({
    name: r.building.length > 12 ? r.building.substring(0, 11) + '..' : r.building,
    consumption: r.consumption,
    threshold: r.threshold,
    status: r.status,
  }));

  const garbageChartData = garbageBins.map((b) => ({
    name: b.bin_code,
    location: b.location,
    fillLevel: b.fill_level,
  }));

  const devicePieData = [
    { name: 'Open (Reported)', value: device_summary?.open_issues || 0, color: '#38bdf8' },
    { name: 'In Progress', value: device_summary?.in_progress_issues || 0, color: '#f59e0b' },
    { name: 'Resolved', value: device_summary?.resolved_issues || 0, color: '#10b981' },
  ].filter((d) => d.value > 0);

  return (
    <div>
      {is_synthetic_data && <DemoBanner message={data_source_notice} />}

      {/* Top Resource Metrics Grid */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <MetricCard
          label="Water Consumption"
          value={current_water_consumption.toLocaleString()}
          unit={water_unit}
          icon={Droplets}
          iconColor="#0ea5e9"
          iconBg="rgba(14, 165, 233, 0.12)"
          status={water_status}
          footerText="Campus Aggregated"
        />

        <MetricCard
          label="Electricity Load"
          value={current_electricity_consumption.toLocaleString()}
          unit={electricity_unit}
          icon={Zap}
          iconColor="#f59e0b"
          iconBg="rgba(245, 158, 11, 0.12)"
          status={electricity_status}
          footerText="Active Meter Sum"
        />

        <MetricCard
          label="Avg Garbage Fill"
          value={`${average_garbage_fill_level}`}
          unit={garbage_unit}
          icon={Trash2}
          iconColor="#a855f7"
          iconBg="rgba(168, 85, 247, 0.12)"
          status={garbage_status}
          footerText="Across Monitored Bins"
        />

        <MetricCard
          label="Active Alerts"
          value={total_active_alerts}
          unit={`(${high_priority_alerts_count} High)`}
          icon={AlertTriangle}
          iconColor="#ef4444"
          iconBg="rgba(239, 68, 68, 0.12)"
          status={total_active_alerts > 0 ? 'Attention' : 'Normal'}
          footerText="Actionable Events"
        />
      </div>

      {/* Device Issues Quick Summary Cards */}
      <div className="grid-5" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Issues</span>
            <Wrench size={16} style={{ color: '#94a3b8' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4 }}>
            {device_summary?.total_issues || 0}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>Open / Reported</span>
            <Clock size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4, color: '#38bdf8' }}>
            {device_summary?.open_issues || 0}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>In Progress</span>
            <TrendingUp size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4, color: '#f59e0b' }}>
            {device_summary?.in_progress_issues || 0}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#10b981' }}>Resolved</span>
            <CheckCircle size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4, color: '#10b981' }}>
            {device_summary?.resolved_issues || 0}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#f43f5e' }}>High Priority</span>
            <AlertTriangle size={16} style={{ color: '#f43f5e' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4, color: '#f43f5e' }}>
            {device_summary?.high_priority_issues || 0}
          </div>
        </div>
      </div>

      {/* High Priority Alerts Section */}
      {high_priority_alerts && high_priority_alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title" style={{ color: '#f43f5e' }}>
                <AlertTriangle size={18} /> High-Priority Active Alerts ({high_priority_alerts.length})
              </h3>
              <p className="card-subtitle">
                Issues requiring immediate campus maintenance inspection or waste remediation.
              </p>
            </div>
            <Link to="/alerts" className="btn btn-outline btn-sm">
              View All Alerts <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Title & Location</th>
                  <th>Recommended Action</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {high_priority_alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <StatusBadge status={alert.resource_type} type="resource" />
                    </td>
                    <td>
                      <strong>{alert.title}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {alert.building} — {alert.location}
                      </div>
                    </td>
                    <td style={{ maxWidth: 360 }}>
                      <span style={{ fontSize: '0.84rem' }}>{alert.recommended_action}</span>
                    </td>
                    <td>
                      <StatusBadge status={alert.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visualization Grid */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Water Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Droplets size={18} style={{ color: '#0ea5e9' }} /> Water Usage by Facility
              </h3>
              <p className="card-subtitle">Measured flow rates against 1200 L threshold</p>
            </div>
            <Link to="/water" className="btn btn-outline btn-sm">
              Details
            </Link>
          </div>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }}
                  formatter={(val) => [`${val} Litres`, 'Consumption']}
                />
                <Bar dataKey="consumption" radius={[4, 4, 0, 0]}>
                  {waterChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.consumption > 1200 ? '#ef4444' : '#0ea5e9'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Electricity Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Zap size={18} style={{ color: '#f59e0b' }} /> Electricity Consumption
              </h3>
              <p className="card-subtitle">Measured load in kWh against 180 kWh threshold</p>
            </div>
            <Link to="/electricity" className="btn btn-outline btn-sm">
              Details
            </Link>
          </div>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={elecChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }}
                  formatter={(val) => [`${val} kWh`, 'Consumption']}
                />
                <Bar dataKey="consumption" radius={[4, 4, 0, 0]}>
                  {elecChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.consumption > 180 ? '#ef4444' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Row: Garbage Fill & Device Issues Summary */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Garbage Bins Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Trash2 size={18} style={{ color: '#a855f7' }} /> Bin Fill Levels (% Capacity)
              </h3>
              <p className="card-subtitle">Normal (&lt;60%), Attention (60-84%), Collection Rec (≥85%)</p>
            </div>
            <Link to="/garbage" className="btn btn-outline btn-sm">
              Details
            </Link>
          </div>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={garbageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" domain={[0, 100]} fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }}
                  formatter={(val, name, props) => [`${val}% (${props.payload.location})`, 'Fill Level']}
                />
                <Bar dataKey="fillLevel" radius={[4, 4, 0, 0]}>
                  {garbageChartData.map((entry, index) => {
                    let color = '#10b981';
                    if (entry.fillLevel >= 85) color = '#ef4444';
                    else if (entry.fillLevel >= 60) color = '#f59e0b';
                    return <Cell key={`bin-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Issues Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Wrench size={18} style={{ color: '#10b981' }} /> Device Issues Pipeline
              </h3>
              <p className="card-subtitle">Reported defects tracking resource waste</p>
            </div>
            <Link to="/devices" className="btn btn-outline btn-sm">
              Manage Issues
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', height: 260 }}>
            <div style={{ flex: 1, height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={devicePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {devicePieData.map((entry, index) => (
                      <Cell key={`slice-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 12 }}>
              {devicePieData.map((item) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
                    <span style={{ color: '#94a3b8' }}>{item.name}</span>
                  </div>
                  <strong style={{ color: '#f8fafc' }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Device Issues List */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Recent Defective Device Reports</h3>
            <p className="card-subtitle">Campus fixtures reported with potential resource leaks</p>
          </div>
          <Link to="/devices" className="btn btn-primary btn-sm">
            Report Device Issue
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Resource</th>
                <th>Location</th>
                <th>Estimated Waste</th>
                <th>Severity</th>
                <th>Repair Status</th>
              </tr>
            </thead>
            <tbody>
              {recent_device_issues && recent_device_issues.length > 0 ? (
                recent_device_issues.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <strong>{issue.device_name}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{issue.device_type}</div>
                    </td>
                    <td>
                      <StatusBadge status={issue.resource_type} type="resource" />
                    </td>
                    <td>
                      {issue.building} — {issue.location}
                    </td>
                    <td>
                      {issue.estimated_waste ? (
                        <span style={{ fontFamily: 'monospace' }}>
                          ~{issue.estimated_waste} {issue.waste_unit}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.82rem' }}>None specified</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={issue.severity} />
                    </td>
                    <td>
                      <StatusBadge status={issue.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    No device issues recorded yet.
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

export default Overview;
