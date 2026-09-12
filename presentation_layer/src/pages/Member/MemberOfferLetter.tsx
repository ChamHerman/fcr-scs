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
  Check,
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
import { Select } from '../../components/ui/Select';
import { OfferResponseModals } from '../../components/OfferResponseModals';
import { CreateObjectionModal } from '../../components/objection';
import { useOfferResponse } from '../Compensation/hooks/useOfferResponse';
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
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [openingPdf, setOpeningPdf] = useState(false);
  const previewRef = useRef<OfferLetterPreviewHandle>(null);

  // Create Objection Modal State
  const [showCreateObjectionModal, setShowCreateObjectionModal] = useState(false);

  // 1. Fetch Cases for Member (to enable case switching if member has multiple cases)
  useEffect(() => {
    let isMounted = true;
    async function loadCases() {
      try {
        const res = await landAcquisitionApi.getAllCases({
          limit: 50,
          ownerNric: identificationNumber || user?.identificationNumber,
          userId: user?.userId,
          userRole: user?.role,
        });
        const allList = res.cases || res || [];
        const cleanIc = (identificationNumber || user?.identificationNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const memberName = (userName || user?.name || '').toLowerCase();
        const memberEmail = (user?.email || '').toLowerCase();

        const memberCases = allList.filter((c: any) => {
          if (c.createdById === user?.userId) return true;
          const owners = c.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [];
          return owners.some((ow: any) => {
            const owIc = (ow.icNumber || ow.nric || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            return (
              (cleanIc && owIc === cleanIc) ||
              ow.ownerId === user?.userId ||
              (ow.name && ow.name.toLowerCase() === memberName) ||
              (ow.email && ow.email.toLowerCase() === memberEmail)
            );
          });
        });
        if (!isMounted) return;
        setCasesList(memberCases);

        if (!selectedCaseId && memberCases.length > 0) {
          // Default to first case that has an offer letter, or first case
          const caseWithOffer = memberCases.find((c: any) => c.offerLetters && c.offerLetters.length > 0);
          const defaultCase = caseWithOffer || memberCases[0];
          setSelectedCaseId(defaultCase.caseId);
        }
      } catch (err) {
        console.error('Failed to load member cases:', err);
      }
    }
    loadCases();
    return () => { isMounted = false; };
  }, [identificationNumber, user, userName, selectedCaseId]);

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
  // Action Handlers via useOfferResponse
  // ---------------------------------------------------------------------------
  const {
    showRejectModal,
    setShowRejectModal,
    showAcceptConfirmModal,
    setShowAcceptConfirmModal,
    showCancelApprovalModal,
    setShowCancelApprovalModal,
    cancellingApproval,
    submitting,
    reason,
    setReason,
    reasonError,
    setReasonError,
    signedFile,
    setSignedFile,
    signedFileError,
    setSignedFileError,
    activeObjection,
    showObjectionPrompt,
    setShowObjectionPrompt,
    withdrawingObjection,
    handleOpenSignedPdf,
    handleAcceptClick,
    handleConfirmAccept,
    handleReject,
    handleCancelApproval,
    handleWithdrawObjectionAndAccept,
  } = useOfferResponse({
    offer,
    canRespondToOffer,
    user: { userId: user?.userId, identificationNumber: identificationNumber || user?.identificationNumber },
    onRefresh: loadOfferData,
  });

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
    setShowCreateObjectionModal(true);
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

  // Open PDF in new browser tab / window
  const handleOpenPdfInNewTab = async () => {
    // Open new tab immediately on user click to preserve user-gesture permission
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Loading Form H PDF...</title>
            <style>
              body {
                margin: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: system-ui, -apple-system, sans-serif;
                background-color: #0f172a;
                color: #f8fafc;
              }
              .spinner {
                width: 44px;
                height: 44px;
                border: 4px solid #334155;
                border-top-color: #8b5cf6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
              p { margin-top: 16px; font-size: 14px; font-weight: 600; color: #cbd5e1; }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <p>Loading Official Form H Notice of Award...</p>
          </body>
        </html>
      `);
      newTab.document.close();
    }

    setOpeningPdf(true);
    try {
      let url = pdfBlobUrl || previewRef.current?.getPdfUrl();
      if (!url && previewRef.current) {
        url = await previewRef.current.generatePdfBlob();
      }

      if (url && newTab) {
        newTab.location.href = url;
      } else if (newTab) {
        newTab.close();
        notify({
          type: 'error',
          title: 'PDF Generation Failed',
          message: 'Unable to prepare PDF document. Please try downloading directly.',
        });
      }
    } catch (err) {
      if (newTab) newTab.close();
      console.error('Failed to open PDF in new tab:', err);
      notify({
        type: 'error',
        title: 'Error',
        message: 'Failed to open PDF in new window.',
      });
    } finally {
      setOpeningPdf(false);
    }
  };

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
      {/* CASE SWITCHER — always a dropdown, labels carry case details   */}
      {/* ------------------------------------------------------------- */}
      {casesList.length > 0 && (
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto sm:w-[460px]">
            <Select
              label="Select Case"
              placeholder="Select an acquisition case…"
              options={casesList.map((c: any) => {
                const lot = c.landParcel?.lotNo ? `Lot ${c.landParcel.lotNo}` : c.caseTitle || c.caseId;
                const statusLabel = c.status ? String(c.status).replace(/_/g, ' ') : '';
                return {
                  value: c.caseId,
                  label: `${c.caseId} — ${lot}${statusLabel ? ` [${statusLabel}]` : ''}`,
                };
              })}
              value={selectedCaseId}
              onChange={(val) => {
                setSelectedCaseId(val);
                setSearchParams({ caseId: val });
              }}
              wrapLabels
            />
          </div>
        </div>
      )}

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
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
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
            {/* OFFICIAL FORM H OFFER LETTER PREVIEW / MOBILE ACTION CARD     */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-gradient-to-br from-[#f8f5fc] via-[#f3edf7] to-[#e8def8] rounded-3xl p-5 sm:p-6 border border-purple-200/80 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      {isOfferAccepted && offer.rawOffer?.signedDocument ? (
                        <>
                          <span>Form H: Uploaded Signed Acceptance Document</span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300/60">
                            Signed Copy
                          </span>
                        </>
                      ) : (
                        <span>Form H: Notice of Award and Offer of Compensation</span>
                      )}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 font-medium">
                      {isOfferAccepted && offer.rawOffer?.signedDocument
                        ? 'Official Landowner Signed Form H Document • Read-Only View'
                        : 'Land Acquisition Act 1960 • Statutory Award Schedule'}
                    </p>
                  </div>
                </div>

                {/* Desktop controls (hidden on mobile) */}
                <div className="hidden sm:flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleOpenPdfInNewTab}
                    className="px-3 py-1.5 rounded-xl border border-purple-200 bg-white/80 hover:bg-white text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    title="Open PDF in new browser window"
                  >
                    <ExternalLink size={14} className="text-violet-600" />
                    <span>Open in New Tab</span>
                  </button>

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

              {/* MOBILE VIEW (sm:hidden): Hide Preview & Redirect User to New Browser to View PDF */}
              <div className="sm:hidden mt-4 space-y-3">
                <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 border border-purple-200/70 space-y-2.5">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {isOfferAccepted && offer.rawOffer?.signedDocument
                      ? 'Your uploaded signed Form H acceptance document is ready for review. Tap below to view the uploaded PDF in a new browser tab with full clarity.'
                      : 'The official Form H statutory compensation schedule is formatted as an official A4 document. Tap below to view the complete PDF in a new browser tab with native zoom and full clarity.'}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-purple-100 text-slate-600">
                    <span>Reference: <strong className="font-mono text-violet-700">{offer.offerReferenceNo}</strong></span>
                    <span className="font-semibold text-slate-500">Official Statutory Award</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenPdfInNewTab}
                    disabled={openingPdf}
                    className="w-full py-3 px-4 bg-violet-700 hover:bg-violet-800 active:bg-violet-900 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-60"
                  >
                    <ExternalLink size={15} />
                    <span>{openingPdf ? 'Opening PDF in New Tab...' : 'View PDF in New Browser'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => previewRef.current?.downloadPdf()}
                    disabled={downloadingPdf}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-purple-200/80 font-semibold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60"
                  >
                    <Download size={14} className="text-slate-500" />
                    <span>{downloadingPdf ? 'Downloading PDF...' : 'Download PDF Document'}</span>
                  </button>
                </div>
              </div>

              {/* DESKTOP VIEW: Full PDF Viewer Box */}
              {/* On mobile, hidden from view but kept offscreen with fixed -left-[99999px] to enable canvas capture for PDF generation */}
              <div
                className={`mt-4 ${
                  isPreviewCollapsed
                    ? 'hidden'
                    : 'block max-sm:fixed max-sm:-left-[99999px] max-sm:top-0 max-sm:opacity-0 max-sm:pointer-events-none'
                }`}
              >
                <OfferLetterPreview
                  ref={previewRef}
                  offer={offer}
                  uploadedPdf={isOfferAccepted ? offer.rawOffer?.signedDocument : null}
                  viewMode="pdf"
                  onDownloadingChange={setDownloadingPdf}
                  onPdfReady={(url) => setPdfBlobUrl(url)}
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

                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                          ow.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ow.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ow.status === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1">
                              <Check size={13} strokeWidth={2.5} />
                              <span>Accepted</span>
                            </span>
                          ) : ow.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1">
                              <X size={13} strokeWidth={2.5} />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={13} strokeWidth={2.5} />
                              <span>Pending</span>
                            </span>
                          )}
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
        onConfirmReject={handleReject}
        reason={reason}
        onReasonChange={(val) => { setReason(val); if (reasonError) setReasonError(''); }}
        reasonError={reasonError}
      />

      {/* CREATE OBJECTION MODAL */}
      <CreateObjectionModal
        isOpen={showCreateObjectionModal}
        onClose={() => setShowCreateObjectionModal(false)}
        offerId={offer?.id}
        caseId={offer?.caseId}
        userId={user?.userId}
        onSuccess={loadOfferData}
      />

    </div>
  );
};

export default MemberOfferLetter;
