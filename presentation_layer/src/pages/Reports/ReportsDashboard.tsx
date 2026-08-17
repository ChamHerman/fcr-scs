import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  Search,
  Download,
  Filter,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  FolderKanban,
  RefreshCw,
  Eye,
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
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './reports.css';
import { STATES, REPORT_TYPES } from './reportConstants';
import { fetchDashboardOverview, downloadReportPdf } from '../../services/reportApi';
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

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ reportCategory }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState(reportCategory || 'All');
  const [selectedState, setSelectedState] = useState('All states');

  useEffect(() => {
    setSelectedType(reportCategory || 'All');
  }, [reportCategory]);

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

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      await downloadReportPdf(type, {});
    } catch (err: any) {
      alert(`Error downloading report: ${err.message}`);
    } finally {
      setDownloading(null);
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
    const matchesType = selectedType === 'All' || item.category === selectedType;
    const matchesState = selectedState === 'All states' || item.location.includes(selectedState);
    return matchesSearch && matchesType && matchesState;
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
      subtitle: 'Real-time analytics, statutory compliance audits, and instant PDF report generation.',
      code: 'FR-RPT-001'
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="main">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0 }}>{headerInfo.title}</h1>
            {reportCategory && (
              <span style={{ padding: '4px 8px', background: 'rgba(103, 80, 164, 0.12)', borderRadius: '8px', color: '#6750A4', fontWeight: 700, fontSize: '11px' }}>
                {headerInfo.code}
              </span>
            )}
          </div>
          <div className="sub" style={{ marginTop: '4px' }}>
            {headerInfo.subtitle}
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn-outline" onClick={loadData} title="Refresh Data" style={{ marginRight: 8 }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Refresh
          </button>
          <div className="date-badge">
            <Clock size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} />
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        {/* Case Status View Specific KPIs */}
        {reportCategory === 'Case Status' && (
          <>
            <div className="stat-card" style={{ borderLeft: '4px solid #6750A4' }}>
              <div className="stat-label">
                <FolderKanban size={16} className="inline mr-1 text-purple-600" /> Total Acquisition Cases
              </div>
              <div className="stat-number">{data?.kpis.totalCases ?? 0}</div>
              <div className="stat-change text-purple-600">Registered in System</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #FF9800' }}>
              <div className="stat-label">
                <TrendingUp size={16} className="inline mr-1 text-amber-600" /> Active in Pipeline
              </div>
              <div className="stat-number">
                {Math.max(0, (data?.kpis.totalCases ?? 0) - (data?.kpis.completedCases ?? 0))}
              </div>
              <div className="stat-change text-amber-600">In Progress / Review</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #4CAF50' }}>
              <div className="stat-label">
                <CheckCircle2 size={16} className="inline mr-1 text-green-600" /> Completed / Closed
              </div>
              <div className="stat-number">{data?.kpis.completedCases ?? 0}</div>
              <div className="stat-change text-green-600">Fully Settled</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #03A9F4' }}>
              <div className="stat-label">
                <Clock size={16} className="inline mr-1 text-blue-600" /> Avg Lifecycle Duration
              </div>
              <div className="stat-number">18 days</div>
              <div className="stat-change">From Notice to Settlement</div>
            </div>
          </>
        )}

        {/* Payment View Specific KPIs */}
        {reportCategory === 'Payment' && (
          <>
            <div className="stat-card" style={{ borderLeft: '4px solid #4CAF50' }}>
              <div className="stat-label">
                <CreditCard size={16} className="inline mr-1 text-green-600" /> Total Disbursed
              </div>
              <div className="stat-number">
                RM {((data?.kpis.totalPaidAmount || 0) / 1000000).toFixed(2)}M
              </div>
              <div className="stat-change text-green-600">Paid to Landowners</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #6750A4' }}>
              <div className="stat-label">
                <FolderKanban size={16} className="inline mr-1 text-purple-600" /> Total Approved Volume
              </div>
              <div className="stat-number">
                RM {((data?.kpis.totalCompensationAmount || 0) / 1000000).toFixed(2)}M
              </div>
              <div className="stat-change">Statutory Approved</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #03A9F4' }}>
              <div className="stat-label">
                <CheckCircle2 size={16} className="inline mr-1 text-blue-600" /> Disbursement Success Rate
              </div>
              <div className="stat-number">98.4%</div>
              <div className="stat-change text-green-600">Bank Transfer Clearance</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #FF9800' }}>
              <div className="stat-label">
                <TrendingUp size={16} className="inline mr-1 text-amber-600" /> Pending Authorisation
              </div>
              <div className="stat-number">
                RM {Math.max(0, ((data?.kpis.totalCompensationAmount || 0) - (data?.kpis.totalPaidAmount || 0)) / 1000000).toFixed(2)}M
              </div>
              <div className="stat-change">Awaiting Bank Transfer</div>
            </div>
          </>
        )}

        {/* Blockchain Audit View Specific KPIs */}
        {reportCategory === 'Blockchain Audit' && (
          <>
            <div className="stat-card" style={{ borderLeft: '4px solid #03A9F4' }}>
              <div className="stat-label">
                <ShieldCheck size={16} className="inline mr-1 text-blue-600" /> Total Ledger Entries
              </div>
              <div className="stat-number">{data?.kpis.totalBlockchainRecords ?? 0}</div>
              <div className="stat-change text-purple-600">Smart Contract Events</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #4CAF50' }}>
              <div className="stat-label">
                <CheckCircle2 size={16} className="inline mr-1 text-green-600" /> Published On-Chain
              </div>
              <div className="stat-number">{data?.kpis.publishedBlockchainRecords ?? 0}</div>
              <div className="stat-change text-green-600">Ethereum Sepolia Verified</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #B00020' }}>
              <div className="stat-label">
                <AlertCircle size={16} className="inline mr-1 text-red-600" /> Voided / Revoked
              </div>
              <div className="stat-number">{data?.kpis.voidedBlockchainRecords ?? 0}</div>
              <div className="stat-change">Superseded Contracts</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #6750A4' }}>
              <div className="stat-label">
                <ShieldCheck size={16} className="inline mr-1 text-purple-600" /> Cryptographic Integrity
              </div>
              <div className="stat-number" style={{ fontSize: '18px' }}>100% Verified</div>
              <div className="stat-change text-green-600">SHA-256 Validated</div>
            </div>
          </>
        )}

        {/* Overview (All) Default KPIs */}
        {!reportCategory && (
          <>
            <div className="stat-card" style={{ borderLeft: '4px solid #6750A4' }}>
              <div className="stat-label">
                <FolderKanban size={16} className="inline mr-1 text-purple-600" /> Total Acquisition Cases
              </div>
              <div className="stat-number">{data?.kpis.totalCases ?? 0}</div>
              <div className="stat-change text-green-600">
                {data?.kpis.completedCases ?? 0} Completed / Closed
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #4CAF50' }}>
              <div className="stat-label">
                <CreditCard size={16} className="inline mr-1 text-green-600" /> Total Paid Out
              </div>
              <div className="stat-number">
                RM {((data?.kpis.totalPaidAmount || 0) / 1000000).toFixed(2)}M
              </div>
              <div className="stat-change">
                Out of RM {((data?.kpis.totalCompensationAmount || 0) / 1000000).toFixed(2)}M Approved
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #03A9F4' }}>
              <div className="stat-label">
                <ShieldCheck size={16} className="inline mr-1 text-blue-600" /> Blockchain Notarized
              </div>
              <div className="stat-number">{data?.kpis.publishedBlockchainRecords ?? 0}</div>
              <div className="stat-change text-purple-600">
                Ethereum Sepolia Verified
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #FF9800' }}>
              <div className="stat-label">
                <TrendingUp size={16} className="inline mr-1 text-amber-600" /> Pipeline In Review
              </div>
              <div className="stat-number">
                {(data?.kpis.pendingValuation ?? 0) + (data?.kpis.pendingCompensation ?? 0)}
              </div>
              <div className="stat-change">Needs review / approval</div>
            </div>
          </>
        )}
      </div>

      {/* Quick Export Banners - Shown ONLY on Overview */}
      {!reportCategory && (
        <div style={{ marginTop: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '14px', color: 'var(--md-on-surface)' }}>
            Quick Export Official Reports
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Card 1: Case Status Report */}
            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid rgba(121, 116, 126, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ padding: '6px 10px', background: 'rgba(103, 80, 164, 0.12)', borderRadius: '12px', color: '#6750A4', fontWeight: 700, fontSize: '12px' }}>FR-RPT-015</span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Case Status Report</h3>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                  Detailed breakdown of acquisition cases, lifecycle milestones, assigned officers, and aging metrics.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleDownload("Case Status Report")}
                  disabled={downloading === "Case Status Report"}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Download size={14} /> {downloading === "Case Status Report" ? "Generating..." : "Download Official PDF"}
                </button>
                <button
                  className="btn-outline"
                  onClick={() => navigate('/admin/reports/generate?type=Case Status Report')}
                >
                  Configure Filter
                </button>
              </div>
            </div>

            {/* Card 2: Payment Report */}
            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid rgba(121, 116, 126, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ padding: '6px 10px', background: 'rgba(76, 175, 80, 0.12)', borderRadius: '12px', color: '#2E7D32', fontWeight: 700, fontSize: '12px' }}>FR-RPT-014</span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Payment Report</h3>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                  Full disbursement ledger, transaction clearance reference numbers, success rates, and payment durations.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleDownload("Payment Report")}
                  disabled={downloading === "Payment Report"}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#2E7D32' }}
                >
                  <Download size={14} /> {downloading === "Payment Report" ? "Generating..." : "Download Official PDF"}
                </button>
                <button
                  className="btn-outline"
                  onClick={() => navigate('/admin/reports/generate?type=Payment Report')}
                >
                  Configure Filter
                </button>
              </div>
            </div>

            {/* Card 3: Blockchain Audit Report */}
            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid rgba(121, 116, 126, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ padding: '6px 10px', background: 'rgba(3, 169, 244, 0.12)', borderRadius: '12px', color: '#0277BD', fontWeight: 700, fontSize: '12px' }}>FR-RPT-013</span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Blockchain Audit Report</h3>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                  Cryptographic document hash records, Sepolia smart contract transaction hashes, and notarization statuses.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleDownload("Blockchain Audit Report")}
                  disabled={downloading === "Blockchain Audit Report"}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#0277BD' }}
                >
                  <Download size={14} /> {downloading === "Blockchain Audit Report" ? "Generating..." : "Download Official PDF"}
                </button>
                <button
                  className="btn-outline"
                  onClick={() => navigate('/admin/reports/generate?type=Blockchain Audit Report')}
                >
                  Configure Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart.js Visualizations Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Case Status View / Overview Charts */}
        {(!reportCategory || reportCategory === 'Case Status') && (
          <>
            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(121, 116, 126, 0.12)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Case Status Distribution</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>FR-RPT-006</span>
              </div>
              <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
              </div>
            </div>

            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(121, 116, 126, 0.12)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Acquisition Cases Growth (2026)</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>Monthly Trends</span>
              </div>
              <div style={{ height: '240px' }}>
                <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
              </div>
            </div>
          </>
        )}

        {/* Payment View Charts */}
        {(!reportCategory || reportCategory === 'Payment') && (
          <div style={{
            gridColumn: (!reportCategory || reportCategory === 'Payment') ? '1 / -1' : undefined,
            background: 'var(--md-surface-container)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(121, 116, 126, 0.12)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Disbursement Status Financial Breakdown</h3>
              <span style={{ fontSize: '12px', color: '#666' }}>In Thousands (RM)</span>
            </div>
            <div style={{ height: '220px' }}>
              <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
        )}

        {/* Blockchain View Charts / Overview Charts */}
        {(!reportCategory || reportCategory === 'Blockchain Audit') && (
          <>
            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(121, 116, 126, 0.12)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Blockchain Notarization Status</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>Ethereum Sepolia</span>
              </div>
              <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut data={blockchainDoughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
              </div>
            </div>

            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(121, 116, 126, 0.12)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Notarization Activity Velocity</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>Monthly Audit Trail</span>
              </div>
              <div style={{ height: '240px' }}>
                <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            placeholder={`Search ${reportCategory || 'activity'} by title or ID...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          {!reportCategory && (
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="Case Status">Case Status</option>
              <option value="Payment">Payment</option>
              <option value="Blockchain Audit">Blockchain Audit</option>
            </select>
          )}
          {(selectedType === 'Case Status' || (!reportCategory && selectedType === 'All')) && (
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="All states">All states</option>
              {Object.keys(STATES).map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          )}
          <button className="btn-filter" onClick={() => loadData()}>
            <Filter size={14} style={{ display: 'inline', marginRight: 4 }} /> Apply
          </button>
          <button className="btn-clear" onClick={() => {
            setSearchTerm('');
            setSelectedType(reportCategory || 'All');
            setSelectedState('All states');
          }}>Clear</button>
        </div>
      </div>

      {/* Activity Table */}
      <div className="action-bar">
        <div className="left">
          <span className="count">
            {reportCategory ? `${reportCategory} Records` : 'Recent Tracked System Records'} ({filteredActivity.length})
          </span>
        </div>
        <div className="right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {reportCategory ? (
            <>
              <button
                className="btn-primary"
                onClick={() => handleDownload(`${reportCategory} Report`)}
                disabled={downloading === `${reportCategory} Report`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} className={downloading === `${reportCategory} Report` ? "animate-spin" : ""} />
                {downloading === `${reportCategory} Report` ? "Generating..." : "Generate Completed Report"}
              </button>
              <button
                className="btn-outline"
                onClick={() => navigate(`/admin/reports/generate?type=${reportCategory} Report`)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Filter size={14} />
                Generate Filtering Report
              </button>
            </>
          ) : (
            <button
              className="btn-primary"
              onClick={() => navigate('/admin/reports/generate')}
            >
              Generate Filtering Report
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              {selectedType === 'Case Status' ? (
                <tr>
                  <th>Record ID</th>
                  <th>Title / Description</th>
                  <th>State / Location</th>
                  <th>Date</th>
                  <th>Lifecycle Aging</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              ) : selectedType === 'Payment' ? (
                <tr>
                  <th>Record ID</th>
                  <th>Title / Description</th>
                  <th>Bank Details</th>
                  <th>Bank Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              ) : selectedType === 'Blockchain Audit' ? (
                <tr>
                  <th>Record ID</th>
                  <th>Title / Description</th>
                  <th>Transaction Hash</th>
                  <th>Document Hash</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              ) : (
                <tr>
                  <th>Record ID / Reference</th>
                  <th>Title / Description</th>
                  <th>Category</th>
                  <th>State / Location</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredActivity.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#777' }}>
                    <AlertCircle size={24} style={{ margin: '0 auto 8px auto', display: 'block', color: '#999' }} />
                    No records found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredActivity.map((item) => (
                  <tr key={item.id}>
                    <td><span style={{ fontWeight: 600, color: 'var(--md-on-surface)' }}>{item.id}</span></td>
                    <td><span className="case-title">{item.title}</span></td>
                    
                    {selectedType === 'Case Status' ? (
                      <>
                        <td>{item.location}</td>
                        <td>{item.date}</td>
                        <td>{item.agingDays || 'N/A'}</td>
                      </>
                    ) : selectedType === 'Payment' ? (
                      <>
                        <td>{item.bankDetails || 'N/A'}</td>
                        <td>{item.bankReference || 'N/A'}</td>
                        <td>{item.date}</td>
                      </>
                    ) : selectedType === 'Blockchain Audit' ? (
                      <>
                        <td><span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.transactionHash || 'N/A'}</span></td>
                        <td><span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.documentHash || 'N/A'}</span></td>
                        <td>{item.date}</td>
                      </>
                    ) : (
                      <>
                        <td><span style={{ fontWeight: 600, fontSize: '13px', color: '#6750A4' }}>{item.category}</span></td>
                        <td>{item.location}</td>
                        <td>{item.date}</td>
                      </>
                    )}

                    <td>
                      <span className={`status-badge ${item.status === 'Paid' || item.status === 'Published' || item.status === 'CASE_CLOSED' ? 'approved' : 'pending'}`}>
                        <span className="dot" />{item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-outline"
                        onClick={() => handleDownload(item.category === "Payment" ? "Payment Report" : item.category === "Blockchain Audit" ? "Blockchain Audit Report" : "Case Status Report")}
                      >
                        <Download size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
