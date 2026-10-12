import React, { useEffect, useState } from 'react';
import { Droplets, AlertTriangle, Search, Info } from 'lucide-react';
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

export function WaterMonitoring() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchWater = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getWaterReadings();
      setReadings(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load water consumption telemetry from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWater();
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

  const totalConsumption = readings.reduce((sum, r) => sum + r.consumption, 0);
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
      <DemoBanner message="Water telemetry data represents synthetic simulation baseline. Cautious rule: Readings > 1200 litres trigger an inspection recommendation." />

      {/* Stats Summary */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplets size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Campus Water Flow</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                {totalConsumption.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>litres</span>
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
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Unusual Usage Warnings</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: anomalyCount > 0 ? '#f43f5e' : '#10b981' }}>
                {anomalyCount} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>locations</span>
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
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Baseline Threshold Rule</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                1,200 <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>litres/meter</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Exceeding flags inspection</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Droplets size={18} style={{ color: '#0ea5e9' }} /> Facility Water Meter Readings
            </h3>
            <p className="card-subtitle">
              Measured volume in litres compared with standard baseline limit (1,200 L)
            </p>
          </div>
        </div>

        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }}
                formatter={(val, name, props) => [`${val} litres (${props.payload.location})`, 'Consumption']}
              />
              <ReferenceLine y={1200} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Threshold 1200L', fill: '#ef4444', fontSize: 11 }} />
              <Bar dataKey="consumption" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.consumption > 1200 ? '#ef4444' : '#0ea5e9'}
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
            placeholder="Search facility or meter location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <button
            className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Meters ({readings.length})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'ANOMALY' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('ANOMALY')}
          >
            Inspection Recommended ({anomalyCount})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'NORMAL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('NORMAL')}
          >
            Normal Usage
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Building</th>
                <th>Meter Location</th>
                <th>Consumption</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Telemetry Notes</th>
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
                    {r.notes || 'Routine reading within expected parameters.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Honesty note */}
      <div style={{ marginTop: 16, fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
        * Note: A reading that exceeds the baseline triggers a notification for physical inspection. It does not automatically confirm an active leak without on-site technical verification.
      </div>
    </div>
  );
}

export default WaterMonitoring;
