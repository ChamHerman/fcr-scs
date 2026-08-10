import React, { useState } from 'react';
import { Clock, History, UserCircle2 } from 'lucide-react';
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './predictionDashboard.css';

const historyItems = [
  { id: 'LA-2026-0024', caseId: 'LA-2026-0024', date: '01 Aug 2026', user: 'AR', amount: 'RM 1,720,000', note: 'Initial AI valuation completed.' },
  { id: 'LA-2026-0024-2', caseId: 'LA-2026-0024', date: '03 Aug 2026', user: 'GS', amount: 'RM 1,790,000', note: 'Government override applied.' },
  { id: 'LA-2026-0024-3', caseId: 'LA-2026-0024', date: '05 Aug 2026', user: 'AR', amount: 'RM 1,760,000', note: 'Model retraining cycle completed.' },
  { id: 'LA-2026-0019', caseId: 'LA-2026-0019', date: '02 Aug 2026', user: 'JK', amount: 'RM 1,850,000', note: 'Needs review after confidence dip.' },
];

export const ViewValuationHistory: React.FC = () => {
  const [selectedCaseId, setSelectedCaseId] = useState('LA-2026-0024');
  const visibleHistory = historyItems.filter((item) => item.caseId === selectedCaseId);
  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>View Valuation History</h1>
          <div className="sub">Review the chronological trail of valuation changes and approval events.</div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <Clock size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> Timeline view
          </div>
          <div className="avatar">
            <History size={20} />
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <input placeholder="Filter by case or date" />
        </div>
        <div className="filter-group">
          <button className="btn-outline">Export timeline</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Case</th>
                <th>Latest update</th>
                <th>Updated by</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {['LA-2026-0024', 'LA-2026-0019'].map((caseId) => (
                <tr key={caseId}>
                  <td><span className="case-title">{caseId}</span></td>
                  <td>{historyItems.find((item) => item.caseId === caseId)?.date}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}><UserCircle2 size={16} /></div>
                      <span>{historyItems.find((item) => item.caseId === caseId)?.user}</span>
                    </div>
                  </td>
                  <td>{historyItems.find((item) => item.caseId === caseId)?.amount}</td>
                  <td>
                    <button className="btn-outline" onClick={() => setSelectedCaseId(caseId)}>View timeline</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-detail-card" style={{ marginTop: 20 }}>
        <div className="topbar" style={{ marginBottom: 12 }}>
          <div className="topbar-left">
            <h2 style={{ fontSize: 20, margin: 0 }}>Timeline for {selectedCaseId}</h2>
            <div className="sub">Recent changes and review events for this valuation case.</div>
          </div>
        </div>
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Updated by</th>
                  <th>Amount</th>
                  <th>Change note</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{item.user}</td>
                    <td>{item.amount}</td>
                    <td><span className="status-badge approved"><span className="dot" />{item.note}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
