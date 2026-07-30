import React, { useRef } from 'react';
import { 
  CheckCircle, Clock, XCircle, User, Activity, Wallet, ShieldCheck, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Button } from '../../components/ui/Button';
import { blockchainApi } from '../../services/blockchainApi';
import { useWallet } from '../../hooks/useWallet';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { SearchInput } from '../../components/ui/SearchInput';
import { WalletButton } from '../../components/ui/WalletButton';
import '../LandAcquisition/case_management.css';

export const BlockchainDashboard: React.FC = () => {
  const { walletConnected, walletAddress, error: walletError, setError: setWalletError, connectWallet: handleConnectWallet } = useWallet();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All Status');
  const [records, setRecords] = React.useState<any[]>([]);
  const [networkInfo, setNetworkInfo] = React.useState<{ name: string; chainId: number; isLocal: boolean } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Page entrance — stagger stats cards then slide in table
    gsap.fromTo('.stat-card',
      { opacity: 0, y: 28, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.1, ease: 'back.out(1.3)', delay: 0.1 }
    );
    gsap.fromTo('.filter-bar, .action-bar, .table-wrap',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.45 }
    );
  }, { scope: containerRef });

  const handleBlockchainAction = async (action: string, caseId: string) => {
    try {
      if (action === 'Publish On-Chain') {
        await blockchainApi.publish({ caseId, documentHash: '0xmockhash', walletAddress: walletAddress || '0xmockwallet' });
      } else if (action === 'Void Ledger') {
        await blockchainApi.voidRecord({ caseId, voidReason: 'Mock Void', walletAddress: walletAddress || '0xmockwallet' });
      } else if (action === 'View Audit Trail') {
        alert('Viewing audit trail for ' + caseId);
      }
      await loadData();
    } catch (e) {
      console.error(e);
      // Fallback for mock if backend fails:
      setRecords(prev => prev.map(r => {
        if (r.caseId === caseId) {
          if (action === 'Publish On-Chain') return { ...r, status: 'Published', transactionHash: '0x12345mock' };
          if (action === 'Void Ledger') return { ...r, status: 'Voided' };
        }
        return r;
      }));
    }
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [recData, netData] = await Promise.all([
        blockchainApi.getRecords(),
        blockchainApi.getNetworkInfo().catch(() => null)
      ]);
      setRecords(recData.records || []);
      setNetworkInfo(netData);
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time filter: reload when statusFilter changes
  React.useEffect(() => {
    loadData();
  }, [statusFilter]);

  const publishedCount = records.filter(r => r.status === 'Published').length;
  const voidedCount = records.filter(r => r.status === 'Voided').length;
  const totalCount = records.length;

  const stats = [
    { label: 'Published Records', value: publishedCount.toString(), change: 'Total: ' + totalCount, icon: CheckCircle },
    { label: 'Total Records', value: totalCount.toString(), change: 'Live DB', icon: Clock },
    { label: 'Voided Records', value: voidedCount.toString(), change: 'Voided', icon: XCircle },
  ];

  const filteredRecords = records.filter(r => {
    const matchesSearch = !searchQuery || 
      r.caseId.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.documentHash && r.documentHash.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.transactionHash && r.transactionHash.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'All Status' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'Published': return 'status-badge approved';
      case 'Voided': return 'status-badge rejected';
      case 'Pending': return 'status-badge pending';
      default: return 'status-badge';
    }
  };

  return (
    <div className="main" ref={containerRef}>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Blockchain Overview</h1>
          <div className="sub">
            Monitor real-time ledger activities and smart contract status.{' '}
            {networkInfo && (
              <span className="text-sm font-semibold text-gray-600 ml-2">
                Network: {networkInfo.isLocal ? 'Hardhat Local' : 'Sepolia Testnet'} ({networkInfo.name})
              </span>
            )}
          </div>
        </div>
        <div className="topbar-right">
          {walletConnected ? (
            <WalletButton walletAddress={walletAddress || undefined} adminId="Admin" />
          ) : (
            <Button 
              onClick={handleConnectWallet}
              variant="animated-primary"
              className="font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(103,80,164,0.3)] hover:shadow-[0_0_20px_rgba(103,80,164,0.5)] transition-all"
              style={{ minWidth: '180px' }}
            >
              <Wallet size={16} />
              Connect MetaMask
            </Button>
          )}
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
      {walletError && <p className="text-red-500 my-4">{walletError}</p>}

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
        <div className="search-wrap" style={{ flex: 1, minWidth: '300px' }}>
          <SearchInput 
            placeholder="Search TxHash or Record ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All Status</option>
            <option>Published</option>
            <option>Voided</option>
          </select>
          <Button variant="outlined" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('All Status'); }}>Clear</Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <Activity size={18} />
          <span className="count">Recent Ledger Activity ({filteredRecords.length})</span>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-4">No records found</td>
                </tr>
              ) : (
                filteredRecords.map((trx) => (
                  <tr key={trx.id || trx.caseId}>
                    <td><span className="case-id">{trx.caseId}</span></td>
                    <td style={{ fontWeight: 500 }}>
                      <ShieldCheck size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom', color: 'var(--md-primary)' }} />
                      {trx.status === 'Voided' ? 'Record Voided' : 'Record Published'}
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--md-on-surface-variant)' }}>
                      {trx.transactionHash ? `${trx.transactionHash.substring(0, 10)}...` : 'N/A'}
                    </td>
                    <td>{new Date(trx.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={getStatusClass(trx.status)}>
                        <span className="dot"></span>
                        {trx.status}
                      </span>
                    </td>
                    <td style={{ position: 'relative' }}>
                      <ActionMenuPortal
                        isOpen={activeMenu === (trx.id || trx.caseId)}
                        onToggle={() => setActiveMenu(activeMenu === (trx.id || trx.caseId) ? null : (trx.id || trx.caseId))}
                        onClose={() => setActiveMenu(null)}
                        actions={[
                          { label: 'Publish On-Chain', onClick: () => navigate(`/admin/blockchain/publish?caseId=${trx.caseId}`) },
                          { label: 'Void Ledger', onClick: () => navigate(`/admin/blockchain/void?caseId=${trx.caseId}`) },
                          { label: 'Verify Audit Trail', onClick: () => navigate(`/verify-audit-trail?caseId=${trx.caseId}`) }
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
};

