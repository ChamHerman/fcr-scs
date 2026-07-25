import React, { useState } from 'react';
import { 
  Search, Clock, CheckCircle, XCircle, 
  DollarSign, User, MoreHorizontal 
} from 'lucide-react';
import '../LandAcquisition/case_management.css';

const stats = [
  { label: 'Total Volume', value: '$2.4M', change: '+12.5%', icon: DollarSign },
  { label: 'Pending Processing', value: '$845K', change: '+5.2%', icon: Clock },
  { label: 'Completed (24h)', value: '1,245', change: '+18.1%', icon: CheckCircle },
  { label: 'Failed Transfers', value: '12', change: '-2.4%', icon: XCircle },
];

const transactions = [
  { id: 'TRX-98231', beneficiary: 'Emma Thompson', amount: '$12,500.00', status: 'Completed', date: '2026-07-24 14:30', method: 'Bank Transfer' },
  { id: 'TRX-98232', beneficiary: 'Marcus Chen', amount: '$4,200.00', status: 'Processing', date: '2026-07-24 14:15', method: 'Wire' },
  { id: 'TRX-98233', beneficiary: 'Sarah Jenkins', amount: '$28,900.00', status: 'Pending', date: '2026-07-24 13:45', method: 'Bank Transfer' },
  { id: 'TRX-98234', beneficiary: 'David Rodriguez', amount: '$1,150.00', status: 'Failed', date: '2026-07-24 13:10', method: 'RTP' },
  { id: 'TRX-98235', beneficiary: 'Elena Rostova', amount: '$9,800.00', status: 'Completed', date: '2026-07-24 12:20', method: 'Bank Transfer' },
];

export default function PaymentDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'Completed': return 'status-badge approved';
      case 'Processing': 
      case 'Pending': return 'status-badge pending';
      case 'Failed': return 'status-badge rejected';
      default: return 'status-badge';
    }
  };

  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Payment Dashboard</h1>
          <div className="sub">Monitor and manage all outgoing compensations and transfers.</div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <Clock size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> 24 Jul 2026
          </div>
          <div className="avatar">
            <User size={20} />
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <stat.icon className="stat-icon" size={32} />
            <div className="stat-label">{stat.label}</div>
            <div className="stat-number">{stat.value}</div>
            <div className={`stat-change ${stat.change.startsWith('-') ? 'negative' : ''}`}>
              {stat.change} from last month
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <Search className="search-icon" />
          <input 
            type="text" 
            placeholder="Search TRX ID or name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select>
            <option>All Status</option>
            <option>Completed</option>
            <option>Processing</option>
            <option>Pending</option>
            <option>Failed</option>
          </select>
          <select>
            <option>All Methods</option>
            <option>Bank Transfer</option>
            <option>Wire</option>
            <option>RTP</option>
          </select>
          <button className="btn-filter">Apply Filters</button>
          <button className="btn-clear">Clear</button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">Showing 1 - 5</span> of 124 transactions
        </div>
        <div className="right">
          <button className="btn-outline">
            Export CSV
          </button>
          <button className="btn-primary">
            Export Report
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Beneficiary</th>
                <th>Date &amp; Time</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((trx, idx) => (
                <tr key={idx}>
                  <td><span className="case-id">{trx.id}</span></td>
                  <td>{trx.beneficiary}</td>
                  <td>{trx.date}</td>
                  <td>{trx.method}</td>
                  <td style={{ fontWeight: 600 }}>{trx.amount}</td>
                  <td>
                    <span className={getStatusClass(trx.status)}>
                      <span className="dot"></span>
                      {trx.status}
                    </span>
                  </td>
                  <td>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--md-on-surface-variant)' }}>
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="pagination">
          <div className="info">Showing 1 to 5 of 124 entries</div>
          <div className="pages">
            <button>&lt;</button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <button>&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
