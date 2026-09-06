import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useNotification } from '../ui/NotificationSystem';
import { compensationApi } from '../../services/compensationApi';

export interface DeleteObjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  objectionId: string | null;
  onSuccess?: (deletedId: string) => void | Promise<void>;
  title?: string;
  subtitle?: string;
}

export const DeleteObjectionModal: React.FC<DeleteObjectionModalProps> = ({
  isOpen,
  onClose,
  objectionId,
  onSuccess,
  title = 'Withdraw Objection',
  subtitle = 'Are you sure you want to withdraw this compensation objection? This action cannot be undone.',
}) => {
  const { notify } = useNotification();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDelete = async () => {
    if (!objectionId) return;

    setIsDeleting(true);
    try {
      await compensationApi.deleteObjection(objectionId);
      notify({
        type: 'success',
        title: 'Objection Withdrawn',
        message: 'The compensation objection has been successfully withdrawn.',
      });
      onClose();
      if (onSuccess) {
        await onSuccess(objectionId);
      }
    } catch (err: any) {
      console.error('Failed to withdraw objection:', err);
      notify({
        type: 'error',
        title: 'Withdrawal Failed',
        message: err.message || 'Failed to withdraw objection.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="!max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="text" size="md" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="filled"
            size="md"
            onClick={handleDelete}
            isLoading={isDeleting}
            className="!rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
          >
            Confirm Withdrawal
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 my-2">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <p>
          Withdrawing this objection will remove your statutory claim from officer review. You will be able to submit a new objection if your offer letter is still active and within statutory deadlines.
        </p>
      </div>
    </Modal>
  );
};
