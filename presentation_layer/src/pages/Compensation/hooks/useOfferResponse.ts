import { useState, useCallback } from 'react';
import { compensationApi } from '../../../services/compensationApi';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { computeFileSha256 } from '../../../utils/crypto';

export interface UseOfferResponseParams {
  offer: { id: string; caseId?: string; totalCompensation?: number } | null;
  canRespondToOffer: boolean;
  user?: { userId?: string; identificationNumber?: string } | null;
  onRefresh: () => void | Promise<void>;
}

export const useOfferResponse = ({
  offer,
  canRespondToOffer,
  user,
  onRefresh,
}: UseOfferResponseParams) => {
  const { notify } = useNotification();

  // Dialog visibility states
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [showAcceptConfirmModal, setShowAcceptConfirmModal] = useState<boolean>(false);
  const [showCancelApprovalModal, setShowCancelApprovalModal] = useState<boolean>(false);
  const [cancellingApproval, setCancellingApproval] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states
  const [reason, setReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string>('');
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [signedFileError, setSignedFileError] = useState<string>('');

  // Active Objection Intercept State
  const [activeObjection, setActiveObjection] = useState<any | null>(null);
  const [showObjectionPrompt, setShowObjectionPrompt] = useState<boolean>(false);
  const [withdrawingObjection, setWithdrawingObjection] = useState<boolean>(false);

  // Signed PDF helper
  const handleOpenSignedPdf = useCallback(() => {
    if (!signedFile) return;
    const blobUrl = URL.createObjectURL(signedFile);
    const win = window.open(blobUrl, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 300);
    }
  }, [signedFile]);

  // Execute Accept API Call
  const handleAccept = useCallback(
    async (force?: boolean) => {
      if (!offer) return;
      if (!canRespondToOffer) {
        notify({
          type: 'error',
          title: 'Access Denied',
          message: 'Only land owners (Displaced Community Members) can accept this offer.',
        });
        return;
      }

      if (!force) {
        try {
          const objRes = await compensationApi.getAllObjections({ search: offer.id });
          const list = objRes.objections || [];
          const pending = list.find(
            (o: any) => o.status === 'PENDING' || o.status === 'Pending Review' || o.rawStatus === 'PENDING'
          );

          if (pending) {
            setActiveObjection(pending);
            setShowObjectionPrompt(true);
            return;
          }
        } catch (e) {
          console.warn('Could not pre-check objections:', e);
        }
      }

      setSubmitting(true);
      try {
        // FR-019: fingerprint the signed Form H on-device before it leaves the
        // browser; the backend verifies its own hash against this value.
        const clientHash = signedFile ? await computeFileSha256(signedFile) : undefined;
        await compensationApi.acceptOffer(offer.id, signedFile, force, {
          ownerNric: user?.identificationNumber,
          userId: user?.userId,
          clientHash,
        });

        setShowObjectionPrompt(false);
        setShowAcceptConfirmModal(false);
        await onRefresh();

        notify({
          type: 'success',
          title: 'Offer Accepted',
          message: 'Your formal acceptance has been recorded successfully. 24-hour grace period active.',
        });
      } catch (err: any) {
        console.error('Accept failed:', err);
        if (err.code === 'ACTIVE_OBJECTION_EXISTS' || err.activeObjection) {
          setActiveObjection(
            err.activeObjection || {
              objectionId: 'OBJ-PENDING',
              objectionReason: 'Active objection exists',
            }
          );
          setShowObjectionPrompt(true);
        } else {
          notify({
            type: 'error',
            title: 'Accept Failed',
            message: err.message || err,
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [offer, canRespondToOffer, signedFile, user, onRefresh, notify]
  );

  // Validate upload & show accept modal
  const handleAcceptClick = useCallback(() => {
    if (!offer) return;
    if (!canRespondToOffer) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only land owners (Displaced Community Members) can accept this offer.',
      });
      return;
    }
    if (!signedFile) {
      setSignedFileError('Please upload the signed Form H PDF before accepting the offer.');
      notify({
        type: 'error',
        title: 'Signed Document Required',
        message: 'Please upload the signed Form H PDF before submitting your acceptance.',
      });
      return;
    }
    const isPdf = signedFile.name.toLowerCase().endsWith('.pdf') || signedFile.type === 'application/pdf';
    if (!isPdf) {
      setSignedFileError('Only PDF files (.pdf) are allowed.');
      notify({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Only PDF documents (.pdf) can be uploaded.',
      });
      return;
    }
    setSignedFileError('');
    setShowAcceptConfirmModal(true);
  }, [offer, canRespondToOffer, signedFile, notify]);

  const handleConfirmAccept = useCallback(
    async (force?: boolean) => {
      setShowAcceptConfirmModal(false);
      await handleAccept(force);
    },
    [handleAccept]
  );

  // Execute Reject API Call
  const handleReject = useCallback(async () => {
    if (!offer) return;
    if (!canRespondToOffer) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only land owners (Displaced Community Members) can reject this offer.',
      });
      return;
    }

    if (!reason.trim()) {
      setReasonError('Please provide a statutory reason or grounds for rejecting this offer.');
      return;
    }
    if (reason.trim().length < 5) {
      setReasonError('Please provide a more detailed explanation (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    try {
      await compensationApi.rejectOffer(offer.id, reason.trim(), {
        ownerNric: user?.identificationNumber,
        userId: user?.userId,
      });

      setShowRejectModal(false);
      setReason('');
      setReasonError('');
      await onRefresh();

      notify({
        type: 'success',
        title: 'Offer Rejected',
        message: 'Your rejection and statement of grounds have been submitted for Land Administrator review.',
      });
    } catch (err: any) {
      console.error('Reject failed:', err);
      notify({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || err,
      });
    } finally {
      setSubmitting(false);
    }
  }, [offer, canRespondToOffer, reason, user, onRefresh, notify]);

  // Cancel Approval API Call (within grace period)
  const handleCancelApproval = useCallback(async () => {
    if (!offer) return;
    if (!canRespondToOffer) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only land owners (Displaced Community Members) can cancel offer approvals.',
      });
      return;
    }

    setCancellingApproval(true);
    try {
      await compensationApi.cancelOfferAcceptance(offer.id, {
        ownerNric: user?.identificationNumber,
        userId: user?.userId,
      });

      setShowCancelApprovalModal(false);
      await onRefresh();

      notify({
        type: 'success',
        title: 'Approval Cancelled',
        message: 'Your approval has been cancelled. You can now re-evaluate or submit an objection if needed.',
      });
    } catch (err: any) {
      console.error('Cancel approval failed:', err);
      notify({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.message || err,
      });
    } finally {
      setCancellingApproval(false);
    }
  }, [offer, canRespondToOffer, user, onRefresh, notify]);

  // Withdraw active objection and proceed with acceptance
  const handleWithdrawObjectionAndAccept = useCallback(async () => {
    if (!activeObjection || !offer) return;
    if (!canRespondToOffer) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only land owners can withdraw objections and accept this offer.',
      });
      return;
    }

    setWithdrawingObjection(true);
    try {
      const objId = activeObjection.objectionId || activeObjection.id;
      if (objId && objId !== 'OBJ-PENDING') {
        await compensationApi.deleteObjection(objId);
      }

      setShowObjectionPrompt(false);
      setActiveObjection(null);

      // Immediately proceed to force-accept
      await handleAccept(true);
    } catch (err: any) {
      console.error('Failed to withdraw objection:', err);
      notify({
        type: 'error',
        title: 'Withdrawal Failed',
        message: err.message || 'Could not withdraw active objection. Please try again.',
      });
    } finally {
      setWithdrawingObjection(false);
    }
  }, [activeObjection, offer, canRespondToOffer, handleAccept, notify]);

  return {
    // Modal states
    showRejectModal,
    setShowRejectModal,
    showAcceptConfirmModal,
    setShowAcceptConfirmModal,
    showCancelApprovalModal,
    setShowCancelApprovalModal,
    cancellingApproval,
    submitting,

    // Form inputs & errors
    reason,
    setReason,
    reasonError,
    setReasonError,
    signedFile,
    setSignedFile,
    signedFileError,
    setSignedFileError,

    // Objection conflict prompt states
    activeObjection,
    setActiveObjection,
    showObjectionPrompt,
    setShowObjectionPrompt,
    withdrawingObjection,

    // Action handlers
    handleOpenSignedPdf,
    handleAcceptClick,
    handleAccept,
    handleConfirmAccept,
    handleReject,
    handleCancelApproval,
    handleWithdrawObjectionAndAccept,
  };
};
