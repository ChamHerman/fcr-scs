import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, User, Network, RefreshCw, Loader2, Info } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { Card } from '../../components/ui/Card';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { Button } from '../../components/ui/Button';
import { useNotification } from '../../components/ui/NotificationSystem';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';

const NETWORK_OPTIONS = [
  { value: 'sepolia', label: 'Sepolia Testnet' },
  { value: 'local', label: 'Hardhat Local Node' },
  { value: 'mainnet', label: 'Ethereum Mainnet' },
];

const NETWORK_DESCRIPTIONS: Record<string, string> = {
  sepolia: 'Public Ethereum testnet (chainId 11155111). Uses SEPOLIA_RPC_URL and the deployed Sepolia contract.',
  local: 'Local Hardhat node (chainId 31337, http://127.0.0.1:8545). Fastest loop for testing .sol changes and ledger flows.',
  mainnet: 'Real Ethereum mainnet (chainId 1). Requires MAINNET_RPC_URL and a deployed mainnet contract — real funds.',
};

interface NetworkInfo {
  name: string;
  label?: string;
  chainId: number;
  isLocal: boolean;
}

export const SettingsPage: React.FC = () => {
  const [info, setInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const { notify } = useNotification();
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.settings-card', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.2)' });
  }, { scope: pageRef });

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setInfo(await blockchainApi.getNetworkInfo());
    } catch (e: any) {
      setError(e.message || 'Failed to load network info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  const handleSwitch = async (network: string) => {
    if (!info || network === info.name) return;
    setSwitching(true);
    try {
      const active = await blockchainApi.setNetwork(network);
      setInfo({ name: active.key, label: active.label, chainId: active.chainId, isLocal: active.isLocal });
      notify({ type: 'success', title: 'Network switched', message: `Blockchain service now writes to ${active.label}.` });
    } catch (e: any) {
      notify({ type: 'error', title: 'Switch failed', message: e.message });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="main" ref={pageRef}>
      <div className="topbar">
        <div className="topbar-left">
          <h1>System Settings</h1>
          <div className="sub">Runtime configuration for the admin console — blockchain network, ledger targets and more.</div>
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

      {error && (
        <div className="my-4 px-4 py-3 rounded-xl bg-md-error/10 border border-md-error/30 text-md-on-error text-sm flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="text" size="sm" onClick={loadNetwork}>Retry</Button>
        </div>
      )}

      <div className="settings-card" style={{ maxWidth: 760 }}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Network size={18} className="text-md-primary" />
            <h2 className="text-lg font-semibold text-md-on-surface">Blockchain Network</h2>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-md-on-surface-variant text-sm py-6">
              <Loader2 size={18} className="animate-spin" /> Loading network info…
            </div>
          ) : (
            <div className="space-y-5">
              {info && (
                <div className="payment-detail-item">
                  <div className="label">Current Network</div>
                  <div className="value">
                    {info.label ?? (info.isLocal ? 'Hardhat Local' : 'Sepolia Testnet')} ({info.name})
                  </div>
                  <div className="text-xs text-md-on-surface-variant mt-1">
                    Chain ID {info.chainId} · {info.isLocal ? 'Local node' : 'Remote RPC'}
                  </div>
                </div>
              )}

              <RadioGroup
                name="network"
                orientation="vertical"
                value={info?.name ?? 'sepolia'}
                onChange={handleSwitch}
                disabled={switching}
                options={NETWORK_OPTIONS}
              />

              <p className="text-sm text-md-on-surface-variant">
                {info ? (NETWORK_DESCRIPTIONS[info.name] ?? '') : ''}
              </p>

              <div className="flex items-start gap-2 text-sm bg-md-secondary-container/40 border border-md-outline/20 rounded-xl px-4 py-3 text-md-on-surface">
                <Info size={16} className="shrink-0 mt-0.5 text-md-primary" />
                <span>
                  The blockchain service publishes and voids records on the selected network at runtime
                  (in-memory switch — it resets when the service restarts). Connect your wallet to the
                  matching chain before publishing. For local development, run a Hardhat node and set
                  <span className="font-mono text-xs"> LOCAL_RPC_URL</span> /{' '}
                  <span className="font-mono text-xs">LOCAL_CONTRACT_ADDRESS</span> in the service env.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="tonal" size="sm" onClick={loadNetwork} isLoading={loading}>
                  <RefreshCw size={14} className="mr-1" /> Refresh
                </Button>
                {switching && (
                  <span className="text-sm text-md-on-surface-variant flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Switching network…
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
        FCR-SCS · Settings · Connected to Live Backend Data
      </div>
    </div>
  );
};
