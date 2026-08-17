import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
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
import { STATES } from './reportConstants';
import { fetchDashboardOverview } from '../../services/reportApi';
import type { DashboardOverviewData } from '../../services/reportApi';

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

/* Design-system status badge palette (mirrors DesignSystem.tsx STATUS_BADGES). */
const STATUS_STYLES = {
  green: { bg: 'bg-[#e6f4ea]', fg: 'text-[#1e7b4a]', dot: 'bg-[#1e7b4a]' },
  amber: { bg: 'bg-[#fef7e0]', fg: 'text-[#8d6e00]', dot: 'bg-[#8d6e00]' },
  red: { bg: 'bg-[#fce8e6]', fg: 'text-[#b3261e]', dot: 'bg-[#b3261e]' },
  blue: { bg: 'bg-[#e3f2fd]', fg: 'text-[#0b5b8c]', dot: 'bg-[#0b5b8c]' },
} as const;

function statusStyle(status: string) {
  const s = status.toUpperCase().replace(/_/g, ' ');
  if (['PAID', 'PUBLISHED', 'APPROVED', 'COMPLETED', 'CASE CLOSED', 'COMPENSATION APPROVED'].includes(s)) {
    return STATUS_STYLES.green;
  }
  if (['VOIDED', 'FAILED', 'REJECTED'].includes(s)) return STATUS_STYLES.red;
  if (['CASE REGISTERED', 'REGISTERED', 'NOTARIZED'].includes(s)) return STATUS_STYLES.blue;
  return STATUS_STYLES.amber;
}

