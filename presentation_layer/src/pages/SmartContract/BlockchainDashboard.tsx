import React from 'react';
import { 
  CheckCircle, Clock, XCircle, User, Activity, Wallet, ShieldCheck, Search 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { blockchainApi } from '../../services/blockchainApi';
import '../LandAcquisition/case_management.css';

export const BlockchainDashboard: React.FC = () => {
  const [walletConnected, setWalletConnected] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All Status');
  const [records, setRecords] = React.useState<any[]>([]);
  const [networkInfo, setNetworkInfo] = React.useState<{ name: string; chainId: number; isLocal: boolean } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

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

  const handleConnectWallet = async () => {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
        }
      } catch (err: any) {
        setError(err.message || 'Wallet connection failed');
      }
    } else {
      setError('MetaMask is not installed');
    }
  };

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
    <div className="main">
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
          <Button 
            onClick={handleConnectWallet}
            variant={walletConnected ? "tonal" : "animated-primary"}
            className="font-semibold gap-2 shadow-[0_0_15px_rgba(103,80,164,0.3)] hover:shadow-[0_0_20px_rgba(103,80,164,0.5)] transition-all"
            style={{ minWidth: '180px' }}
          >
            <Wallet size={16} className={walletConnected ? "text-md-primary" : ""} />
            {walletConnected ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 'Connect MetaMask'}
          </Button>
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
          <button className="btn-filter" onClick={loadData}>Apply Filters</button>
          <button className="btn-clear" onClick={() => { setSearchQuery(''); setStatusFilter('All Status'); }}>Clear</button>
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
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-4">No records found</td>
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

