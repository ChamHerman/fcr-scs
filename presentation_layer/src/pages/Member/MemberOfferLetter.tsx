import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download, 
  UploadCloud, 
  Landmark, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  ChevronRight, 
  FileCheck2, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronUp,
  X, 
  UserCheck, 
  AlertCircle, 
  ExternalLink,
  Layers,
  Phone,
  Mail
} from 'lucide-react';
import { useRole } from '../../hooks/useRole';
import { compensationApi } from '../../services/compensationApi';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import { BASE_URL } from '../../services/api';
import { formatCurrencyRM } from '../../utils/currency';
import { useNotification } from '../../components/ui/NotificationSystem';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { FileUpload } from '../../components/ui/FileUpload';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { CopyButton } from '../../components/ui/CopyButton';
import { OfferResponseModals } from '../../components/OfferResponseModals';
import { 
  OfferLetterPreview, 
  type OfferDetail, 
  type OwnerApprovalStatus,
  type OfferLetterPreviewHandle,
} from '../Compensation/OfferLetterPreview';
import { 
  OFFER_STATUS_CLASS_MAP as statusClassMap, 
  OFFER_STATUS_LABEL_MAP as statusLabelMap 
} from '../../constants';

export const MemberOfferLetter: React.FC = () => {
  const { offerId: routeOfferId } = useParams<{ offerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryOfferId = searchParams.get('offerId') || '';
  const queryCaseId = searchParams.get('caseId') || '';

  const navigate = useNavigate();
  const { user, userName, identificationNumber, isMember, canRespondToOffer } = useRole();
  const { notify } = useNotification();

  // State
  const [loading, setLoading] = useState(true);
  const [casesList, setCasesList] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(queryCaseId);
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const previewRef = useRef<OfferLetterPreviewHandle>(null);

  // Landowner Response Actions State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAcceptConfirmModal, setShowAcceptConfirmModal] = useState(false);
  const [showCancelApprovalModal, setShowCancelApprovalModal] = useState(false);
  const [cancellingApproval, setCancellingApproval] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [signedFileError, setSignedFileError] = useState('');

  // Active Objection State
  const [activeObjection, setActiveObjection] = useState<any | null>(null);
  const [showObjectionPrompt, setShowObjectionPrompt] = useState(false);
  const [withdrawingObjection, setWithdrawingObjection] = useState(false);

  // Create Objection Modal State
  const [showCreateObjectionModal, setShowCreateObjectionModal] = useState(false);
  const [createObjectionAmount, setCreateObjectionAmount] = useState<number | ''>('');
  const [createObjectionReason, setCreateObjectionReason] = useState('');
  const [createObjectionFiles, setCreateObjectionFiles] = useState<any[]>([]);
  const [isCreatingObjection, setIsCreatingObjection] = useState(false);

  // File preview helper
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

  // 1. Fetch Cases for Member (to enable case switching if member has multiple cases)
  useEffect(() => {
    let isMounted = true;
    async function loadCases() {
      try {
        const res = await landAcquisitionApi.getAllCases({ limit: 50 });
        const list = res.cases || res || [];
        if (!isMounted) return;
        setCasesList(list);

        if (!selectedCaseId && list.length > 0) {
          // Default to first case that has an offer letter, or first case
          const caseWithOffer = list.find((c: any) => c.offerLetters && c.offerLetters.length > 0);
          const defaultCase = caseWithOffer || list[0];
          setSelectedCaseId(defaultCase.caseId);
        }
      } catch (err) {
        console.error('Failed to load member cases:', err);
      }
    }
    loadCases();
    return () => { isMounted = false; };
  }, []);

  // 2. Fetch Offer Letter Data
  const loadOfferData = useCallback(async () => {
    setLoading(true);
    try {
      let resolvedOfferId = routeOfferId || queryOfferId;

      // If no offerId specified directly, search via selectedCaseId
      if (!resolvedOfferId && selectedCaseId) {
        const caseData = await landAcquisitionApi.getCaseById(selectedCaseId);
        const c = caseData.acquisitionCase || caseData;
        if (c?.offerLetters && c.offerLetters.length > 0) {
          resolvedOfferId = c.offerLetters[0].offerId;
        }
      }

      if (!resolvedOfferId) {
        // Try to query all offer letters for the current user/landowner
        const allOffersRes = await compensationApi.getAllOfferLetters({
          ownerNric: identificationNumber || user?.identificationNumber,
          limit: 10
        });
        const list = allOffersRes.offerLetters || allOffersRes || [];
        if (list.length > 0) {
          resolvedOfferId = list[0].offerId;
        }
      }

      if (!resolvedOfferId) {
        setOffer(null);
        setLoading(false);
        return;
      }

      // Fetch Full Offer Letter Details from API
      const res = await compensationApi.getOfferLetterById(resolvedOfferId);
      const o = res.offerLetter || res;
      const c = o.acquisitionCase;
      const lp = c?.landParcel || o.landOwnership?.landParcel;
      const cr = o.compensationReport;
      const vr = cr?.valuationReport || c?.valuationReports?.[0];

      // Extract owners
      const parcelOwnerships = lp?.ownerships || [];
      const parcelOwners = parcelOwnerships
        .map((ow: any) => {
          if (!ow?.landOwner) return null;
          const rawShare = ow.share != null ? String(ow.share) : ow.sharePercentage != null ? String(ow.sharePercentage) : '';
          const formattedShare = rawShare
            ? (rawShare.endsWith('%') ? rawShare : `${rawShare}%`)
            : '100%';
          return {
            ...ow.landOwner,
            sharePercentage: formattedShare,
          };
        })
        .filter(Boolean);

      const allOwners = parcelOwners.length > 0
        ? parcelOwners
        : o.landOwnership?.landOwner
        ? [
            {
              ...o.landOwnership.landOwner,
              sharePercentage: o.landOwnership.share != null
                ? (String(o.landOwnership.share).endsWith('%') ? String(o.landOwnership.share) : `${o.landOwnership.share}%`)
                : '100%',
            },
          ]
        : [];

      const userIcClean = (identificationNumber || user?.identificationNumber || '').replace(/[^a-zA-Z0-9]/g, '');
      const memberResponses: any[] = o.memberResponses || [];

      // Map each owner to their individual response
      const ownersList: OwnerApprovalStatus[] = allOwners.map((owner: any) => {
        const oIcClean = (owner.nric || '').replace(/[^a-zA-Z0-9]/g, '');
        const isCurrent =
          Boolean(userIcClean) && (oIcClean === userIcClean || owner.ownerId === user?.userId);

        const resp = memberResponses.find((r) => r.ownerId === owner.ownerId);

        let status: 'ACCEPTED' | 'REJECTED' | 'PENDING' = 'PENDING';
        if (resp) {
          status = resp.status === 'ACCEPTED' ? 'ACCEPTED' : resp.status === 'REJECTED' ? 'REJECTED' : 'PENDING';
        } else if (o.status === 'ACCEPTED' && allOwners.length === 1) {
          status = 'ACCEPTED';
        } else if (o.status === 'REJECTED' && allOwners.length === 1) {
          status = 'REJECTED';
        }

        return {
          ownerId: owner.ownerId,
          name: owner.name,
          nric: owner.nric,
          contact: owner.contact || '—',
          address: owner.address || '—',
          sharePercentage: owner.sharePercentage || '100%',
          status,
          remarks: resp?.remarks,
          respondedAt: resp?.respondedAt
            ? new Date(resp.respondedAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined,
          respondedAtDate: resp?.respondedAt ? new Date(resp.respondedAt) : null,
          isCurrentUser: isCurrent,
        };
      });

      if (ownersList.length === 0) {
        ownersList.push({
          ownerId: user?.userId || 'owner-1',
          name: userName || user?.name || 'Land Owner',
          nric: identificationNumber || user?.identificationNumber || '—',
          contact: user?.contactNumber || '—',
          address: 'Registered Address on File',
          sharePercentage: '100%',
          status: (o.status === 'ACCEPTED' ? 'ACCEPTED' : o.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as 'ACCEPTED' | 'REJECTED' | 'PENDING',
          isCurrentUser: true,
        });
      }

      const isMultiOwner = ownersList.length > 1;
      const acceptedCount = ownersList.filter((ow) => ow.status === 'ACCEPTED').length;
      const rejectedOwner = ownersList.find((ow) => ow.status === 'REJECTED');
      const hasRejectedOwner = Boolean(rejectedOwner || o.status === 'REJECTED');

      const currentUserOwner = ownersList.find((ow) => ow.isCurrentUser) || ownersList[0];
      const currentUserStatus = currentUserOwner ? currentUserOwner.status : null;

      // 1-day grace period computation:
      const acceptedDate = isMultiOwner && currentUserOwner?.respondedAtDate
        ? currentUserOwner.respondedAtDate
        : o.acceptedAt
        ? new Date(o.acceptedAt)
        : null;

      const isWithinOneDay = acceptedDate
        ? (new Date().getTime() - acceptedDate.getTime()) <= (24 * 60 * 60 * 1000)
        : false;

      const ownerName =
        parcelOwners.length > 0
          ? parcelOwners.map((ow: any) => ow.name).join(', ')
          : o.landOwnership?.landOwner?.name || userName || 'Land Owner';
      const ownerIc =
        parcelOwners.length > 0
          ? parcelOwners.map((ow: any) => ow.nric).join(', ')
          : o.landOwnership?.landOwner?.nric || identificationNumber || '—';
      const ownerAddress = o.landOwnership?.landOwner?.address || parcelOwners[0]?.address || 'Registered Address on File';
      const ownerPhone =
        parcelOwners.length > 0
          ? parcelOwners.map((ow: any) => ow.contact).filter(Boolean).join(', ')
          : o.landOwnership?.landOwner?.contact || user?.contactNumber || '—';

      const rawStatus = o.status || 'PENDING';

      const formatted: OfferDetail = {
        id: o.offerId,
        offerReferenceNo: o.offerReferenceNo,
        caseId: o.caseId || c?.caseId,
        caseTitle: c?.caseTitle || 'Land Acquisition Project',
        projectName: c?.project?.projectName || 'Infrastructure Development Project',
        acquiringAuthority:
          c?.project?.acquiringAgency || 'Department of Lands and Mines (JKPTG)',
        ownerName,
        ownerIc,
        ownerAddress,
        ownerPhone,
        landTitle: lp?.landTitleNo || '—',
        lotNo: lp?.lotNo || '—',
        tempat: lp?.tempat || '—',
        mukim: lp?.mukim || '—',
        district: lp?.district || '—',
        state: lp?.state || '—',
        landArea:
          lp?.area != null
            ? `${Number(lp.area).toLocaleString('en-US', { maximumFractionDigits: 0 })} m²`
            : lp?.landArea != null
            ? `${Number(lp.landArea).toLocaleString('en-US', { maximumFractionDigits: 0 })} m²`
            : vr?.landArea != null
            ? `${Number(vr.landArea).toLocaleString('en-US', { maximumFractionDigits: 0 })} m²`
            : '—',
        acquisitionArea:
          vr?.acquisitionArea != null
            ? `${Number(vr.acquisitionArea).toLocaleString('en-US', { maximumFractionDigits: 0 })} m²`
            : lp?.acquisitionArea != null
            ? `${Number(lp.acquisitionArea).toLocaleString('en-US', { maximumFractionDigits: 0 })} m²`
            : lp?.area != null
            ? `${Number(lp.area).toLocaleString('en-US', { maximumFractionDigits: 0 })} m²`
            : '—',
        issueDate: o.offerDate
          ? new Date(o.offerDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—',
        expiryDate: o.expiryDate
          ? new Date(o.expiryDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—',
        enquiryDate: c?.registrationDate
          ? new Date(c.registrationDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—',
        awardDate: o.offerDate
          ? new Date(o.offerDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—',
        awardReference: '',
        status: statusLabelMap[rawStatus] || rawStatus,
        statusClass: statusClassMap[rawStatus] || 'status-offer-pending',
        totalCompensation: Number(o.offerAmount || cr?.totalCompensation || 0),
        components: {
          landValue: Number(cr?.landValue || o.offerAmount || 0),
          buildingValue: Number(cr?.buildingValue || 0),
          cropValue: Number(cr?.cropValue || 0),
          businessDisruption: Number(cr?.businessDisruption || 0),
          disturbanceCompensation: Number(cr?.disturbanceCompensation || 0),
          relocationAllowance: Number(cr?.relocationAllowance || 0),
          otherEligible: Number(cr?.otherEligible || 0),
        },
        valuationReferences: {
          marketValue: Number(vr?.marketValue || cr?.landValue || 0),
          aiValuationPrice: vr?.aiValuationPrice ? Number(vr.aiValuationPrice) : undefined,
          recommendedCompensation: Number(vr?.recommendedCompensation || cr?.totalCompensation || 0),
          approvedCompensation: Number(cr?.totalCompensation || o.offerAmount || 0),
          valuationMethod: vr?.valuationMethod || 'Sales Comparison Method',
        },
        paymentConditions:
          'Payment will be processed directly to your registered bank account upon formal statutory acceptance.',
        remarks: o.remarks || cr?.remarks,
        rawOffer: o,
        owners: ownersList,
        isMultiOwner,
        acceptedCount,
        totalOwners: ownersList.length,
        hasRejectedOwner,
        acceptedAtDate: o.acceptedAt ? new Date(o.acceptedAt) : null,
        currentUserAcceptedAtDate: acceptedDate,
        isWithinOneDay,
        rejectedOwnerInfo: rejectedOwner
          ? {
              name: rejectedOwner.name,
              nric: rejectedOwner.nric,
              remarks: rejectedOwner.remarks || o.remarks,
              respondedAt: rejectedOwner.respondedAt,
            }
          : o.status === 'REJECTED'
          ? {
              name: ownerName,
              nric: ownerIc,
              remarks: o.remarks,
              respondedAt: o.rejectedAt
                ? new Date(o.rejectedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : undefined,
            }
          : null,
        currentUserStatus,
        rawStatus,
      };

      setOffer(formatted);
      if (c?.caseId && c.caseId !== selectedCaseId) {
        setSelectedCaseId(c.caseId);
      }
    } catch (err: any) {
      console.error('Failed to load offer letter:', err);
      notify({
        type: 'error',
        title: 'Loading Failed',
        message: err.message || 'Failed to retrieve offer letter details.'
      });
    } finally {
      setLoading(false);
    }
  }, [routeOfferId, queryOfferId, selectedCaseId, identificationNumber, user, userName, notify]);

  useEffect(() => {
    loadOfferData();
  }, [loadOfferData]);

  // Handle Case Switching
  const handleCaseChange = (newCaseId: string) => {
    setSelectedCaseId(newCaseId);
    setSearchParams({ caseId: newCaseId }, { replace: true });
  };

  // ---------------------------------------------------------------------------
  // Action Handlers (aligned with admin OfferLetterReview business logic)
  // ---------------------------------------------------------------------------
  const handleAcceptClick = () => {
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
  };

  const handleConfirmAccept = async (force?: boolean) => {
    setShowAcceptConfirmModal(false);
    await handleAccept(force);
  };

  const handleAccept = async (force?: boolean) => {
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
        const pending = list.find((o: any) => o.status === 'PENDING' || o.status === 'Pending Review' || o.rawStatus === 'PENDING');
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
      await compensationApi.acceptOffer(offer.id, signedFile, force, {
        ownerNric: identificationNumber || user?.identificationNumber,
        userId: user?.userId,
      });
      setShowObjectionPrompt(false);
      await loadOfferData();
      notify({
        type: 'success',
        title: 'Offer Accepted',
        message: 'Your formal acceptance has been recorded successfully.',
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
  };

  const handleWithdrawObjectionAndAccept = async () => {
    if (!activeObjection || !offer) return;
    if (!canRespondToOffer) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only land owners (Displaced Community Members) can perform this action.',
      });
      return;
    }
    setWithdrawingObjection(true);
    try {
      if (activeObjection.objectionId) {
        await compensationApi.deleteObjection(activeObjection.objectionId);
      }
      setShowObjectionPrompt(false);
      await handleAccept(true);
    } catch (err: any) {
      console.error('Failed to withdraw objection:', err);
      notify({
        type: 'error',
        title: 'Withdrawal Failed',
        message: `Could not withdraw objection: ${err.message || err}`,
      });
    } finally {
      setWithdrawingObjection(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!reason.trim()) {
      setReasonError('Reason is required.');
      return;
    }
    if (!offer) return;
    if (!canRespondToOffer) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only land owners (Displaced Community Members) can reject this offer.',
      });
      return;
    }
    setSubmitting(true);
    try {
      await compensationApi.rejectOffer(offer.id, reason.trim(), {
        ownerNric: identificationNumber || user?.identificationNumber,
        userId: user?.userId,
      });
      setShowRejectModal(false);
      await loadOfferData();
      notify({
        type: 'success',
        title: 'Offer Rejected',
        message: 'Offer rejection recorded. Case marked as OFFER_REJECTED.',
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
  };

  const handleCancelApproval = async () => {
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
        ownerNric: identificationNumber || user?.identificationNumber,
        userId: user?.userId,
      });
      setShowCancelApprovalModal(false);
      await loadOfferData();
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
  };

  const handleOpenCreateObjection = () => {
    if (!offer) return;
    if (!canRespondToOffer) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only land owners (Displaced Community Members) can file an objection to this offer.',
      });
      return;
    }
    const base = offer.totalCompensation;
    setCreateObjectionAmount(base ? Math.round(Number(base) * 1.15) : '');
    setCreateObjectionReason('');
    setCreateObjectionFiles([]);
    setShowCreateObjectionModal(true);
  };

  const handleCreateFileUpload = (file: File | null, e?: React.ChangeEvent<HTMLInputElement>) => {
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
        setCreateObjectionFiles((prev) => [
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
      setCreateObjectionFiles((prev) => [
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

  const handleRemoveCreateFile = (fileId: string) => {
    setCreateObjectionFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSaveCreateObjection = async () => {
    if (!offer) return;
    if (typeof createObjectionAmount !== 'number' || createObjectionAmount <= 0) {
      notify({
        type: 'general',
        title: 'Invalid Amount',
        message: 'Requested compensation amount must be greater than RM 0.',
      });
      return;
    }

    if (!createObjectionReason.trim()) {
      notify({
        type: 'general',
        title: 'Reason Required',
        message: 'Please provide statutory grounds / reasons for your objection.',
      });
      return;
    }

    setIsCreatingObjection(true);
    try {
      await compensationApi.createObjection({
        offerId: offer.id,
        caseId: offer.caseId,
        objectionReason: createObjectionReason.trim(),
        requestedAmount: Number(createObjectionAmount),
        createdById: user?.userId,
      });

      notify({
        type: 'success',
        title: 'Objection Filed',
        message: 'Your compensation objection has been successfully submitted for officer review.',
      });

      setShowCreateObjectionModal(false);
      await loadOfferData();
    } catch (err: any) {
      console.error('Failed to submit objection:', err);
      notify({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Failed to submit objection.',
      });
    } finally {
      setIsCreatingObjection(false);
    }
  };

  // Status flags
  const isOfferAccepted = useMemo(() => {
    if (!offer) return false;
    return (
      offer.rawStatus === 'ACCEPTED' ||
      offer.status === 'Accepted' ||
      offer.status === 'ACCEPTED' ||
      offer.currentUserStatus === 'ACCEPTED'
    );
  }, [offer]);

  const isOfferRejected = useMemo(() => {
    if (!offer) return false;
    return (
      offer.rawStatus === 'REJECTED' ||
      offer.status === 'Rejected' ||
      offer.status === 'REJECTED' ||
      offer.currentUserStatus === 'REJECTED'
    );
  }, [offer]);

  const isOfferPending = !isOfferAccepted && !isOfferRejected;

  // Days remaining calculation
  const daysRemaining = useMemo(() => {
    const rawExpiry = offer?.rawOffer?.expiryDate || offer?.expiryDate;
    if (!rawExpiry || rawExpiry === '—') return null;
    const expDate = new Date(rawExpiry).getTime();
    if (isNaN(expDate)) return null;
    const diff = Math.ceil((expDate - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [offer]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* ------------------------------------------------------------- */}
      {/* TOPBAR / BREADCRUMBS                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={selectedCaseId ? `/member?caseId=${selectedCaseId}` : '/member'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTAINER                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {loading ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Retrieving Official Form H Offer Letter...</h3>
            <p className="text-xs text-slate-500">Connecting to national land acquisition registry database</p>
          </div>
        ) : !offer ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <FileText size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Offer Letter Issued Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              An official compensation offer letter (Form H) has not been finalized for this case yet. Valuers and the Department of Lands and Mines (JKPTG) are currently conducting assessments.
            </p>
            <Link
              to="/member"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <ArrowLeft size={14} />
              <span>Return to Case Overview</span>
            </Link>
          </div>
        ) : (
          <>
            {/* ------------------------------------------------------------- */}
            {/* HERO SUMMARY BANNER                                           */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-gradient-to-br from-[#f8f5fc] via-[#f3edf7] to-[#e8def8] text-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-purple-200/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-violet-600/10 text-violet-800 font-mono text-xs font-semibold border border-violet-300/60">
                      Case: {offer.caseId}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/80 text-slate-700 font-mono text-xs font-semibold border border-slate-200">
                      Ref: {offer.offerReferenceNo}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isOfferAccepted 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/70' 
                        : isOfferRejected 
                        ? 'bg-rose-100 text-rose-800 border border-rose-300/70'
                        : 'bg-amber-100 text-amber-900 border border-amber-300/70'
                    }`}>
                      ● {offer.status}
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    {offer.caseTitle}
                  </h1>

                  <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-1 font-medium">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-violet-600" />
                      <span>Lot {offer.lotNo}, {offer.mukim}, {offer.state}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-indigo-600" />
                      <span>Title: {offer.landTitle}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Layers size={13} className="text-emerald-700" />
                      <span>Acquisition Area: {offer.acquisitionArea}</span>
                    </span>
                  </div>
                </div>

                {/* Total Compensation Award Card */}
                <div className="bg-white/85 backdrop-blur-md rounded-2xl p-5 border border-purple-200/70 shrink-0 min-w-[240px] text-left md:text-right shadow-sm">
                  <span className="text-[11px] font-bold text-violet-900/70 uppercase tracking-wider block">
                    Total Statutory Award (Form H)
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 font-mono">
                    {formatCurrencyRM(offer.totalCompensation)}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 flex items-center md:justify-end gap-1 font-medium">
                    <Clock size={12} className="text-amber-600" />
                    <span>
                      {daysRemaining !== null 
                        ? `${daysRemaining} days remaining to accept` 
                        : `Issued on ${offer.issueDate}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* OFFICIAL FORM H OFFER LETTER PREVIEW (IMAGE 2 DESIGN)         */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-gradient-to-br from-[#f8f5fc] via-[#f3edf7] to-[#e8def8] rounded-3xl p-5 sm:p-6 border border-purple-200/80 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Form H: Notice of Award and Offer of Compensation
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 font-medium">
                      Land Acquisition Act 1960 • Statutory Award Schedule
                    </p>
                  </div>
                </div>

                {/* Right side controls: Collapse button and Download button */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                    className="px-3 py-1.5 rounded-xl border border-purple-200 bg-white/80 hover:bg-white text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    {isPreviewCollapsed ? (
                      <>
                        <Eye size={14} className="text-slate-500" />
                        <span>Show Preview</span>
                        <ChevronDown size={14} className="text-slate-400" />
                      </>
                    ) : (
                      <>
                        <EyeOff size={14} className="text-slate-500" />
                        <span>Collapse Preview</span>
                        <ChevronUp size={14} className="text-slate-400" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => previewRef.current?.downloadPdf()}
                    disabled={downloadingPdf}
                    className="px-3.5 py-1.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Only the PDF Viewer Black Box (When not collapsed) */}
              <div className={`mt-4 ${isPreviewCollapsed ? "hidden" : "block"}`}>
                <OfferLetterPreview
                  ref={previewRef}
                  offer={offer}
                  viewMode="pdf"
                  onDownloadingChange={setDownloadingPdf}
                />
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* LANDOWNER INTERACTIVE RESPONSE ACTION BAR                     */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck size={18} className="text-violet-600" />
                    <span>Landowner Official Response</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isOfferAccepted
                      ? 'You have formally accepted this compensation award. You can proceed with setting up your electronic bank payout.'
                      : isOfferRejected
                      ? 'You have rejected this compensation award. You may file an objection for officer review and reassessment.'
                      : 'Please download the Form G offer document below, sign the declaration, and upload the signed PDF before accepting.'}
                  </p>
                </div>

                {/* Status Badges & Quick Shortcuts */}
                {isOfferAccepted ? (
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                      to={`/member/bank-details?caseId=${offer.caseId}`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                    >
                      <CheckCircle2 size={15} />
                      <span>Setup Bank Details</span>
                    </Link>

                    {offer.rawOffer?.signedDocument && (
                      <button
                        type="button"
                        onClick={() => {
                          const cleanPath = offer.rawOffer.signedDocument.replace(/^\/+/, '');
                          window.open(`${BASE_URL}/${cleanPath}`, '_blank', 'noopener,noreferrer');
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>View Uploaded Copy</span>
                      </button>
                    )}

                    {offer.isWithinOneDay && (
                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => setShowCancelApprovalModal(true)}
                        isLoading={cancellingApproval}
                      >
                        <XCircle size={15} /> Cancel Acceptance (Grace Period)
                      </Button>
                    )}
                  </div>
                ) : isOfferRejected ? (
                  <div className="flex items-center gap-2">
                    <div className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <XCircle size={15} /> Offer Formally Rejected
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Pending Acceptance: Upload & Action Buttons */}
              {isOfferPending && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <UploadCloud size={16} className="text-violet-600" />
                      <span>Upload Signed Form H Acceptance Document (PDF)</span>
                    </div>

                    <FileUpload
                      label="Signed Document Copy *"
                      fileName={signedFile?.name}
                      onView={handleOpenSignedPdf}
                      placeholder="Select signed Form H PDF document (.pdf only)"
                      accept=".pdf,application/pdf"
                      error={signedFileError}
                      onChange={(file) => {
                        if (file) {
                          const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
                          if (!isPdf) {
                            setSignedFile(null);
                            setSignedFileError('Only PDF files (.pdf) are allowed.');
                            notify({
                              type: 'error',
                              title: 'Invalid File Type',
                              message: 'Only PDF documents (.pdf) can be uploaded.',
                            });
                            return;
                          }
                        }
                        setSignedFile(file);
                        if (file) setSignedFileError('');
                      }}
                      onClear={() => {
                        setSignedFile(null);
                        setSignedFileError('');
                      }}
                    />
                    <p className="text-[11px] text-slate-500">
                      * Please ensure page 3 declaration signature and date are clearly visible before uploading.
                    </p>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-3 flex-wrap pt-2">
                    <Button
                      variant="danger"
                      size="md"
                      onClick={handleOpenCreateObjection}
                      className="w-full sm:w-auto"
                    >
                      <XCircle size={16} />
                      <span>Reject and Submit Objection</span>
                    </Button>

                    <Button
                      variant="filled"
                      size="md"
                      onClick={handleAcceptClick}
                      isLoading={submitting}
                      className="w-full sm:w-auto"
                    >
                      <CheckCircle2 size={16} />
                      <span>Accept Compensation Award</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* MULTI-OWNER APPROVAL STATUS LIST (IF MULTI-OWNER)             */}
            {/* ------------------------------------------------------------- */}
            {offer.isMultiOwner && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-violet-600" />
                    <span>Co-Owners Statutory Acceptance Status</span>
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {offer.acceptedCount} of {offer.totalOwners} Accepted
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {offer.owners.map((ow) => (
                    <div
                      key={ow.ownerId}
                      className={`p-4 rounded-2xl border transition ${
                        ow.isCurrentUser 
                          ? 'bg-violet-50/50 border-violet-200 ring-1 ring-violet-200' 
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{ow.name}</span>
                            {ow.isCurrentUser && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            MyKad: {ow.nric} • Share: {ow.sharePercentage}
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                          ow.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ow.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ow.status === 'ACCEPTED' ? '✓ Accepted' : ow.status === 'REJECTED' ? '✕ Rejected' : '⏳ Pending'}
                        </span>
                      </div>
                      {ow.respondedAt && (
                        <div className="text-[10px] text-slate-400 mt-2">
                          Responded on: {ow.respondedAt}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <OfferResponseModals
        // Accept
        showAcceptConfirmModal={showAcceptConfirmModal}
        onCloseAcceptModal={() => setShowAcceptConfirmModal(false)}
        onConfirmAccept={() => handleConfirmAccept()}
        submitting={submitting}
        totalCompensation={offer?.totalCompensation || 0}
        signedFile={signedFile}
        // Cancel Approval
        showCancelApprovalModal={showCancelApprovalModal}
        onCloseCancelModal={() => setShowCancelApprovalModal(false)}
        onCancelApproval={handleCancelApproval}
        cancellingApproval={cancellingApproval}
        // Active Objection
        showObjectionPrompt={showObjectionPrompt}
        activeObjection={activeObjection}
        onCloseObjectionModal={() => setShowObjectionPrompt(false)}
        onWithdrawObjectionAndAccept={handleWithdrawObjectionAndAccept}
        withdrawingObjection={withdrawingObjection}
        // Reject
        showRejectModal={showRejectModal}
        onCloseRejectModal={() => setShowRejectModal(false)}
        onConfirmReject={handleRejectSubmit}
        reason={reason}
        onReasonChange={(val) => { setReason(val); if (reasonError) setReasonError(''); }}
        reasonError={reasonError}
      />

      {/* ------------------------------------------------------------- */}
      {/* CREATE OBJECTION MODAL                                         */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={showCreateObjectionModal}
        onClose={() => setShowCreateObjectionModal(false)}
        title="Submit Compensation Objection"
        subtitle="Submit objection against compensation award for officer review and assessment"
        maxWidth="!max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="text" size="md" onClick={() => setShowCreateObjectionModal(false)}>
              Cancel
            </Button>
            <Button
              variant="filled"
              size="md"
              onClick={handleSaveCreateObjection}
              isLoading={isCreatingObjection}
              className="!rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-bold text-xs"
            >
              Submit Objection
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <CurrencyInput
            label="Requested Compensation Amount (RM) *"
            id="createObjectionAmount"
            placeholder="0.00"
            value={createObjectionAmount}
            onValueChange={(_formatted, num) => setCreateObjectionAmount(num > 0 ? num : '')}
          />

          <Textarea
            label="Grounds & Details of Objection (Reason) *"
            rows={5}
            value={createObjectionReason}
            onChange={(e) => setCreateObjectionReason(e.target.value)}
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
              onChange={handleCreateFileUpload}
            />

            {createObjectionFiles.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Attached Files ({createObjectionFiles.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {createObjectionFiles.map((f) => (
                    <div
                      key={f.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700"
                    >
                      <FileText className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      <span className="font-medium truncate max-w-[180px]">{f.name || f.fileName}</span>
                      {f.fileSize && <span className="text-[10px] text-slate-400">({f.fileSize})</span>}
                      <button
                        type="button"
                        onClick={() => handleRemoveCreateFile(f.id)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default MemberOfferLetter;
