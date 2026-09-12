import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ConfirmSubmitModalProps {
  isOpen: boolean;
  title: string;
  /** What is about to be submitted — a short summary the member reviews. */
  summary: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * FR-017: every member portal submission requires a second, explicit
 * confirmation. The form's own submit button opens this review dialog; only
 * its Confirm button dispatches the request.
 */
export const ConfirmSubmitModal: React.FC<ConfirmSubmitModalProps> = ({
  isOpen,
  title,
  summary,
  confirmLabel = 'Confirm Submission',
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={loading ? () => {} : onCancel}
    title={title}
    maxWidth="max-w-md"
    footer={
      <div className="flex items-center justify-end gap-3 w-full">
        <Button variant="text" size="md" onClick={onCancel} disabled={loading}>
          Back to Form
        </Button>
        <Button variant="filled" size="md" onClick={onConfirm} isLoading={loading}>
          {confirmLabel}
        </Button>
      </div>
    }
  >
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 text-xs text-md-on-surface-variant bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-3">
        <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
        <span>
          Please review the details below. This submission is official — confirm only when everything is correct.
        </span>
      </div>
      <div className="bg-md-surface-container-low rounded-xl border border-md-outline/10 px-4 py-3 text-sm text-md-on-surface space-y-2">
        {summary}
      </div>
    </div>
  </Modal>
);

/** One labelled summary row inside the confirmation body. */
export const ConfirmRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <span className="text-md-on-surface-variant shrink-0">{label}</span>
    <span className={`font-bold text-md-on-surface text-right break-words ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);
