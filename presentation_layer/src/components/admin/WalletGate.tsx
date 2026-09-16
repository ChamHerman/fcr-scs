import React from 'react';
import { ShieldAlert, AlertTriangle, RefreshCw, Loader2, Copy, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWallet } from '../../hooks/useWallet';
import { useNotification } from '../ui/NotificationSystem';
import { copyToClipboard } from '../../utils/clipboard';
import { Button } from '../ui/Button';

/**
 * Route gate for the admin blockchain module. The authorised admin wallet must
 * be connected via MetaMask before any /admin/blockchain page renders:
 *  - not connected → prompt warning to connect the authorised admin wallet
 *  - connected with the wrong account → access blocked, mismatch shown, retry
 */
export const WalletGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { walletAddress, walletConnected, error, connectWallet, adminAddress, checking } = useWallet();
  const { notify } = useNotification();

  const truncateAddress = (addr?: string | null) => {
    if (!addr) return '';
    return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
  };

  const handleCopy = (e: React.MouseEvent, addr: string) => {
    e.stopPropagation();
    void copyToClipboard(addr, notify, 'Admin Address Copied');
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-24 text-md-on-surface-variant">
        <Loader2 size={22} className="inline animate-spin mr-2" />
        Checking MetaMask connection…
      </div>
    );
  }

  if (!walletConnected) {
    const wrongAccount = Boolean(walletAddress);
    return (
      <div className="max-w-xl mx-auto my-10 px-4">
        <div className="bg-md-surface-container-low border border-amber-500/30 rounded-2xl px-8 py-10 text-center shadow-sm">
          {/* Warning Icon Badge */}
          <div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
              wrongAccount ? 'bg-md-error/10 text-md-error' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            {wrongAccount ? <ShieldAlert size={28} /> : <AlertTriangle size={28} />}
          </div>

          <h1 className="text-xl font-bold text-md-on-surface mb-2">
            {wrongAccount ? 'Incorrect Wallet Address' : 'Admin Wallet Required'}
          </h1>

          {wrongAccount ? (
            <div className="space-y-4 text-sm text-md-on-surface-variant">
              <p>
                Connected to MetaMask with{' '}
                <button
                  type="button"
                  onClick={(e) => handleCopy(e, walletAddress || '')}
                  title="Click to copy full connected address"
                  className="font-mono font-semibold text-md-error bg-md-error/10 hover:bg-md-error/20 transition px-2 py-0.5 rounded inline-flex items-center gap-1 align-baseline cursor-pointer"
                >
                  <span>{truncateAddress(walletAddress)}</span>
                  <Copy size={12} className="opacity-70" />
                </button>
                , which is not the designated government admin wallet.
              </p>

              <p>
                Please connect to MetaMask with the authorised admin address:{' '}
                <button
                  type="button"
                  onClick={(e) => handleCopy(e, adminAddress || '')}
                  title="Click to copy full admin address"
                  className="font-mono font-semibold text-md-on-surface bg-md-surface-container hover:bg-md-surface-container-high transition px-2 py-0.5 rounded border border-md-outline/20 inline-flex items-center gap-1 align-baseline cursor-pointer"
                >
                  <span>{truncateAddress(adminAddress)}</span>
                  <Copy size={12} className="opacity-70" />
                </button>
                . Switch to the authorised account in MetaMask, then try again.
              </p>

              <div className="pt-2">
                <Button variant="filled" className="px-6" onClick={connectWallet}>
                  <RefreshCw size={14} className="mr-1.5" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-md-on-surface-variant">
              <p>
                The blockchain module can only be accessed with the authorised government admin wallet.
              </p>

              <div className="p-3.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 rounded-xl text-left text-xs space-y-1.5">
                <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Authorised Admin Address</span>
                </div>
                <div className="text-amber-950 dark:text-amber-100 flex items-center justify-between gap-2">
                  <span>Please connect to MetaMask with:</span>
                  <button
                    type="button"
                    onClick={(e) => handleCopy(e, adminAddress || '')}
                    title="Click to copy full address"
                    className="font-mono font-bold text-xs bg-amber-500/20 hover:bg-amber-500/30 transition px-2 py-0.5 rounded inline-flex items-center gap-1 text-amber-900 dark:text-amber-100 cursor-pointer"
                  >
                    <span>{truncateAddress(adminAddress)}</span>
                    <Copy size={12} className="opacity-80" />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="filled" className="px-6 font-semibold" onClick={connectWallet}>
                  <span>Connect MetaMask</span>
                </Button>
              </div>

              {error && !error.toLowerCase().includes('user rejected') && (
                <div className="bg-md-error/10 border border-md-error/30 text-md-on-error rounded-xl px-4 py-2.5 text-xs text-left">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Support Guidance */}
          <div className="mt-6 pt-4 border-t border-md-outline/10 text-xs text-md-on-surface-variant/80 flex items-center justify-center gap-1.5">
            <span>Need assistance or don&apos;t have access?</span>
            <Link
              to="/contact"
              className="font-medium text-md-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Contact Support</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
