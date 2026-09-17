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
  Archive,
  Layers,
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
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useNotification } from '../../components/ui/NotificationSystem';
import { usePollingRefresh } from '../../hooks/usePollingRefresh';
import { caseStatusLabel, paymentStatusLabel } from './reportConstants';
import { ReportSummaryCards, ReportDataTable } from './reportComponents';
import {
  fetchDashboardOverview,
  fetchCaseStatusReport,
  fetchPaymentReport,
  fetchBlockchainAuditReport,
  downloadReportPdf
} from '../../services/reportApi';
import type { DashboardOverviewData, ReportGeneratedResponse } from '../../services/reportApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../context/AuthContext';
import { getRoleTitle } from '../../utils/roleUtils';

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
    reportId: 'RPT-DEMO-001',
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
    reportId: 'RPT-DEMO-002',
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
    reportId: 'RPT-DEMO-003',
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
  useDocumentTitle(reportCategory ? `${reportCategory} Report` : 'Reports Overview');
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

  // Dynamically derive available states strictly from loaded table records
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    (categoryData?.details || []).forEach((row: any) => {
      if (row.state && row.state !== 'Not recorded') {
        set.add(row.state);
      }
    });
    return ['All states', ...Array.from(set).sort()];
  }, [categoryData?.details]);

  useEffect(() => {
    if (selectedState !== 'All states' && !availableStates.includes(selectedState)) {
      setSelectedState('All states');
    }
  }, [availableStates, selectedState]);

  const categorySeqRef = useRef(0);
  const { user } = useAuth();

  const operator = useMemo(() => {
    if (user?.name) {
      return `${user.name} (${getRoleTitle(user.role)})`;
    }
    return reportCategory === 'Case Status'
      ? 'Government Officer (JKPTG)'
      : 'Gov Administrator (Government Administrator)';
  }, [user, reportCategory]);

  /* Overview data (charts + totals) is only needed on the overview page. */
  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
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
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  /* Category pages fetch only their own records from the dedicated endpoint. */
  const loadCategoryData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!reportCategory) return;
    const seq = ++categorySeqRef.current;
    if (!opts?.silent) setLoading(true);
    try {
      let res: ReportGeneratedResponse;
      if (reportCategory === 'Payment') {
        res = await fetchPaymentReport({ operator });
      } else if (reportCategory === 'Blockchain Audit') {
        res = await fetchBlockchainAuditReport({ operator });
      } else {
        res = await fetchCaseStatusReport({ operator });
      }
      if (seq !== categorySeqRef.current) return;
      setCategoryData(res);
    } catch (err) {
      console.warn(`Could not fetch ${reportCategory} data, using fallback`, err);
      if (seq !== categorySeqRef.current) return;
      setCategoryData(FALLBACK_CATEGORY_DATA[reportCategory]);
    } finally {
      if (!opts?.silent && seq === categorySeqRef.current) setLoading(false);
    }
  }, [reportCategory]);

  useEffect(() => {
    if (reportCategory) {
      setCategoryData(null);
      loadCategoryData();
    } else {
      loadData();
    }
  }, [loadCategoryData, loadData, reportCategory]);

  // Silent automatic polling every 15 seconds
  usePollingRefresh(
    () => {
      if (reportCategory) {
        return loadCategoryData({ silent: true });
      } else {
        return loadData({ silent: true });
      }
    },
    { intervalMs: 15000 }
  );

  const handleFullDownload = async () => {
    if (!reportCategory) return;
    setDownloading(true);
    try {
      await downloadReportPdf(`${reportCategory} Report`, { operator });
      setDownloading(false);
      setFullReportOpen(false);
      notify({ type: 'success', title: 'Report downloaded', message: 'The full report PDF has been generated and downloaded.' });
    } catch (err: any) {
      setDownloading(false);
      notify({ type: 'error', title: 'Download failed', message: err.message || 'Something went wrong while generating the PDF.' });
    }
  };

  // Case Status Chart Data
  const caseLabels = data ? Object.keys(data.caseStatusDistribution).map(k => caseStatusLabel(k)) : [];
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
          '#03A9F4',
          '#009688',
          '#9C27B0',
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
  const paymentLabels = data ? Object.keys(data.paymentStatusDistribution).map(k => paymentStatusLabel(k)) : ['Paid', 'Approved', 'Initiated'];
  const paymentTotals = data ? Object.values(data.paymentStatusDistribution).map(p => p.total / 1000) : [2450, 950, 450];
  const barChartColors = ['#4CAF50', '#6750A4', '#FF9800', '#0277BD', '#7D5260', '#9C27B0', '#009688'];
  const barChartData = {
    labels: paymentLabels,
    datasets: [
      {
        label: 'Disbursement Volume (RM in Thousands)',
        data: paymentTotals,
        backgroundColor: paymentLabels.map((_, i) => barChartColors[i % barChartColors.length]),
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
      };
    }
    if (reportCategory === 'Payment') {
      return {
        title: 'Payment & Disbursement Report',
        subtitle: 'Comprehensive disbursement ledger, bank clearance status, and success rates.',
      };
    }
    if (reportCategory === 'Blockchain Audit') {
      return {
        title: 'Blockchain Audit & Notarization Report',
        subtitle: 'Immutable cryptographic audit trail, smart contract settlements, and notarization hashes.',
      };
    }
    return {
      title: 'Reports Overview',
      subtitle: 'Comprehensive overview of land acquisition cases, disbursement progress, and blockchain notarization.',
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <PageHeader
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
      />

      {/* KPI Cards Grid */}
      <div className={`grid gap-4 ${reportCategory === 'Case Status' || reportCategory === 'Payment' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'}`}>
        {/* Case Status View Specific KPIs */}
        {reportCategory === 'Case Status' && (
          <>
            <StatCard icon={<FolderKanban size={16} className="text-[#6750A4]" />} label="Total Acquisition Cases" value={categoryData?.summary?.totalCases ?? 0} sub="Registered in System" />
            <StatCard icon={<TrendingUp size={16} className="text-[#a8600b]" />} label="Active in Pipeline" value={categoryData?.summary?.activeCases ?? 0} sub="In Progress / Review" />
            <StatCard icon={<CheckCircle2 size={16} className="text-[#1e7b4a]" />} label="Payment Completed" value={categoryData?.summary?.paymentCompletedCases ?? 0} sub="Disbursements Settled" />
            <StatCard icon={<Archive size={16} className="text-[#5B4296]" />} label="Case Closed" value={categoryData?.summary?.closedCases ?? 0} sub="Statutory File Sealed" />
            <StatCard icon={<Clock size={16} className="text-[#0b5b8c]" />} label="Avg Lifecycle Duration" value={categoryData?.summary?.averageAgingDays ?? '0 days'} sub="From Notice to Settlement" />
          </>
        )}

        {/* Payment View Specific KPIs */}
        {reportCategory === 'Payment' && (() => {
          const details = categoryData?.details || [];
          const parseAmt = (val: any): number => {
            if (typeof val === "number") return val;
            const clean = String(val || "").replace(/[^0-9.-]+/g, "");
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? 0 : parsed;
          };

          const pendingClearanceRows = details.filter((d: any) => {
            const cs = String(d.clearanceStatus || "").toLowerCase();
            const ref = String(d.bankReference || "").toLowerCase();
            const st = String(d.status || "").toUpperCase();
            return cs === "pending clearance" || ref.includes("pending") || (!st.includes("PAID") && !st.includes("SUCCEED"));
          });
          const dynamicUndisbursedNum = pendingClearanceRows.reduce((sum: number, d: any) => sum + parseAmt(d.amount), 0);

          const settledRows = details.filter((d: any) => {
            const cs = String(d.clearanceStatus || "").toLowerCase();
            const st = String(d.status || "").toUpperCase();
            return cs === "cleared" || st === "PAID" || st === "TRANSFER_SUCCEED";
          });
          const dynamicDisbursedNum = settledRows.reduce((sum: number, d: any) => sum + parseAmt(d.amount), 0);
          const dynamicTotalVolNum = dynamicDisbursedNum + dynamicUndisbursedNum;
          const dynamicRate = dynamicTotalVolNum > 0 ? Math.round((dynamicDisbursedNum / dynamicTotalVolNum) * 100) : 0;

          const totalVolStr = dynamicTotalVolNum > 0
            ? `RM ${dynamicTotalVolNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "RM 0.00";
          const disbursedStr = dynamicDisbursedNum > 0
            ? `RM ${dynamicDisbursedNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : (categoryData?.summary?.totalDisbursement ?? "RM 0.00");
          const undisbursedStr = dynamicUndisbursedNum > 0
            ? `RM ${dynamicUndisbursedNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : (categoryData?.summary?.undisbursedAmount ?? "RM 0.00");

          return (
            <>
              <StatCard icon={<Layers size={16} className="text-[#6750A4]" />} label="Total Volume" value={totalVolStr} sub="Total Pipeline Volume" />
              <StatCard icon={<CreditCard size={16} className="text-[#1e7b4a]" />} label="Total Disbursements" value={disbursedStr} sub="Cleared to Beneficiary" />
              <StatCard icon={<TrendingUp size={16} className="text-[#a8600b]" />} label="Undisbursed Amount" value={undisbursedStr} sub="Pending Clearance" />
              <StatCard icon={<CheckCircle2 size={16} className="text-[#0b5b8c]" />} label="Disbursement Rate" value={`${dynamicRate}%`} sub="Disbursed / Pipeline Volume" />
              <StatCard icon={<FolderKanban size={16} className="text-[#5B4296]" />} label="Settled Records" value={`${settledRows.length} Paid`} sub={`${pendingClearanceRows.length} Pending Clearance`} />
            </>
          );
        })()}

        {/* Blockchain Audit View Specific KPIs */}
        {reportCategory === 'Blockchain Audit' && (() => {
          const totalRecs = Number(categoryData?.summary?.totalRecords ?? (categoryData?.details?.length ?? 0));
          const publishedRecs = Number(categoryData?.summary?.publishedRecords ?? (categoryData?.details?.filter((r: any) => String(r.status).toUpperCase() === 'PUBLISHED').length ?? 0));
          const dynamicCryptoPercentage = totalRecs > 0 ? `${Math.round((publishedRecs / totalRecs) * 100)}%` : '0%';
          const dynamicCryptoRatio = `${publishedRecs}/${totalRecs} Notarized`;

          return (
            <>
              <StatCard icon={<ShieldCheck size={16} className="text-[#0b5b8c]" />} label="Total Ledger Records" value={totalRecs} sub="Smart Contract Events" />
              <StatCard icon={<CheckCircle2 size={16} className="text-[#1e7b4a]" />} label="Published On-Chain" value={publishedRecs} sub="Ethereum Sepolia Verified" />
              <StatCard icon={<Clock size={16} className="text-[#a8600b]" />} label="Ready to Publish" value={categoryData?.summary?.readyToPublishRecords ?? (totalRecs - publishedRecs)} sub="Pending Publication" />
              <StatCard
                icon={<ShieldCheck size={16} className="text-[#6750A4]" />}
                label="Cryptographic Proof"
                value={dynamicCryptoPercentage}
                sub={dynamicCryptoRatio}
              />
            </>
          );
        })()}

        {/* Overview (All) Default KPIs */}
        {!reportCategory && (
          <>
            <StatCard icon={<FolderKanban size={16} className="text-[#6750A4]" />} label="Total Acquisition Cases" value={data?.kpis.totalCases ?? 0} sub={`${data?.kpis.paymentCompletedCases ?? (data?.kpis.completedCases ?? 0)} Completed • ${data?.kpis.closedCases ?? 0} Closed`} />
            <StatCard icon={<CreditCard size={16} className="text-[#1e7b4a]" />} label="Total Disbursements" value={`RM ${((data?.kpis.totalSettledAmount || 0) / 1000000).toFixed(2)}M`} sub={`of RM ${((data?.kpis.totalCompensationAmount || 0) / 1000000).toFixed(2)}M Total Pipeline Volume`} />
            <StatCard icon={<ShieldCheck size={16} className="text-[#0b5b8c]" />} label="Blockchain Notarized" value={data?.kpis.publishedBlockchainRecords ?? 0} sub={`${data?.kpis.readyToPublishBlockchainRecords ?? 0} ready to publish`} />
            <StatCard icon={<TrendingUp size={16} className="text-[#a8600b]" />} label="Active in Pipeline" value={data?.kpis.activeCases ?? 0} sub="In Progress / Review" />
          </>
        )}
      </div>

      {/* Visualization Graphs — Overview only */}
      {!reportCategory && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-md-surface-container rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold">Case Status Distribution</h3>
              <span className="text-xs text-md-on-surface-variant">By Status</span>
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
                  options={availableStates.map((s) => ({
                    value: s,
                    label: s === 'All states' ? 'All States' : s,
                  }))}
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

          {/* Data Table — same shared component the preview modal uses */}
          <ReportDataTable
            data={{
              reportType: categoryData?.reportType ?? `${reportCategory} Report`,
              reportId: categoryData?.reportId ?? '',
              generatedAt: categoryData?.generatedAt ?? new Date().toISOString(),
              filterApplied: categoryData?.filterApplied ?? {},
              summary: categoryData?.summary ?? {},
              details: filteredDetails,
            }}
          />
        </>
      )}

      {/* Full Report Preview-before-download Modal */}
      <Modal
        isOpen={fullReportOpen}
        onClose={() => !downloading && setFullReportOpen(false)}
        title={`${reportCategory ? `${reportCategory} Report` : 'Report'} — Full Preview`}
        subtitle="Complete report without filters. Review the report below, then download the PDF."
        maxWidth="max-w-6xl"
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
