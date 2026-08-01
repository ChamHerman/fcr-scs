import React from 'react';
import { CalendarRange, FileText } from 'lucide-react';
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './reports.css';

export const GenerateReports: React.FC = () => {
  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Generate Reports</h1>
          <div className="sub">Create structured reporting requests for compensation and valuation analytics.</div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <FileText size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> Desktop form
          </div>
          <div className="avatar">
            <CalendarRange size={20} />
          </div>
        </div>
      </div>

      <div className="filter-bar report-form-panel">
        <div className="report-form-grid">
          <div className="report-form-row">
            <label>
              <span className="meta-text">Report category</span>
              <select className="filter-bar select" style={{ width: '100%', marginTop: 8 }}>
                <option>Compensation overview</option>
                <option>Valuation review</option>
                <option>Operational summary</option>
              </select>
            </label>
            <label>
              <span className="meta-text">Location</span>
              <select className="filter-bar select" style={{ width: '100%', marginTop: 8 }}>
                <option>Selangor</option>
                <option>Kuala Lumpur</option>
                <option>Johor</option>
              </select>
            </label>
          </div>

          <div className="report-form-row">
            <label>
              <span className="meta-text">Date range</span>
              <input className="report-input" defaultValue="01 Jul 2026 - 31 Jul 2026" style={{ marginTop: 8 }} />
            </label>
            <label>
              <span className="meta-text">State</span>
              <select className="filter-bar select" style={{ width: '100%', marginTop: 8 }}>
                <option>Selangor</option>
                <option>WP Kuala Lumpur</option>
                <option>Penang</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">Ready to generate report</span>
        </div>
        <div className="right">
          <button className="btn-primary">Generate Report</button>
        </div>
      </div>
    </div>
  );
};
