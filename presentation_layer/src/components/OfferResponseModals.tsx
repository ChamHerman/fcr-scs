import React from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCheck,
  Clock,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { formatCurrencyRM } from '../utils/currency';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ActiveObjectionInfo {
  objectionId: string;
  objectionReason?: string;
}

export interface OfferResponseModalsProps {
  // --- Accept Modal ---
  showAcceptConfirmModal: boolean;
  onCloseAcceptModal: () => void;
  onConfirmAccept: () => void;
  submitting: boolean;
  totalCompensation: number;
  signedFile: File | null;

  // --- Cancel Approval Modal ---
  showCancelApprovalModal: boolean;
  onCloseCancelModal: () => void;
  onCancelApproval: () => void;
  cancellingApproval: boolean;
  graceCountdown?: string;

  // --- Active Objection Modal ---
  showObjectionPrompt: boolean;
  activeObjection: ActiveObjectionInfo | null;
  onCloseObjectionModal: () => void;
  onWithdrawObjectionAndAccept: () => void;
  withdrawingObjection: boolean;

  // --- Reject Modal ---
  showRejectModal: boolean;
  onCloseRejectModal: () => void;
  onConfirmReject: () => void;
  reason: string;
  onReasonChange: (value: string) => void;
  reasonError: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const OfferResponseModals: React.FC<OfferResponseModalsProps> = ({
  showAcceptConfirmModal,
  onCloseAcceptModal,
  onConfirmAccept,
  submitting,
  totalCompensation,
  signedFile,

  showCancelApprovalModal,
  onCloseCancelModal,
  onCancelApproval,
  cancellingApproval,
  graceCountdown,

  showObjectionPrompt,
  activeObjection,
  onCloseObjectionModal,
  onWithdrawObjectionAndAccept,
  withdrawingObjection,

  showRejectModal,
  onCloseRejectModal,
  onConfirmReject,
  reason,
  onReasonChange,
  reasonError,
}) => {
  return (
    <>
      {/* Accept Award Confirmation Modal */}
      <Modal
        isOpen={showAcceptConfirmModal}
        onClose={onCloseAcceptModal}
        title="Confirm Acceptance of Statutory Award"
        subtitle="Form H Award Acceptance Declaration"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="text" onClick={onCloseAcceptModal}>
              Cancel
            </Button>
            <Button variant="filled" onClick={onConfirmAccept} isLoading={submitting}>
              <CheckCircle size={16} /> Confirm & Accept Award
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-sm text-md-on-surface-variant">
          <p>
            You are formally accepting the compensation award of{' '}
            <strong className="text-md-primary font-bold">{formatCurrencyRM(totalCompensation)}</strong>.
          </p>

          {signedFile && (
            <div className="p-3 bg-md-surface-container-low rounded-xl text-xs flex items-center justify-between border border-md-outline/10">
              <div className="flex items-center gap-2 text-md-on-surface min-w-0">
                <FileCheck size={16} className="text-md-primary flex-shrink-0" />
                <span className="font-medium truncate">{signedFile.name}</span>
                <span className="text-md-on-surface-variant flex-shrink-0">
                  ({(signedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <span className="text-green-600 font-semibold text-[11px] bg-green-500/10 px-2 py-0.5 rounded flex-shrink-0 ml-2">
                Signed Attachment Attached
              </span>
            </div>
          )}

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
            <div className="font-bold flex items-center gap-2 mb-1 text-amber-700 dark:text-amber-300">
              <AlertTriangle size={16} /> 1-Day Approval Policy
            </div>
            You have a <strong>24-hour grace window</strong> to cancel this acceptance. After 24 hours, the approval is permanently finalized.
          </div>
        </div>
      </Modal>

      {/* Cancel Approval Modal */}
      <Modal
        isOpen={showCancelApprovalModal}
        onClose={onCloseCancelModal}
        title="Cancel Compensation Approval"
        subtitle="Withdraw your formal acceptance within the 24-hour statutory grace period"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="text" onClick={onCloseCancelModal}>
              Keep Approved
            </Button>
            <Button variant="danger" onClick={onCancelApproval} isLoading={cancellingApproval}>
              <XCircle size={16} /> Yes, Cancel Approval
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-sm text-md-on-surface-variant">
          <p>
            Are you sure you want to cancel your previous acceptance of this compensation offer? Status will be reset to Pending, and your signed document will be retained as draft.
          </p>

          {graceCountdown && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                <span className="font-semibold">Time Remaining to Cancel:</span>
              </div>
              <span className="font-mono font-bold text-amber-800 dark:text-amber-200 text-sm">
                {graceCountdown}
              </span>
            </div>
          )}
        </div>
      </Modal>

      {/* Active Objection Warning Modal */}
      <Modal
        isOpen={Boolean(showObjectionPrompt && activeObjection)}
        onClose={onCloseObjectionModal}
        title="Active Objection Detected"
        subtitle="Cannot accept offer while an active objection is under review"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="filled" onClick={onWithdrawObjectionAndAccept} isLoading={withdrawingObjection}>
              Withdraw Objection & Accept Offer
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-sm text-md-on-surface-variant">
          <p>You currently have an active objection filed for this case.</p>
          <div className="p-3 bg-md-surface-container rounded-xl text-xs flex flex-col gap-1 border border-md-outline/10">
            <div>
              Objection ID: <strong className="font-mono text-md-primary">{activeObjection?.objectionId}</strong>
            </div>
            <div>Reason: <em>"{activeObjection?.objectionReason || 'Under review'}"</em></div>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={onCloseRejectModal}
        title="Reject Offer"
        subtitle="Formal rejection recording"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="text" onClick={onCloseRejectModal}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirmReject} isLoading={submitting}>
              Confirm Reject
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Reason for Rejection *"
            rows={3}
            placeholder="State the formal reason for rejecting this offer..."
            value={reason}
            error={reasonError}
            onChange={(e) => onReasonChange(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
};

export default OfferResponseModals;
