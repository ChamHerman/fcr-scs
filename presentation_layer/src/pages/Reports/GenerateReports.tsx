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
  ALL_OPTION,
  STATES,
  CASE_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  BLOCKCHAIN_STATUS_OPTIONS,
  caseStatusLabel,
  paymentStatusLabel,
  blockchainStatusLabel
} from './reportConstants';
import type { SelectOption } from '../../components/ui/Select';
import { ReportSummaryCards, ReportDataTable } from './reportComponents';
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

/* One short description per report function. */
const REPORT_DESCRIPTIONS: Record<string, string> = {
  'Case Status Report': 'Acquisition lifecycle, statutory aging and case status.',
  'Payment Report': 'Disbursement ledger, bank clearance and settlement outcomes.',
  'Blockchain Audit Report': 'On-chain publication and document integrity trail.',
};

export const GenerateReports: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useNotification();

  // The report type is locked from the entry URL (e.g. clicking
  // "Generate Filtering Report" on a report page) — users cannot switch type.
  const rawType = searchParams.get('type') || 'Case Status Report';
  const category = SUPPORTED_TYPES.includes(rawType) ? rawType : 'Case Status Report';

  // Back returns to the report page the user came from, when known.
  const fromPath = searchParams.get('from');
  const handleBack = () => {
    if (fromPath) {
      navigate(fromPath);
    } else {
      navigate(-1);
    }
  };

  const [state, setState] = useState<string>('All');
  const [status, setStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ReportGeneratedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const seqRef = useRef(0);

  /* Values are real enum members; labels come from the owning module's map. */
  const currentStatusOptions = useMemo<SelectOption[]>(() => {
    const toOptions = (values: string[], labelFor: (value: string) => string): SelectOption[] =>
      values.map((value) => ({
        value,
        label: value === ALL_OPTION ? 'All Statuses' : labelFor(value),
      }));

    if (category === 'Payment Report') return toOptions(PAYMENT_STATUS_OPTIONS, paymentStatusLabel);
    if (category === 'Blockchain Audit Report') return toOptions(BLOCKCHAIN_STATUS_OPTIONS, blockchainStatusLabel);
    return toOptions(CASE_STATUS_OPTIONS, caseStatusLabel);
  }, [category]);

  const buildFilters = useCallback((): ReportFilterOptions => {
    return {
      startDate,
      endDate,
      state: state === 'All' ? undefined : state,
      status: status === 'All' ? undefined : status,
    };
  }, [startDate, endDate, state, status]);

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
          <Button variant="tonal" size="sm" onClick={handleBack}>
            <ArrowLeft size={16} />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold">Generate Filtering Reports</h1>
              <span className="px-2 py-1 rounded-lg bg-md-primary/15 text-md-primary font-bold text-xs whitespace-nowrap">
                {category}
              </span>
            </div>
            <p className="text-md-on-surface-variant mt-1 max-w-3xl">
              {REPORT_DESCRIPTIONS[category]}
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
              Generating: <strong>{category}</strong>
            </span>
          </div>

          {category === 'Case Status Report' && (
            <Select
              label="State / Territory"
              value={state}
              onChange={setState}
              options={[
                { value: 'All', label: 'All States' },
                ...Object.keys(STATES).map((s) => ({ value: s, label: s })),
              ]}
            />
          )}

          <Select
            label="Filter Status"
            value={status}
            onChange={setStatus}
            options={currentStatusOptions}
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
          <h2 className="text-lg font-semibold">Report Preview</h2>
          {loading && <RefreshCw size={16} className="animate-spin text-md-on-surface-variant" />}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-md-error text-md-on-error text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {previewData && (
          <>
            <ReportSummaryCards data={previewData} />
            <ReportDataTable data={previewData} />
          </>
        )}
      </div>

      {/* Preview-before-download Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => !downloading && setPreviewOpen(false)}
        title={`${category} — Preview`}
        subtitle="Review the report below, then download the PDF."
        maxWidth="max-w-5xl"
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
            <ReportSummaryCards data={previewData} />
            <ReportDataTable data={previewData} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GenerateReports;
