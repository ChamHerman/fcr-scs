import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  AlertCircle,
  Building2,
  Layers, 
  FileText, 
  UserCheck, 
  ExternalLink,
  CheckCircle2,
  Loader2,
  ChevronDown,
  RotateCw,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useRole } from '../../hooks/useRole';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import { compensationApi } from '../../services/compensationApi';
import { authService } from '../../services/auth.service';
import {
  OBJECTION_STATUS_CLASS_MAP,
  OBJECTION_STATUS_LABEL_MAP,
} from '../../constants/compensation';
import { OfferLetterPreview } from '../Compensation/OfferLetterPreview';
import { 
  CreateObjectionModal,
  EditObjectionModal,
  DeleteObjectionModal,
  ViewObjectionModal
} from '../../components/objection';
import {
  MemberCaseSummaryCard,
  MemberWorkflowTimeline,
  MemberObjectionsTab,
  MemberDocumentsTab,
  MemberOfficerTab,
} from './components';
import { useMemberWorkflow } from './hooks/useMemberWorkflow';
import { blockchainApi } from '../../services/blockchainApi';

export const MemberDashboard: React.FC = () => {
  const { user, userName, identificationNumber, userId, role, isMember, isSysAdmin } = useRole();
  const { notify } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  // Active Member Identification Number State
  const [userIc, setUserIc] = useState<string>(() => user?.identificationNumber || '');

  // Case Selection & Data State
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(searchParams.get('caseId') || '');
  const [loadingCases, setLoadingCases] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [caseDetails, setCaseDetails] = useState<any | null>(null);
  const [isM2Published, setIsM2Published] = useState<boolean>(false);

  // Modals & Navigation state
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'workflow' | 'objections' | 'documents' | 'officer'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['workflow', 'objections', 'documents', 'officer'].includes(tabParam)) {
      return tabParam as 'workflow' | 'objections' | 'documents' | 'officer';
    }
    return 'workflow';
  });
  const [tabDropdownOpen, setTabDropdownOpen] = useState<boolean>(false);
  const tabDropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize state when URL search params change
  useEffect(() => {
    const caseIdFromUrl = searchParams.get('caseId');
    if (caseIdFromUrl && caseIdFromUrl !== selectedCaseId) {
      setSelectedCaseId(caseIdFromUrl);
    }
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['workflow', 'objections', 'documents', 'officer'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as 'workflow' | 'objections' | 'documents' | 'officer');
    }
  }, [searchParams]);

  // Close mobile tab dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(event.target as Node)) {
        setTabDropdownOpen(false);
      }
    };

    if (tabDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tabDropdownOpen]);

  // Objections State
  const [allMemberObjections, setAllMemberObjections] = useState<any[]>([]);
  const [loadingObjections, setLoadingObjections] = useState<boolean>(false);

  // Shared Modals State
  const [viewObjection, setViewObjection] = useState<any | null>(null);
  const [editObjectionItem, setEditObjectionItem] = useState<any | null>(null);
  const [deleteObjectionId, setDeleteObjectionId] = useState<string | null>(null);
  const [showCreateObjectionModal, setShowCreateObjectionModal] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // 1. Fetch Cases for the Land Owner
  // ---------------------------------------------------------------------------
  const fetchMemberCases = useCallback(async () => {
    setLoadingCases(true);
    try {
      const isAdm = user?.role === 'SYSTEM_ADMINISTRATOR' || user?.role === 'GOVERNMENT_ADMINISTRATOR';
      
      const res = await landAcquisitionApi.getAllCases({
        limit: 100,
        userRole: user?.role,
        userId: user?.userId,
        ownerNric: user?.identificationNumber,
      });

      const allFetched: any[] = res.cases || [];

      // Filter cases that belong to the user as an owner, or created by them (unless admin)
      let userCases = allFetched;
      if (!isAdm && user) {
        const cleanIc = (user.identificationNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const userNameClean = (user.name || '').toLowerCase();
        const userEmailClean = (user.email || '').toLowerCase();

        userCases = allFetched.filter((c: any) => {
          if (c.createdById === user.userId) return true;
          const owners = c.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [];
          return owners.some((ow: any) => {
            const owIc = (ow.nric || ow.icNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            return (
              (cleanIc && owIc === cleanIc) ||
              ow.ownerId === user.userId ||
              (ow.email && ow.email.toLowerCase() === userEmailClean) ||
              (ow.name && ow.name.toLowerCase() === userNameClean)
            );
          });
        });
      }

      setCases(userCases);

      // Select initial case
      const paramCaseId = searchParams.get('caseId');
      if (paramCaseId && userCases.some((c) => c.caseId === paramCaseId)) {
        setSelectedCaseId(paramCaseId);
      } else if (userCases.length > 0) {
        setSelectedCaseId(userCases[0].caseId);
        const newParams: Record<string, string> = { caseId: userCases[0].caseId };
        const tab = searchParams.get('tab');
        if (tab && tab !== 'workflow') newParams.tab = tab;
        setSearchParams(newParams, { replace: true });
      } else {
        setSelectedCaseId('');
      }
    } catch (err: any) {
      console.error('Failed to load member cases:', err);
    } finally {
      setLoadingCases(false);
    }
  }, [user, searchParams, setSearchParams]);

  useEffect(() => {
    fetchMemberCases();
  }, [fetchMemberCases]);

  // ---------------------------------------------------------------------------
  // 1b. Retrieve User Identification Number (IC) if missing from Auth Context
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (user?.identificationNumber) {
      setUserIc(user.identificationNumber);
    } else if (isMember && user?.userId) {
      authService.getUserById(user.userId)
        .then((res) => {
          const idNum = res?.data?.identificationNumber;
          if (idNum) {
            setUserIc(idNum);
            const stored = localStorage.getItem('user_data');
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                parsed.identificationNumber = idNum;
                localStorage.setItem('user_data', JSON.stringify(parsed));
              } catch (e) {}
            }
          }
        })
        .catch((err) => console.error('Failed to load user identification number:', err));
    }
  }, [user, isMember]);

  // ---------------------------------------------------------------------------
  // 1c. Load All Objections Created by or Scoped to this Member
  // ---------------------------------------------------------------------------
  const loadMemberObjections = useCallback(async () => {
    setLoadingObjections(true);
    try {
      const activeMemberIc = (userIc || user?.identificationNumber || identificationNumber || '').trim();
      const scopeParams: any = {
        limit: 1000,
        userRole: role || 'DISPLACED_COMMUNITY_MEMBER',
      };

      if (isMember || !role) {
        scopeParams.ownerNric = activeMemberIc || undefined;
        scopeParams.userId = userId || user?.userId;
        scopeParams.userRole = 'DISPLACED_COMMUNITY_MEMBER';
      }

      const res = await compensationApi.getAllObjections(scopeParams);
      const rawObjections = res.objections || [];

      // Defensive client-side check for member
      const scopedList = rawObjections.filter((o: any) => {
        const currentUid = userId || user?.userId;
        if (currentUid && o.createdById === currentUid) return true;
        if (activeMemberIc) {
          const cleanActiveIc = activeMemberIc.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const directOwnerIc = (o.offerLetter?.landOwnership?.landOwner?.nric || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          if (directOwnerIc && directOwnerIc === cleanActiveIc) return true;

          const parcelOwners = o.acquisitionCase?.landParcel?.ownerships?.map((ow: any) => ow.landOwner).filter(Boolean) || [];
          const isParcelOwner = parcelOwners.some((ow: any) => (ow.nric || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanActiveIc);
          if (isParcelOwner) return true;
        }
        return false;
      });

      const formatted = scopedList.map((o: any) => {
        const parcelOwners = o.acquisitionCase?.landParcel?.ownerships?.map((ow: any) => ow.landOwner).filter(Boolean) || [];
        const ownerName = parcelOwners.length > 0 
          ? parcelOwners.map((ow: any) => ow.name).join(', ') 
          : (o.offerLetter?.landOwnership?.landOwner?.name || userName || '—');

        const docList = (o.objectionDocuments || o.documents || []).map((d: any) => ({
          id: d.documentId || d.id || Math.random().toString(),
          name: d.fileName || d.name || 'Supporting_Document.pdf',
          fileName: d.fileName || d.name || 'Supporting_Document.pdf',
          filePath: d.filePath,
          fileSize: d.fileSize ? `${(Number(d.fileSize) / 1024).toFixed(1)} KB` : (d.size ? `${d.size}` : ''),
          mimeType: d.mimeType || 'application/pdf',
        }));

        return {
          id: o.objectionId,
          offerId: o.offerId,
          caseId: o.acquisitionCase?.caseId || o.caseId || '—',
          caseTitle: o.acquisitionCase?.caseTitle || '—',
          lotNo: o.acquisitionCase?.landParcel?.lotNo || '—',
          mukim: o.acquisitionCase?.landParcel?.mukim || '',
          district: o.acquisitionCase?.landParcel?.district || '',
          state: o.acquisitionCase?.landParcel?.state || '',
          ownerName,
          requestedAmount: Number(o.requestedAmount || 0),
          originalOfferAmount: Number(o.offerLetter?.offerAmount || o.offerLetter?.totalCompensation || o.acquisitionCase?.offerLetters?.[0]?.offerAmount || 0),
          submissionDate: o.createdAt
            ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—',
          status: OBJECTION_STATUS_LABEL_MAP[o.status] || o.status,
          rawStatus: o.status,
          statusClass: OBJECTION_STATUS_CLASS_MAP[o.status] || 'status-objection-review',
          reason: o.objectionReason || '—',
          documents: docList,
          reviewRemarks: o.reviewRemarks,
          reviewedAt: o.reviewedAt ? new Date(o.reviewedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
          revisedCompensation: o.revisedCompensation ? Number(o.revisedCompensation) : null,
          createdById: o.createdById,
          raw: o,
        };
      });

      setAllMemberObjections(formatted);
    } catch (err: any) {
      console.error('Failed to load member objections:', err);
    } finally {
      setLoadingObjections(false);
    }
  }, [user, userIc, userId, role, isMember, identificationNumber, userName]);

  useEffect(() => {
    loadMemberObjections();
  }, [loadMemberObjections]);

  // ---------------------------------------------------------------------------
  // 2. Fetch Selected Case Details
  // ---------------------------------------------------------------------------
  const fetchSelectedCaseDetails = useCallback(async (caseId: string) => {
    if (!caseId) {
      setCaseDetails(null);
      return;
    }
    setLoadingDetails(true);
    try {
      const res = await landAcquisitionApi.getCaseById(caseId);
      const c = res.case || res;
      setCaseDetails(c);
    } catch (err: any) {
      console.error(`Failed to load case details for ${caseId}:`, err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      fetchSelectedCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId, fetchSelectedCaseDetails]);

  useEffect(() => {
    if (!selectedCaseId) {
      setIsM2Published(false);
      return;
    }
    let isMounted = true;
    blockchainApi
      .getRecords()
      .then((res: any) => {
        if (!isMounted) return;
        const list: any[] = res?.records || [];
        const mine = list.filter((r) => r.caseId === selectedCaseId);
        const isPublished = (s?: string | null) =>
          String(s || '').toUpperCase().replace(/[\s_]+/g, '_') === 'PUBLISHED';
        const m2 = mine.find((r) => r.milestone === 'SETTLEMENT');
        setIsM2Published(Boolean(m2 && isPublished(m2.status)));
      })
      .catch(() => {
        if (isMounted) setIsM2Published(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedCaseId]);

  // Handle Case Switcher
  const handleCaseChange = (newCaseId: string) => {
    setSelectedCaseId(newCaseId);
    const newParams: Record<string, string> = { caseId: newCaseId };
    if (activeTab && activeTab !== 'workflow') {
      newParams.tab = activeTab;
    }
    setSearchParams(newParams, { replace: true });
  };

  // Handle Tab Switcher
  const handleTabChange = (newTab: 'workflow' | 'objections' | 'documents' | 'officer') => {
    setActiveTab(newTab);
    const newParams: Record<string, string> = {};
    if (selectedCaseId) {
      newParams.caseId = selectedCaseId;
    }
    if (newTab !== 'workflow') {
      newParams.tab = newTab;
    }
    setSearchParams(newParams, { replace: true });
  };

  // ---------------------------------------------------------------------------
  // 3. Encapsulated Member Workflow Hook
  // ---------------------------------------------------------------------------
  const {
    isCaseClosed,
    activeValuation,
    activeOffer,
    hasOfferLetter,
    isOfferAccepted,
    objectionDisabledReason,
    canCreateObjection,
    parcel,
    locationString,
    metaParts,
    assignedOfficer,
    offerStatusBadge,
    currentStageNum,
    progressPercent,
    progressBadge,
    totalCompensation,
    formattedOfferDetail,
    workflowSteps,
    documentChecklist,
  } = useMemberWorkflow({
    caseDetails,
    user,
    userName,
    identificationNumber: userIc || identificationNumber,
    allMemberObjections,
    selectedCaseId,
    isM2Published: isM2Published || caseDetails?.status === 'CASE_CLOSED',
  });

  // Filter objections specifically belonging to the selected case
  const caseObjections = useMemo(() => {
    if (!selectedCaseId) return allMemberObjections;
    return allMemberObjections.filter((o) => {
      const matchCaseId =
        o.caseId === selectedCaseId ||
        o.raw?.caseId === selectedCaseId ||
        o.raw?.acquisitionCase?.caseId === selectedCaseId;
      const matchOfferId =
        activeOffer?.offerId &&
        (o.offerId === activeOffer.offerId || o.raw?.offerId === activeOffer.offerId);
      return Boolean(matchCaseId || matchOfferId);
    });
  }, [allMemberObjections, selectedCaseId, activeOffer]);

  // Automatically expand only the current active step on load
  useEffect(() => {
    if (currentStageNum) {
      setExpandedStep(currentStageNum);
    }
  }, [currentStageNum]);
  // ---------------------------------------------------------------------------
  // Mobile Viewport Pull-to-Refresh Gesture Handler & Animation
  // ---------------------------------------------------------------------------
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isMobileReloading, setIsMobileReloading] = useState<boolean>(false);
  const touchStartYRef = useRef<number>(0);

  const handleMobileReload = useCallback(async () => {
    setIsMobileReloading(true);
    setPullDistance(55);
    try {
      if (selectedCaseId) {
        await fetchSelectedCaseDetails(selectedCaseId);
      }
      await fetchMemberCases();
      await loadMemberObjections();
      notify({ type: 'success', title: 'Data Reloaded', message: 'Case information is up to date.' });
    } catch {
      notify({ type: 'general', title: 'Reloaded', message: 'Case view refreshed.' });
    } finally {
      setTimeout(() => {
        setIsMobileReloading(false);
        setPullDistance(0);
        setIsPulling(false);
      }, 600);
    }
  }, [selectedCaseId, fetchSelectedCaseDetails, fetchMemberCases, loadMemberObjections, notify]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && e.touches.length === 1) {
        touchStartYRef.current = e.touches[0].clientY;
        setIsPulling(true);
      } else {
        setIsPulling(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartYRef.current || isMobileReloading) return;
      if (window.scrollY <= 0 && e.touches.length === 1) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartYRef.current;
        if (diff > 0) {
          const damped = Math.min(Math.pow(diff, 0.82) * 1.6, 80);
          setPullDistance(damped);
        }
      }
    };

    const handleTouchEnd = () => {
      if (!touchStartYRef.current) return;
      touchStartYRef.current = 0;
      setIsPulling(false);
      if (pullDistance >= 45 && !isMobileReloading) {
        handleMobileReload();
      } else if (!isMobileReloading) {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isMobileReloading, handleMobileReload]);


  // Dynamic Tab Content
  const tabContent = (
    <>
      {activeTab === 'workflow' && (
        <MemberWorkflowTimeline
          workflowSteps={workflowSteps}
          expandedStep={expandedStep}
          onToggleStep={(id) => setExpandedStep((prev) => (prev === id ? null : id))}
          hasOfferLetter={hasOfferLetter}
          selectedCaseId={selectedCaseId}
          activeOffer={activeOffer}
          isOfferAccepted={isOfferAccepted}
          totalCompensation={totalCompensation}
        />
      )}

      {activeTab === 'objections' && (
        <MemberObjectionsTab
          objections={caseObjections}
          loading={loadingObjections}
          canCreateObjection={canCreateObjection}
          objectionDisabledReason={objectionDisabledReason}
          hasOfferLetter={hasOfferLetter}
          selectedCaseId={selectedCaseId}
          activeOffer={activeOffer}
          onOpenCreateObjection={() => setShowCreateObjectionModal(true)}
          onOpenEditObjection={(obj) => setEditObjectionItem(obj)}
          onOpenDeleteObjection={(id) => setDeleteObjectionId(id)}
          onOpenViewObjection={(obj) => setViewObjection(obj)}
          isMember={isMember}
          isSysAdmin={isSysAdmin}
        />
      )}

      {activeTab === 'documents' && (
        <MemberDocumentsTab documents={documentChecklist} />
      )}

      {activeTab === 'officer' && (
        <MemberOfficerTab assignedOfficer={assignedOfficer} />
      )}
    </>
  );

  // If initial load of cases
  if (loadingCases && cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading your acquisition cases...</span>
      </div>
    );
  }

  if (!loadingCases && cases.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Building2 size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">No Cases Registered Under Your Identity</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          There are currently no gazetted land acquisition cases associated with your account ({user?.identificationNumber || user?.email || user?.name}). Contact your appointed Land Administrator if you believe this is in error.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pt-6 sm:pt-8 pb-12 px-4 sm:px-6 lg:px-8 relative">
      {/* ------------------------------------------------------------- */}
      {/* MOBILE PULL-TO-REFRESH FLOATING ANIMATION INDICATOR           */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`sm:hidden fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ease-md-bouncy flex flex-col items-center gap-1 ${
          pullDistance > 10 || isMobileReloading
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
        style={{
          top: `${Math.max(16, pullDistance)}px`,
        }}
      >
        <div className="w-11 h-11 rounded-full bg-white dark:bg-md-surface-container border border-md-outline/25 shadow-xl flex items-center justify-center text-md-primary ring-4 ring-md-primary/15">
          <RotateCw
            size={20}
            className={`transition-transform duration-150 ${
              isMobileReloading ? 'animate-spin text-md-primary' : ''
            }`}
            style={{
              transform: isMobileReloading ? undefined : `rotate(${pullDistance * 4.5}deg)`,
            }}
          />
        </div>
        {isMobileReloading && (
          <span className="text-[10px] font-mono font-bold text-md-primary bg-white/95 dark:bg-md-surface px-2.5 py-0.5 rounded-full shadow-sm border border-md-outline/15">
            Reloading...
          </span>
        )}
      </div>

      {/* CASE SWITCHER & HERO SUMMARY CARD                             */}
      {/* ------------------------------------------------------------- */}
      <MemberCaseSummaryCard
        cases={cases}
        selectedCaseId={selectedCaseId}
        onCaseChange={handleCaseChange}
        onRefreshCase={fetchSelectedCaseDetails}
        loadingDetails={loadingDetails}
        caseDetails={caseDetails}
        parcel={parcel}
        locationString={locationString}
        offerStatusBadge={offerStatusBadge}
        activeOffer={activeOffer}
        activeValuation={activeValuation}
        currentStageNum={currentStageNum}
        totalCompensation={totalCompensation}
        metaParts={metaParts}
        hasOfferLetter={hasOfferLetter}
        progressPercent={progressPercent}
        progressBadge={progressBadge}
        onOpenOfferModal={() => setShowOfferModal(true)}
        onOpenCreateObjection={() => setShowCreateObjectionModal(true)}
        isOfferAccepted={isOfferAccepted}
        canCreateObjection={canCreateObjection}
        objectionDisabledReason={objectionDisabledReason}
        workflowSteps={workflowSteps}
        isCaseClosed={isCaseClosed}
      />

      {/* ------------------------------------------------------------- */}
      {/* MOBILE VIEW: TAB CARD (DROPDOWN + CONTENT LIKE ACQUISITION)   */}
      {/* ------------------------------------------------------------- */}
      <div className="sm:hidden bg-md-surface-container border border-md-outline/15 rounded-3xl p-5 shadow-xs space-y-4">
        {/* Mobile Tab Selector (Custom Dropdown with Rounded Option Box) */}
        <div className="relative z-30" ref={tabDropdownRef}>
          {/* Dropdown Trigger Button */}
          <button
            type="button"
            onClick={() => setTabDropdownOpen((prev) => !prev)}
            className="w-full bg-md-surface border border-md-outline/25 hover:border-md-outline/40 text-md-on-surface font-bold text-xs rounded-2xl py-3 pl-3.5 pr-4 focus:outline-none focus:ring-2 focus:ring-md-primary shadow-xs flex items-center justify-between cursor-pointer transition select-none"
            aria-expanded={tabDropdownOpen}
            aria-haspopup="listbox"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-violet-600 shrink-0">
                {activeTab === 'workflow' && <Layers className="w-4 h-4" />}
                {activeTab === 'objections' && <AlertCircle className="w-4 h-4" />}
                {activeTab === 'documents' && <FileText className="w-4 h-4" />}
                {activeTab === 'officer' && <UserCheck className="w-4 h-4" />}
              </span>
              <span className="truncate">
                {activeTab === 'workflow' && 'Workflow Timeline'}
                {activeTab === 'objections' && 'Objections'}
                {activeTab === 'documents' && 'Forms & Documents'}
                {activeTab === 'officer' && 'Assigned Officer'}
              </span>
              {activeTab === 'objections' && caseObjections.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800">
                  {caseObjections.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                tabDropdownOpen ? 'rotate-180 text-violet-600' : ''
              }`}
            />
          </button>

          {/* Dropdown Option Box with Border Radius and White Background */}
          {tabDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-md-surface border border-md-outline/25 rounded-2xl shadow-xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="space-y-1" role="listbox">
                <button
                  type="button"
                  role="option"
                  aria-selected={activeTab === 'workflow'}
                  onClick={() => {
                    handleTabChange('workflow');
                    setTabDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'workflow'
                      ? 'bg-md-primary/10 text-md-primary font-bold'
                      : 'text-md-on-surface-variant hover:bg-md-surface-container hover:text-md-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Layers className={`w-4 h-4 shrink-0 ${activeTab === 'workflow' ? 'text-violet-600' : 'text-slate-400'}`} />
                    <span className="truncate">Workflow Timeline</span>
                  </div>
                  {activeTab === 'workflow' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  role="option"
                  aria-selected={activeTab === 'objections'}
                  onClick={() => {
                    handleTabChange('objections');
                    setTabDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'objections'
                      ? 'bg-violet-50 text-violet-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertCircle className={`w-4 h-4 shrink-0 ${activeTab === 'objections' ? 'text-violet-600' : 'text-slate-400'}`} />
                    <span className="truncate">Objections</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {caseObjections.length > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          activeTab === 'objections'
                            ? 'bg-violet-200/80 text-violet-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {caseObjections.length}
                      </span>
                    )}
                    {activeTab === 'objections' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 shrink-0" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  role="option"
                  aria-selected={activeTab === 'documents'}
                  onClick={() => {
                    handleTabChange('documents');
                    setTabDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'documents'
                      ? 'bg-violet-50 text-violet-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'documents' ? 'text-violet-600' : 'text-slate-400'}`} />
                    <span className="truncate">Forms & Documents</span>
                  </div>
                  {activeTab === 'documents' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  role="option"
                  aria-selected={activeTab === 'officer'}
                  onClick={() => {
                    handleTabChange('officer');
                    setTabDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'officer'
                      ? 'bg-violet-50 text-violet-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserCheck className={`w-4 h-4 shrink-0 ${activeTab === 'officer' ? 'text-violet-600' : 'text-slate-400'}`} />
                    <span className="truncate">Assigned Officer</span>
                  </div>
                  {activeTab === 'officer' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Content wrapped inside the card */}
        <div className="pt-1">
          {tabContent}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP VIEW: PILL SELECTOR & TAB CONTENT                     */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden sm:block space-y-5">
        {/* Desktop Tab Selector (Pills) */}
        <div className="flex bg-md-surface-container-low p-1.5 rounded-2xl text-xs font-semibold overflow-x-auto no-scrollbar gap-1.5 border border-md-outline/15 shadow-xs">
          <button
            onClick={() => handleTabChange('workflow')}
            className={`flex-1 min-w-[100px] py-2 px-3.5 rounded-xl transition text-center flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'workflow'
                ? 'bg-md-surface text-md-primary shadow-sm font-bold ring-1 ring-md-outline/10'
                : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container/60'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Workflow</span>
          </button>

          <button
            onClick={() => handleTabChange('objections')}
            className={`flex-1 min-w-[100px] py-2 px-3.5 rounded-xl transition text-center flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'objections'
                ? 'bg-md-surface text-md-primary shadow-sm font-bold ring-1 ring-md-outline/10'
                : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container/60'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Objections</span>
            {caseObjections.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'objections' ? 'bg-md-primary/15 text-md-primary' : 'bg-md-surface-container-highest text-md-on-surface-variant'
              }`}>
                {caseObjections.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('documents')}
            className={`flex-1 min-w-[100px] py-2 px-3.5 rounded-xl transition text-center flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-md-surface text-md-primary shadow-sm font-bold ring-1 ring-md-outline/10'
                : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container/60'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Forms</span>
          </button>

          <button
            onClick={() => handleTabChange('officer')}
            className={`flex-1 min-w-[100px] py-2 px-3.5 rounded-xl transition text-center flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'officer'
                ? 'bg-md-surface text-md-primary shadow-sm font-bold ring-1 ring-md-outline/10'
                : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container/60'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Officer</span>
          </button>
        </div>
        {/* Desktop Tab Content */}
        <div>
          {tabContent}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SHARED CREATE OBJECTION MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      <CreateObjectionModal
        isOpen={showCreateObjectionModal}
        onClose={() => setShowCreateObjectionModal(false)}
        caseId={selectedCaseId}
        offerId={activeOffer?.offerId}
        userId={userId || user?.userId}
        onSuccess={async () => {
          setShowCreateObjectionModal(false);
          await loadMemberObjections();
          if (selectedCaseId) {
            await fetchSelectedCaseDetails(selectedCaseId);
          }
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* SHARED VIEW OBJECTION MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      <ViewObjectionModal
        isOpen={Boolean(viewObjection)}
        onClose={() => setViewObjection(null)}
        objection={viewObjection}
        showFullReviewLink={false}
      />

      {/* ------------------------------------------------------------- */}
      {/* SHARED EDIT OBJECTION MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      <EditObjectionModal
        isOpen={Boolean(editObjectionItem)}
        onClose={() => setEditObjectionItem(null)}
        objection={editObjectionItem}
        onSuccess={async () => {
          setEditObjectionItem(null);
          await loadMemberObjections();
          if (selectedCaseId) {
            await fetchSelectedCaseDetails(selectedCaseId);
          }
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* SHARED DELETE / WITHDRAW OBJECTION MODAL                      */}
      {/* ------------------------------------------------------------- */}
      <DeleteObjectionModal
        isOpen={Boolean(deleteObjectionId)}
        onClose={() => setDeleteObjectionId(null)}
        objectionId={deleteObjectionId}
        onSuccess={async () => {
          setDeleteObjectionId(null);
          await loadMemberObjections();
          if (selectedCaseId) {
            await fetchSelectedCaseDetails(selectedCaseId);
          }
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* OFFICIAL FORM H OFFER LETTER PREVIEW MODAL                    */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={showOfferModal && Boolean(hasOfferLetter && formattedOfferDetail)}
        onClose={() => setShowOfferModal(false)}
        title="Notice of Award - Form H Official Offer Letter"
        subtitle="Land Acquisition Act 1960 • Official Statutory Document"
        maxWidth="!max-w-5xl"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Official Form H Notice of Award & Compensation Schedule
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Link
                to={`/member/offer-letter?caseId=${selectedCaseId}&offerId=${activeOffer?.offerId || ''}`}
                onClick={() => setShowOfferModal(false)}
                className="px-3 py-2 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <span>Open Full Page</span>
                <ExternalLink size={13} />
              </Link>
              <Button
                variant="text"
                size="md"
                onClick={() => setShowOfferModal(false)}
              >
                Close Preview
              </Button>
              {isOfferAccepted ? (
                <Link
                  to={`/member/payment-status?caseId=${selectedCaseId}`}
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Manage Bank Details</span>
                </Link>
              ) : (
                <Link
                  to={`/member/payment-status?caseId=${selectedCaseId}`}
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept Award & Set Up Payout</span>
                </Link>
              )}
            </div>
          </div>
        }
      >
        {formattedOfferDetail && (
          <div className="py-2">
            <OfferLetterPreview offer={formattedOfferDetail} />
          </div>
        )}
      </Modal>
    </div>
  );
};
export default MemberDashboard;
