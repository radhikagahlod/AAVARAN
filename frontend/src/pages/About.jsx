import React from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  Wrench,
  Activity,
  Layers,
  Database,
  Wifi,
  Terminal,
  BookOpen,
} from 'lucide-react';
import DemoBanner from '../components/DemoBanner';

export function About() {
  return (
    <div>
      <DemoBanner message="AAVARAN is designed with total scientific honesty: baseline telemetry is demonstrative, while issue tracking and status persistence are fully functional." />

      {/* Hero Section */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(14, 165, 233, 0.08) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
          marginBottom: 28,
          padding: '36px 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div className="brand-icon-box" style={{ width: 52, height: 52 }}>
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              AAVARAN
            </h1>
            <p style={{ color: '#10b981', fontWeight: 600, fontSize: '0.95rem' }}>
              AI-Based Analysis and Visualization for Adaptive Resource Awareness Network
            </p>
          </div>
        </div>

        <p style={{ fontSize: '1.05rem', color: '#e2e8f0', maxWidth: 850, lineHeight: 1.6, marginBottom: 16 }}>
          Tagline: <strong>Smarter Resources. Sustainable Campus.</strong>
        </p>

        <p style={{ fontSize: '0.92rem', color: '#94a3b8', maxWidth: 850, lineHeight: 1.6 }}>
          AAVARAN is a campus resource-awareness and monitoring platform designed to help collegiate institutions
          monitor resource consumption, identify unusual readings, track defective fixtures that waste water and
          electricity, and coordinate corrective maintenance actions.
        </p>
      </div>

      {/* Core Workflow Section */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h3 className="card-title" style={{ marginBottom: 8 }}>
          <Activity size={18} style={{ color: '#10b981' }} /> The Core Operational Workflow
        </h3>
        <p className="card-subtitle" style={{ marginBottom: 20 }}>
          Every event in AAVARAN flows through an explainable 4-phase lifecycle:
        </p>

        <div className="grid-4">
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 18, borderRadius: 12, border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontWeight: 700, marginBottom: 8 }}>
              <Search size={18} /> 1. DETECT
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Continuous monitoring against established baseline thresholds (Water: &gt;1200L, Power: &gt;180kWh, Garbage: ≥85%) and direct crowd-sourced defect logging.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 18, borderRadius: 12, border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>
              <Layers size={18} /> 2. PRIORITIZE
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Automatic severity ranking (High, Medium, Low) and instant generation of actionable alerts linked directly to responsible campus facilities.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 18, borderRadius: 12, border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 700, marginBottom: 8 }}>
              <Wrench size={18} /> 3. ACT
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Maintenance coordination: tickets advance from Reported → In Progress, with recorded technician notes, parts replacement logs, and timestamped updates.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 18, borderRadius: 12, border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a855f7', fontWeight: 700, marginBottom: 8 }}>
              <CheckCircle size={18} /> 4. VERIFY
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Transparent verification: records repair sign-off while explicitly noting that physical inspection or follow-up telemetry is required to confirm leak stoppage.
            </p>
          </div>
        </div>
      </div>

      {/* Honest Transparency Statement */}
      <div className="card" style={{ marginBottom: 28, borderColor: 'rgba(245, 158, 11, 0.4)' }}>
        <h3 className="card-title" style={{ color: '#f59e0b', marginBottom: 12 }}>
          <ShieldCheck size={20} /> Transparency &amp; Honesty Protocol
        </h3>
        <div style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 10 }}>
            In compliance with rigorous engineering standards for student hackathon submissions:
          </p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>
              <strong>Synthetic Simulation:</strong> Initial water, electricity, and garbage telemetry are synthetic demonstrations illustrating how smart campus IoT feeds integrate into our pipeline.
            </li>
            <li>
              <strong>Explainable Rules:</strong> Anomaly detection uses transparent, documented mathematical thresholds rather than opaque claims of autonomous machine learning.
            </li>
            <li>
              <strong>Cautious Wording:</strong> Elevated water readings are reported as <em>"Unusual water usage detected — inspection recommended"</em> rather than definitive leak diagnoses.
            </li>
            <li>
              <strong>Repair Verification Integrity:</strong> Marking an issue <em>"Resolved"</em> preserves the user's logged repair note and timestamp; it is clearly disclaimed that independent physical verification remains necessary.
            </li>
          </ul>
        </div>
      </div>

      {/* Tech Stack & Dual-Laptop Setup */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* Architecture */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 14 }}>
            <Database size={18} style={{ color: '#0ea5e9' }} /> Technical Architecture
          </h3>
          <div style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6 }}>
            <p style={{ marginBottom: 8 }}>
              <strong>Frontend:</strong> React 19, Vite, Vanilla CSS design system, React Router DOM, Recharts data visualization, Lucide React icons, Axios client.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Backend:</strong> Python 3.14, FastAPI, Uvicorn ASGI server, Pydantic V2 data validation models, SQLAlchemy ORM, Pytest test suite.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Database:</strong> SQLite database (<code style={{ color: '#38bdf8' }}>aavaran.db</code>) with automatic schema migration, deterministic demo seeding, and full CRUD persistence.
            </p>
            <p>
              <strong>API Docs:</strong> Swagger UI interactive documentation available at <code style={{ color: '#38bdf8' }}>http://127.0.0.1:8000/docs</code>.
            </p>
          </div>
        </div>

        {/* Multi-Device Setup */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 14 }}>
            <Wifi size={18} style={{ color: '#10b981' }} /> Same-Wi-Fi Dual Laptop Demo Guide
          </h3>
          <div style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6 }}>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>
                <strong>Run backend with LAN host:</strong><br />
                <code style={{ color: '#10b981' }}>python -m uvicorn main:app --host 0.0.0.0 --port 8000</code>
              </li>
              <li>
                <strong>Find Laptop IPv4 address:</strong><br />
                Run <code style={{ color: '#10b981' }}>ipconfig</code> on backend laptop (e.g. 192.168.1.45).
              </li>
              <li>
                <strong>Configure Frontend:</strong><br />
                Set <code style={{ color: '#10b981' }}>VITE_API_BASE_URL=http://192.168.1.45:8000</code> in <code style={{ color: '#10b981' }}>frontend/.env</code>.
              </li>
              <li>
                <strong>Run Vite:</strong> Run <code style={{ color: '#10b981' }}>npm run dev</code> on frontend laptop.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
