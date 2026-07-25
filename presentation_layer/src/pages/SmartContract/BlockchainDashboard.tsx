import React from 'react';
import { 
  CheckCircle, Clock, XCircle, User, Activity, Wallet, ShieldCheck, Search 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import '../LandAcquisition/case_management.css';

export const BlockchainDashboard: React.FC = () => {
  const [walletConnected, setWalletConnected] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  const stats = [
    { label: 'Published Records', value: '12,405', change: '+2.4%', icon: CheckCircle },
    { label: 'Pending Transactions', value: '34', change: '+5.1%', icon: Clock },
    { label: 'Voided Records', value: '142', change: '-1.2%', icon: XCircle },
  ];

  const transactions = [
    { id: 'REC-4892', hash: '0x9f8c...3b1a', type: 'Contract Executed', status: 'Confirmed', time: '2 mins ago' },
    { id: 'REC-4891', hash: '0x1a2b...4c3d', type: 'Payment Sent', status: 'Confirmed', time: '14 mins ago' },
    { id: 'REC-4890', hash: '0x5e6f...7g8h', type: 'Offer Signed', status: 'Pending', time: '28 mins ago' },
    { id: 'REC-4889', hash: '0x9i0j...1k2l', type: 'Report Published', status: 'Confirmed', time: '45 mins ago' },
  ];

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'Confirmed': return 'status-badge approved';
      case 'Pending': return 'status-badge pending';
      case 'Failed': return 'status-badge rejected';
      default: return 'status-badge';
    }
  };

  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Blockchain Overview</h1>
          <div className="sub">Monitor real-time ledger activities and smart contract status.</div>
        </div>
        <div className="topbar-right">
          <Button 
            onClick={() => setWalletConnected(!walletConnected)}
            variant={walletConnected ? "tonal" : "animated-primary"}
            className="font-semibold gap-2 shadow-[0_0_15px_rgba(103,80,164,0.3)] hover:shadow-[0_0_20px_rgba(103,80,164,0.5)] transition-all"
            style={{ minWidth: '180px' }}
          >
            <Wallet size={16} className={walletConnected ? "text-md-primary" : ""} />
            {walletConnected ? '0x71C...9A23' : 'Connect MetaMask'}
          </Button>
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
            placeholder="Search TxHash or Record ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select>
            <option>All Status</option>
            <option>Confirmed</option>
            <option>Pending</option>
          </select>
          <button className="btn-filter">Apply Filters</button>
          <button className="btn-clear">Clear</button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <Activity size={18} />
          <span className="count">Recent Ledger Activity</span>
        </div>
        <div className="right">
          <button className="btn-primary">
            View All Explorer
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Type</th>
                <th>TxHash</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((trx, idx) => (
                <tr key={idx}>
                  <td><span className="case-id">{trx.id}</span></td>
                  <td style={{ fontWeight: 500 }}>
                    <ShieldCheck size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom', color: 'var(--md-primary)' }} />
                    {trx.type}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--md-on-surface-variant)' }}>{trx.hash}</td>
                  <td>{trx.time}</td>
                  <td>
                    <span className={getStatusClass(trx.status)}>
                      <span className="dot"></span>
                      {trx.status}
                    </span>
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
