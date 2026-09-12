import React, { useState, useEffect } from 'react';
import { FileText, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Textarea } from '../ui/Textarea';
import { FileUpload } from '../ui/FileUpload';
import { useNotification } from '../ui/NotificationSystem';
import { compensationApi } from '../../services/compensationApi';
import { ConfirmSubmitModal, ConfirmRow } from '../member/ConfirmSubmitModal';

export interface CreateObjectionFile {
  id: string;
  name: string;
  fileName?: string;
  fileSize?: string;
  file?: File;
}

export interface CreateObjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId?: string;
  caseId?: string;
  userId?: string;
  onSuccess?: () => void | Promise<void>;
  title?: string;
  subtitle?: string;
}

export const CreateObjectionModal: React.FC<CreateObjectionModalProps> = ({
  isOpen,
  onClose,
  offerId,
  caseId,
  userId,
  onSuccess,
  title = 'Submit Compensation Objection',
  subtitle = 'Submit objection against compensation award for officer review and assessment',
}) => {
  const { notify } = useNotification();
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('');
  const [files, setFiles] = useState<CreateObjectionFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setReason('');
      setFiles([]);
    }
  }, [isOpen]);

  const handleFileUpload = (file: File | null, e?: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e?.target.files;
    if (fileList && fileList.length > 0) {
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        if (f.size > 10 * 1024 * 1024) {
          notify({
            type: 'general',
            title: 'File Too Large',
            message: `${f.name} exceeds 10MB limit.`,
          });
          continue;
        }
        const sizeInMB = (f.size / (1024 * 1024)).toFixed(1);
        setFiles((prev) => [
          ...prev,
          {
            id: `new-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
            name: f.name,
            fileName: f.name,
            fileSize: `${sizeInMB} MB`,
            file: f,
          },
        ]);
      }
    } else if (file) {
      if (file.size > 10 * 1024 * 1024) {
        notify({
          type: 'general',
          title: 'File Too Large',
          message: `${file.name} exceeds 10MB limit.`,
        });
        return;
      }
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
      setFiles((prev) => [
        ...prev,
        {
          id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: file.name,
          fileName: file.name,
          fileSize: `${sizeInMB} MB`,
          file: file,
        },
      ]);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmit = async () => {
    if (!caseId && !offerId) {
      notify({
        type: 'general',
        title: 'Case Required',
        message: 'Please select a valid acquisition case.',
      });
      return;
    }

    let finalOfferId = offerId;
    if (!finalOfferId && caseId) {
      try {
        const res = await compensationApi.getAllOfferLetters({ limit: 100 });
        const match = (res.offerLetters || []).find((o: any) => o.caseId === caseId);
        if (match) {
          finalOfferId = match.offerId;
        }
      } catch (e) {
        console.warn('Failed to resolve offer letter:', e);
      }
    }

    if (!finalOfferId) {
      notify({
        type: 'error',
        title: 'Offer Letter Not Found',
        message: 'A formal compensation offer letter (Form H) is required before filing an objection for this case.',
      });
      return;
    }

    if (typeof amount !== 'number' || amount <= 0) {
      notify({
        type: 'general',
        title: 'Invalid Amount',
        message: 'Requested compensation amount must be greater than RM 0.',
      });
      return;
    }

    if (!reason.trim()) {
      notify({
        type: 'general',
        title: 'Reason Required',
        message: 'Please provide statutory grounds / reasons for your objection.',
      });
      return;
    }

    // FR-017: second explicit confirmation before the official submission.
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    try {
      let finalOfferId = offerId;
      if (!finalOfferId && caseId) {
        try {
          const res = await compensationApi.getAllOfferLetters({ limit: 100 });
          const match = (res.offerLetters || []).find((o: any) => o.caseId === caseId);
          if (match) {
            finalOfferId = match.offerId;
          }
        } catch (e) {
          console.warn('Failed to resolve offer letter:', e);
        }
      }
      if (!finalOfferId) {
        setShowConfirm(false);
        notify({
          type: 'error',
          title: 'Offer Letter Not Found',
          message: 'A formal compensation offer letter (Form H) is required before filing an objection for this case.',
        });
        return;
      }
      await compensationApi.createObjection({
        offerId: finalOfferId,
        caseId: caseId || '',
        objectionReason: reason.trim(),
        requestedAmount: Number(amount),
        createdById: userId,
      });

      notify({
        type: 'success',
        title: 'Objection Filed',
        message: 'Your compensation objection has been successfully submitted for officer review.',
      });

      onClose();
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err: any) {
      console.error('Failed to submit objection:', err);
      notify({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Failed to submit objection.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="!max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="text" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="filled"
            size="md"
            onClick={handleSubmit}
            className="!rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-bold text-xs"
          >
            Review & Submit Objection
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <CurrencyInput
          label="Requested Compensation Amount (RM) *"
          id="createObjectionAmount"
          placeholder="0.00"
          value={amount}
          onValueChange={(_formatted, num) => setAmount(num > 0 ? num : '')}
        />

        <Textarea
          label="Grounds & Details of Objection (Reason) *"
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain the grounds and details for your compensation objection..."
        />

        {/* Attached Documents Upload & List */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Attached Supporting Document(s)
          </label>
          <FileUpload
            id="createObjectionUpload"
            label="Attach Supporting Documents"
            placeholder="Choose file to attach (PDF, JPG, PNG, DOC, DOCX)"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            multiple
            onChange={handleFileUpload}
          />

          {files.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Attached Files ({files.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700"
                  >
                    <FileText className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span className="font-medium truncate max-w-[180px]">{f.name || f.fileName}</span>
                    {f.fileSize && <span className="text-[10px] text-slate-400">({f.fileSize})</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(f.id)}
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No supporting documents currently attached.
            </p>
          )}
        </div>
      </div>

      {/* FR-017 second confirmation */}
      <ConfirmSubmitModal
        isOpen={showConfirm}
        title="Confirm Objection Submission"
        loading={isSubmitting}
        confirmLabel="Submit Official Objection"
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setShowConfirm(false)}
        summary={
          <>
            {caseId && <ConfirmRow label="Case" value={caseId} mono />}
            <ConfirmRow
              label="Requested Amount"
              value={`RM ${Number(amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
            />
            <ConfirmRow label="Grounds" value={reason.trim()} />
            {files.length > 0 && <ConfirmRow label="Attachments" value={files.map((f) => f.name).join(', ')} />}
          </>
        }
      />
    </Modal>
  );
};
