import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Clock, CheckCircle, XCircle, 
  DollarSign, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { SearchInput } from '../../components/ui/SearchInput';
import '../LandAcquisition/case_management.css';

export default function PaymentDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allCases, setAllCases] = useState<any[]>([]);
  const [pendingCases, setPendingCases] = useState<any[]>([]);
  const [failedCases, setFailedCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.stat-card',
      { opacity: 0, y: 28, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.1, ease: 'back.out(1.3)', delay: 0.1 }
    );
    gsap.fromTo('.filter-bar, .action-bar, .table-wrap',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.45 }
    );
  }, { scope: containerRef });

  const handlePaymentAction = async (action: string, caseId: string) => {
    try {
      if (action === 'Simulate Initiate') {
        await paymentApi.initiate({ caseId, adminId: 'mock-admin' });
      } else if (action === 'Simulate Authorise') {
        await paymentApi.authorise({ caseId, adminId: 'mock-admin' });
      } else if (action === 'Simulate Fail') {
        await paymentApi.reject({ caseId, adminId: 'mock-admin', reason: 'Simulated Fail' });
      } else if (action === 'Download Receipt') {
        alert('Downloading receipt for ' + caseId);
      } else if (action === 'View Details') {
        alert('Viewing details for ' + caseId);
      }
      await loadData();
    } catch (e) {
      console.error(e);
      // Fallback for mock if backend fails:
      setAllCases(prev => prev.map(c => {
        if (c.caseId === caseId) {
          if (action === 'Simulate Initiate') return { ...c, status: 'Transfer Initiated' };
          if (action === 'Simulate Authorise') return { ...c, status: 'Paid' };
          if (action === 'Simulate Fail') return { ...c, status: 'Failed' };
        }
        return c;
      }));
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [allRes, pendingRes, failedRes] = await Promise.all([
        paymentApi.getAllCases().catch(() => ({ cases: [] })),
        paymentApi.getPendingAuthorisations().catch(() => ({ cases: [] })),
        paymentApi.getFailedTransactions().catch(() => ({ cases: [] }))
      ]);
      setAllCases(allRes.cases || []);
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
    { label: 'Total Payment Cases', value: allCases.length.toString(), change: 'Live System', icon: DollarSign },
  ];

  const allTx = allCases.map(c => ({
    id: c.caseId,
    beneficiary: c.accountHolderName || 'N/A',
    amount: `RM ${(c.amount || 0).toLocaleString()}`,
    status: c.status || 'Pending',
    date: new Date(c.updatedAt || c.createdAt).toLocaleString(),
    method: c.bankName || 'Bank Transfer'
  }));

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
    <div className="main" ref={containerRef}>
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
        <SearchInput 
          placeholder="Search TRX ID or name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
                <th>Actions</th>
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
                    <td style={{ position: 'relative' }}>
                      <ActionMenuPortal
                        isOpen={activeMenu === trx.id}
                        onToggle={() => setActiveMenu(activeMenu === trx.id ? null : trx.id)}
                        onClose={() => setActiveMenu(null)}
                        actions={[
                          { label: 'View Details', onClick: () => navigate(`/admin/payment/initiate?caseId=${trx.id}`) },
                          { label: 'Initiate Transfer', onClick: () => navigate(`/admin/payment/initiate?caseId=${trx.id}`) },
                          { label: 'Authorise Transfer', onClick: () => navigate(`/admin/payment/pending?caseId=${trx.id}`) },
                          { label: 'Failed Log / Manage', onClick: () => navigate(`/admin/payment/failed?caseId=${trx.id}`) },
                          { label: 'Download Receipt', onClick: () => handlePaymentAction('Download Receipt', trx.id) }
                        ]}
                      />
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

