import React, { useState, useEffect } from 'react';
import { 
  Search, Clock, CheckCircle, XCircle, 
  DollarSign, User, MoreHorizontal 
} from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';
import '../LandAcquisition/case_management.css';

export default function PaymentDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingCases, setPendingCases] = useState<any[]>([]);
  const [failedCases, setFailedCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingRes, failedRes] = await Promise.all([
        paymentApi.getPendingAuthorisations(),
        paymentApi.getFailedTransactions()
      ]);
      setPendingCases(pendingRes.cases || []);
      setFailedCases(failedRes.cases || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = [
    { label: 'Pending Authorisations', value: pendingCases.length.toString(), change: 'Requires Action', icon: Clock },
    { label: 'Failed Transfers', value: failedCases.length.toString(), change: 'Requires Attention', icon: XCircle },
    { label: 'Active Pipeline', value: (pendingCases.length + failedCases.length).toString(), change: 'Live System', icon: DollarSign },
  ];

  const allTx = [
    ...pendingCases.map(c => ({
      id: c.caseId,
      beneficiary: c.accountHolderName || 'N/A',
      amount: `RM ${(c.amount || 0).toLocaleString()}`,
      status: 'Pending',
      date: new Date(c.updatedAt || c.createdAt).toLocaleString(),
      method: c.bankName || 'Bank Transfer'
    })),
    ...failedCases.map(c => ({
      id: c.caseId,
      beneficiary: c.accountHolderName || 'N/A',
      amount: `RM ${(c.amount || 0).toLocaleString()}`,
      status: 'Failed',
      date: new Date(c.updatedAt || c.createdAt).toLocaleString(),
      method: c.bankName || 'Bank Transfer'
    }))
  ];

  const filteredTx = allTx.filter(t => 
    !searchQuery || t.id.toLowerCase().includes(searchQuery.toLowerCase()) || t.beneficiary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'Paid':
      case 'Completed': return 'status-badge approved';
      case 'Pending': 
      case 'Transfer Initiated': return 'status-badge pending';
      case 'Failed': 
      case 'Transfer Failed': return 'status-badge rejected';
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
            <Clock size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className="avatar">
            <User size={20} />
          </div>
        </div>
      </div>

      {loading && <p className="text-gray-500 my-4">Loading...</p>}
      {error && <p className="text-red-500 my-4">{error}</p>}

      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <stat.icon className="stat-icon" size={32} />
            <div className="stat-label">{stat.label}</div>
            <div className="stat-number">{stat.value}</div>
            <div className="stat-change">
              {stat.change}
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
          <button className="btn-filter" onClick={loadData}>Refresh</button>
          <button className="btn-clear" onClick={() => setSearchQuery('')}>Clear</button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">Showing {filteredTx.length} items</span>
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
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-4">No active payment transactions found</td>
                </tr>
              ) : (
                filteredTx.map((trx) => (
                  <tr key={trx.id}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

