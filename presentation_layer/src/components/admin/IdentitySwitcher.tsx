import React from 'react';
import classNames from 'classnames';
import { UserRound } from 'lucide-react';
import { ADMIN_IDENTITIES, useAdminIdentity } from '../../hooks/useAdminIdentity';

/**
 * Dev-only identity switcher (PLAN_HM_1308 §4) — rendered in the admin header.
 * Swaps the simulated actor between Admin A (admin-01) and Admin B (admin-02)
 * so segregation of duties and audit trails are observable. No free-form admin
 * ID inputs exist anywhere in the redesigned module; pages read this identity.
 */
export const IdentitySwitcher: React.FC = () => {
  const { identityId, identityLabel, setIdentity } = useAdminIdentity();

  return (
    <div className="flex items-center gap-2 bg-md-surface-container-low border border-md-outline/20 rounded-full pl-3 pr-1.5 py-1.5">
      <UserRound size={15} className="text-md-on-surface-variant" />
      <span className="text-xs font-semibold text-md-on-surface hidden sm:inline">Signing as:</span>
      <div className="flex items-center gap-1">
        {ADMIN_IDENTITIES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setIdentity(a.id)}
            title={`${a.label} (${a.id})`}
            className={classNames(
              'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors duration-200 ease-md-bouncy',
              identityId === a.id
                ? 'bg-md-primary text-md-on-primary'
                : 'text-md-on-surface-variant hover:bg-md-surface-container'
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
};
