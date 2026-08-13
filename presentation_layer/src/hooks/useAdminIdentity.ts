import { useAdminIdentityContext } from '../context/AdminIdentityContext';
export { ADMIN_IDENTITIES } from '../context/AdminIdentityContext';
import type { AdminIdentity } from '../context/AdminIdentityContext';

/**
 * Dev-only identity switcher (PLAN_HM_1308 §4). The active identity is shared
 * via AdminIdentityProvider (mounted in AdminLayout) so every page reacts to a
 * switch instantly; pages send it as the actor/admin ID on mutations.
 */
export function useAdminIdentity(): { identityId: string; identityLabel: string; setIdentity: (id: string) => void; identities: AdminIdentity[] } {
  return useAdminIdentityContext();
}
