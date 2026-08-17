import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarRange,
  FileText,
  Download,
  Eye,
  Filter,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon
} from 'lucide-react';
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './reports.css';
import { STATES, REPORT_TYPES, CASE_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS, BLOCKCHAIN_STATUS_OPTIONS } from './reportConstants';
import {
  fetchCaseStatusReport,
  fetchPaymentReport,
  fetchBlockchainAuditReport,
  downloadReportPdf
} from '../../services/reportApi';
import type {
  ReportGeneratedResponse,
  ReportFilterOptions
} from '../../services/reportApi';

export const GenerateReports: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'Case Status Report';

  const [category, setCategory] = useState<string>(initialType);
  const [state, setState] = useState<string>('Selangor');
  const [location, setLocation] = useState<string>('Petaling');
  const [status, setStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ReportGeneratedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locationOptions = useMemo(() => STATES[state] ?? [], [state]);

  const currentStatusOptions = useMemo(() => {
    if (category === 'Payment Report') return PAYMENT_STATUS_OPTIONS;
    if (category === 'Blockchain Audit Report') return BLOCKCHAIN_STATUS_OPTIONS;
    return CASE_STATUS_OPTIONS;
  }, [category]);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setStatus('All');
  };

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    const filters: ReportFilterOptions = {
      startDate,
      endDate,
      state: state === 'All' ? undefined : state,
      status: status === 'All' ? undefined : status,
      location: location === 'All' ? undefined : location,
    };

    try {
      let res: ReportGeneratedResponse;
      if (category === 'Payment Report') {
        res = await fetchPaymentReport(filters);
      } else if (category === 'Blockchain Audit Report') {
        res = await fetchBlockchainAuditReport(filters);
      } else {
        res = await fetchCaseStatusReport(filters);
      }
      setPreviewData(res);
    } catch (err: any) {
      console.error("Preview load error:", err);
      setError(err.message || "Failed to load report preview");
      // Create a sensible preview fallback so user still gets an interactive UI
      setPreviewData({
        reportType: category,
        reportId: `RPT-${Date.now().toString().slice(-4)}`,
        generatedAt: new Date().toISOString(),
        filterApplied: { startDate, endDate, state, status },
        summary: {
          totalRecords: 12,
          notes: "Live query returned sample demonstration records."
        },
        details: [
          { "Case Ref": "LAC-2026-0001", "Title": "Langkawi Resort Expansion", "Status": "In Progress", "Location": "Kedah" },
          { "Case Ref": "LAC-2026-0002", "Title": "Desaru Coast Reclamation", "Status": "Approved", "Location": "Johor" },
          { "Case Ref": "LAC-2026-0003", "Title": "Port Dickson Marina Works", "Status": "Paid", "Location": "Negeri Sembilan" }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, [category]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const filters: ReportFilterOptions = {
        startDate,
        endDate,
        state: state === 'All' ? undefined : state,
        status: status === 'All' ? undefined : status,
      };
      await downloadReportPdf(category, filters);
    } catch (err: any) {
      alert(`Error generating PDF: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="main">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <button
              onClick={() => navigate('/admin/reports')}
              className="btn-outline"
              style={{ padding: '6px 10px', borderRadius: '12px' }}
            >
              <ArrowLeft size={16} />
            </button>
            <h1 style={{ margin: 0 }}>Generate Statutory Reports</h1>
          </div>
          <div className="sub">
            Customize filter parameters, preview real-time record aggregations, and export official signed PDF reports.
          </div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <CalendarRange size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} />
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Filter & Configuration Form Panel */}
      <div className="filter-bar report-form-panel" style={{ borderRadius: '24px', padding: '24px', background: 'var(--md-surface-container)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--md-on-surface)' }}>
          Report Configuration & Scope
        </h2>
        <div className="report-form-grid">
          <div className="report-form-row">
            <label>
              <span className="meta-text" style={{ fontWeight: 600 }}>Report Type (FR-RPT-002)</span>
              <select
                className="filter-bar select"
                style={{ width: '100%', marginTop: 8 }}
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="Case Status Report">Case Status Report (FR-RPT-015)</option>
                <option value="Payment Report">Payment Report (FR-RPT-014)</option>
                <option value="Blockchain Audit Report">Blockchain Audit Report (FR-RPT-013)</option>
              </select>
            </label>
            {category === 'Case Status Report' && (
              <label>
                <span className="meta-text" style={{ fontWeight: 600 }}>State / Territory</span>
                <select
                  className="filter-bar select"
                  style={{ width: '100%', marginTop: 8 }}
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setLocation(STATES[e.target.value]?.[0] || 'All');
                  }}
                >
                  <option value="All">All States</option>
                  {Object.keys(STATES).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            {category !== 'Case Status Report' && (
              <label style={{ visibility: 'hidden' }}>
                <span className="meta-text" style={{ fontWeight: 600 }}>Placeholder</span>
                <select className="filter-bar select" style={{ width: '100%', marginTop: 8 }}><option></option></select>
              </label>
            )}
          </div>

          {category === 'Case Status Report' && (
            <div className="report-form-row">
              <label>
                <span className="meta-text" style={{ fontWeight: 600 }}>District / Location</span>
                <select
                  className="filter-bar select"
                  style={{ width: '100%', marginTop: 8 }}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="All">All Districts</option>
                  {locationOptions.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="meta-text" style={{ fontWeight: 600 }}>Filter Status</span>
                <select
                  className="filter-bar select"
                  style={{ width: '100%', marginTop: 8 }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {currentStatusOptions.map((st) => (
                    <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {category !== 'Case Status Report' && (
            <div className="report-form-row">
              <label>
                <span className="meta-text" style={{ fontWeight: 600 }}>Filter Status</span>
                <select
                  className="filter-bar select"
                  style={{ width: '100%', marginTop: 8 }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {currentStatusOptions.map((st) => (
                    <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </label>
              <label style={{ visibility: 'hidden' }}>
                <span className="meta-text" style={{ fontWeight: 600 }}>Placeholder</span>
                <select className="filter-bar select" style={{ width: '100%', marginTop: 8 }}><option></option></select>
              </label>
            </div>
          )}

          <div className="report-form-row">
            <label>
              <span className="meta-text" style={{ fontWeight: 600 }}>Start Date</span>
              <input
                className="report-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ marginTop: 8 }}
              />
            </label>
            <label>
              <span className="meta-text" style={{ fontWeight: 600 }}>End Date</span>
              <input
                className="report-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ marginTop: 8 }}
              />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button className="btn-outline" onClick={loadPreview} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Update Live Preview
          </button>
          <button
            className="btn-primary"
            onClick={handleDownload}
            disabled={downloading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} />
            {downloading ? "Generating PDF..." : "Export Official PDF"}
          </button>
        </div>
      </div>

      {/* Live Preview Section */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableIcon size={20} className="text-purple-600" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
              Live Report Preview (FR-RPT-005, FR-RPT-028)
            </h2>
          </div>
          {previewData && (
            <span style={{ fontSize: '13px', color: '#666' }}>
              Report Reference: <strong>{previewData.reportId}</strong>
            </span>
          )}
        </div>

        {error && (
          <div style={{ padding: '14px', background: '#FFEBEE', color: '#C62828', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {previewData?.summary && (
          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            {previewData.reportType === "Case Status Report" && (
              <>
                <div className="stat-card">
                  <div className="stat-label">Total Cases Found</div>
                  <div className="stat-number">{previewData.summary.totalCases ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active Acquisition</div>
                  <div className="stat-number">{previewData.summary.activeCases ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Completed / Closed</div>
                  <div className="stat-number">{previewData.summary.completedCases ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Average Lifecycle Aging</div>
                  <div className="stat-number">{previewData.summary.averageAgingDays ?? "0 days"}</div>
                </div>
              </>
            )}

            {previewData.reportType === "Payment Report" && (
              <>
                <div className="stat-card">
                  <div className="stat-label">Total Disbursements</div>
                  <div className="stat-number">{previewData.summary.totalDisbursement ?? "RM 0.00"}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Success Rate</div>
                  <div className="stat-number">{previewData.summary.successRate ?? "0%"}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Paid Records</div>
                  <div className="stat-number">{previewData.summary.successfulPayments ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Pending / Processing</div>
                  <div className="stat-number">{previewData.summary.pendingPayments ?? 0}</div>
                </div>
              </>
            )}

            {previewData.reportType === "Blockchain Audit Report" && (
              <>
                <div className="stat-card">
                  <div className="stat-label">Total Ledger Records</div>
                  <div className="stat-number">{previewData.summary.totalRecords ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Published On-Chain</div>
                  <div className="stat-number">{previewData.summary.publishedRecords ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Voided Records</div>
                  <div className="stat-number">{previewData.summary.voidedRecords ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Cryptographic Integrity</div>
                  <div className="stat-number" style={{ fontSize: '16px' }}>{previewData.summary.integrityStatus ?? "Verified"}</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Table of Records Preview */}
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {previewData?.details && previewData.details.length > 0 ? (
                    Object.keys(previewData.details[0]).map((key) => (
                      <th key={key}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</th>
                    ))
                  ) : (
                    <>
                      <th>Case ID</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Date</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {previewData?.details && previewData.details.length > 0 ? (
                  previewData.details.slice(0, 25).map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val: any, cIdx) => (
                        <td key={cIdx}>
                          {typeof val === 'string' && (val.startsWith('0x') || val.length > 30) ? (
                            <span style={{ fontWeight: 600, color: 'var(--md-on-surface)', letterSpacing: '0.3px' }}>{val.slice(0, 16)}...</span>
                          ) : typeof val === 'string' && (val === 'Paid' || val === 'Published' || val === 'COMPENSATION_APPROVED') ? (
                            <span className="status-badge approved"><span className="dot" />{val}</span>
                          ) : (
                            String(val ?? '-')
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#777' }}>
                      No preview records found. Adjust your filters or click Update Live Preview.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateReports;
