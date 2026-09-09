import { useMemo } from 'react';
import { formatCurrencyRM } from '../../../utils/currency';
import { CASE_STATUS_LABEL_MAP } from '../../../constants/landAcquisition';
import type { OfferDetail, OwnerApprovalStatus } from '../../Compensation/OfferLetterPreview';

export interface WorkflowStep {
  id: number;
  title: string;
  subtitle: string;
  date: string;
  status: 'completed' | 'current' | 'upcoming';
  description: string;
  badgeText: string;
  actionText?: string;
  details?: { label: string; value: string }[];
}

export interface UseMemberWorkflowParams {
  caseDetails: any;
  user: any;
  userName?: string;
  identificationNumber?: string;
  allMemberObjections: any[];
  selectedCaseId: string;
}

export const useMemberWorkflow = ({
  caseDetails,
  user,
  userName,
  identificationNumber,
  allMemberObjections,
  selectedCaseId,
}: UseMemberWorkflowParams) => {
  // 1. Active valuation report
  const activeValuation = useMemo(() => {
    if (!caseDetails?.valuationReports || caseDetails.valuationReports.length === 0) return null;
    return (
      caseDetails.valuationReports.find((r: any) => r.reportStatus === 'APPROVED') ||
      caseDetails.valuationReports[0]
    );
  }, [caseDetails]);

  // 2. Active compensation report
  const activeCompensation = useMemo(() => {
    if (!caseDetails?.compensationReports || caseDetails.compensationReports.length === 0) return null;
    return (
      caseDetails.compensationReports.find((r: any) => r.status === 'APPROVED') ||
      caseDetails.compensationReports[0]
    );
  }, [caseDetails]);

  // 3. Active offer letter
  const activeOffer = useMemo(() => {
    if (!caseDetails?.offerLetters || caseDetails.offerLetters.length === 0) return null;
    return caseDetails.offerLetters[0];
  }, [caseDetails]);

  const hasOfferLetter = Boolean(activeOffer);

  // Status flags
  const isOfferAccepted = useMemo(() => {
    if (!activeOffer) return false;
    return (
      activeOffer.rawStatus === 'ACCEPTED' ||
      activeOffer.status === 'ACCEPTED' ||
      Boolean(activeOffer.acceptedAt) ||
      caseDetails?.status === 'OFFER_ACCEPTED'
    );
  }, [activeOffer, caseDetails]);

  const isOfferPending = useMemo(() => {
    if (!activeOffer) return false;
    const stat = (activeOffer.status || '').toUpperCase();
    const caseStat = (caseDetails?.status || '').toUpperCase();
    if (stat === 'ACCEPTED' || stat === 'REJECTED' || stat === 'CANCELLED') return false;
    if (caseStat === 'OFFER_ACCEPTED' || caseStat === 'OFFER_REJECTED') return false;
    return stat === 'PENDING' || caseStat === 'OFFER_ISSUED' || stat === 'ISSUED';
  }, [activeOffer, caseDetails]);

  // Check if there is an existing objection in PENDING review
  const hasPendingObjection = useMemo(() => {
    const caseObjections = allMemberObjections.filter(
      (o) =>
        (selectedCaseId && o.caseId === selectedCaseId) ||
        (activeOffer?.offerId && o.offerId === activeOffer.offerId)
    );
    const hasListPending = caseObjections.some(
      (o) => o.rawStatus === 'PENDING' || o.status === 'Pending Review' || o.status === 'PENDING'
    );

    const rawCaseObjs = caseDetails?.objections || activeOffer?.objections || [];
    const hasRawPending = rawCaseObjs.some(
      (o: any) => o.status === 'PENDING' || o.rawStatus === 'PENDING'
    );

    return hasListPending || hasRawPending;
  }, [allMemberObjections, selectedCaseId, activeOffer, caseDetails]);

  const objectionDisabledReason = useMemo(() => {
    if (hasPendingObjection) {
      return 'You already have an objection currently pending review for this case.';
    }
    if (!hasOfferLetter) {
      return 'Official Form H Notice of Award has not been issued yet for this case.';
    }
    if (isOfferAccepted) {
      return 'The statutory compensation award has already been accepted.';
    }
    if (!isOfferPending) {
      return 'Compensation offer letter is not in pending status.';
    }
    return '';
  }, [hasPendingObjection, hasOfferLetter, isOfferAccepted, isOfferPending]);

  const canCreateObjection = !objectionDisabledReason;

  // Parcel & Ownership Info
  const parcel = caseDetails?.landParcel;
  const ownerships: any[] = parcel?.ownerships || [];

  const claimantName = useMemo(() => {
    if (ownerships.length > 0) {
      const names = ownerships.map((o: any) => o.landOwner?.name).filter(Boolean).join(' & ');
      if (names) return names;
    }
    return userName || user?.name || '';
  }, [ownerships, userName, user]);

  const claimantNric = useMemo(() => {
    if (ownerships.length > 0) {
      const ics = ownerships.map((o: any) => o.landOwner?.nric).filter(Boolean).join(' / ');
      if (ics) return ics;
    }
    return identificationNumber || user?.identificationNumber || '';
  }, [ownerships, identificationNumber, user]);

  const landAreaFormatted = useMemo(() => {
    if (!parcel?.area) return '';
    const areaNum = Number(parcel.area);
    return `${areaNum.toLocaleString()} m²`;
  }, [parcel]);

  const locationString = useMemo(() => {
    if (!parcel) return '';
    const parts = [parcel.mukim, parcel.district, parcel.state].filter(Boolean);
    return parts.join(', ');
  }, [parcel]);

  const metaParts = useMemo(() => {
    return [
      landAreaFormatted,
      parcel?.category,
      parcel?.tenureType,
      claimantName ? `Claimant: ${claimantName}` : null,
    ].filter(Boolean) as string[];
  }, [landAreaFormatted, parcel, claimantName]);

  // Assigned Officer & Contacts
  const assignedOfficer = useMemo(() => {
    const valuer = caseDetails?.caseAssignments?.[0]?.assignedTo || activeValuation?.valuer;
    const creator = caseDetails?.createdBy;
    return {
      name: valuer?.name || creator?.name || 'Department of Lands & Mines Officer',
      designation: valuer ? 'Senior Land Valuer & Assessment Officer' : 'Land Administrator (Enquiry Officer)',
      department: `Department of Lands and Mines (${parcel?.state || 'WP Kuala Lumpur'}) (JKPTG)`,
      phone: valuer?.contactNumber || creator?.contactNumber || '+603-2610 3300',
      email: valuer?.email || creator?.email || 'enquiry.tanah@jkptg.gov.my',
      office: `${parcel?.district ? `Pejabat Tanah Daerah ${parcel.district}, ` : ''}${parcel?.state || 'Kuala Lumpur'}, Malaysia`,
      officeHours: 'Mon - Fri: 8:30 AM - 4:30 PM',
    };
  }, [caseDetails, activeValuation, parcel]);

  // Offer Expiry & Badge Calculation
  const { offerStatusBadge, daysRemaining } = useMemo(() => {
    const rawStatus = caseDetails?.status || '';
    const offerStat = activeOffer?.status || (rawStatus === 'OFFER_ISSUED' ? 'PENDING' : null);

    const rawExpiry = activeOffer?.rawOffer?.expiryDate || activeOffer?.expiryDate;
    if (rawExpiry && (offerStat === 'PENDING' || rawStatus === 'OFFER_ISSUED')) {
      const expDate = new Date(rawExpiry).getTime();
      if (!isNaN(expDate)) {
        const diff = Math.ceil((expDate - Date.now()) / (1000 * 60 * 60 * 24));
        const days = Math.max(0, diff);
        return {
          daysRemaining: days,
          offerStatusBadge: days > 0 ? `${days} Days Left` : 'Offer Expired',
        };
      }
    }

    if (offerStat === 'ACCEPTED' || rawStatus === 'OFFER_ACCEPTED') {
      return { daysRemaining: null, offerStatusBadge: 'Award Accepted' };
    }
    if (offerStat === 'REJECTED' || rawStatus === 'OFFER_REJECTED') {
      return { daysRemaining: null, offerStatusBadge: 'Award Rejected' };
    }
    if (rawStatus === 'OBJECTION_FILED' || (caseDetails?.objections && caseDetails.objections.length > 0)) {
      return { daysRemaining: null, offerStatusBadge: 'Objection In Review' };
    }
    if (rawStatus.includes('VALUATION')) {
      return { daysRemaining: null, offerStatusBadge: 'Valuation Stage' };
    }
    if (rawStatus === 'CASE_REGISTERED') {
      return { daysRemaining: null, offerStatusBadge: 'Notice Issued' };
    }

    return {
      daysRemaining: null,
      offerStatusBadge: CASE_STATUS_LABEL_MAP[rawStatus] || rawStatus || 'In Progress',
    };
  }, [caseDetails, activeOffer]);

  // Dynamic 6-Stage Progress Tracker
  const { currentStageNum, progressPercent, progressBadge } = useMemo(() => {
    const st = caseDetails?.status || '';

    if (activeOffer?.status === 'REJECTED' || st === 'OFFER_REJECTED') {
      return { currentStageNum: 3, progressPercent: 50, progressBadge: 'Stage 3 of 6 (Award Rejected)' };
    }

    switch (st) {
      case 'CASE_REGISTERED':
        return { currentStageNum: 1, progressPercent: 17, progressBadge: 'Stage 1 of 6 (Notice Issued)' };
      case 'VALUER_ASSIGNED':
      case 'VALUATION_IN_PROGRESS':
      case 'VALUATION_SUBMITTED':
      case 'PENDING_VALUATION_APPROVAL':
        return { currentStageNum: 2, progressPercent: 33, progressBadge: 'Stage 2 of 6 (Valuation Assessment)' };
      case 'VALUATION_APPROVED':
      case 'PENDING_COMPENSATION_APPROVAL':
      case 'COMPENSATION_APPROVED':
      case 'COMPENSATION_DETERMINED':
        return { currentStageNum: 3, progressPercent: 50, progressBadge: 'Stage 3 of 6 (Offer Preparation)' };
      case 'OFFER_ISSUED':
        return { currentStageNum: 3, progressPercent: 50, progressBadge: 'Stage 3 of 6 (Form H Active)' };
      case 'OFFER_ACCEPTED':
      case 'OBJECTION_FILED':
      case 'OBJECTION_RESOLVED':
        return { currentStageNum: 4, progressPercent: 67, progressBadge: 'Stage 4 of 6 (Claimant Decision)' };
      case 'PAYMENT_IN_PROGRESS':
      case 'PAYMENT_PROCESSING':
        return { currentStageNum: 5, progressPercent: 83, progressBadge: 'Stage 5 of 6 (Payment Processing)' };
      case 'PAYMENT_COMPLETED':
        return { currentStageNum: 5, progressPercent: 90, progressBadge: 'Stage 5 of 6 (Payment Disbursed)' };
      case 'LAND_POSSESSED':
      case 'CASE_CLOSED':
        return { currentStageNum: 6, progressPercent: 100, progressBadge: 'Stage 6 of 6 (Handover Completed)' };
      default:
        return { currentStageNum: 1, progressPercent: 17, progressBadge: 'Stage 1 of 6 (Registered)' };
    }
  }, [caseDetails, activeOffer]);

  // Dynamic Total Compensation Award
  const totalCompensation = useMemo(() => {
    if (activeOffer?.offerAmount) return Number(activeOffer.offerAmount);
    if (activeOffer?.rawOffer?.offerAmount) return Number(activeOffer.rawOffer.offerAmount);
    if (activeCompensation?.totalCompensation) return Number(activeCompensation.totalCompensation);
    if (activeValuation?.recommendedCompensation) return Number(activeValuation.recommendedCompensation);
    return 0;
  }, [activeOffer, activeCompensation, activeValuation]);

  // Formatted offer detail for preview modal
  const formattedOfferDetail: OfferDetail | null = useMemo(() => {
    if (!activeOffer && !caseDetails) return null;
    const o = activeOffer || {};
    const comp = activeCompensation || {};
    const val = activeValuation || {};

    const ownersList: OwnerApprovalStatus[] = [
      {
        ownerId: user?.userId || 'owner-1',
        name: claimantName || 'Land Owner',
        nric: claimantNric || '—',
        contact: user?.contactNumber || '—',
        address: parcel?.address || 'Registered Address on Title',
        sharePercentage: '100%',
        status: (o.status === 'ACCEPTED' ? 'ACCEPTED' : o.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as 'ACCEPTED' | 'REJECTED' | 'PENDING',
        isCurrentUser: true,
      },
    ];

    return {
      id: o.offerId || o.id || 'OFFER-PREVIEW',
      offerReferenceNo: o.offerReferenceNo || `JKPTG/WPKL/H/${caseDetails?.caseId || '2026'}/01`,
      caseId: caseDetails?.caseId || selectedCaseId || '',
      caseTitle: caseDetails?.caseTitle || '',
      projectName: caseDetails?.project?.projectName || '',
      acquiringAuthority: 'Department of Lands and Mines (JKPTG)',
      ownerName: claimantName,
      ownerIc: claimantNric,
      ownerAddress: parcel?.address || 'Registered Address on Title',
      ownerPhone: user?.contactNumber || '+6012-3456789',
      landTitle: parcel?.landTitleNo || '—',
      lotNo: parcel?.lotNo || '—',
      tempat: parcel?.mukim || '—',
      mukim: parcel?.mukim || '',
      district: parcel?.district || '',
      state: parcel?.state || '',
      landArea: parcel?.area ? `${Number(parcel.area).toLocaleString()} m²` : '—',
      acquisitionArea: parcel?.area ? `${Number(parcel.area).toLocaleString()} m²` : '—',
      issueDate: o.offerDate
        ? new Date(o.offerDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Pending Official Issuance',
      expiryDate: o.expiryDate
        ? new Date(o.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Pending Notice',
      enquiryDate: '15 March 2026',
      awardDate: o.createdAt
        ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      awardReference: o.offerReferenceNo || `JKPTG/WPKL/H/${caseDetails?.caseId || '2026'}/01`,
      status: o.status || 'PENDING',
      statusClass: 'status-pending',
      totalCompensation: totalCompensation,
      components: {
        landValue: Number(comp.components?.landValue || val.marketValue || totalCompensation),
        buildingValue: Number(comp.components?.buildingValue || 0),
        cropValue: Number(comp.components?.cropValue || 0),
        businessDisruption: Number(comp.components?.businessDisruption || 0),
        disturbanceCompensation: Number(comp.components?.disturbanceCompensation || 0),
        relocationAllowance: Number(comp.components?.relocationAllowance || 0),
        otherEligible: Number(comp.components?.otherEligible || 0),
      },
      valuationReferences: {
        marketValue: Number(val.marketValue || totalCompensation),
        recommendedCompensation: Number(val.recommendedCompensation || totalCompensation),
        approvedCompensation: Number(comp.totalCompensation || totalCompensation),
        valuationMethod: val.valuationMethod || 'Comparison Method',
      },
      paymentConditions: 'Payment will be credited to registered commercial bank within statutory timeframe.',
      rawOffer: o,
      owners: ownersList,
      isMultiOwner: false,
      acceptedCount: o.status === 'ACCEPTED' ? 1 : 0,
      totalOwners: 1,
      hasRejectedOwner: o.status === 'REJECTED',
      rejectedOwnerInfo: null,
      currentUserStatus: (o.status === 'ACCEPTED' ? 'ACCEPTED' : o.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as 'ACCEPTED' | 'REJECTED' | 'PENDING',
    };
  }, [
    activeOffer,
    caseDetails,
    selectedCaseId,
    activeCompensation,
    activeValuation,
    claimantName,
    claimantNric,
    parcel,
    user,
    totalCompensation,
  ]);

  // Dynamic 6 Workflow Steps
  const workflowSteps: WorkflowStep[] = useMemo(() => {
    const regDate = caseDetails?.registrationDate
      ? new Date(caseDetails.registrationDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

    const valDate = activeValuation?.valuationDate
      ? new Date(activeValuation.valuationDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : currentStageNum > 2
      ? 'Completed'
      : currentStageNum === 2
      ? 'In Progress'
      : 'Pending';

    const offerDate = activeOffer?.offerDate
      ? new Date(activeOffer.offerDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : currentStageNum >= 3 && activeCompensation?.createdAt
      ? new Date(activeCompensation.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Pending';

    const getStepStatus = (stepId: number): 'completed' | 'current' | 'upcoming' => {
      if (currentStageNum > stepId) return 'completed';
      if (currentStageNum === stepId) return 'current';
      return 'upcoming';
    };

    const step1Details = [
      caseDetails?.caseId ? { label: 'Case Reference', value: caseDetails.caseId } : null,
      claimantName ? { label: 'Registered Claimant', value: claimantName } : null,
      claimantNric ? { label: 'Claimant NRIC', value: claimantNric } : null,
      caseDetails?.project?.projectName ? { label: 'Project', value: caseDetails.project.projectName } : null,
      caseDetails?.project?.purpose || caseDetails?.project?.projectType
        ? { label: 'Purpose', value: caseDetails.project.purpose || caseDetails.project.projectType }
        : null,
    ].filter(Boolean) as { label: string; value: string }[];

    const step2Details = [
      activeValuation?.valuationMethod ? { label: 'Valuation Method', value: activeValuation.valuationMethod } : null,
      assignedOfficer.name && currentStageNum >= 2 ? { label: 'Valuer Assessor', value: assignedOfficer.name } : null,
      activeValuation?.marketValue ? { label: 'Market Benchmark', value: formatCurrencyRM(activeValuation.marketValue) } : null,
    ].filter(Boolean) as { label: string; value: string }[];

    const step3Details = [
      activeOffer?.offerReferenceNo ? { label: 'Award Reference', value: activeOffer.offerReferenceNo } : null,
      totalCompensation > 0 ? { label: 'Total Award', value: formatCurrencyRM(totalCompensation) } : null,
      activeOffer?.expiryDate
        ? {
            label: 'Deadline',
            value: new Date(activeOffer.expiryDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
          }
        : null,
    ].filter(Boolean) as { label: string; value: string }[];

    const step4Details = [
      isOfferAccepted ? { label: 'Decision Status', value: 'Accepted by Land Owner' } : null,
      activeOffer?.rejectedAt ? { label: 'Decision Status', value: 'Rejected by Land Owner' } : null,
      caseDetails?.objections?.length ? { label: 'Objection Status', value: 'Compensation Objection Filed' } : null,
    ].filter(Boolean) as { label: string; value: string }[];

    const step5Details = [
      currentStageNum >= 5 ? { label: 'Disbursement Method', value: 'Electronic GIRO / Bank Transfer' } : null,
      isOfferAccepted ? { label: 'Beneficiary Bank', value: 'Registered Payout Account' } : null,
    ].filter(Boolean) as { label: string; value: string }[];

    const step6Details = [
      currentStageNum >= 6 ? { label: 'Possession Status', value: 'Vacant Possession Handed Over' } : null,
      currentStageNum >= 6 ? { label: 'Relocation Assistance', value: 'Provided by Land Office' } : null,
    ].filter(Boolean) as { label: string; value: string }[];

    return [
      {
        id: 1,
        title: 'Notice of Acquisition (Sec. 4 & 8)',
        subtitle: 'Gazette Declaration & Land Freezing',
        date: regDate || 'Registered',
        status: getStepStatus(1),
        badgeText: getStepStatus(1) === 'completed' ? 'Completed' : 'Active Stage',
        description: `Official statutory notice declared under Land Acquisition Act 1960 for project ${
          caseDetails?.project?.projectName || 'Public Infrastructure'
        }. Inquiry notice served to registered owners.`,
        details: step1Details,
      },
      {
        id: 2,
        title: 'Joint Site Inspection & Valuation',
        subtitle: 'JPPH Assessment of Land & Property',
        date: valDate,
        status: getStepStatus(2),
        badgeText:
          getStepStatus(2) === 'completed'
            ? 'Completed'
            : getStepStatus(2) === 'current'
            ? 'In Progress'
            : 'Upcoming',
        description:
          'Physical valuation conducted on-site by JPPH and licensed valuers to determine statutory market value and damages.',
        details: step2Details,
      },
      {
        id: 3,
        title: 'Offer Letter Issuance (Form H)',
        subtitle: 'Compensation Award Package Ready',
        date: offerDate,
        status: getStepStatus(3),
        badgeText:
          activeOffer?.status === 'REJECTED' || caseDetails?.status === 'OFFER_REJECTED'
            ? 'Award Rejected'
            : getStepStatus(3) === 'completed'
            ? 'Issued'
            : getStepStatus(3) === 'current'
            ? daysRemaining
              ? `${daysRemaining} Days Left`
              : 'Action Required'
            : 'Pending',
        description: hasOfferLetter
          ? 'Form H Notice of Award issued by Land Administrator stating breakdown of compensation award.'
          : 'Pending finalization of compensation schedule and Land Administrator Form H issuance.',
        details: step3Details,
      },
      {
        id: 4,
        title: 'Claimant Response & Decision',
        subtitle: 'Formal Acceptance or Objection Filing',
        date: isOfferAccepted
          ? 'Accepted'
          : activeOffer?.rejectedAt
          ? 'Rejected'
          : currentStageNum >= 4
          ? 'Awaiting Decision'
          : 'Upcoming',
        status: getStepStatus(4),
        badgeText: isOfferAccepted
          ? 'Award Accepted'
          : activeOffer?.rejectedAt
          ? 'Award Rejected'
          : getStepStatus(4) === 'current'
          ? 'Action Required'
          : 'Upcoming',
        description:
          'Displaced land owner reviews compensation award and decides whether to formally accept or file an objection.',
        details: step4Details,
      },
      {
        id: 5,
        title: 'Compensation Payout & Settlement',
        subtitle: 'Electronic GIRO Fund Disbursement',
        date: currentStageNum >= 5 ? 'Processing Payout' : 'Pending Stage 4',
        status: getStepStatus(5),
        badgeText:
          currentStageNum >= 5
            ? caseDetails?.status === 'PAYMENT_COMPLETED'
              ? 'Paid & Settled'
              : 'Disbursing Funds'
            : 'Upcoming',
        description:
          'Approved statutory compensation deposited directly into registered land owner bank account.',
        details: step5Details,
      },
      {
        id: 6,
        title: 'Handover & Formal Possession',
        subtitle: 'Vacant Possession & Title Registration',
        date: currentStageNum >= 6 ? 'Possession Taken' : 'Pending Stage 5',
        status: getStepStatus(6),
        badgeText: currentStageNum >= 6 ? 'Completed' : 'Upcoming',
        description:
          'Title ownership transferred to Federal/State Government, and vacant possession officially handed over.',
        details: step6Details,
      },
    ];
  }, [
    caseDetails,
    activeValuation,
    activeCompensation,
    activeOffer,
    currentStageNum,
    claimantName,
    claimantNric,
    assignedOfficer,
    totalCompensation,
    isOfferAccepted,
    hasOfferLetter,
    daysRemaining,
  ]);

  // 7. Dynamic Documents Checklist (Non-empty only)
  const documentChecklist = useMemo(() => {
    const docs: { title: string; status: string; date: string; badge: string; filePath?: string; fileSize?: string }[] = [];

    if (parcel?.landTitleNo) {
      docs.push({
        title: `Official Land Title Grant (${parcel.landTitleNo})`,
        status: 'Verified',
        date: caseDetails?.registrationDate 
          ? new Date(caseDetails.registrationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Official Grant',
        badge: 'bg-emerald-100 text-emerald-800'
      });
    }

    if (activeOffer) {
      docs.push({
        title: `Official Form H Award Letter (${activeOffer.offerReferenceNo || 'Form H'})`,
        status: activeOffer.status === 'ACCEPTED' ? 'Signed & Accepted' : 'Action Needed',
        date: activeOffer.offerDate 
          ? new Date(activeOffer.offerDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Pending Signature',
        badge: activeOffer.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      });
    }

    (caseDetails?.caseDocuments || []).forEach((doc: any) => {
      const formattedSize = doc.fileSize ? `${(Number(doc.fileSize) / 1024).toFixed(1)} KB` : '';
      docs.push({
        title: `${doc.fileName} (${doc.documentType || 'Statutory Filing'})`,
        status: 'Uploaded & Verified',
        date: doc.createdAt 
          ? new Date(doc.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Verified',
        badge: 'bg-blue-100 text-blue-800',
        filePath: doc.filePath,
        fileSize: formattedSize
      });
    });

    if (activeOffer || isOfferAccepted) {
      docs.push({
        title: 'Bank Account Confirmation / Beneficiary Details',
        status: isOfferAccepted ? 'Verified' : 'Required for Payout',
        date: 'Needed for Electronic Disbursement',
        badge: isOfferAccepted ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-100 text-violet-800'
      });
    }

    return docs;
  }, [parcel, caseDetails, activeOffer, isOfferAccepted]);

  return {
    activeValuation,
    activeCompensation,
    activeOffer,
    hasOfferLetter,
    isOfferAccepted,
    isOfferPending,
    hasPendingObjection,
    objectionDisabledReason,
    canCreateObjection,
    parcel,
    claimantName,
    claimantNric,
    landAreaFormatted,
    locationString,
    metaParts,
    assignedOfficer,
    offerStatusBadge,
    daysRemaining,
    currentStageNum,
    progressPercent,
    progressBadge,
    totalCompensation,
    formattedOfferDetail,
    workflowSteps,
    documentChecklist,
  };
};
