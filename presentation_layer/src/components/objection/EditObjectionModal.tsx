import React, { useState, useEffect } from 'react';
import { FileText, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Textarea } from '../ui/Textarea';
import { FileUpload } from '../ui/FileUpload';
import { useNotification } from '../ui/NotificationSystem';
import { compensationApi } from '../../services/compensationApi';

export interface ObjectionEditableItem {
  id: string;
  caseTitle?: string;
  reason?: string;
  requestedAmount?: number;
  documents?: any[];
}

export interface EditObjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  objection: ObjectionEditableItem | null;
  onSuccess?: (updated: { id: string; reason: string; requestedAmount: number; documents: any[] }) => void | Promise<void>;
  showFileUpload?: boolean;
}

export const EditObjectionModal: React.FC<EditObjectionModalProps> = ({
  isOpen,
  onClose,
  objection,
  onSuccess,
  showFileUpload = true,
}) => {
  const { notify } = useNotification();
  const [reason, setReason] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [files, setFiles] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (objection) {
      setReason(objection.reason || '');
      setAmount(objection.requestedAmount || '');
      setFiles(objection.documents ? [...objection.documents] : []);
    }
  }, [objection]);

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

  const handleSave = async () => {
    if (!objection) return;

    if (typeof amount === 'number' && amount <= 0) {
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

    setIsUpdating(true);
    try {
      await compensationApi.updateObjection(objection.id, {
        objectionReason: reason.trim(),
        requestedAmount: Number(amount),
      });

      notify({
        type: 'success',
        title: 'Objection Updated',
        message: 'Your objection details have been saved successfully.',
      });

      onClose();
      if (onSuccess) {
        await onSuccess({
          id: objection.id,
          reason: reason.trim(),
          requestedAmount: Number(amount),
          documents: files,
        });
      }
    } catch (err: any) {
      console.error('Failed to update objection:', err);
      notify({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update objection.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Objection"
      subtitle={objection?.caseTitle ? `Update objection details for ${objection.caseTitle}` : 'Update objection details'}
      maxWidth="!max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="text" size="md" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            variant="filled"
            size="md"
            onClick={handleSave}
            isLoading={isUpdating}
            className="!rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-bold text-xs"
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <CurrencyInput
          label="Requested Compensation Amount (RM) *"
          id="editObjectionAmount"
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

        {showFileUpload && (
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Attached Supporting Document(s)
            </label>
            <FileUpload
              id="editObjectionUpload"
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
                      key={f.id || f.fileName || f.name}
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
        )}
      </div>
    </Modal>
  );
};
