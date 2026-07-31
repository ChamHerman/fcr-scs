import React from 'react';
import { CheckCircle2, Mail, Repeat } from 'lucide-react';
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './reports.css';

export const ScheduleReportsGeneration: React.FC = () => {
  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Schedule Reports Generation</h1>
          <div className="sub">Define automatic report delivery for your team and stakeholders.</div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <Repeat size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> Automation
          </div>
          <div className="avatar">
            <Mail size={20} />
          </div>
        </div>
      </div>

      <div className="filter-bar report-form-panel">
        <div className="report-form-grid">
          <label>
            <span className="meta-text">Report template</span>
            <select className="filter-bar select" style={{ width: '100%', marginTop: 8 }}>
              <option>Compensation summary</option>
              <option>Valuation performance</option>
              <option>Executive overview</option>
            </select>
          </label>
          <label>
            <span className="meta-text">Frequency</span>
            <select className="filter-bar select" style={{ width: '100%', marginTop: 8 }}>
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </label>
          <label>
            <span className="meta-text">Recipient email</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Mail size={16} color="var(--md-primary)" />
              <input className="report-input" defaultValue="operations@agency.gov" />
            </div>
            <div className="status-badge approved" style={{ marginTop: 10 }}><span className="dot" />Validated</div>
          </label>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">Delivery is ready to save</span>
        </div>
        <div className="right">
          <button className="btn-primary">Save Schedule</button>
        </div>
      </div>
    </div>
  );
};
