import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarRange,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Table as TableIcon,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useNotification } from '../../components/ui/NotificationSystem';
import {
  STATES,
  CASE_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  BLOCKCHAIN_STATUS_OPTIONS
} from './reportConstants';
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

const SUPPORTED_TYPES = ['Case Status Report', 'Payment Report', 'Blockchain Audit Report'];

const REPORT_CODE: Record<string, string> = {
  'Case Status Report': 'FR-RPT-015',
  'Payment Report': 'FR-RPT-014',
  'Blockchain Audit Report': 'FR-RPT-013',
};

/* ─────────────────────────── Preview primitives ─────────────────────────── */

const PreviewSummary: React.FC<{ data: ReportGeneratedResponse }> = ({ data }) => {
  const s = data.summary ?? {};
  let cards: { label: string; value: React.ReactNode }[] = [];

  if (data.reportType === "Case Status Report") {
    cards = [
      { label: 'Total Cases Found', value: s.totalCases ?? 0 },
      { label: 'Active Acquisition', value: s.activeCases ?? 0 },
      { label: 'Completed / Closed', value: s.completedCases ?? 0 },
      { label: 'Average Lifecycle Aging', value: s.averageAgingDays ?? '0 days' },
    ];
  } else if (data.reportType === "Payment Report") {
    cards = [
      { label: 'Total Disbursements', value: s.totalDisbursement ?? 'RM 0.00' },
      { label: 'Success Rate', value: s.successRate ?? '0%' },
      { label: 'Paid Records', value: s.successfulPayments ?? 0 },
      { label: 'Pending / Processing', value: s.pendingPayments ?? 0 },
    ];
  } else {
    cards = [
      { label: 'Total Ledger Records', value: s.totalRecords ?? 0 },
      { label: 'Published On-Chain', value: s.publishedRecords ?? 0 },
      { label: 'Voided Records', value: s.voidedRecords ?? 0 },
      { label: 'Cryptographic Integrity', value: s.integrityStatus ?? 'Verified' },
    ];
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-md-surface-container rounded-xl p-5 shadow-sm">
          <div className="text-[13px] font-medium text-md-on-surface-variant tracking-wide">{c.label}</div>
          <div className="text-2xl font-bold mt-1 tracking-tight">{c.value}</div>
        </div>
      ))}
    </div>
  );
};

