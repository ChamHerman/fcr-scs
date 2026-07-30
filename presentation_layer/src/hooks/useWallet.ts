import { useState, useEffect } from 'react';

export const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const adminAddress = import.meta.env.VITE_ADMIN_WALLET_ADDRESS;

  const validateAdminAddress = (address: string) => {
    if (!adminAddress) return true; // If no admin address configured, allow all for dev
    if (address.toLowerCase() !== adminAddress.toLowerCase()) {
      setError(`Unauthorized wallet. Expected Admin wallet: ${adminAddress.substring(0,6)}...`);
      setWalletConnected(false);
      setWalletAddress('');
      return false;
    }
    return true;
  };

  const connectWallet = async () => {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          if (validateAdminAddress(accounts[0])) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setError('');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to connect wallet');
      }
    } else {
      setError('MetaMask extension is required');
    }
  };

  useEffect(() => {
    // Auto detect on load
    const checkConnection = async () => {
      if ((window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
             if (validateAdminAddress(accounts[0])) {
               setWalletAddress(accounts[0]);
               setWalletConnected(true);
             }
          }
        } catch (err) {
          console.error("Auto detect failed", err);
        }
      }
    };
    checkConnection();
    
    if ((window as any).ethereum) {
       (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
         if (accounts.length > 0) {
           if (validateAdminAddress(accounts[0])) {
              setWalletAddress(accounts[0]);
              setWalletConnected(true);
              setError('');
           }
         } else {
           setWalletAddress('');
           setWalletConnected(false);
         }
       });
    }
  }, [adminAddress]);

  return {
    walletAddress,
    walletConnected,
    error,
    setError,
    connectWallet
  };
};
