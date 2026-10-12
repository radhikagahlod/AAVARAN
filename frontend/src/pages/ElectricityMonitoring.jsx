import React, { useEffect, useState } from 'react';
import { Zap, AlertTriangle, Search, Info, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DemoBanner from '../components/DemoBanner';

export function ElectricityMonitoring() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchElectricity = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getElectricityReadings();
      setReadings(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load electricity consumption telemetry from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectricity();
  }, []);

  const filteredReadings = readings.filter((r) => {
    const matchesSearch =
      r.building.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ANOMALY' && r.is_anomaly) ||
      (statusFilter === 'NORMAL' && !r.is_anomaly);
    return matchesSearch && matchesStatus;
  });

  const totalLoad = readings.reduce((sum, r) => sum + r.consumption, 0);
  const anomalyCount = readings.filter((r) => r.is_anomaly).length;

  const chartData = readings.map((r) => ({
    name: r.building,
    location: r.location,
    consumption: r.consumption,
    threshold: r.threshold,
    isAnomaly: r.is_anomaly,
  }));

  return (
    <div>
      <DemoBanner message="Electricity telemetry values reflect simulated smart meter feeds. Baseline threshold: 180 kWh. Exceeding points to usage review, not automated defect assumption." />

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Campus Power Load</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                {totalLoad.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>kWh</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Review Recommendations</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: anomalyCount > 0 ? '#f43f5e' : '#10b981' }}>
                {anomalyCount} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>meters</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Standard Load Limit</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                180 <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>kWh</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Triggers energy audit review</div>
            </div>
          </div>
        </div>
      </div>

      {/* Electricity Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Zap size={18} style={{ color: '#f59e0b' }} /> Campus Power Feeds &amp; Subpanels
            </h3>
            <p className="card-subtitle">Active consumption in kWh vs established 180 kWh baseline</p>
          </div>
        </div>

        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }}
                formatter={(val, name, props) => [`${val} kWh (${props.payload.location})`, 'Consumption']}
              />
              <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Limit 180 kWh', fill: '#ef4444', fontSize: 11 }} />
              <Bar dataKey="consumption" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.consumption > 180 ? '#ef4444' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search building or panel location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <button
            className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Panels ({readings.length})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'ANOMALY' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('ANOMALY')}
          >
            Review Recommended ({anomalyCount})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'NORMAL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('NORMAL')}
          >
            Normal Load
          </button>
        </div>
      </div>

      {/* Readings Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Building</th>
                <th>Substation / Panel Location</th>
                <th>Consumption</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Operational Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredReadings.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.building}</strong>
                  </td>
                  <td>{r.location}</td>
                  <td>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: r.is_anomaly ? '#f43f5e' : '#f8fafc' }}>
                      {r.consumption.toLocaleString()} {r.unit}
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8' }}>{r.threshold} {r.unit}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {r.notes || 'Operating within standard baseline.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest statement */}
      <div style={{ marginTop: 16, fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
        * Note: High electricity consumption indicates an elevated load requiring energy management review. It does not automatically signify a defective bulb or damaged fixture. Defective fixtures should be submitted through the Device Issues module.
      </div>
    </div>
  );
}

export default ElectricityMonitoring;
