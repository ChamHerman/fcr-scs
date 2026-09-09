import { useAuth, type User } from '../context/AuthContext';
export { ADMIN_IDENTITIES } from '../context/AdminIdentityContext';
import type { AdminIdentity } from '../context/AdminIdentityContext';

export interface AdminIdentityResult {
  identityId: string;
  identityLabel: string;
  role: string;
  user: User | null;
  setIdentity: (id: string) => void;
  identities: AdminIdentity[];
}

export function useAdminIdentity(): AdminIdentityResult {
  const { user } = useAuth();
  const identityId = user?.userId || 'admin-01';
  const identityLabel = user ? `${user.name}` : 'Gov Admin 1';
  const role = user?.role || 'GOVERNMENT_ADMINISTRATOR';

  return {
    identityId,
    identityLabel,
    role,
    user,
    setIdentity: (_id: string) => {},
    identities: [],
  };
}
