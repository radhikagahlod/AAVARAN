import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Download,
  Search,
  Filter,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
  Droplets,
  HelpCircle,
  X,
  FileCheck,
  Cpu,
  BarChart2,
} from 'lucide-react';
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

export function UploadAnalyze() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'review', 'analytics', 'history'

  // Upload form state
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('electricity_bill');
  const [building, setBuilding] = useState('Science Complex');
  const [billingPeriod, setBillingPeriod] = useState('September 2026');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Extraction Review state
  const [extractedData, setExtractedData] = useState(null);
  const [reviewFields, setReviewFields] = useState({
    consumption: '',
    consumption_unit: 'kWh',
    bill_amount: '',
    consumer_number: '',
    meter_number: '',
    previous_reading: '',
    current_reading: '',
    notes: '',
  });
  const [confirming, setConfirming] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(null);

  // History state
  const [documents, setDocuments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategory, setHistoryCategory] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Analytics state
  const [analyticsResource, setAnalyticsResource] = useState('Electricity');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const fileInputRef = useRef(null);

  // Load History
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const docs = await api.getDocuments({
        category: historyCategory || undefined,
        search: historySearch || undefined,
      });
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load Analytics
  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const data =
        analyticsResource === 'Electricity'
          ? await api.getElectricityAnalytics()
          : await api.getWaterAnalytics();
      setAnalyticsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, historyCategory, analyticsResource]);

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    setUploadError(null);
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    const validExts = ['.pdf', '.jpg', '.jpeg', '.png', '.csv'];
    if (!validExts.includes(ext)) {
      setUploadError(`Invalid file format '${ext}'. Supported: PDF, JPG, PNG, CSV.`);
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10 MB limit.');
      return;
    }
    setFile(selectedFile);
  };

  // 1-Click Load Synthetic Sample Bills for Testing
  const handleLoadSample = (sampleType) => {
    setUploadError(null);
    let sampleContent = '';
    let sampleName = '';
    let cat = 'electricity_bill';
    let bld = 'Science Complex';
    let per = 'September 2026';

    if (sampleType === 'elec_pdf') {
      cat = 'electricity_bill';
      sampleName = 'sample_electricity_bill.pdf';
      sampleContent =
        'Consumer No: CAMPUS-EL-90214\nMeter No: MTR-SCIENCE-401\nBilling Period: September 2026\nPrevious Reading: 13200.0\nCurrent Reading: 13418.0\nUnits Consumed: 218.0 kWh\nTotal Bill Amount: Rs 2177.00\n';
    } else if (sampleType === 'water_pdf') {
      cat = 'water_bill';
      sampleName = 'sample_water_bill.pdf';
      bld = 'Engineering Block A';
      sampleContent =
        'Consumer No: CAMPUS-WT-55310\nMeter No: WTR-ENG-05\nBilling Period: September 2026\nWater Consumption: 1280.0 litres\nTotal Bill Amount: Rs 1100.00\n';
    } else if (sampleType === 'elec_csv') {
      cat = 'electricity_report';
      sampleName = 'sample_electricity_report.csv';
      sampleContent =
        'timestamp,building,location,consumption,unit,status\n2026-10-10T09:00:00Z,Computer Center,Main Cluster,175.5,kWh,Normal\n2026-10-10T11:00:00Z,Science Complex,Auditorium AC,198.0,kWh,Elevated\n2026-10-10T14:00:00Z,Library Building,Reading Hall,112.0,kWh,Normal\n';
    } else if (sampleType === 'garbage_csv') {
      cat = 'garbage_records';
      sampleName = 'sample_garbage_records.csv';
      bld = 'Main Campus';
      sampleContent =
        'bin_code,building,location,fill_level\nBIN-007,Science Complex,Courtyard,91.0\nBIN-008,Engineering Block B,Lounge,68.5\nBIN-009,Central Dining Hall,Plaza,86.0\n';
    } else if (sampleType === 'maint_csv') {
      cat = 'maintenance_report';
      sampleName = 'sample_maintenance_report.csv';
      bld = 'Main Campus';
      sampleContent =
        'device_name,device_type,resource_type,building,location,description,severity,status,estimated_waste\nRestroom Tap East,Tap,Water,Science Complex,1st Floor,Leaking tap handle,High,Reported,75.0\nCorridor Floodlight,Light Bank,Electricity,Hostel 1,Wing C,Daylight timer stuck ON,Medium,Reported,14.0\n';
    }

    const blob = new Blob([sampleContent], {
      type: sampleName.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
    });
    const sampleFile = new File([blob], sampleName, {
      type: sampleName.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
    });

    setFile(sampleFile);
    setCategory(cat);
    setBuilding(bld);
    setBillingPeriod(per);
  };

  // Step 1: Submit file for automatic extraction
  const handleExtractSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select or drop a bill / report file first.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setConfirmedSuccess(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('building', building);
      formData.append('billing_period', billingPeriod);

      const res = await api.extractDocument(formData);
      setExtractedData(res);
      setReviewFields({
        consumption: res.consumption !== null && res.consumption !== undefined ? res.consumption : '',
        consumption_unit: res.consumption_unit || ('water' in category ? 'litres' : 'kWh'),
        bill_amount: res.bill_amount !== null && res.bill_amount !== undefined ? res.bill_amount : '',
        consumer_number: res.consumer_number || '',
        meter_number: res.meter_number || '',
        previous_reading: res.previous_reading !== null && res.previous_reading !== undefined ? res.previous_reading : '',
        current_reading: res.current_reading !== null && res.current_reading !== undefined ? res.current_reading : '',
        notes: res.notes || '',
      });

      // Advance to review tab
      setActiveTab('review');
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.detail || 'Extraction failed. Please verify file integrity.');
    } finally {
      setUploading(false);
    }
  };

  // Step 2: Confirm and commit to database
  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    if (!extractedData) return;

    try {
      setConfirming(true);
      const payload = {
        temp_token: extractedData.temp_token,
        category: extractedData.category,
        building: extractedData.building,
        billing_period: extractedData.billing_period,
        consumption: reviewFields.consumption !== '' ? Number(reviewFields.consumption) : null,
        consumption_unit: reviewFields.consumption_unit,
        bill_amount: reviewFields.bill_amount !== '' ? Number(reviewFields.bill_amount) : null,
        consumer_number: reviewFields.consumer_number || null,
        meter_number: reviewFields.meter_number || null,
        previous_reading: reviewFields.previous_reading !== '' ? Number(reviewFields.previous_reading) : null,
        current_reading: reviewFields.current_reading !== '' ? Number(reviewFields.current_reading) : null,
        notes: reviewFields.notes || null,
      };

      const savedDoc = await api.confirmDocument(payload);
      setConfirmedSuccess({
        id: savedDoc.id,
        category: savedDoc.category,
        building: savedDoc.building,
        consumption: savedDoc.consumption,
        unit: savedDoc.consumption_unit,
        bill_amount: savedDoc.bill_amount,
      });

      setFile(null);
      setExtractedData(null);
      setActiveTab('analytics');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to save confirmed record.');
    } finally {
      setConfirming(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (id) => {
    if (!window.confirm(`Are you sure you want to delete document #${id}?`)) return;
    try {
      await api.deleteDocument(id);
      fetchHistory();
      if (selectedDoc && selectedDoc.id === id) setSelectedDoc(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete document.');
    }
  };

  return (
    <div>
      <DemoBanner message="Document extraction analyzes bills and reports. Rule-based anomaly thresholds and statistical regression models update live upon confirmation." />

      {/* Success Notification Banner */}
      {confirmedSuccess && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            borderColor: '#10b981',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle size={22} style={{ color: '#10b981' }} />
            <div>
              <strong style={{ color: '#10b981' }}>Record #{confirmedSuccess.id} Confirmed &amp; Saved!</strong>
              <div style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>
                Dashboard updated for {confirmedSuccess.building}: {confirmedSuccess.consumption} {confirmedSuccess.unit}
                {confirmedSuccess.bill_amount && ` (Amount: ₹${confirmedSuccess.bill_amount})`}.
              </div>
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setConfirmedSuccess(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('upload')}
        >
          <UploadCloud size={16} /> 1. Upload &amp; Extract
        </button>

        <button
          className={`btn ${activeTab === 'review' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('review')}
          disabled={!extractedData}
          style={{ opacity: !extractedData ? 0.6 : 1 }}
        >
          <FileCheck size={16} /> 2. Review &amp; Confirm {extractedData ? '(!)' : ''}
        </button>

        <button
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('analytics')}
        >
          <Cpu size={16} /> 3. AI Analytics &amp; Forecasting
        </button>

        <button
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
        >
          <BarChart2 size={16} /> 4. Upload History &amp; Reports
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: UPLOAD & EXTRACT                                        */}
      {/* ============================================================== */}
      {activeTab === 'upload' && (
        <div>
          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Upload Form Card */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 6 }}>
                <UploadCloud size={20} style={{ color: '#10b981' }} /> Document Intake Portal
              </h3>
              <p className="card-subtitle" style={{ marginBottom: 18 }}>
                Upload utility bills (PDF, PNG, JPG) or monitoring reports (CSV) for automatic data extraction.
              </p>

              <form onSubmit={handleExtractSubmit}>
                <div className="form-group">
                  <label className="form-label">Document Category *</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="electricity_bill">Electricity Bill (PDF / Scanned Image)</option>
                    <option value="water_bill">Water Bill (PDF / Scanned Image)</option>
                    <option value="electricity_report">Electricity Consumption Report (CSV)</option>
                    <option value="water_report">Water Consumption Report (CSV)</option>
                    <option value="garbage_records">Garbage Bin Fill Records (CSV)</option>
                    <option value="maintenance_report">Maintenance &amp; Defective Devices (CSV)</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Campus Facility / Building *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Science Complex"
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Billing / Reporting Period *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. September 2026 or 2026-Q3"
                      value={billingPeriod}
                      onChange={(e) => setBillingPeriod(e.target.value)}
                    />
                  </div>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? '#10b981' : '#334155'}`,
                    borderRadius: 12,
                    padding: '28px 20px',
                    textAlign: 'center',
                    backgroundColor: isDragging ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: 16,
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png,.csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                  />
                  <UploadCloud size={38} style={{ color: file ? '#10b981' : '#64748b', margin: '0 auto 10px' }} />
                  {file ? (
                    <div>
                      <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>{file.name}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
                        Size: {(file.size / 1024).toFixed(1)} KB — Click or drop to replace
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.92rem', color: '#f8fafc', fontWeight: 600 }}>
                        Drag &amp; drop document here, or <span style={{ color: '#10b981' }}>browse files</span>
                      </p>
                      <p style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 4 }}>
                        Supported: PDF, JPG, PNG, CSV (Max: 10 MB). Safe sandboxed parsing.
                      </p>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div style={{ color: '#f43f5e', fontSize: '0.82rem', marginBottom: 14 }}>
                    ⚠️ {uploadError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={uploading || !file}
                >
                  {uploading ? (
                    <>
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }}></div>
                      Extracting Document Data...
                    </>
                  ) : (
                    <>
                      <FileText size={16} /> Process &amp; Extract Document
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick Demo Sample Files Card */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 6 }}>
                <FileCheck size={20} style={{ color: '#38bdf8' }} /> Quick Synthetic Demo Tester
              </h3>
              <p className="card-subtitle" style={{ marginBottom: 18 }}>
                Test extraction and analytics instantly using pre-configured synthetic college documents.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px' }}
                  onClick={() => handleLoadSample('elec_pdf')}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Load Sample Electricity Bill (PDF)</div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                      Science Complex • 218 kWh • ₹2,177 • Consumer CAMPUS-EL-90214
                    </div>
                  </div>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px' }}
                  onClick={() => handleLoadSample('water_pdf')}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Droplets size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Load Sample Water Bill (PDF)</div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                      Engineering Block A • 1,280 L • ₹1,100 • Meter WTR-ENG-05
                    </div>
                  </div>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px' }}
                  onClick={() => handleLoadSample('elec_csv')}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Load Electricity Report (CSV)</div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                      Multi-facility smart meter subpanel feed records
                    </div>
                  </div>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px' }}
                  onClick={() => handleLoadSample('garbage_csv')}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Load Garbage Bins Telemetry (CSV)</div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                      Ultrasonic bin capacity updates (BIN-007 through BIN-010)
                    </div>
                  </div>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px' }}
                  onClick={() => handleLoadSample('maint_csv')}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <FileCheck size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Load Maintenance Report (CSV)</div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                      Defective fixtures causing water seepage &amp; lighting waste
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: REVIEW & CONFIRM                                        */}
      {/* ============================================================== */}
      {activeTab === 'review' && extractedData && (
        <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <FileCheck size={20} style={{ color: '#10b981' }} /> Review &amp; Confirm Extracted Information
              </h3>
              <p className="card-subtitle">
                Inspect extracted fields from <strong>{extractedData.filename}</strong>. Modify or complete any values before saving.
              </p>
            </div>
            <span
              className={`badge ${
                extractedData.extraction_confidence === 'high'
                  ? 'badge-normal'
                  : extractedData.extraction_confidence === 'medium'
                  ? 'badge-warning'
                  : 'badge-info'
              }`}
            >
              Confidence: {extractedData.extraction_confidence.toUpperCase()}
            </span>
          </div>

          <form onSubmit={handleConfirmSubmit}>
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 16, borderRadius: 10, marginBottom: 20, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                <strong>Extraction Insights:</strong> {extractedData.notes}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Extracted Consumption ({reviewFields.consumption_unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="e.g. 218.0"
                  value={reviewFields.consumption}
                  onChange={(e) => setReviewFields({ ...reviewFields, consumption: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Measurement Unit</label>
                <input
                  type="text"
                  className="form-input"
                  value={reviewFields.consumption_unit}
                  onChange={(e) => setReviewFields({ ...reviewFields, consumption_unit: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Total Bill Amount (₹ / Currency)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="e.g. 2177.00"
                  value={reviewFields.bill_amount}
                  onChange={(e) => setReviewFields({ ...reviewFields, bill_amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Consumer / Account Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CAMPUS-EL-90214"
                  value={reviewFields.consumer_number}
                  onChange={(e) => setReviewFields({ ...reviewFields, consumer_number: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Meter Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. MTR-SCIENCE-401"
                  value={reviewFields.meter_number}
                  onChange={(e) => setReviewFields({ ...reviewFields, meter_number: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Previous &amp; Current Readings</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="Prev (e.g. 13200)"
                    value={reviewFields.previous_reading}
                    onChange={(e) => setReviewFields({ ...reviewFields, previous_reading: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="Curr (e.g. 13418)"
                    value={reviewFields.current_reading}
                    onChange={(e) => setReviewFields({ ...reviewFields, current_reading: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Verification &amp; Audit Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Optional comments or voucher reference numbers..."
                value={reviewFields.notes}
                onChange={(e) => setReviewFields({ ...reviewFields, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveTab('upload')}
              >
                Cancel / Re-upload
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={confirming}
              >
                {confirming ? 'Saving to Database...' : 'Confirm & Save to Dashboard'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: AI ANALYTICS & FORECASTING                              */}
      {/* ============================================================== */}
      {activeTab === 'analytics' && (
        <div>
          {/* Resource Selection Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-sm ${analyticsResource === 'Electricity' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAnalyticsResource('Electricity')}
              >
                <Zap size={14} /> Electricity Analytics
              </button>
              <button
                className={`btn btn-sm ${analyticsResource === 'Water' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAnalyticsResource('Water')}
              >
                <Droplets size={14} /> Water Analytics
              </button>
            </div>

            <button className="btn btn-outline btn-sm" onClick={fetchAnalytics}>
              <RefreshCw size={14} /> Refresh Analytics
            </button>
          </div>

          {loadingAnalytics ? (
            <div className="state-box">
              <div className="spinner"></div>
              <p className="state-title">Calculating Resource Analytics...</p>
            </div>
          ) : analyticsData ? (
            <div>
              {/* Analytics Summary Cards */}
              <div className="grid-4" style={{ marginBottom: 24 }}>
                <div className="card">
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>LATEST PERIOD CONSUMPTION</span>
                  <div style={{ fontSize: '1.7rem', fontWeight: 800, marginTop: 4 }}>
                    {analyticsData.current_consumption}{' '}
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {analyticsData.consumption_unit}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Active billing statement</span>
                </div>

                <div className="card">
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>PERIOD-OVER-PERIOD CHANGE</span>
                  <div
                    style={{
                      fontSize: '1.7rem',
                      fontWeight: 800,
                      marginTop: 4,
                      color:
                        analyticsData.percentage_change !== null
                          ? analyticsData.percentage_change > 15
                            ? '#f43f5e'
                            : analyticsData.percentage_change < 0
                            ? '#10b981'
                            : '#f59e0b'
                          : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {analyticsData.percentage_change !== null ? (
                      <>
                        {analyticsData.percentage_change > 0 ? (
                          <TrendingUp size={22} />
                        ) : (
                          <TrendingDown size={22} />
                        )}
                        {analyticsData.percentage_change > 0 ? '+' : ''}
                        {analyticsData.percentage_change}%
                      </>
                    ) : (
                      'N/A (1st Cycle)'
                    )}
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    vs previous {analyticsData.previous_consumption ? `${analyticsData.previous_consumption} ${analyticsData.consumption_unit}` : 'baseline'}
                  </span>
                </div>

                <div className="card">
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>TOTAL BILLED EXPENDITURE</span>
                  <div style={{ fontSize: '1.7rem', fontWeight: 800, marginTop: 4, color: '#f59e0b' }}>
                    ₹{analyticsData.total_bill_amount.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Aggregated utility expense</span>
                </div>

                <div className="card">
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>ANOMALY STATUS</span>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${analyticsData.anomaly_flag ? 'badge-danger' : 'badge-normal'}`}>
                      {analyticsData.anomaly_flag ? 'Unusual Increase Flagged' : 'Within Normal Baseline'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: 8 }}>
                    Rule threshold check
                  </span>
                </div>
              </div>

              {/* Anomaly & Recommended Action Card */}
              {analyticsData.anomaly_flag && (
                <div
                  className="card"
                  style={{
                    marginBottom: 24,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    background: 'rgba(239, 68, 68, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <h4 style={{ color: '#f43f5e', fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
                        Anomaly Detected: {analyticsData.anomaly_reason}
                      </h4>
                      <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                        <strong>Recommended Corrective Action:</strong> {analyticsData.recommended_action}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Real AI & Predictive Modeling Card */}
              <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Historical Periods Chart */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h4 className="card-title">
                        <BarChart2 size={18} style={{ color: '#10b981' }} /> Historical Billing Consumption
                      </h4>
                      <p className="card-subtitle">Monthly tracked volume from confirmed utility bills</p>
                    </div>
                  </div>
                  <div style={{ height: 260, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.historical_periods} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <XAxis dataKey="period" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }}
                          formatter={(val) => [`${val} ${analyticsData.consumption_unit}`, 'Consumption']}
                        />
                        <Bar dataKey="consumption" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Machine Learning / Statistical Trend Model */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h4 className="card-title">
                        <Cpu size={18} style={{ color: '#38bdf8' }} /> Statistical Demand Forecasting (Real AI)
                      </h4>
                      <p className="card-subtitle">Ordinary Least Squares Regression based on billing history</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 14, borderRadius: 10, border: '1px solid #1e293b' }}>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>MODEL STATUS &amp; CONFIDENCE:</div>
                      <div style={{ fontSize: '0.92rem', color: '#f8fafc', fontWeight: 600, marginTop: 4 }}>
                        {analyticsData.prediction.message}
                      </div>
                    </div>

                    {analyticsData.prediction.has_model ? (
                      <div className="grid-2" style={{ gap: 12 }}>
                        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 12, borderRadius: 8 }}>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>PROJECTED NEXT CYCLE:</span>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>
                            {analyticsData.prediction.projected_next} {analyticsData.consumption_unit}
                          </div>
                        </div>

                        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 12, borderRadius: 8 }}>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>TREND DIRECTION:</span>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: analyticsData.prediction.trend_direction === 'upward' ? '#f59e0b' : '#10b981', textTransform: 'capitalize' }}>
                            {analyticsData.prediction.trend_direction} (Slope: {analyticsData.prediction.slope})
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>
                        * Machine learning forecasting activates automatically once 3 or more historical billing cycles are stored. No synthetic predictions are fabricated.
                      </div>
                    )}

                    <div style={{ fontSize: '0.76rem', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: 10 }}>
                      Model: Ordinary Least Squares (OLS) Linear Regression • Objective: Resource demand projection and consumption drift monitoring.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: UPLOAD HISTORY & REPORTS                                */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div>
          {/* History Toolbar */}
          <div className="toolbar">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search filename or building..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              <select
                className="form-select"
                style={{ padding: '8px 12px', fontSize: '0.84rem' }}
                value={historyCategory}
                onChange={(e) => setHistoryCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="electricity_bill">Electricity Bills</option>
                <option value="water_bill">Water Bills</option>
                <option value="electricity_report">Electricity Reports (CSV)</option>
                <option value="water_report">Water Reports (CSV)</option>
                <option value="garbage_records">Garbage Records (CSV)</option>
                <option value="maintenance_report">Maintenance Reports (CSV)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={fetchHistory}>
                <RefreshCw size={14} /> Refresh
              </button>
              <a
                href={api.getExportUrl()}
                className="btn btn-primary btn-sm"
                target="_blank"
                rel="noreferrer"
                download="aavaran_resource_documents_report.csv"
              >
                <Download size={14} /> Export CSV Report
              </a>
            </div>
          </div>

          {/* Documents Table */}
          <div className="card">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Document</th>
                    <th>Category</th>
                    <th>Building</th>
                    <th>Billing Period</th>
                    <th>Consumption</th>
                    <th>Bill Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <tr key={doc.id}>
                        <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>#{doc.id}</td>
                        <td>
                          <strong>{doc.filename}</strong>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {new Date(doc.upload_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={doc.category.replace('_', ' ')} />
                        </td>
                        <td>{doc.building}</td>
                        <td>{doc.billing_period}</td>
                        <td>
                          {doc.consumption !== null ? (
                            <strong>
                              {doc.consumption} {doc.consumption_unit}
                            </strong>
                          ) : (
                            <span style={{ color: '#64748b' }}>—</span>
                          )}
                        </td>
                        <td>
                          {doc.bill_amount !== null ? (
                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>₹{doc.bill_amount}</span>
                          ) : (
                            <span style={{ color: '#64748b' }}>—</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={doc.status} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedDoc(doc)}
                              title="View Document Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteDoc(doc.id)}
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 36, color: '#64748b' }}>
                        {loadingHistory ? 'Loading upload history...' : 'No uploaded records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Document Detail Modal */}
          {selectedDoc && (
            <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
              <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h3 className="modal-title">Document Record #{selectedDoc.id}</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{selectedDoc.filename}</span>
                  </div>
                  <button className="btn-outline btn-sm" onClick={() => setSelectedDoc(null)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Category:</span>
                      <div style={{ fontWeight: 600 }}>{selectedDoc.category}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Building:</span>
                      <div style={{ fontWeight: 600 }}>{selectedDoc.building}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Billing Period:</span>
                      <div style={{ fontWeight: 600 }}>{selectedDoc.billing_period}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Upload Date:</span>
                      <div>{new Date(selectedDoc.upload_date).toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid #1e293b' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Extracted Consumption:</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
                          {selectedDoc.consumption !== null ? `${selectedDoc.consumption} ${selectedDoc.consumption_unit}` : 'None'}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Bill Amount:</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
                          {selectedDoc.bill_amount !== null ? `₹${selectedDoc.bill_amount}` : 'None'}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Consumer ID:</span>
                        <div style={{ fontFamily: 'monospace' }}>{selectedDoc.consumer_number || 'N/A'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Meter ID:</span>
                        <div style={{ fontFamily: 'monospace' }}>{selectedDoc.meter_number || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {selectedDoc.notes && (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      <strong>Audit Notes:</strong> {selectedDoc.notes}
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setSelectedDoc(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadAnalyze;
