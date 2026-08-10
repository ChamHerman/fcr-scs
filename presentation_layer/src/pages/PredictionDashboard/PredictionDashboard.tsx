import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Camera, Eye, RefreshCw, Clock, BarChart3 } from 'lucide-react';
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './predictionDashboard.css';

export const PredictionDashboard: React.FC = () => {
  const navigate = useNavigate();

  const metrics = [
    { label: 'Pending Valuations', value: 8 },
    { label: 'Avg Confidence', value: '84%' },
    { label: 'Model Version', value: 'v3.1.2' },
    { label: 'Last Trained', value: '2026-07-28' },
  ];

  const valuationRows = [
    {
      caseId: 'LA-2026-0024',
      amount: 'RM 1,720,000',
      confidence: '88%',
      status: 'Completed',
      actionLabel: 'View result',
      actionRoute: '/admin/prediction/results',
    },
    {
      caseId: 'LA-2026-0019',
      amount: 'RM 1,850,000',
      confidence: '79%',
      status: 'Needs review',
      actionLabel: 'Review valuation',
      actionRoute: '/admin/prediction/review',
    },
  ];

  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>AI Valuation Dashboard</h1>
          <div className="sub">Overview of AI valuation activity and quick actions.</div>
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

      <div className="stats-grid">
        {metrics.map((m) => (
          <div className="stat-card" key={m.label}>
            <div className="stat-label">{m.label}</div>
            <div className="stat-number">{m.value}</div>
            <div className="stat-change">Live data</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <input placeholder="Search valuation or case ID" />
        </div>
        <div className="filter-group">
          <button className="btn-filter" onClick={() => navigate('/admin/prediction/process')}><Camera size={14} style={{ display: 'inline', marginRight: 6 }} /> Process Valuation</button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">Quick actions</span>
        </div>
        <div className="right">
          <button className="btn-primary" onClick={() => navigate('/admin/prediction/history')}>View History</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Case</th>
                <th>Estimated value</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {valuationRows.map((row) => (
                <tr key={row.caseId}>
                  <td><span className="case-title">{row.caseId}</span></td>
                  <td>{row.amount}</td>
                  <td>{row.confidence}</td>
                  <td><span className={`status-badge ${row.status === 'Completed' ? 'approved' : 'pending'}`}><span className="dot" />{row.status}</span></td>
                  <td>
                    <button className="btn-outline" onClick={() => navigate(row.actionRoute)}>{row.actionLabel}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PredictionDashboard;