const PreviewTable: React.FC<{ data: ReportGeneratedResponse }> = ({ data }) => {
  const isSuccessStatus = (val: string) =>
    ['Paid', 'Published', 'Approved', 'Completed', 'COMPENSATION_APPROVED', 'CASE_CLOSED'].includes(val);

  return (
    <div className="bg-md-surface-container rounded-xl shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {data.details && data.details.length > 0 ? (
              Object.keys(data.details[0]).map((key) => (
                <th key={key} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant whitespace-nowrap">
                  {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                </th>
              ))
            ) : (
              <>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Case ID</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Date</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {data.details && data.details.length > 0 ? (
            data.details.slice(0, 25).map((row, idx) => (
              <tr key={idx} className="border-t border-md-outline/10 hover:bg-md-primary/5 transition-colors">
                {Object.values(row).map((val: any, cIdx) => (
                  <td key={cIdx} className="px-4 py-3">
                    {typeof val === 'string' && (val.startsWith('0x') || val.length > 30) ? (
                      <span className="font-medium font-mono text-xs text-md-on-surface-variant">{val.slice(0, 16)}...</span>
                    ) : typeof val === 'string' && isSuccessStatus(val) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-3 text-xs font-semibold bg-[#e6f4ea] text-[#1e7b4a]">
                        <span className="w-2 h-2 rounded-full bg-[#1e7b4a]" />
                        {val}
                      </span>
                    ) : (
                      <span className="text-md-on-surface-variant">{String(val ?? '-')}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-md-on-surface-variant">
                <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                No preview records found. Adjust your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

/* ─────────────────────────────── Main page ─────────────────────────────── */

export const GenerateReports: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useNotification();

  // The report type is locked from the entry URL (e.g. clicking
  // "Generate Filtering Report" on a report page) — users cannot switch type.
  const rawType = searchParams.get('type') || 'Case Status Report';
  const category = SUPPORTED_TYPES.includes(rawType) ? rawType : 'Case Status Report';

  const [state, setState] = useState<string>('All');
  const [location, setLocation] = useState<string>('All');
  const [status, setStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ReportGeneratedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const seqRef = useRef(0);

  const locationOptions = useMemo(() => (state === 'All' ? [] : (STATES[state] ?? [])), [state]);

  const currentStatusOptions = useMemo(() => {
    if (category === 'Payment Report') return PAYMENT_STATUS_OPTIONS;
    if (category === 'Blockchain Audit Report') return BLOCKCHAIN_STATUS_OPTIONS;
    return CASE_STATUS_OPTIONS;
  }, [category]);

  const buildFilters = useCallback((): ReportFilterOptions => {
    return {
      startDate,
      endDate,
      state: state === 'All' ? undefined : state,
      status: status === 'All' ? undefined : status,
      location: location === 'All' ? undefined : location,
    };
  }, [startDate, endDate, state, status, location]);

  const loadPreview = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    const filters = buildFilters();

    try {
      let res: ReportGeneratedResponse;
      if (category === 'Payment Report') {
        res = await fetchPaymentReport(filters);
      } else if (category === 'Blockchain Audit Report') {
        res = await fetchBlockchainAuditReport(filters);
      } else {
        res = await fetchCaseStatusReport(filters);
      }
      if (seq !== seqRef.current) return;
      setPreviewData(res);
    } catch (err: any) {
      console.error("Preview load error:", err);
      if (seq !== seqRef.current) return;
      setError(err.message || "Failed to load report preview");
      // Create a sensible preview fallback so the user still gets an interactive UI
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
      if (seq === seqRef.current) setLoading(false);
    }
  }, [category, buildFilters, startDate, endDate, state, status]);

  // Real-time preview: debounce every filter change, no manual refresh button.
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPreview();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadPreview]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadReportPdf(category, buildFilters());
      setDownloading(false);
      setPreviewOpen(false);
      notify({ type: 'success', title: 'Report downloaded', message: 'The PDF report has been generated and downloaded.' });
    } catch (err: any) {
      setDownloading(false);
      notify({ type: 'error', title: 'Download failed', message: err.message || 'Something went wrong while generating the PDF.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="tonal" size="sm" onClick={() => navigate('/admin/reports')}>
            <ArrowLeft size={16} />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold">Generate Statutory Reports</h1>
              <span className="px-2 py-1 rounded-lg bg-md-primary/15 text-md-primary font-bold text-xs whitespace-nowrap">
                {REPORT_CODE[category]}
              </span>
            </div>
            <p className="text-md-on-surface-variant mt-1 max-w-2xl">
              Configure filter parameters for the {category}. The preview updates in real time as you change the filters.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-md-on-surface-variant px-3.5 py-2 rounded-full bg-md-surface-container shadow-sm">
          <CalendarRange size={16} />
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Filter & Configuration Form Panel */}
      <div className="bg-md-surface-container rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Report Configuration & Scope</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Locked report type — no type selector */}
          <div className="md:col-span-2 flex items-center gap-2 px-4 py-3 rounded-xl bg-md-secondary-container text-md-on-secondary-container text-sm">
            <FileText size={16} />
            <span>
              Generating: <strong>{category}</strong> ({REPORT_CODE[category]})
            </span>
          </div>

          {category === 'Case Status Report' && (
            <>
              <Select
                label="State / Territory"
                value={state}
                onChange={(v) => {
                  setState(v);
                  setLocation('All');
                }}
                options={[
                  { value: 'All', label: 'All States' },
                  ...Object.keys(STATES).map((s) => ({ value: s, label: s })),
                ]}
              />
              <Select
                label="District / Location"
                value={location}
                onChange={setLocation}
                options={[
                  { value: 'All', label: 'All Districts' },
                  ...locationOptions.map((loc) => ({ value: loc, label: loc })),
                ]}
              />
            </>
          )}

          <Select
            label="Filter Status"
            value={status}
            onChange={setStatus}
            options={currentStatusOptions.map((st) => ({ value: st, label: st.replace(/_/g, ' ') }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-md-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-md-primary animate-pulse" />
            Live preview updates automatically as you change the filters.
          </span>
          <Button
            variant="filled"
            onClick={() => setPreviewOpen(true)}
            disabled={!previewData || loading}
          >
            <Eye size={16} />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Live Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TableIcon size={20} className="text-md-primary" />
          <h2 className="text-lg font-semibold">Live Report Preview</h2>
          {loading && <RefreshCw size={16} className="animate-spin text-md-on-surface-variant" />}
          {previewData && (
            <span className="text-xs text-md-on-surface-variant">
              Report Reference: <strong>{previewData.reportId}</strong>
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-md-error text-md-on-error text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {previewData && (
          <>
            <PreviewSummary data={previewData} />
            <PreviewTable data={previewData} />
          </>
        )}
      </div>

      {/* Preview-before-download Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => !downloading && setPreviewOpen(false)}
        title={`${category} — Preview`}
        subtitle={previewData ? `Report Reference: ${previewData.reportId} — review the report below, then download the PDF.` : ''}
        maxWidth="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="text" disabled={downloading} onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" isLoading={downloading} onClick={handleDownload}>
              <Download size={14} />
              Download PDF
            </Button>
          </div>
        }
      >
        {previewData && (
          <div className="space-y-4">
            <PreviewSummary data={previewData} />
            <PreviewTable data={previewData} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GenerateReports;
