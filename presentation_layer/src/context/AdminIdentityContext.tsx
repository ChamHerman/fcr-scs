import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Dev-only identity switcher (PLAN_HM_1308 §4). Two simulated admins so
 * segregation of duties (initiator ≠ signer) and audit `created_by` are
 * observable in the demo. The active identity is persisted in localStorage,
 * shared via context so every mounted page reacts to a switch immediately.
 */
export interface AdminIdentity {
  id: string;
  label: string;
}

export const ADMIN_IDENTITIES: AdminIdentity[] = [
  { id: 'admin-01', label: 'Admin A' },
  { id: 'admin-02', label: 'Admin B' },
];

const STORAGE_KEY = 'fcr_admin_identity';

const readStored = (): string => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return ADMIN_IDENTITIES.some((a) => a.id === v) ? (v as string) : 'admin-01';
  } catch {
    return 'admin-01';
  }
};

interface AdminIdentityContextValue {
  identityId: string;
  identityLabel: string;
  identities: AdminIdentity[];
  setIdentity: (id: string) => void;
}

const AdminIdentityContext = createContext<AdminIdentityContextValue | undefined>(undefined);

export const AdminIdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [identityId, setIdentityId] = useState<string>(readStored);

  const setIdentity = useCallback((id: string) => {
    setIdentityId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable — in-memory only */
    }
  }, []);

  const identity = ADMIN_IDENTITIES.find((a) => a.id === identityId) ?? ADMIN_IDENTITIES[0];

  return (
    <AdminIdentityContext.Provider value={{ identityId: identity.id, identityLabel: identity.label, identities: ADMIN_IDENTITIES, setIdentity }}>
      {children}
    </AdminIdentityContext.Provider>
  );
};

export const useAdminIdentityContext = () => {
  const ctx = useContext(AdminIdentityContext);
  if (!ctx) throw new Error('useAdminIdentityContext must be used within AdminIdentityProvider');
  return ctx;
};
