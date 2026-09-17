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
  AlertCircle,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { CopyButton } from '../../components/ui/CopyButton';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { getRoleTitle } from '../../utils/roleUtils';
import {
  ALL_OPTION,
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
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const SUPPORTED_TYPES = ['Case Status Report', 'Payment Report', 'Blockchain Audit Report'];

/* One short description per report function. */
const REPORT_DESCRIPTIONS: Record<string, string> = {
  'Case Status Report': 'Acquisition lifecycle, statutory aging and case status.',
  'Payment Report': 'Disbursement ledger, bank clearance and settlement outcomes.',
  'Blockchain Audit Report': 'On-chain publication and document integrity trail.',
};

export const GenerateReports: React.FC = () => {
  useDocumentTitle('Generate Report');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useNotification();
  const { user } = useAuth();
  const { isOfficer, isAdmin } = useRole();

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

  // Operator resolution: match user's name & role
  const operator = useMemo(() => {
    if (user?.name) {
      return `${user.name} (${getRoleTitle(user.role)})`;
    }
    return category === 'Case Status Report'
      ? 'Government Officer (JKPTG)'
      : 'Gov Administrator (Government Administrator)';
  }, [user, category]);

  // RBAC: Only Government Administrator (or System Admin) can generate Payment and Blockchain reports.
  // Government Officers can generate Case Status reports.
  const isRoleRestricted = useMemo(() => {
    return isOfficer && !isAdmin && category !== 'Case Status Report';
  }, [isOfficer, isAdmin, category]);

  const [state, setState] = useState<string>('All');
  const [status, setStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ReportGeneratedResponse | null>(null);
  const [baseRecords, setBaseRecords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const seqRef = useRef(0);
  const isBlockchain = category === 'Blockchain Audit Report';

  // Date validation: Start Date cannot be later than End Date
  const dateError = useMemo(() => {
    if (isBlockchain) return null;
    if (!startDate || !endDate) return null;
    if (startDate > endDate) {
      return 'Start date cannot be later than end date. Please select a valid date range.';
    }
    return null;
  }, [isBlockchain, startDate, endDate]);

  // Dynamically derive available states strictly from loaded table records
  const availableStateValues = useMemo(() => {
    const set = new Set<string>();
    baseRecords.forEach((r: any) => {
      if (r.state && r.state !== 'Not recorded') {
        set.add(r.state);
      }
    });
    return Array.from(set).sort();
  }, [baseRecords]);

  // Dropdown shows "All States" plus only the states that exist in active records
  const currentStateOptions = useMemo<SelectOption[]>(() => {
    return [
      { value: 'All', label: 'All States' },
      ...availableStateValues.map((s) => ({ value: s, label: s })),
    ];
  }, [availableStateValues]);

  // Revert state to 'All' if selected state is not present in available records
  useEffect(() => {
    if (state !== 'All' && !availableStateValues.includes(state)) {
      setState('All');
    }
  }, [availableStateValues, state]);

  // Scope status records: for Case Status Report with a specific state selected, narrow down to that state
  const recordsForStatus = useMemo(() => {
    if (category === 'Case Status Report' && state !== 'All') {
      return baseRecords.filter((r: any) => r.state === state);
    }
    return baseRecords;
  }, [baseRecords, category, state]);

  // Dynamically derive available statuses strictly from loaded table records
  const availableStatusValues = useMemo(() => {
    const set = new Set<string>();
    recordsForStatus.forEach((r: any) => {
      if (r.status) set.add(r.status);
    });
    return Array.from(set).sort();
  }, [recordsForStatus]);

  // Dropdown shows "All statuses" plus only the statuses that exist in the active records
  const currentStatusOptions = useMemo<SelectOption[]>(() => {
    const toLabel = (val: string) => {
      if (category === 'Payment Report') return paymentStatusLabel(val);
      if (category === 'Blockchain Audit Report') return blockchainStatusLabel(val);
      return caseStatusLabel(val);
    };

    const opts: SelectOption[] = [{ value: 'All', label: 'All statuses' }];
    availableStatusValues.forEach((val) => {
      opts.push({ value: val, label: toLabel(val) });
    });
    return opts;
  }, [availableStatusValues, category]);

  // Revert status to 'All' if selected status is not present in available records
  useEffect(() => {
    if (status !== 'All' && !availableStatusValues.includes(status)) {
      setStatus('All');
    }
  }, [availableStatusValues, status]);

  const buildFilters = useCallback((overrideStatus?: string): ReportFilterOptions => {
    const activeStatus = overrideStatus !== undefined ? overrideStatus : status;
    return {
      startDate: isBlockchain ? undefined : startDate,
      endDate: isBlockchain ? undefined : endDate,
      state: category === 'Case Status Report' && state !== 'All' ? state : undefined,
      status: activeStatus === 'All' ? undefined : activeStatus,
      operator,
    };
  }, [category, isBlockchain, startDate, endDate, state, status, operator]);

  const loadPreview = useCallback(async () => {
    if (isRoleRestricted) return;
    if (dateError) {
      setError(dateError);
      return;
    }

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

      // Keep baseRecords populated with the complete unfiltered set for this scope
      if (status === 'All' && state === 'All') {
        setBaseRecords(res.details || []);
      }
    } catch (err: any) {
      console.error("Preview load error:", err);
      if (seq !== seqRef.current) return;
      setError(err.message || "Failed to load report preview");
      setPreviewData(null);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [category, buildFilters, dateError, isRoleRestricted, status, state]);

  // On category or date range change, fetch the baseline dataset without state/status constraints
  // so the dropdown filters can dynamically discover all available states and statuses for the scope
  useEffect(() => {
    if (isRoleRestricted || dateError) return;
    let isMounted = true;
    const baseFilters: ReportFilterOptions = {
      startDate: isBlockchain ? undefined : startDate,
      endDate: isBlockchain ? undefined : endDate,
      operator,
    };

    const fetchBase = async () => {
      try {
        let res: ReportGeneratedResponse;
        if (category === 'Payment Report') {
          res = await fetchPaymentReport(baseFilters);
        } else if (category === 'Blockchain Audit Report') {
          res = await fetchBlockchainAuditReport(baseFilters);
        } else {
          res = await fetchCaseStatusReport(baseFilters);
        }
        if (isMounted) {
          setBaseRecords(res.details || []);
        }
      } catch {
        // Handled in loadPreview
      }
    };

    fetchBase();
    return () => {
      isMounted = false;
    };
  }, [category, startDate, endDate, operator, isRoleRestricted, dateError, isBlockchain]);

  // Real-time preview: debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPreview();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadPreview]);

  const handleResetFilters = () => {
    setState('All');
    setStatus('All');
    setStartDate('2026-01-01');
    setEndDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  const handleDownload = async () => {
    if (isRoleRestricted || dateError) return;
    setDownloading(true);
    try {
      await downloadReportPdf(category, buildFilters(), previewData?.reportId);
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
      <PageHeader
        title={`Generate Filtering Reports (${category})`}
        subtitle={REPORT_DESCRIPTIONS[category]}
        onBack={handleBack}
      />

      {/* Role Restriction Banner */}
      {isRoleRestricted && (
        <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert size={22} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Role Access Restricted</div>
              <div className="text-xs text-md-on-surface-variant mt-0.5">
                Government Officers are authorised to generate <strong>Case Status Reports</strong>. Only Government Administrators can generate <strong>{category}</strong>.
              </div>
            </div>
          </div>
          <Button
            variant="filled"
            size="sm"
            onClick={() => navigate('/admin/reports/generate?type=Case Status Report')}
          >
            Switch to Case Status Report
          </Button>
        </div>
      )}

      {/* Filter & Configuration Form Panel */}
      <div className="bg-md-surface-container rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Report Configuration & Scope</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Locked report type with dynamic operator badge */}
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl bg-md-secondary-container text-md-on-secondary-container text-sm">
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span>
                Generating: <strong>{category}</strong>
              </span>
            </div>
            <div className="text-xs font-medium">
              Operator: <strong>{operator}</strong>
            </div>
          </div>

          {category === 'Case Status Report' && (
            <Select
              label="State / Territory"
              value={state}
              onChange={setState}
              options={currentStateOptions}
            />
          )}

          <div className={category === 'Blockchain Audit Report' ? 'md:col-span-2' : ''}>
            <Select
              label="Filter Status"
              value={status}
              onChange={setStatus}
              options={currentStatusOptions}
              placeholder="All statuses"
            />
          </div>

          {category !== 'Blockchain Audit Report' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {dateError && (
                <div className="md:col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 font-medium">
                  <AlertCircle size={15} className="shrink-0 text-red-600 dark:text-red-400" />
                  <span>{dateError}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-md-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-md-primary animate-pulse" />
              Live preview updates automatically as you change the filters.
            </span>
            <Button
              variant="text"
              size="sm"
              onClick={handleResetFilters}
              disabled={loading}
              className="text-xs"
            >
              <RotateCcw size={13} />
              Reset Filters
            </Button>
          </div>
          <Button
            variant="filled"
            onClick={() => setPreviewOpen(true)}
            disabled={!previewData || loading || Boolean(dateError) || isRoleRestricted}
          >
            <Eye size={16} />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Live Preview Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TableIcon size={20} className="text-md-primary" />
            <h2 className="text-lg font-semibold">Report Preview</h2>
            {loading && <RefreshCw size={16} className="animate-spin text-md-on-surface-variant" />}
          </div>

          {previewData?.reportId && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-md-surface-container-high border border-md-outline-variant text-xs shadow-sm">
              <span className="text-md-on-surface-variant font-medium">Report Reference ID:</span>
              <span className="font-mono font-bold text-md-primary">{previewData.reportId}</span>
              <CopyButton value={previewData.reportId} title="Copy Report Reference ID" />
            </div>
          )}
        </div>

        {error && !dateError && (
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
        title={`${category} — Full Preview`}
        subtitle="Complete report preview. Review all details below before downloading the official PDF."
        maxWidth="max-w-6xl"
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
            {previewData.reportId && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-md-surface-container-high border border-md-outline-variant text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-md-on-surface-variant font-medium">Official Audit Reference ID:</span>
                  <span className="font-mono font-bold text-md-primary">{previewData.reportId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-md-on-surface-variant">Operator: <strong>{operator}</strong></span>
                  <CopyButton value={previewData.reportId} title="Copy Report Reference ID" />
                </div>
              </div>
            )}
            <ReportSummaryCards data={previewData} />
            <ReportDataTable data={previewData} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GenerateReports;