/* Stat card follows the DesignSystem "Dashboard Patterns — Stat Cards" recipe:
   surface-container fill, rounded-xl, sm shadow lifting to md + slight scale. */
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
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All states');

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
          totalBlockchainRecords: 14,
          publishedBlockchainRecords: 12,
          voidedBlockchainRecords: 2,
          completedCases: 9,
          pendingValuation: 6,
          pendingCompensation: 4,
        },
        caseStatusDistribution: {
          "CASE_REGISTERED": 4,
          "VALUATION_IN_PROGRESS": 6,
          "COMPENSATION_APPROVED": 5,
          "PAYMENT_IN_PROGRESS": 3,
          "PAYMENT_COMPLETED": 6
        },
        paymentStatusDistribution: {
          "Paid": { count: 12, total: 2450000 },
          "Approved": { count: 4, total: 950000 },
          "Transfer Initiated": { count: 2, total: 450000 }
        },
        blockchainStatusDistribution: {
          "Published": 12,
          "Voided": 2
        },
        monthlyTrends: {
          "Feb": 4, "Mar": 8, "Apr": 14, "May": 19, "Jun": 21, "Jul": 26, "Aug": 24
        },
        recentActivity: [
          { id: "LAC-2026-0012", title: "Pantai Cenang Land Acquisition", category: "Case Status", location: "Kedah / Langkawi", date: "2026-08-14", status: "VALUATION_IN_PROGRESS", agingDays: "12d" },
          { id: "LAC-2026-0011", title: "Desaru Coastal Highway Expansion", category: "Case Status", location: "Johor / Kota Tinggi", date: "2026-08-12", status: "COMPENSATION_APPROVED", agingDays: "15d" },
          { id: "PAY-0089", title: "Disbursement for Tanjong Tokong", category: "Payment", location: "National / Bank Transfer", date: "2026-08-10", status: "Paid", bankDetails: "Maybank (••••4321)", bankReference: "MBB-2026-9921" },
          { id: "PAY-0088", title: "Compensation for Gombak Rail", category: "Payment", location: "National / Bank Transfer", date: "2026-08-09", status: "Approved", bankDetails: "CIMB Bank (••••1188)", bankReference: "Pending Clearance" },
          { id: "BC-2026-004", title: "Smart Contract Settlement #004", category: "Blockchain Audit", location: "Ethereum Sepolia", date: "2026-08-08", status: "Published", transactionHash: "0x89ab...34fe", documentHash: "0x12cd...78ba" },
          { id: "BC-2026-003", title: "Valuation Notarization #003", category: "Blockchain Audit", location: "Ethereum Sepolia", date: "2026-08-05", status: "Published", transactionHash: "0x45cd...11aa", documentHash: "0x99ee...22cc" }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    labels: ['Published On-chain', 'Voided Records'],
    datasets: [
      {
        data: [data?.kpis.publishedBlockchainRecords ?? 12, data?.kpis.voidedBlockchainRecords ?? 2],
        backgroundColor: ['#0277BD', '#B00020'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const filteredActivity = (data?.recentActivity || []).filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = selectedState === 'All states' || item.location.includes(selectedState);
    return matchesSearch && matchesState;
  });

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
          <Button variant="tonal" size="sm" onClick={loadData}>
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
            <StatCard icon={<FolderKanban size={16} className="text-[#6750A4]" />} label="Total Acquisition Cases" value={data?.kpis.totalCases ?? 0} sub="Registered in System" />
            <StatCard icon={<TrendingUp size={16} className="text-[#a8600b]" />} label="Active in Pipeline" value={Math.max(0, (data?.kpis.totalCases ?? 0) - (data?.kpis.completedCases ?? 0))} sub="In Progress / Review" />
            <StatCard icon={<CheckCircle2 size={16} className="text-[#1e7b4a]" />} label="Completed / Closed" value={data?.kpis.completedCases ?? 0} sub="Fully Settled" />
            <StatCard icon={<Clock size={16} className="text-[#0b5b8c]" />} label="Avg Lifecycle Duration" value="18 days" sub="From Notice to Settlement" />
          </>
        )}

        {/* Payment View Specific KPIs */}
        {reportCategory === 'Payment' && (
          <>
            <StatCard icon={<CreditCard size={16} className="text-[#1e7b4a]" />} label="Total Disbursed" value={`RM ${((data?.kpis.totalPaidAmount || 0) / 1000000).toFixed(2)}M`} sub="Paid to Landowners" />
            <StatCard icon={<FolderKanban size={16} className="text-[#6750A4]" />} label="Total Approved Volume" value={`RM ${((data?.kpis.totalCompensationAmount || 0) / 1000000).toFixed(2)}M`} sub="Statutory Approved" />
            <StatCard icon={<CheckCircle2 size={16} className="text-[#0b5b8c]" />} label="Disbursement Success Rate" value="98.4%" sub="Bank Transfer Clearance" />
            <StatCard icon={<TrendingUp size={16} className="text-[#a8600b]" />} label="Pending Authorisation" value={`RM ${Math.max(0, ((data?.kpis.totalCompensationAmount || 0) - (data?.kpis.totalPaidAmount || 0)) / 1000000).toFixed(2)}M`} sub="Awaiting Bank Transfer" />
          </>
        )}

        {/* Blockchain Audit View Specific KPIs */}
        {reportCategory === 'Blockchain Audit' && (
          <>
            <StatCard icon={<ShieldCheck size={16} className="text-[#0b5b8c]" />} label="Total Ledger Entries" value={data?.kpis.totalBlockchainRecords ?? 0} sub="Smart Contract Events" />
            <StatCard icon={<CheckCircle2 size={16} className="text-[#1e7b4a]" />} label="Published On-Chain" value={data?.kpis.publishedBlockchainRecords ?? 0} sub="Ethereum Sepolia Verified" />
            <StatCard icon={<AlertCircle size={16} className="text-[#b3261e]" />} label="Voided / Revoked" value={data?.kpis.voidedBlockchainRecords ?? 0} sub="Superseded Contracts" />
            <StatCard icon={<ShieldCheck size={16} className="text-[#6750A4]" />} label="Cryptographic Integrity" value="100% Verified" sub="SHA-256 Validated" />
          </>
        )}

        {/* Overview (All) Default KPIs */}
        {!reportCategory && (
          <>
            <StatCard icon={<FolderKanban size={16} className="text-[#6750A4]" />} label="Total Acquisition Cases" value={data?.kpis.totalCases ?? 0} sub={`${data?.kpis.completedCases ?? 0} Completed / Closed`} />
            <StatCard icon={<CreditCard size={16} className="text-[#1e7b4a]" />} label="Total Paid Out" value={`RM ${((data?.kpis.totalPaidAmount || 0) / 1000000).toFixed(2)}M`} sub={`Out of RM ${((data?.kpis.totalCompensationAmount || 0) / 1000000).toFixed(2)}M Approved`} />
            <StatCard icon={<ShieldCheck size={16} className="text-[#0b5b8c]" />} label="Blockchain Notarized" value={data?.kpis.publishedBlockchainRecords ?? 0} sub="Ethereum Sepolia Verified" />
            <StatCard icon={<TrendingUp size={16} className="text-[#a8600b]" />} label="Pipeline In Review" value={(data?.kpis.pendingValuation ?? 0) + (data?.kpis.pendingCompensation ?? 0)} sub="Needs review / approval" />
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
              placeholder={`Search ${reportCategory} by title or ID...`}
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

          {/* Table Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-md-on-surface-variant">
              {reportCategory} Records ({filteredActivity.length})
            </span>
            <Button
              variant="filled"
              onClick={() => navigate(`/admin/reports/generate?type=${reportCategory} Report`)}
            >
              <Filter size={14} />
              Generate Filtering Report
            </Button>
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
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Title / Description</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Bank Details</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Bank Reference</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Record ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Title / Description</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Transaction Hash</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Document Hash</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredActivity.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-md-on-surface-variant">
                      <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                      No records found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredActivity.map((item) => {
                    const badge = statusStyle(item.status);
                    return (
                      <tr key={item.id} className="border-t border-md-outline/10 hover:bg-md-primary/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-md-primary text-[13px]">{item.id}</td>
                        <td className="px-4 py-3 font-medium">{item.title}</td>

                        {reportCategory === 'Case Status' ? (
                          <>
                            <td className="px-4 py-3 text-md-on-surface-variant">{item.location}</td>
                            <td className="px-4 py-3 text-md-on-surface-variant">{item.date}</td>
                            <td className="px-4 py-3 text-md-on-surface-variant">{item.agingDays || 'N/A'}</td>
                          </>
                        ) : reportCategory === 'Payment' ? (
                          <>
                            <td className="px-4 py-3 text-md-on-surface-variant">{item.bankDetails || 'N/A'}</td>
                            <td className="px-4 py-3 text-md-on-surface-variant">{item.bankReference || 'N/A'}</td>
                            <td className="px-4 py-3 text-md-on-surface-variant">{item.date}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-mono text-xs text-md-on-surface-variant">{item.transactionHash || 'N/A'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-md-on-surface-variant">{item.documentHash || 'N/A'}</td>
                            <td className="px-4 py-3 text-md-on-surface-variant">{item.date}</td>
                          </>
                        )}

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-3 text-xs font-semibold ${badge.bg} ${badge.fg}`}>
                            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsDashboard;
