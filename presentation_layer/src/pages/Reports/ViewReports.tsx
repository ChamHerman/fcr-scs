import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, Clock, PieChart } from 'lucide-react';
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './reports.css';

type ReportItem = {
  id: string;
  title: string;
  type: string;
  location: string;
  generatedAt: string;
  status: string;
  owner: string;
  totalCompensation: string;
  pendingReview: string;
  approvalRate: string;
  summary: string;
  breakdown: Array<{ label: string; value: string }>;
};

const REPORT_DATA: ReportItem[] = [
  {
    id: 'RPT-1042',
    title: 'Compensation Summary',
    type: 'Overview',
    location: 'Selangor / Petaling',
    generatedAt: '24 Jul 2026',
    status: 'Completed',
    owner: 'Operations Team',
    totalCompensation: 'RM 1.24M',
    pendingReview: '12 cases',
    approvalRate: '94%',
    summary: 'High-volume compensation pipeline with strong approval throughput.',
    breakdown: [
      { label: 'Approved cases', value: '184' },
      { label: 'Pending review', value: '29' },
      { label: 'Average processing', value: '3.2 days' },
      { label: 'Disbursement', value: 'RM 4.8M' }
    ]
  },
  {
    id: 'RPT-1041',
    title: 'Asset Valuation',
    type: 'Valuation',
    location: 'Johor / Johor Bahru',
    generatedAt: '20 Jul 2026',
    status: 'Pending',
    owner: 'Valuation Unit',
    totalCompensation: 'RM 890K',
    pendingReview: '7 cases',
    approvalRate: '88%',
    summary: 'Valuation review is still awaiting committee confirmation.',
    breakdown: [
      { label: 'Approved cases', value: '71' },
      { label: 'Pending review', value: '18' },
      { label: 'Average processing', value: '4.1 days' },
      { label: 'Disbursement', value: 'RM 2.3M' }
    ]
  },
  {
    id: 'RPT-1039',
    title: 'Blockchain Audit',
    type: 'Compliance',
    location: 'Kuala Lumpur / Setiawangsa',
    generatedAt: '18 Jul 2026',
    status: 'Completed',
    owner: 'Audit Office',
    totalCompensation: 'RM 650K',
    pendingReview: '5 cases',
    approvalRate: '97%',
    summary: 'Ledger integrity checks passed with no discrepancies this cycle.',
    breakdown: [
      { label: 'Approved cases', value: '152' },
      { label: 'Pending review', value: '11' },
      { label: 'Average processing', value: '2.7 days' },
      { label: 'Disbursement', value: 'RM 1.9M' }
    ]
  }
];

export const ViewReports: React.FC = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const selectedReport = REPORT_DATA.find((report) => report.id === reportId);

  useEffect(() => {
    if (reportId && !selectedReport) {
      navigate('/admin/reports');
    }
  }, [reportId, selectedReport, navigate]);

  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>View Reports</h1>
          <div className="sub">Review the overview for each report and open a detailed breakdown for any record.</div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <Clock size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className="avatar">
            <BarChart3 size={20} />
          </div>
        </div>
      </div>

      {!selectedReport ? (
        <div className="report-detail-card" style={{ marginTop: 20 }}>
          <div className="topbar">
            <div className="topbar-left">
              <h2>Report not found</h2>
              <div className="sub">Please go back and select a valid report.</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total compensation</div>
              <div className="stat-number">{selectedReport.totalCompensation}</div>
              <div className="stat-change">Live summary</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending review</div>
              <div className="stat-number">{selectedReport.pendingReview}</div>
              <div className="stat-change">Awaiting action</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Approval rate</div>
              <div className="stat-number">{selectedReport.approvalRate}</div>
              <div className="stat-change">Above target</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Generated</div>
              <div className="stat-number">{selectedReport.generatedAt}</div>
              <div className="stat-change">Latest cycle</div>
            </div>
          </div>

          <div className="report-detail-card" style={{ marginTop: 20 }}>
            <div className="topbar" style={{ marginBottom: 12 }}>
              <div className="topbar-left">
                <h2 style={{ fontSize: 20, margin: 0 }}>{selectedReport.title}</h2>
                <div className="sub">{selectedReport.summary}</div>
              </div>
              <div className="topbar-right">
                <span className={`status-badge ${selectedReport.status === 'Completed' ? 'approved' : 'pending'}`}><span className="dot" />{selectedReport.status}</span>
              </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 16 }}>
              {selectedReport.breakdown.map((item) => (
                <div key={item.label} className="stat-card">
                  <div className="stat-label">{item.label}</div>
                  <div className="stat-number">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="filter-bar" style={{ marginBottom: 0 }}>
              <div className="search-wrap">
                <PieChart size={16} className="search-icon" />
                <input value={`Owner: ${selectedReport.owner}`} readOnly />
              </div>
              <div className="filter-group">
                <button className="btn-outline">Open full report</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
