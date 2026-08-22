import React from 'react';
import { Send, PenLine, XCircle, RotateCcw, Download, Ban, BadgeCheck, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { useNotification } from '../../components/ui/NotificationSystem';
import { normalizePaymentStatus } from './statusMaps';
import { hasBankDetails, hasSignedOrInitiated, signaturesLeft, downloadReceipt } from './paymentModals';
import type { PaymentRow } from './paymentModals';

/**
 * Shared per-row actions for every payment list (overview, initiate, pending,
 * failed). One render path per status — clicking the row opens the detail
 * modal, so there is no view/eye action here.
 */
export type PaymentRowActionType =
  | 'initiate'
  | 'authorise'
  | 'reject'
  | 'cancel'
  | 'retry'
  | 'request-update'
  | 'schedule'
  | 'resolve-dispute';

interface PaymentRowActionsProps {
  pc: PaymentRow;
  identityId: string;
  onAction: (type: PaymentRowActionType, pc: PaymentRow) => void;
  /** Overflow menu open-state is owned by the page so only one menu opens at a time. */
  activeMenu: string | null;
  setActiveMenu: (key: string | null) => void;
  /** Extra entries prepended to the overflow menu (e.g. View Error Logs on the failed page). */
  extraMenuActions?: Array<{ label: string; onClick: () => void }>;
}

const pillBtn = 'h-8 px-3.5 text-xs inline-flex items-center gap-2 rounded-full font-medium';

export const PaymentRowActions: React.FC<PaymentRowActionsProps> = ({
  pc,
  identityId,
  onAction,
  activeMenu,
  setActiveMenu,
  extraMenuActions,
}) => {
  const { notify } = useNotification();
  const norm = normalizePaymentStatus(pc.status);
  const signed = hasSignedOrInitiated(pc, identityId);
  const left = signaturesLeft(pc);

  const menu = (actions: Array<{ label: string; onClick: () => void }>) => (
    <ActionMenuPortal
      isOpen={activeMenu === pc.caseId}
      onToggle={() => setActiveMenu(activeMenu === pc.caseId ? null : pc.caseId)}
      onClose={() => setActiveMenu(null)}
      actions={actions}
    />
  );

  switch (norm) {
    case 'Offer Accepted':
    case 'Bank Details Submitted':
      if (!hasBankDetails(pc)) return <div className="row-actions" />;
      return (
        <div className="row-actions">
          <Button size="sm" variant="filled" className={pillBtn} onClick={() => onAction('initiate', pc)}>
            <Send size={13} className="shrink-0" />
            <span>Initiate</span>
          </Button>
          <IconButton title="Cancel Payment" variant="danger" onClick={() => onAction('cancel', pc)}>
            <Ban size={16} />
          </IconButton>
        </div>
      );

    case 'Transfer Initiated':
    case 'Authorised': {
      if (left > 0 && !signed) {
        return (
          <div className="row-actions">
            <Button size="sm" variant="filled" className={pillBtn} onClick={() => onAction('authorise', pc)}>
              <PenLine size={13} className="shrink-0" />
              <span>Authorise</span>
            </Button>
            <IconButton title="Reject Transfer" variant="danger" onClick={() => onAction('reject', pc)}>
              <XCircle size={16} />
            </IconButton>
            {menu([{ label: 'Cancel Payment', onClick: () => onAction('cancel', pc) }])}
          </div>
        );
      }
      // Self-signed or fully signed: the current admin already approved (SoD),
      // and the transfer is on its way to the bank — nothing left to do.
      return (
        <div className="row-actions">
          <Button
            size="sm"
            variant="tonal"
            disabled
            className={`${pillBtn} opacity-60 cursor-not-allowed`}
            title={
              signed
                ? 'You already signed this transfer (Segregation of Duties) — it cannot be rejected or signed again'
                : 'All required signatures collected — the transfer is being submitted to the bank'
            }
          >
            <Lock size={12} className="shrink-0 text-amber-500" />
            <span>Authorised</span>
          </Button>
        </div>
      );
    }

    case 'Transfer Failed':
      return (
        <div className="row-actions">
          <Button size="sm" variant="filled" className={pillBtn} onClick={() => onAction('retry', pc)}>
            <RotateCcw size={13} className="shrink-0" />
            <span>Retry</span>
          </Button>
          {menu([
            ...(extraMenuActions ?? []),
            { label: 'Request Details Update', onClick: () => onAction('request-update', pc) },
            { label: 'Schedule Tomorrow', onClick: () => onAction('schedule', pc) },
          ])}
        </div>
      );

    case 'Paid':
      return (
        <div className="row-actions">
          <Button size="sm" variant="filled" className={pillBtn} onClick={() => downloadReceipt(pc, notify)}>
            <Download size={13} className="shrink-0" />
            <span>Receipt</span>
          </Button>
        </div>
      );

    case 'Payment Disputed':
      return (
        <div className="row-actions">
          <Button size="sm" variant="filled" className={pillBtn} onClick={() => onAction('resolve-dispute', pc)}>
            <BadgeCheck size={13} className="shrink-0" />
            <span>Resolve</span>
          </Button>
        </div>
      );

    case 'Scheduled':
      // Scheduled for the next clearing window — still cancellable beforehand.
      return (
        <div className="row-actions">
          <IconButton title="Cancel Payment" variant="danger" onClick={() => onAction('cancel', pc)}>
            <Ban size={16} />
          </IconButton>
        </div>
      );

    default:
      // Waiting Bank Approval, Cancelled, Transfer Rejected, Pending New Bank
      // Details — no admin actions; click the row to view details.
      return <div className="row-actions" />;
  }
};
