import React, { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Clock, Search, MapPin } from 'lucide-react';

import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DemoBanner from '../components/DemoBanner';

export function GarbageMonitoring() {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchBins = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getGarbageBins();
      setBins(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load smart garbage bin telemetry from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
  }, []);

  const filteredBins = bins.filter((b) => {
    const matchesSearch =
      b.bin_code.toLowerCase().includes(search.toLowerCase()) ||
      b.building.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'COLLECTION' && b.collection_recommended) ||
      (statusFilter === 'ATTENTION' && b.status === 'Attention') ||
      (statusFilter === 'NORMAL' && b.status === 'Normal');

    return matchesSearch && matchesStatus;
  });

  const avgFill = bins.length > 0 ? (bins.reduce((acc, b) => acc + b.fill_level, 0) / bins.length).toFixed(1) : 0;
  const collectionNeeded = bins.filter((b) => b.collection_recommended).length;
  const attentionCount = bins.filter((b) => b.status === 'Attention').length;
  const normalCount = bins.filter((b) => b.status === 'Normal').length;

  return (
    <div>
      <DemoBanner message="Garbage bin ultrasonic fill sensor telemetry is simulated. Threshold logic: <60% Normal, 60%-84% Attention, ≥85% Collection Recommended." />

      {/* Summary Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Monitored Smart Bins</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{bins.length}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Collection Recommended</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f43f5e' }}>
                {collectionNeeded} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>bins (≥85%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Attention Level</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
                {attentionCount} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>bins (60-84%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Campus Average Fill</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{avgFill}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search bin code or building..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <button
            className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Bins ({bins.length})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'COLLECTION' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('COLLECTION')}
          >
            Collection Recommended ({collectionNeeded})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'ATTENTION' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('ATTENTION')}
          >
            Attention ({attentionCount})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'NORMAL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('NORMAL')}
          >
            Normal ({normalCount})
          </button>
        </div>
      </div>

      {/* Garbage Bins Grid Visual Cards */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        {filteredBins.map((bin) => {
          let progressColor = '#10b981';
          if (bin.fill_level >= 85) progressColor = '#ef4444';
          else if (bin.fill_level >= 60) progressColor = '#f59e0b';

          return (
            <div key={bin.id} className="card" style={{ borderColor: bin.fill_level >= 85 ? 'rgba(239, 68, 68, 0.4)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#94a3b8' }}>{bin.bin_code}</span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 2 }}>{bin.building}</h4>
                </div>
                <StatusBadge status={bin.status} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16 }}>
                <MapPin size={14} style={{ color: '#64748b' }} />
                <span>{bin.location}</span>
              </div>

              {/* Visual Fill Gauge / Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                  <span style={{ color: '#94a3b8' }}>Fill Level</span>
                  <strong style={{ color: progressColor, fontSize: '0.95rem' }}>{bin.fill_level}%</strong>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${bin.fill_level}%`,
                      backgroundColor: progressColor,
                    }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #1e293b', paddingTop: 10, fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>Threshold: &lt;60% Normal | ≥85% Pickup</span>
                <span>{bin.collection_recommended ? '⚠️ Pickup Alert' : '✓ Normal Cycle'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Threshold Explanation Note */}
      <div className="card" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>
          Garbage Level Classification Rules
        </h4>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          • <strong>Below 60% (Normal):</strong> Waste accumulation is standard; scheduled daily pickup is sufficient.<br />
          • <strong>60% to below 85% (Attention):</strong> High traffic area; bin should be monitored during peak campus hours.<br />
          • <strong>85% to 100% (Collection Recommended):</strong> Overflow risk; urgent custodial dispatch ticket is generated.
        </p>
      </div>
    </div>
  );
}

export default GarbageMonitoring;
