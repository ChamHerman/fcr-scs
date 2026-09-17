import React from 'react';

/**
 * A single beneficiary/co-owner as returned on a payment case payload.
 * `sharePercent` and `amount` are the owner's own apportionment of the award.
 */
export interface PaymentOwner {
  id?: string;
  ownerId?: string;
  beneficiaryIndex?: number;
  sharePercent?: number | string | null;
  amount?: number | string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  myKadNumber?: string | null;
  submittedAt?: string | null;
}

const fmtRM = (value?: number | string | null) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '—';
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtShare = (value?: number | string | null) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('en-MY', { maximumFractionDigits: 4 })}%`;
};

const maskAccount = (accountNumber?: string | null) => {
  if (!accountNumber) return '—';
  const clean = accountNumber.replace(/[\s-]/g, '');
  return clean.length > 4 ? `•••• ${clean.slice(-4)}` : clean;
};

/**
 * Stacked owner cards for a co-owned payment case.
 *
 * One payment record is split across N owners by percentage, so a single-row
 * "Beneficiary" cell silently showed one person receiving the whole award.
 * This renders every owner with their own share, amount, payout account and
 * whether they have submitted bank details yet (N-of-M progress).
 *
 * Falls back to the legacy single-owner fields when a case has no beneficiary
 * rows, so pre-multi-owner records render exactly as before.
 */
export const OwnerStack: React.FC<{
  owners?: PaymentOwner[] | null;
  /** Legacy single-owner fallback values, used when `owners` is empty. */
  fallback?: {
    accountHolderName?: string | null;
    myKadNumber?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    amount?: number | string | null;
  };
  /** Show the compact variant used inside dense table cells. */
  compact?: boolean;
  className?: string;
}> = ({ owners, fallback, compact = false, className = '' }) => {
  const list = (owners || []).filter(Boolean);

  if (list.length === 0) {
    const name = fallback?.accountHolderName || '—';
    if (compact) return <span className={className}>{name}</span>;
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="font-semibold text-md-on-surface">{name}</div>
        <div className="text-md-on-surface-variant text-xs">
          {fallback?.bankName || '—'} · {maskAccount(fallback?.accountNumber)}
        </div>
      </div>
    );
  }

  // A single owner needs no stacking — keep the original one-line presentation.
  if (list.length === 1) {
    const o = list[0];
    const name = o.accountHolderName || fallback?.accountHolderName || '—';
    if (compact) return <span className={className}>{name}</span>;
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="font-semibold text-md-on-surface">{name}</div>
        <div className="text-md-on-surface-variant text-xs">
          {o.bankName || fallback?.bankName || '—'} · {maskAccount(o.accountNumber || fallback?.accountNumber)}
        </div>
      </div>
    );
  }

  const submitted = list.filter((o) => Boolean(o.submittedAt)).length;

  if (compact) {
    return (
      <div className={`space-y-0.5 ${className}`}>
        <span>{list.map((o) => o.accountHolderName || '—').join(', ')}</span>
        <span className="block text-[11px] text-md-on-surface-variant">
          {submitted} of {list.length} owners submitted
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant">
          {list.length} co-owners
        </span>
        <span
          className={
            submitted >= list.length
              ? 'text-[11px] font-bold text-emerald-700'
              : 'text-[11px] font-bold text-amber-700'
          }
        >
          {submitted} of {list.length} submitted
        </span>
      </div>
      <div className="space-y-2">
        {list.map((o, idx) => (
          <div
            key={o.id || o.ownerId || idx}
            className="rounded-lg border border-md-outline/15 bg-md-surface-container-low px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-md-on-surface truncate">
                  {idx + 1}. {o.accountHolderName || '—'}
                </div>
                <div className="text-xs text-md-on-surface-variant mt-0.5">
                  {o.myKadNumber || fallback?.myKadNumber || '—'} · {o.bankName || '—'} ·{' '}
                  {maskAccount(o.accountNumber)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-md-on-surface">{fmtRM(o.amount)}</div>
                <div className="text-xs text-md-on-surface-variant">{fmtShare(o.sharePercent)}</div>
              </div>
            </div>
            <div className="mt-1.5">
              {o.submittedAt ? (
                <span className="text-[11px] font-semibold text-emerald-700">Bank details submitted</span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700">Awaiting bank details</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OwnerStack;
