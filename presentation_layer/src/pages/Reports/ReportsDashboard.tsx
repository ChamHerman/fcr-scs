import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Clock,
  Download,
  FileText,
  Filter,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  FolderKanban,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useNotification } from '../../components/ui/NotificationSystem';
import { STATES } from './reportConstants';
import { StatusBadge, ReportSummaryCards, ReportDataTable } from './reportComponents';
import {
  fetchDashboardOverview,
  fetchCaseStatusReport,
  fetchPaymentReport,
  fetchBlockchainAuditReport,
  downloadReportPdf
} from '../../services/reportApi';
import type { DashboardOverviewData, ReportGeneratedResponse } from '../../services/reportApi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ReportsDashboardProps {
  reportCategory?: 'Case Status' | 'Payment' | 'Blockchain Audit';
}

/* Per-category fallback data used when the backend is unreachable. */
const FALLBACK_CATEGORY_DATA: Record<string, ReportGeneratedResponse> = {
  'Case Status': {
    reportType: 'Case Status Report',
    reportId: 'FR-RPT-015-DEMO',
    generatedAt: new Date().toISOString(),
    filterApplied: {},
    summary: { totalCases: 2, activeCases: 1, completedCases: 1, averageAgingDays: '12 days' },
    details: [
      { caseId: 'LAC-2026-0012', title: 'Pantai Cenang Land Acquisition', state: 'Kedah', district: 'Langkawi', status: 'VALUATION_IN_PROGRESS', date: '2026-08-14', lifecycleAging: '12 days' },
      { caseId: 'LAC-2026-0011', title: 'Desaru Coastal Highway Expansion', state: 'Johor', district: 'Kota Tinggi', status: 'COMPENSATION_APPROVED', date: '2026-08-12', lifecycleAging: '15 days' },
    ],
  },
  'Payment': {
    reportType: 'Payment Report',
    reportId: 'FR-RPT-014-DEMO',
    generatedAt: new Date().toISOString(),
    filterApplied: {},
    summary: { totalRecords: 2, totalDisbursement: 'RM 2,450,000.00', successfulPayments: 1, pendingPayments: 1, successRate: '50%' },
    details: [
      { caseId: 'PAY-0089', payeeName: 'Tanjong Tokong Beneficiary', bankName: 'Maybank', amount: 'RM 1,200,000.00', status: 'Paid', bankReference: 'MBB-2026-9921', date: '2026-08-10' },
      { caseId: 'PAY-0088', payeeName: 'Gombak Rail Beneficiary', bankName: 'CIMB Bank', amount: 'RM 750,000.00', status: 'Approved', bankReference: 'Pending Clearance', date: '2026-08-09' },
    ],
  },
  'Blockchain Audit': {
    reportType: 'Blockchain Audit Report',
    reportId: 'FR-RPT-013-DEMO',
    generatedAt: new Date().toISOString(),
    filterApplied: {},
    summary: { totalRecords: 2, publishedRecords: 2, readyToPublishRecords: 0, integrityStatus: '100% Cryptographically Verified' },
    details: [
      { caseId: 'BC-2026-004', transactionHash: '0x89ab...34fe', documentHash: '0x12cd...78ba', status: 'Published', publishedAt: '2026-08-08' },
      { caseId: 'BC-2026-003', transactionHash: '0x45cd...11aa', documentHash: '0x99ee...22cc', status: 'Published', publishedAt: '2026-08-05' },
    ],
  },
};

/* Stat card follows the DesignSystem "Dashboard Patterns — Stat Cards" recipe. */
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}> = ({ icon, label, value, sub }) => (
  <div className="bg-md-surface-container rounded-xl p-5 shadow-sm transition-all duration-300 ease-md-bouncy hover:shadow-md hover:scale-[1.01]">
    <div className="flex items-center gap-2 text-[13px] font-medium text-md-on-surface-variant tracking-wide">
      {icon}
      {label}
    </div>
    <div className="text-3xl font-bold mt-1 tracking-tight">{value}</div>
    {sub && <div className="text-xs text-md-on-surface-variant mt-1.5">{sub}</div>}
  </div>
);

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ reportCategory }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotification();

  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [categoryData, setCategoryData] = useState<ReportGeneratedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All states');
  const [fullReportOpen, setFullReportOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const categorySeqRef = useRef(0);

  /* Overview data (charts + totals) is only needed on the overview page. */
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchDashboardOverview();
      setData(res);
    } catch (err) {
      console.warn("Could not fetch overview from API, using fallback data", err);
      setData({
        kpis: {
          totalCases: 24,
          totalPayments: 18,
          totalCompensationAmount: 3850000,
          totalPaidAmount: 2450000,
          totalSettledAmount: 2900000,
          totalBlockchainRecords: 14,
          publishedBlockchainRecords: 12,
          readyToPublishBlockchainRecords: 2,
          completedCases: 9,
          activeCases: 15,
          inValuation: 6,
          inCompensation: 5,
          inOffer: 3,
          inPayment: 1,
          rejectedCases: 0,
        },
        caseStatusDistribution: {
          "CASE_REGISTERED": 4,
          "VALUATION_IN_PROGRESS": 6,
          "COMPENSATION_APPROVED": 5,
          "PAYMENT_IN_PROGRESS": 3,
          "PAYMENT_COMPLETED": 6
        },
        paymentStatusDistribution: {
          "PAID": { count: 12, total: 2450000 },
          "READY_TO_INITIATE": { count: 4, total: 950000 },
          "BANK_DETAILS_AND_M1_PENDING": { count: 2, total: 450000 }
        },
        blockchainStatusDistribution: {
          "PUBLISHED": 12,
          "READY_TO_PUBLISH": 2
        },
        monthlyTrends: {
          "Feb": 4, "Mar": 8, "Apr": 14, "May": 19, "Jun": 21, "Jul": 26, "Aug": 24
        },
      });
    } finally {
      setLoading(false);
    }
  };

  /* Category pages fetch only their own records from the dedicated endpoint. */
  const loadCategoryData = useCallback(async () => {
    if (!reportCategory) return;
    const seq = ++categorySeqRef.current;
    setLoading(true);
    try {
      let res: ReportGeneratedResponse;
      if (reportCategory === 'Payment') {
        res = await fetchPaymentReport({});
      } else if (reportCategory === 'Blockchain Audit') {
        res = await fetchBlockchainAuditReport({});
      } else {
        res = await fetchCaseStatusReport({});
      }
      if (seq !== categorySeqRef.current) return;
      setCategoryData(res);
    } catch (err) {
      console.warn(`Could not fetch ${reportCategory} data, using fallback`, err);
      if (seq !== categorySeqRef.current) return;
      setCategoryData(FALLBACK_CATEGORY_DATA[reportCategory]);
    } finally {
      if (seq === categorySeqRef.current) setLoading(false);
    }
  }, [reportCategory]);

  useEffect(() => {
    if (reportCategory) {
      setCategoryData(null);
      loadCategoryData();
    } else {
      loadData();
    }
  }, [loadCategoryData, reportCategory]);

  const handleRefresh = () => {
    if (reportCategory) loadCategoryData();
    else loadData();
  };

  const handleFullDownload = async () => {
    if (!reportCategory) return;
    setDownloading(true);
    try {
      await downloadReportPdf(`${reportCategory} Report`, {});
      setDownloading(false);
      setFullReportOpen(false);
      notify({ type: 'success', title: 'Report downloaded', message: 'The full report PDF has been generated and downloaded.' });
    } catch (err: any) {
      setDownloading(false);
      notify({ type: 'error', title: 'Download failed', message: err.message || 'Something went wrong while generating the PDF.' });
    }
  };

  // Case Status Chart Data
  const caseLabels = data ? Object.keys(data.caseStatusDistribution).map(k => k.replace(/_/g, ' ')) : [];
  const caseValues = data ? Object.values(data.caseStatusDistribution) : [];
  const doughnutData = {
    labels: caseLabels.length ? caseLabels : ['Registered', 'In Valuation', 'Approved', 'Paid'],
    datasets: [
      {
        data: caseValues.length ? caseValues : [4, 6, 5, 9],
        backgroundColor: [
          '#6750A4',
          '#E8DEF8',
          '#7D5260',
          '#4CAF50',
          '#FF9800',
          '#03A9F4'
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Monthly Trend Line Chart Data
  const months = data ? Object.keys(data.monthlyTrends) : ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const monthCounts = data ? Object.values(data.monthlyTrends) : [4, 8, 14, 19, 21, 26, 24];
  const lineChartData = {
    labels: months,
    datasets: [
      {
        label: 'Acquisition Cases Initiated',
        data: monthCounts,
        borderColor: '#6750A4',
        backgroundColor: 'rgba(103, 80, 164, 0.12)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#6750A4',
        pointRadius: 4,
      },
    ],
  };

  // Payment Breakdown Bar Chart Data
  const paymentLabels = data ? Object.keys(data.paymentStatusDistribution) : ['Paid', 'Approved', 'Initiated'];
  const paymentTotals = data ? Object.values(data.paymentStatusDistribution).map(p => p.total / 1000) : [2450, 950, 450];
  const barChartData = {
    labels: paymentLabels,
    datasets: [
      {
        label: 'Disbursement Volume (RM in Thousands)',
        data: paymentTotals,
        backgroundColor: ['#4CAF50', '#6750A4', '#FF9800'],
        borderRadius: 8,
      },
    ],
  };

  // Blockchain Status Doughnut
  const blockchainDoughnutData = {
    labels: ['Published On-chain', 'Ready to Publish'],
    datasets: [
      {
        data: [data?.kpis.publishedBlockchainRecords ?? 12, data?.kpis.readyToPublishBlockchainRecords ?? 2],
        backgroundColor: ['#0277BD', '#FB8C00'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  /* Category records, filtered client-side by search + state. */
  const categoryDetails = useMemo(() => categoryData?.details ?? [], [categoryData]);

  const filteredDetails = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return categoryDetails.filter((row: any) => {
      const haystack = Object.values(row).join(' ').toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      let matchesState = true;
      if (reportCategory === 'Case Status' && selectedState !== 'All states' && row.state) {
        matchesState = row.state === selectedState;
      }
      return matchesSearch && matchesState;
    });
  }, [categoryDetails, searchTerm, selectedState, reportCategory]);

  // Page Header Details
  const getHeaderInfo = () => {
    if (reportCategory === 'Case Status') {
      return {
        title: 'Case Status & Lifecycle Report',
        subtitle: 'Real-time acquisition lifecycle tracking, statutory compliance aging, and officer assignments.',
        code: 'FR-RPT-015'
      };
    }
    if (reportCategory === 'Payment') {
      return {
        title: 'Payment & Disbursement Report',
        subtitle: 'Comprehensive disbursement ledger, bank clearance status, and success rates.',
        code: 'FR-RPT-014'
      };
    }
    if (reportCategory === 'Blockchain Audit') {
      return {
        title: 'Blockchain Audit & Notarization Report',
        subtitle: 'Immutable cryptographic audit trail, smart contract settlements, and notarization hashes.',
        code: 'FR-RPT-013'
      };
    }
    return {
      title: 'Reporting & Analytics Dashboard',
      subtitle: 'Real-time analytics and statutory compliance overview.',
      code: 'FR-RPT-001'
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">{headerInfo.title}</h1>
            {reportCategory && (
              <span className="px-2 py-1 rounded-lg bg-md-primary/15 text-md-primary font-bold text-xs whitespace-nowrap">
                {headerInfo.code}
              </span>
            )}
          </div>
          <p className="text-md-on-surface-variant mt-1 max-w-2xl">{headerInfo.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="tonal" size="sm" onClick={handleRefresh}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <span className="inline-flex items-center gap-2 text-sm text-md-on-surface-variant px-3.5 py-2 rounded-full bg-md-surface-container shadow-sm">
            <Clock size={16} />
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Case Status View Specific KPIs */}
        {reportCategory === 'Case Status' && (
          <>
            <StatCard icon={<FolderKanban size={16} className="text-[#6750A4]" />} label="Total Acquisition Cases" value={categoryData?.summary?.totalCases ?? 0} sub="Registered in System" />
            <StatCard icon={<TrendingUp size={16} className="text-[#a8600b]" />} label="Active in Pipeline" value={categoryData?.summary?.activeCases ?? 0} sub="In Progress / Review" />
            <StatCard icon={<CheckCircle2 size={16} className="text-[#1e7b4a]" />} label="Completed / Closed" value={categoryData?.summary?.completedCases ?? 0} sub="Fully Settled" />
            <StatCard icon={<Clock size={16} className="text-[#0b5b8c]" />} label="Avg Lifecycle Duration" value={categoryData?.summary?.averageAgingDays ?? '0 days'} sub="From Notice to Settlement" />
          </>
        )}

        {/* Payment View Specific KPIs */}
        {reportCategory === 'Payment' && (
          <>
            <StatCard icon={<CreditCard size={16} className="text-[#1e7b4a]" />} label="Total Disbursements" value={categoryData?.summary?.totalDisbursement ?? 'RM 0.00'} sub="Paid to Landowners" />
            <StatCard icon={<CheckCircle2 size={16} className="text-[#0b5b8c]" />} label="Disbursement Success Rate" value={categoryData?.summary?.successRate ?? '0%'} sub="Bank Transfer Clearance" />
            <StatCard icon={<FolderKanban size={16} className="text-[#6750A4]" />} label="Paid Records" value={categoryData?.summary?.successfulPayments ?? 0} sub="Settled in Full" />
            <StatCard icon={<TrendingUp size={16} className="text-[#a8600b]" />} label="Pending / Processing" value={categoryData?.summary?.pendingPayments ?? 0} sub="Awaiting Bank Transfer" />
          </>
        )}

        {/* Blockchain Audit View Specific KPIs */}
        {reportCategory === 'Blockchain Audit' && (
          <>
            <StatCard icon={<ShieldCheck size={16} className="text-[#0b5b8c]" />} label="Total Ledger Records" value={categoryData?.summary?.totalRecords ?? 0} sub="Smart Contract Events" />
            <StatCard icon={<CheckCircle2 size={16} className="text-[#1e7b4a]" />} label="Published On-Chain" value={categoryData?.summary?.publishedRecords ?? 0} sub="Ethereum Sepolia Verified" />
            <StatCard icon={<Clock size={16} className="text-[#a8600b]" />} label="Ready to Publish" value={categoryData?.summary?.readyToPublishRecords ?? 0} sub="Pending Publication" />
            <StatCard icon={<ShieldCheck size={16} className="text-[#6750A4]" />} label="Cryptographic Integrity" value={categoryData?.summary?.integrityStatus ?? 'Verified'} sub="SHA-256 Validated" />
          </>
        )}

        {/* Overview (All) Default KPIs */}
        {!reportCategory && (
          <>
            <StatCard icon={<FolderKanban size={16} className="text-[#6750A4]" />} label="Total Acquisition Cases" value={data?.kpis.totalCases ?? 0} sub={`${data?.kpis.completedCases ?? 0} Completed / Closed`} />
            <StatCard icon={<CreditCard size={16} className="text-[#1e7b4a]" />} label="Total Paid Out" value={`RM ${((data?.kpis.totalSettledAmount || 0) / 1000000).toFixed(2)}M`} sub={`of RM ${((data?.kpis.totalCompensationAmount || 0) / 1000000).toFixed(2)}M payment volume`} />
            <StatCard icon={<ShieldCheck size={16} className="text-[#0b5b8c]" />} label="Blockchain Notarized" value={data?.kpis.publishedBlockchainRecords ?? 0} sub={`${data?.kpis.readyToPublishBlockchainRecords ?? 0} ready to publish`} />
            <StatCard icon={<TrendingUp size={16} className="text-[#a8600b]" />} label="Active Pipeline" value={data?.kpis.activeCases ?? 0} sub="Cases not yet closed" />
          </>
        )}
      </div>

      {/* Visualization Graphs — Overview only */}
      {!reportCategory && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-md-surface-container rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold">Case Status Distribution</h3>
              <span className="text-xs text-md-on-surface-variant">FR-RPT-006</span>
            </div>
            <div className="h-60 flex items-center justify-center">
              <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>

          <div className="bg-md-surface-container rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold">Acquisition Cases Growth (2026)</h3>
              <span className="text-xs text-md-on-surface-variant">Monthly Trends</span>
            </div>
            <div className="h-60">
              <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>

          <div className="lg:col-span-2 bg-md-surface-container rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold">Disbursement Status Financial Breakdown</h3>
              <span className="text-xs text-md-on-surface-variant">In Thousands (RM)</span>
            </div>
            <div className="h-60">
              <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>

          <div className="bg-md-surface-container rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold">Blockchain Notarization Status</h3>
              <span className="text-xs text-md-on-surface-variant">Ethereum Sepolia</span>
            </div>
            <div className="h-60 flex items-center justify-center">
              <Doughnut data={blockchainDoughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>

          <div className="bg-md-surface-container rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold">Notarization Activity Velocity</h3>
              <span className="text-xs text-md-on-surface-variant">Monthly Audit Trail</span>
            </div>
            <div className="h-60">
              <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
        </div>
      )}

      {/* Record Table — category views only */}
      {reportCategory && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              containerClassName="flex-1 min-w-[220px]"
              placeholder={`Search ${reportCategory} records by ID, title or reference...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {reportCategory === 'Case Status' && (
              <div className="w-52">
                <Select
                  label="State"
                  value={selectedState}
                  onChange={setSelectedState}
                  options={[
                    { value: 'All states', label: 'All States' },
                    ...Object.keys(STATES).map((s) => ({ value: s, label: s })),
                  ]}
                />
              </div>
            )}
            <Button
              variant="text"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedState('All states');
              }}
            >
              Clear
            </Button>
          </div>

          {/* Table Header Row + Report Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-md-on-surface-variant">
              {reportCategory} Records ({filteredDetails.length})
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="filled"
                onClick={() => setFullReportOpen(true)}
                disabled={!categoryData}
              >
                <FileText size={14} />
                Generate Full Report
              </Button>
              <Button
                variant="tonal"
                onClick={() => navigate(`/admin/reports/generate?type=${reportCategory} Report&from=${encodeURIComponent(location.pathname)}`)}
              >
                <Filter size={14} />
                Generate Filtering Report
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-md-surface-container rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {reportCategory === 'Case Status' ? (
                    <>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Record ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Title / Description</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">State / Location</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Lifecycle Aging</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Status</th>
                    </>
                  ) : reportCategory === 'Payment' ? (
                    <>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Record ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Payee / Title</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Bank Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Amount</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Bank Reference</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Record ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Transaction Hash</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Document Hash</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredDetails.length === 0 ? (
                  <tr>
                    <td colSpan={reportCategory === 'Payment' ? 7 : reportCategory === 'Blockchain Audit' ? 5 : 6} className="px-4 py-8 text-center text-md-on-surface-variant">
                      <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                      No records found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDetails.map((row: any, idx) => (
                    <tr key={idx} className="border-t border-md-outline/10 hover:bg-md-primary/5 transition-colors">
                      {reportCategory === 'Case Status' ? (
                        <>
                          <td className="px-4 py-3 font-semibold text-md-primary text-[13px]">{row.caseId}</td>
                          <td className="px-4 py-3 font-medium">{row.title}</td>
                          <td className="px-4 py-3 text-md-on-surface-variant">{`${row.state} / ${row.district}`}</td>
                          <td className="px-4 py-3 text-md-on-surface-variant">{row.date}</td>
                          <td className="px-4 py-3 text-md-on-surface-variant">{row.lifecycleAging}</td>
                          <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                        </>
                      ) : reportCategory === 'Payment' ? (
                        <>
                          <td className="px-4 py-3 font-semibold text-md-primary text-[13px]">{row.caseId}</td>
                          <td className="px-4 py-3 font-medium">{row.payeeName}</td>
                          <td className="px-4 py-3 text-md-on-surface-variant">{row.bankName}</td>
                          <td className="px-4 py-3 font-medium">{row.amount}</td>
                          <td className="px-4 py-3 text-md-on-surface-variant">{row.bankReference}</td>
                          <td className="px-4 py-3 text-md-on-surface-variant">{row.date}</td>
                          <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-semibold text-md-primary text-[13px]">{row.caseId}</td>
                          <td className="px-4 py-3 font-mono text-xs text-md-on-surface-variant">{row.transactionHash}</td>
                          <td className="px-4 py-3 font-mono text-xs text-md-on-surface-variant">{row.documentHash}</td>
                          <td className="px-4 py-3 text-md-on-surface-variant">{row.publishedAt}</td>
                          <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Full Report Preview-before-download Modal */}
      <Modal
        isOpen={fullReportOpen}
        onClose={() => !downloading && setFullReportOpen(false)}
        title={`${reportCategory ? `${reportCategory} Report` : 'Report'} — Full Preview`}
        subtitle="Complete report without filters. Review the report below, then download the PDF."
        maxWidth="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="text" disabled={downloading} onClick={() => setFullReportOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" isLoading={downloading} onClick={handleFullDownload}>
              <Download size={14} />
              Download PDF
            </Button>
          </div>
        }
      >
        {categoryData && (
          <div className="space-y-4">
            <ReportSummaryCards data={categoryData} />
            <ReportDataTable data={categoryData} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportsDashboard;
