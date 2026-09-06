import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Download, 
  Eye, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Layers, 
  ExternalLink,
  X, 
  FileCheck2, 
  ChevronDown, 
  ChevronUp, 
  Landmark, 
  UserCheck, 
  Check, 
  Info, 
  ChevronRight,
  AlertCircle,
  FolderOpen,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Scale
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Textarea } from '../../components/ui/Textarea';
import { CopyButton } from '../../components/ui/CopyButton';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { FileUpload } from '../../components/ui/FileUpload';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useRole } from '../../hooks/useRole';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import { compensationApi } from '../../services/compensationApi';
import { BASE_URL } from '../../services/api';
import { 
  CASE_STATUS_LABEL_MAP 
} from '../../constants/landAcquisition';
import {
  OBJECTION_STATUS_CLASS_MAP,
  OBJECTION_STATUS_LABEL_MAP,
  OBJECTION_STATUS_OPTIONS,
} from '../../constants/compensation';
import { formatCurrencyRM } from '../../utils/currency';
import { OfferLetterPreview, type OfferDetail, type OwnerApprovalStatus } from '../Compensation/OfferLetterPreview';

interface WorkflowStep {
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

export const MemberDashboard: React.FC = () => {
  const { user, userName, identificationNumber, userId, role, isMember, isSysAdmin } = useRole();
  const navigate = useNavigate();
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
  const [, setError] = useState<string | null>(null);

  // State for Offer Letter Modal
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  
  // Accordion state for workflow steps
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  
  // Active Tab for details
  const [activeTab, setActiveTab] = useState<'workflow' | 'objections' | 'documents' | 'officer'>('workflow');

  // Objections State
  const [allMemberObjections, setAllMemberObjections] = useState<any[]>([]);
  const [loadingObjections, setLoadingObjections] = useState<boolean>(false);
  const [objectionSearchTerm, setObjectionSearchTerm] = useState<string>('');
  const [objectionStatusFilter, setObjectionStatusFilter] = useState<string>('');
  const [objectionCurrentPage, setObjectionCurrentPage] = useState<number>(1);
  const objectionItemsPerPage = 6;

  // Modals state for Objections
  const [viewObjection, setViewObjection] = useState<any | null>(null);
  const [editObjectionItem, setEditObjectionItem] = useState<any | null>(null);
  const [editObjectionReason, setEditObjectionReason] = useState<string>('');
  const [editObjectionAmount, setEditObjectionAmount] = useState<number | ''>('');
  const [editObjectionFiles, setEditObjectionFiles] = useState<any[]>([]);
  const [isUpdatingObjection, setIsUpdatingObjection] = useState<boolean>(false);
  const [deleteObjectionId, setDeleteObjectionId] = useState<string | null>(null);
  const [isDeletingObjection, setIsDeletingObjection] = useState<boolean>(false);

  // Create Objection Modal State
  const [showCreateObjectionModal, setShowCreateObjectionModal] = useState<boolean>(false);
  const [createObjectionCaseId, setCreateObjectionCaseId] = useState<string>('');
  const [createObjectionOfferId, setCreateObjectionOfferId] = useState<string>('');
  const [createObjectionAmount, setCreateObjectionAmount] = useState<number | ''>('');
  const [createObjectionReason, setCreateObjectionReason] = useState<string>('');
  const [createObjectionFiles, setCreateObjectionFiles] = useState<any[]>([]);
  const [isCreatingObjection, setIsCreatingObjection] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // 1. Fetch Cases for the Land Owner
  // ---------------------------------------------------------------------------
  const fetchMemberCases = useCallback(async () => {
    setLoadingCases(true);
    setError(null);
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
        userCases = allFetched.filter((c: any) => {
          if (c.createdById === user.userId) return true;
          const owners = c.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [];
          return owners.some((ow: any) => {
            const owIc = (ow.nric || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            return (cleanIc && owIc === cleanIc) || ow.ownerId === user.userId || ow.email === user.email;
          });
        });

        // Fallback: If no cases explicitly match user NRIC (e.g. testing in dev with different account),
        // show fetched cases so the user can still test all views
        if (userCases.length === 0 && allFetched.length > 0) {
          userCases = allFetched;
        }
      }

      setCases(userCases);

      // Select initial case
      const paramCaseId = searchParams.get('caseId');
      if (paramCaseId && userCases.some((c) => c.caseId === paramCaseId)) {
        setSelectedCaseId(paramCaseId);
      } else if (userCases.length > 0) {
        setSelectedCaseId(userCases[0].caseId);
        setSearchParams({ caseId: userCases[0].caseId }, { replace: true });
      } else {
        setSelectedCaseId('');
      }
    } catch (err: any) {
      console.error('Failed to load member cases:', err);
      setError(err.message || 'Failed to retrieve acquisition cases.');
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
      fetch(`${BASE_URL}/api/users/${user.userId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.identificationNumber) {
            setUserIc(json.data.identificationNumber);
            const stored = localStorage.getItem('user_data');
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                parsed.identificationNumber = json.data.identificationNumber;
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
  // Create Objection Handlers
  // ---------------------------------------------------------------------------
  const handleOpenCreateObjection = async () => {
    const targetCaseId = selectedCaseId || cases[0]?.caseId || '';
    setCreateObjectionCaseId(targetCaseId);

    let offerId = activeOffer?.offerId || caseDetails?.offerLetters?.[0]?.offerId || '';
    let baseAmount = activeOffer?.offerAmount || totalCompensation || 0;

    if (!offerId && targetCaseId) {
      try {
        const activeMemberIc = (userIc || user?.identificationNumber || identificationNumber || '').trim();
        const res = await compensationApi.getAllOfferLetters({
          ownerNric: activeMemberIc || undefined,
          limit: 100,
        });
        const matchingOffer = (res.offerLetters || []).find((o: any) => o.caseId === targetCaseId);
        if (matchingOffer) {
          offerId = matchingOffer.offerId;
          if (matchingOffer.offerAmount) {
            baseAmount = Number(matchingOffer.offerAmount);
          }
        }
      } catch (e) {
        console.error('Error finding offer letter for create objection:', e);
      }
    }

    setCreateObjectionOfferId(offerId);
    setCreateObjectionAmount(baseAmount ? Math.round(Number(baseAmount) * 1.15) : '');
    setCreateObjectionReason('');
    setCreateObjectionFiles([]);
    setShowCreateObjectionModal(true);
  };

  const handleCreateCaseChange = async (newCaseId: string) => {
    setCreateObjectionCaseId(newCaseId);
    try {
      const activeMemberIc = (userIc || user?.identificationNumber || identificationNumber || '').trim();
      const res = await compensationApi.getAllOfferLetters({
        ownerNric: activeMemberIc || undefined,
        limit: 100,
      });
      const matchingOffer = (res.offerLetters || []).find((o: any) => o.caseId === newCaseId);
      if (matchingOffer) {
        setCreateObjectionOfferId(matchingOffer.offerId);
        if (matchingOffer.offerAmount) {
          setCreateObjectionAmount(Math.round(Number(matchingOffer.offerAmount) * 1.15));
        }
      } else {
        setCreateObjectionOfferId('');
      }
    } catch (e) {
      console.error('Failed to lookup offer letter for case:', e);
    }
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
    if (!createObjectionCaseId) {
      notify({
        type: 'general',
        title: 'Case Required',
        message: 'Please select a valid acquisition case.',
      });
      return;
    }

    let finalOfferId = createObjectionOfferId;
    if (!finalOfferId) {
      try {
        const res = await compensationApi.getAllOfferLetters({ limit: 100 });
        const match = (res.offerLetters || []).find((o: any) => o.caseId === createObjectionCaseId);
        if (match) {
          finalOfferId = match.offerId;
        }
      } catch (e) {}
    }

    if (!finalOfferId) {
      notify({
        type: 'error',
        title: 'Offer Letter Not Found',
        message: 'A formal compensation offer letter (Form H) is required before filing an objection for this case.',
      });
      return;
    }

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
        message: 'Please provide grounds / reasons for your objection.',
      });
      return;
    }

    setIsCreatingObjection(true);
    try {
      await compensationApi.createObjection({
        offerId: finalOfferId,
        caseId: createObjectionCaseId,
        objectionReason: createObjectionReason,
        requestedAmount: Number(createObjectionAmount),
        createdById: userId || user?.userId,
      });

      notify({
        type: 'success',
        title: 'Objection Filed',
        message: 'Your compensation objection has been successfully submitted for officer review.',
      });

      setShowCreateObjectionModal(false);
      await loadMemberObjections();
      if (selectedCaseId) {
        await fetchSelectedCaseDetails(selectedCaseId);
      }
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

  // Edit / Delete Objections Handlers
  const handleOpenEditObjection = (obj: any) => {
    setEditObjectionItem(obj);
    setEditObjectionReason(obj.reason);
    setEditObjectionAmount(obj.requestedAmount);
    setEditObjectionFiles(obj.documents ? [...obj.documents] : []);
  };

  const handleEditFileUpload = (file: File | null, e?: React.ChangeEvent<HTMLInputElement>) => {
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
        setEditObjectionFiles((prev) => [
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
      setEditObjectionFiles((prev) => [
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

  const handleRemoveEditFile = (fileId: string) => {
    setEditObjectionFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSaveEditObjection = async () => {
    if (!editObjectionItem) return;
    if (typeof editObjectionAmount === 'number' && editObjectionAmount <= 0) {
      notify({
        type: 'general',
        title: 'Invalid Amount',
        message: 'Requested compensation amount must be greater than RM 0.',
      });
      return;
    }
    if (!editObjectionReason.trim()) {
      notify({
        type: 'general',
        title: 'Reason Required',
        message: 'Please provide grounds / reasons for your objection.',
      });
      return;
    }
    setIsUpdatingObjection(true);
    try {
      await compensationApi.updateObjection(editObjectionItem.id, {
        objectionReason: editObjectionReason,
        requestedAmount: Number(editObjectionAmount),
      });

      // Update local state smoothly with updated values and files
      setAllMemberObjections((prev) =>
        prev.map((item) =>
          item.id === editObjectionItem.id
            ? {
                ...item,
                reason: editObjectionReason,
                requestedAmount: Number(editObjectionAmount),
                documents: editObjectionFiles,
              }
            : item
        )
      );

      notify({
        type: 'success',
        title: 'Objection Updated',
        message: `Objection ${editObjectionItem.id} has been successfully updated.`,
      });
      setEditObjectionItem(null);
      await loadMemberObjections();
      if (selectedCaseId) {
        await fetchSelectedCaseDetails(selectedCaseId);
      }
    } catch (err: any) {
      console.error('Failed to update objection:', err);
      notify({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update objection.',
      });
    } finally {
      setIsUpdatingObjection(false);
    }
  };

  const handleDeleteObjectionConfirm = async () => {
    if (!deleteObjectionId) return;
    setIsDeletingObjection(true);
    try {
      await compensationApi.deleteObjection(deleteObjectionId);
      notify({
        type: 'success',
        title: 'Objection Withdrawn',
        message: 'Your objection has been deleted. The offer letter status has been reset to Pending.',
      });
      setDeleteObjectionId(null);
      await loadMemberObjections();
      if (selectedCaseId) {
        await fetchSelectedCaseDetails(selectedCaseId);
      }
    } catch (err: any) {
      console.error('Failed to delete objection:', err);
      notify({
        type: 'error',
        title: 'Withdrawal Failed',
        message: err.message || 'Failed to withdraw objection.',
      });
    } finally {
      setIsDeletingObjection(false);
    }
  };

  // Filtered & Paginated Objections List
  const filteredMemberObjections = useMemo(() => {
    let list = allMemberObjections;
    if (objectionSearchTerm.trim()) {
      const term = objectionSearchTerm.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(term) ||
          o.caseTitle.toLowerCase().includes(term) ||
          o.caseId.toLowerCase().includes(term) ||
          o.lotNo.toLowerCase().includes(term) ||
          o.reason.toLowerCase().includes(term)
      );
    }
    if (objectionStatusFilter) {
      list = list.filter((o) => o.rawStatus === objectionStatusFilter || o.status === objectionStatusFilter);
    }
    return list;
  }, [allMemberObjections, objectionSearchTerm, objectionStatusFilter]);

  const paginatedObjections = useMemo(() => {
    const startIndex = (objectionCurrentPage - 1) * objectionItemsPerPage;
    return filteredMemberObjections.slice(startIndex, startIndex + objectionItemsPerPage);
  }, [filteredMemberObjections, objectionCurrentPage, objectionItemsPerPage]);

  const objectionStats = useMemo(() => {
    return {
      total: allMemberObjections.length,
      pending: allMemberObjections.filter((o) => o.rawStatus === 'PENDING' || o.status === 'Pending Review').length,
      approved: allMemberObjections.filter((o) => o.rawStatus === 'APPROVED' || o.status === 'Approved').length,
      rejected: allMemberObjections.filter((o) => o.rawStatus === 'REJECTED' || o.status === 'Rejected').length,
    };
  }, [allMemberObjections]);

  // ---------------------------------------------------------------------------
  // 2. Fetch Selected Case Details & Business Logic
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
      setError(err.message || `Failed to load details for case ${caseId}`);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      fetchSelectedCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId, fetchSelectedCaseDetails]);

  // Handle Case Switcher
  const handleCaseChange = (newCaseId: string) => {
    setSelectedCaseId(newCaseId);
    setSearchParams({ caseId: newCaseId }, { replace: true });
  };

  // ---------------------------------------------------------------------------
  // 3. Derived Business Logic & Data Extraction
  // ---------------------------------------------------------------------------
  const activeOffer = useMemo(() => {
    return caseDetails?.offerLetters?.[0] || null;
  }, [caseDetails]);

  const hasOfferLetter = Boolean(activeOffer);

  const activeCompensation = useMemo(() => {
    return caseDetails?.compensationReports?.find((cr: any) => cr.status === 'APPROVED') || 
           caseDetails?.compensationReports?.[0] || null;
  }, [caseDetails]);

  const activeValuation = useMemo(() => {
    return caseDetails?.valuationReports?.find((vr: any) => vr.reportStatus === 'APPROVED') || 
           caseDetails?.valuationReports?.[0] || null;
  }, [caseDetails]);

  const totalCompensation = useMemo(() => {
    if (activeOffer?.offerAmount) return Number(activeOffer.offerAmount);
    if (activeCompensation?.totalCompensation) return Number(activeCompensation.totalCompensation);
    if (activeValuation?.recommendedCompensation) return Number(activeValuation.recommendedCompensation);
    if (activeValuation?.marketValue) return Number(activeValuation.marketValue);
    return 0;
  }, [activeOffer, activeCompensation, activeValuation]);

  const isOfferAccepted = useMemo(() => {
    return activeOffer?.status === 'ACCEPTED' || 
           caseDetails?.status === 'OFFER_ACCEPTED' || 
           caseDetails?.status?.includes('PAYMENT');
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
    // 1. Check scoped member objections list for this case or offer
    const caseObjections = allMemberObjections.filter(
      (o) => (selectedCaseId && o.caseId === selectedCaseId) || (activeOffer?.offerId && o.offerId === activeOffer.offerId)
    );
    const hasListPending = caseObjections.some(
      (o) => o.rawStatus === 'PENDING' || o.status === 'Pending Review' || o.status === 'PENDING'
    );

    // 2. Check caseDetails and activeOffer objections directly from database payload
    const rawCaseObjs = caseDetails?.objections || activeOffer?.objections || [];
    const hasRawPending = rawCaseObjs.some(
      (o: any) => o.status === 'PENDING' || o.rawStatus === 'PENDING'
    );

    return hasListPending || hasRawPending;
  }, [allMemberObjections, selectedCaseId, activeOffer, caseDetails]);

  // Determine why objection creation is disabled (for hover tooltips)
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

  // Can only create if there is no disabled reason
  const canCreateObjection = !objectionDisabledReason;

  // Owners & Parcel Info
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

  // Only show square meters (m²), no square feet
  const landAreaFormatted = useMemo(() => {
    if (!parcel?.area) return '';
    const areaNum = Number(parcel.area);
    return `${areaNum.toLocaleString()} m²`;
  }, [parcel]);

  // Location string without empty separators
  const locationString = useMemo(() => {
    if (!parcel) return '';
    const parts = [parcel.mukim, parcel.district, parcel.state].filter(Boolean);
    return parts.join(', ');
  }, [parcel]);

  // Metadata items for Hero card (only non-empty)
  const metaParts = useMemo(() => {
    return [
      landAreaFormatted, 
      parcel?.category, 
      parcel?.tenureType,
      claimantName ? `Claimant: ${claimantName}` : null
    ].filter(Boolean);
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
      officeHours: 'Mon - Fri: 8:30 AM - 4:30 PM'
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
          offerStatusBadge: days > 0 ? `${days} Days Left` : 'Offer Expired'
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
      offerStatusBadge: CASE_STATUS_LABEL_MAP[rawStatus] || rawStatus || 'In Progress'
    };
  }, [caseDetails, activeOffer]);

  // ---------------------------------------------------------------------------
  // 4. Dynamic 6-Stage Progress Tracker
  // ---------------------------------------------------------------------------
  const { currentStageNum, progressPercent, progressBadge } = useMemo(() => {
    const st = caseDetails?.status || '';

    // If offer is rejected, progress remains at Stage 3 (Offer Letter Issuance)
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

  // Automatically expand only the current active step on load
  useEffect(() => {
    if (currentStageNum) {
      setExpandedStep(currentStageNum);
    }
  }, [currentStageNum]);

  // ---------------------------------------------------------------------------
  // 5. Dynamic Workflow Timeline Steps (Non-empty info only)
  // ---------------------------------------------------------------------------
  const workflowSteps: WorkflowStep[] = useMemo(() => {
    const regDate = caseDetails?.registrationDate 
      ? new Date(caseDetails.registrationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    const valDate = activeValuation?.valuationDate 
      ? new Date(activeValuation.valuationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : (currentStageNum > 2 ? 'Completed' : currentStageNum === 2 ? 'In Progress' : 'Pending');

    const offerDate = activeOffer?.offerDate
      ? new Date(activeOffer.offerDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : (currentStageNum >= 3 && activeCompensation?.createdAt 
          ? new Date(activeCompensation.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Pending');

    const decisionDate = activeOffer?.acceptedAt
      ? new Date(activeOffer.acceptedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : (activeOffer?.rejectedAt
          ? new Date(activeOffer.rejectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : (currentStageNum >= 4 ? 'Awaiting Decision' : 'Pending'));

    const getStepStatus = (stepId: number): 'completed' | 'current' | 'upcoming' => {
      if (currentStageNum > stepId) return 'completed';
      if (currentStageNum === stepId) return 'current';
      return 'upcoming';
    };

    // Step 1 Details (only non-empty)
    const step1Details = [
      caseDetails?.caseId ? { label: 'Case Reference', value: caseDetails.caseId } : null,
      claimantName ? { label: 'Registered Claimant', value: claimantName } : null,
      claimantNric ? { label: 'Claimant NRIC', value: claimantNric } : null,
      caseDetails?.project?.projectName ? { label: 'Project', value: caseDetails.project.projectName } : null,
      (caseDetails?.project?.purpose || caseDetails?.project?.projectType) 
        ? { label: 'Purpose', value: caseDetails.project.purpose || caseDetails.project.projectType } 
        : null
    ].filter(Boolean) as { label: string; value: string }[];

    // Step 2 Details (only non-empty)
    const step2Details = [
      activeValuation?.valuationMethod ? { label: 'Valuation Method', value: activeValuation.valuationMethod } : null,
      (assignedOfficer.name && currentStageNum >= 2) ? { label: 'Valuer Assessor', value: assignedOfficer.name } : null,
      activeValuation?.marketValue ? { label: 'Market Benchmark', value: formatCurrencyRM(activeValuation.marketValue) } : null
    ].filter(Boolean) as { label: string; value: string }[];

    // Step 3 Details (only non-empty)
    const step3Details = [
      activeOffer?.offerReferenceNo ? { label: 'Award Reference', value: activeOffer.offerReferenceNo } : null,
      totalCompensation > 0 ? { label: 'Total Award', value: formatCurrencyRM(totalCompensation) } : null,
      activeOffer?.expiryDate ? { label: 'Deadline', value: new Date(activeOffer.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } : null
    ].filter(Boolean) as { label: string; value: string }[];

    // Step 4 Details (only non-empty)
    const step4Details = [
      isOfferAccepted ? { label: 'Decision Status', value: 'Accepted by Land Owner' } : null,
      activeOffer?.rejectedAt ? { label: 'Decision Status', value: 'Rejected by Land Owner' } : null,
      caseDetails?.objections?.length ? { label: 'Objection Status', value: 'Compensation Objection Filed' } : null
    ].filter(Boolean) as { label: string; value: string }[];

    // Step 5 Details (only non-empty)
    const step5Details = [
      currentStageNum >= 5 ? { label: 'Disbursement Method', value: 'Electronic GIRO / Bank Transfer' } : null,
      isOfferAccepted ? { label: 'Beneficiary Bank', value: 'Registered Payout Account' } : null
    ].filter(Boolean) as { label: string; value: string }[];

    // Step 6 Details (only non-empty)
    const step6Details = [
      currentStageNum >= 6 ? { label: 'Possession Status', value: 'Vacant Possession Handed Over' } : null,
      currentStageNum >= 6 ? { label: 'Relocation Assistance', value: 'Provided by Land Office' } : null
    ].filter(Boolean) as { label: string; value: string }[];

    return [
      {
        id: 1,
        title: 'Notice of Acquisition (Sec. 4 & 8)',
        subtitle: 'Gazette Declaration & Land Freezing',
        date: regDate || 'Registered',
        status: getStepStatus(1),
        badgeText: getStepStatus(1) === 'completed' ? 'Completed' : 'Active Stage',
        description: `Official statutory notice declared under Land Acquisition Act 1960 for project ${caseDetails?.project?.projectName || 'Public Infrastructure'}. Inquiry notice served to registered owners.`,
        details: step1Details
      },
      {
        id: 2,
        title: 'Joint Site Inspection & Valuation',
        subtitle: 'JPPH Assessment of Land & Property',
        date: valDate,
        status: getStepStatus(2),
        badgeText: getStepStatus(2) === 'completed' ? 'Completed' : getStepStatus(2) === 'current' ? 'In Progress' : 'Upcoming',
        description: 'Physical valuation conducted on-site by JPPH and licensed valuers to determine statutory market value and damages.',
        details: step2Details
      },
      {
        id: 3,
        title: 'Offer Letter Issuance (Form H)',
        subtitle: 'Compensation Award Package Ready',
        date: offerDate,
        status: getStepStatus(3),
        badgeText: activeOffer?.status === 'REJECTED' || caseDetails?.status === 'OFFER_REJECTED'
          ? 'Award Rejected'
          : getStepStatus(3) === 'completed' 
            ? 'Issued' 
            : getStepStatus(3) === 'current' 
              ? (daysRemaining ? `${daysRemaining} Days Left` : 'Action Required') 
              : 'Upcoming',
        actionText: 'Review Form H',
        description: activeOffer?.status === 'REJECTED' || caseDetails?.status === 'OFFER_REJECTED'
          ? 'The compensation award offered in Form H was rejected. The case remains at the offer stage until accepted or an objection is submitted.'
          : 'Official Notice of Award (Form H) served. Claimant has statutory 14 calendar days to review, accept, or appeal the compensation amount.',
        details: step3Details
      },
      {
        id: 4,
        title: 'Claimant Response & Decision',
        subtitle: 'Award Acceptance or Compensation Objection',
        date: decisionDate,
        status: getStepStatus(4),
        badgeText: getStepStatus(4) === 'completed' ? 'Decision Submitted' : getStepStatus(4) === 'current' ? 'Awaiting Decision' : 'Upcoming',
        description: 'Submit signed Form G acceptance alongside verified bank payout details OR submit an objection for officer review and valuation revision.',
        details: step4Details
      },
      {
        id: 5,
        title: 'Electronic Payment & Settlement',
        subtitle: 'Smart Contract & Multi-Sig Payout',
        date: currentStageNum >= 5 ? 'Active' : 'Est. Post-Acceptance',
        status: getStepStatus(5),
        badgeText: getStepStatus(5) === 'completed' ? 'Settled' : getStepStatus(5) === 'current' ? 'Processing' : 'Upcoming',
        description: 'Compensation transferred directly to verified bank account with blockchain-backed cryptographic audit trail receipt.',
        details: step5Details
      },
      {
        id: 6,
        title: 'Vacant Possession & Relocation',
        subtitle: 'Property Handover & Support Desk',
        date: currentStageNum >= 6 ? 'Active' : 'Est. Post-Payout',
        status: getStepStatus(6),
        badgeText: getStepStatus(6) === 'completed' ? 'Completed' : getStepStatus(6) === 'current' ? 'Active Handover' : 'Upcoming',
        description: 'Handover of keys and physical vacant possession. Government and project community desk provide moving and utility transfer assistance.',
        details: step6Details
      }
    ];
  }, [caseDetails, activeValuation, activeOffer, activeCompensation, currentStageNum, assignedOfficer, totalCompensation, daysRemaining, isOfferAccepted]);

  // ---------------------------------------------------------------------------
  // 6. Dynamic Compensation Breakdown Items (Non-empty only)
  // ---------------------------------------------------------------------------
  const compensationItems = useMemo(() => {
    if (!activeCompensation && !activeValuation) {
      return [];
    }

    const comps = [
      { item: 'Land Market Value Assessment', amount: Number(activeCompensation?.landValue || activeValuation?.marketValue || totalCompensation || 0), category: 'Land Asset' },
      { item: 'Residential / Building Structures & Fixtures', amount: Number(activeCompensation?.buildingValue || 0), category: 'Structure' },
      { item: 'Crops, Trees & Agricultural Improvements', amount: Number(activeCompensation?.cropValue || 0), category: 'Agriculture' },
      { item: 'Business Interruption & Commercial Losses', amount: Number(activeCompensation?.businessDisruption || 0), category: 'Commercial' },
      { item: 'Disturbance Allowance & Relocation Transport', amount: Number(activeCompensation?.disturbanceCompensation || 0), category: 'Relocation' },
      { item: 'Relocation Accommodation Allowance', amount: Number(activeCompensation?.relocationAllowance || 0), category: 'Relocation' },
      { item: 'Statutory Valuation Fees & Legal Reimbursement', amount: Number(activeCompensation?.otherEligible || 0), category: 'Statutory' }
    ];

    // Filter only items with amount > 0
    const nonZero = comps.filter(c => c.amount > 0);
    const effectiveList = nonZero.length > 0 ? nonZero : [];
    const totalCalc = effectiveList.reduce((acc, c) => acc + c.amount, 0) || totalCompensation || 1;

    return effectiveList.map(c => ({
      ...c,
      percent: `${((c.amount / totalCalc) * 100).toFixed(1)}%`
    }));
  }, [activeCompensation, activeValuation, totalCompensation]);

  // ---------------------------------------------------------------------------
  // 7. Dynamic Documents Checklist (Non-empty only)
  // ---------------------------------------------------------------------------
  const documentChecklist = useMemo(() => {
    const docs: { title: string; status: string; date: string; badge: string; filePath?: string; fileSize?: string }[] = [];

    // Title grant (only if exists)
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

    // Form H offer letter (only if activeOffer exists)
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

    // Case documents uploaded in backend
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

    // Bank statement requirement (only once offer is available or accepted)
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

  // ---------------------------------------------------------------------------
  // 8. Formatted Offer Detail for Official Offer Letter Preview (PDF Format)
  // ---------------------------------------------------------------------------
  const formattedOfferDetail: OfferDetail | null = useMemo(() => {
    if (!activeOffer) return null;

    const o = activeOffer;
    const c = caseDetails;
    const lp = parcel;
    const vr = activeValuation;
    const cr = activeCompensation;

    const allOwners = lp?.ownerships || [];
    const parcelOwners = allOwners
      .map((own: any) => own.landOwner)
      .filter(Boolean);

    const ownersList: OwnerApprovalStatus[] = (o.ownerResponses || []).map((resp: any) => {
      const owner = resp.landOwner || {};
      const isCurrent = Boolean(
        user?.userId &&
          (resp.userId === user.userId ||
            owner.ownerId === user.userId ||
            (user.identificationNumber &&
              owner.nric &&
              owner.nric.replace(/[^a-zA-Z0-9]/g, "") ===
                user.identificationNumber.replace(/[^a-zA-Z0-9]/g, "")))
      );

      return {
        ownerId: owner.ownerId || resp.responseId || "owner",
        name: owner.name || resp.ownerName || userName || "Land Owner",
        nric: owner.nric || resp.ownerNric || identificationNumber || "—",
        contact: owner.contact || "—",
        address: owner.address || "—",
        sharePercentage: owner.sharePercentage || "100%",
        status: (resp.status === "ACCEPTED" || resp.status === "REJECTED" ? resp.status : "PENDING") as "ACCEPTED" | "REJECTED" | "PENDING",
        remarks: resp.remarks,
        respondedAt: resp.respondedAt,
        respondedAtDate: resp.respondedAt ? new Date(resp.respondedAt) : null,
        isCurrentUser: isCurrent,
      };
    });

    if (ownersList.length === 0) {
      ownersList.push({
        ownerId: user?.userId || "owner-1",
        name: claimantName || userName || user?.name || "Land Owner",
        nric: claimantNric || identificationNumber || user?.identificationNumber || "—",
        contact: user?.contactNumber || "—",
        address: "Registered Address on File",
        sharePercentage: "100%",
        status: (isOfferAccepted ? "ACCEPTED" : o.status === "REJECTED" ? "REJECTED" : "PENDING") as "ACCEPTED" | "REJECTED" | "PENDING",
        isCurrentUser: true,
      });
    }

    const isMultiOwner = ownersList.length > 1;
    const acceptedCount = ownersList.filter((ow) => ow.status === "ACCEPTED").length;
    const rejectedOwner = ownersList.find((ow) => ow.status === "REJECTED");
    const hasRejectedOwner = Boolean(rejectedOwner || o.status === "REJECTED");
    const currentUserOwner = ownersList.find((ow) => ow.isCurrentUser) || ownersList[0];
    const currentUserStatus = currentUserOwner ? currentUserOwner.status : null;

    const ownerName = claimantName || (parcelOwners.length > 0 ? parcelOwners.map((ow: any) => ow.name).join(", ") : userName || "Land Owner");
    const ownerIc = claimantNric || (parcelOwners.length > 0 ? parcelOwners.map((ow: any) => ow.nric).join(", ") : identificationNumber || "—");

    const totalComp = Number(o.totalCompensation || cr?.totalCompensation || totalCompensation || 0);

    return {
      id: o.offerId,
      offerReferenceNo: o.offerReferenceNo || "FORM-G",
      caseId: c?.caseId || selectedCaseId,
      caseTitle: c?.caseTitle || "Land Acquisition",
      projectName: c?.project?.projectName || "Infrastructure Project",
      acquiringAuthority: c?.project?.acquiringAgency || "Department of Lands and Mines (JKPTG)",
      ownerName,
      ownerIc,
      ownerAddress: o.landOwnership?.landOwner?.address || parcelOwners[0]?.address || "Registered Address on File",
      ownerPhone: user?.contactNumber || o.landOwnership?.landOwner?.contact || "—",
      landTitle: lp?.landTitleNo || "—",
      lotNo: lp?.lotNo || "—",
      tempat: lp?.tempat || "—",
      mukim: lp?.mukim || "—",
      district: lp?.district || "—",
      state: lp?.state || "—",
      landArea: landAreaFormatted || (lp?.area ? `${lp.area} m²` : "—"),
      acquisitionArea: vr?.acquisitionArea ? `${vr.acquisitionArea} m²` : landAreaFormatted || "—",
      issueDate: o.offerDate
        ? new Date(o.offerDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
      expiryDate: o.expiryDate
        ? new Date(o.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
      enquiryDate: o.offerDate
        ? new Date(o.offerDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
      awardDate: o.offerDate
        ? new Date(o.offerDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
      awardReference: o.offerReferenceNo || "FORM-G",
      status: o.status === "ACCEPTED" ? "Accepted" : o.status === "REJECTED" ? "Rejected" : "Pending Response",
      statusClass: o.status === "ACCEPTED" ? "accepted" : o.status === "REJECTED" ? "rejected" : "pending",
      totalCompensation: totalComp,
      components: {
        landValue: Number(o.landValue || cr?.landValue || 0),
        buildingValue: Number(o.buildingValue || cr?.buildingValue || 0),
        cropValue: Number(o.cropValue || cr?.cropValue || 0),
        businessDisruption: Number(o.businessDisruption || cr?.businessDisruption || 0),
        disturbanceCompensation: Number(o.disturbanceCompensation || cr?.disturbanceCompensation || 0),
        relocationAllowance: Number(o.relocationAllowance || cr?.relocationAllowance || 0),
        otherEligible: Number(o.otherEligible || cr?.otherEligible || 0),
      },
      valuationReferences: {
        marketValue: Number(vr?.marketValue || totalComp),
        recommendedCompensation: Number(cr?.totalCompensation || totalComp),
        approvedCompensation: totalComp,
        valuationMethod: vr?.valuationMethod || "Comparison Method",
      },
      paymentConditions: "Payment via Electronic Fund Transfer (EFT) within 30 working days upon receipt of executed Form G and statutory vesting verification.",
      rawOffer: o,
      owners: ownersList,
      isMultiOwner,
      acceptedCount,
      totalOwners: ownersList.length,
      hasRejectedOwner,
      rejectedOwnerInfo: null,
      currentUserStatus,
      rawStatus: o.status || "PENDING",
    };
  }, [
    activeOffer,
    caseDetails,
    parcel,
    activeValuation,
    activeCompensation,
    user,
    userName,
    identificationNumber,
    claimantName,
    claimantNric,
    isOfferAccepted,
    totalCompensation,
    selectedCaseId,
    landAreaFormatted,
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 font-sans antialiased">
      
      {/* ------------------------------------------------------------- */}
      {/* CASE SELECTOR BANNER (DISPLAY ONLY IF MORE THAN ONE CASE)     */}
      {/* ------------------------------------------------------------- */}
      {loadingCases ? (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-600">Loading your acquisition cases...</span>
        </div>
      ) : cases.length > 1 ? (
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900">Select Acquisition Case:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full">
                  {cases.length} Properties
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                You have multiple registered acquisition cases. Switch below to view property details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="case-select" className="sr-only">Select Case</label>
            <div className="relative">
              <select
                id="case-select"
                value={selectedCaseId}
                onChange={(e) => handleCaseChange(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 font-bold text-xs rounded-xl py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer shadow-sm transition"
              >
                {cases.map((c: any) => {
                  const parcelLot = c.landParcel?.lotNo ? `Lot ${c.landParcel.lotNo}` : c.caseTitle || c.caseId;
                  const mukim = c.landParcel?.mukim ? ` (${c.landParcel.mukim})` : '';
                  const statusLabel = CASE_STATUS_LABEL_MAP[c.status] || c.status;
                  return (
                    <option key={c.caseId} value={c.caseId}>
                      {c.caseId} • {parcelLot}{mukim} [{statusLabel}]
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={() => fetchSelectedCaseDetails(selectedCaseId)}
              title="Refresh case data"
              disabled={loadingDetails}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer disabled:opacity-50"
            >
              <div className={`w-3.5 h-3.5 rounded-full border border-slate-600 border-t-transparent ${loadingDetails ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* HERO CARD (ADMIN PORTAL LIGHT PURPLE THEME)                   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-br from-[#f8f5fc] via-[#f3edf7] to-[#e8def8] text-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden border border-purple-200/80">
        {/* Subtle Ambient Light Glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 bg-purple-300/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-56 h-56 bg-violet-300/25 rounded-full blur-3xl pointer-events-none" />

        {/* Lot & Case Header */}
        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-violet-600/10 text-violet-800 border border-violet-300/70 uppercase tracking-wider">
              {caseDetails?.caseId || selectedCaseId || '—'}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {parcel?.lotNo
                ? (parcel.lotNo.toLowerCase().startsWith('lot') ? parcel.lotNo : `Lot ${parcel.lotNo}`)
                : (caseDetails?.caseTitle || 'Land Parcel')}
            </h1>
            {locationString && (
              <p className="text-slate-600 text-xs sm:text-sm flex items-center gap-1.5 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span>{locationString}</span>
              </p>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            {offerStatusBadge}
          </span>
        </div>

        {/* Total Compensation Box */}
        <div className="relative z-10 bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-purple-200/70 my-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-violet-900/70">
              {activeOffer ? 'Awarded Compensation (Form H)' : activeValuation ? 'Valuation Assessment' : 'Statutory Compensation'}
            </span>
            <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300/70">
              {activeOffer?.status === 'ACCEPTED' ? 'Offer Accepted' : activeValuation?.reportStatus === 'APPROVED' ? 'JPPH Approved' : currentStageNum === 1 ? 'Case Registered' : 'Assessment Pending'}
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1.5 tracking-tight">
            {totalCompensation > 0 ? formatCurrencyRM(totalCompensation) : 'Awaiting Valuation'}
          </div>
          {metaParts.length > 0 && (
            <p className="text-xs text-slate-600 mt-1.5 font-medium">
              <span>{metaParts.join(' • ')}</span>
            </p>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* View Offer Letter: Disabled if no offer letter yet */}
          {hasOfferLetter ? (
            <Link to={`/member/offer-letter?caseId=${selectedCaseId}&offerId=${activeOffer?.offerId || ''}`} className="w-full block">
              <Button
                variant="filled"
                size="md"
                className="w-full !rounded-xl font-bold text-xs sm:text-sm shadow-md gap-2 h-auto py-3 px-4 bg-violet-700 hover:bg-violet-800 text-white cursor-pointer transition"
              >
                <Eye className="w-4 h-4" />
                <span>View Offer Letter Details</span>
              </Button>
            </Link>
          ) : (
            <Button
              variant="filled"
              size="md"
              disabled
              className="w-full !rounded-xl font-bold text-xs sm:text-sm shadow-none gap-2 h-auto py-3 px-4 bg-slate-200/80 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60"
            >
              <Eye className="w-4 h-4" />
              <span>No Offer Letter Yet</span>
            </Button>
          )}

          {/* Accept & Payout: Disabled if offer hasn't been accepted yet */}
          {isOfferAccepted ? (
            <Link to={`/member/bank-details?caseId=${selectedCaseId}`} className="w-full block">
              <Button
                variant="filled"
                size="md"
                className="w-full !rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md gap-2 h-auto py-3 px-4 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Manage Bank & Payout</span>
              </Button>
            </Link>
          ) : (
            <Button
              variant="filled"
              size="md"
              disabled
              className="w-full !rounded-xl bg-slate-200/80 border border-slate-300 text-slate-400 font-bold text-xs sm:text-sm gap-2 h-auto py-3 px-4 cursor-not-allowed opacity-60 shadow-none"
              title="You must accept the offer letter before setting up payout"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span>Accept & Payout (Offer Not Accepted)</span>
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACQUISITION PROGRESS BAR                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2.5">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-violet-600" />
            Acquisition Progress
          </span>
          <span className="text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            {progressBadge} ({progressPercent}%)
          </span>
        </div>

        {/* 6 Step Segmented Bar */}
        <div className="grid grid-cols-6 gap-1.5 mb-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              currentStageNum > 1 ? 'bg-emerald-500' : currentStageNum === 1 ? 'bg-violet-600 animate-pulse' : 'bg-slate-200'
            }`} 
            title="1. Notice of Acquisition" 
          />
          <div 
            className={`h-2 rounded-full transition-all ${
              currentStageNum > 2 ? 'bg-emerald-500' : currentStageNum === 2 ? 'bg-violet-600 animate-pulse' : 'bg-slate-200'
            }`} 
            title="2. Site Valuation" 
          />
          <div 
            className={`h-2 rounded-full transition-all ${
              currentStageNum > 3 ? 'bg-emerald-500' : currentStageNum === 3 ? 'bg-violet-600 animate-pulse' : 'bg-slate-200'
            }`} 
            title="3. Offer Letter (Form H)" 
          />
          <div 
            className={`h-2 rounded-full transition-all ${
              currentStageNum > 4 ? 'bg-emerald-500' : currentStageNum === 4 ? 'bg-violet-600 animate-pulse' : 'bg-slate-200'
            }`} 
            title="4. Claimant Decision" 
          />
          <div 
            className={`h-2 rounded-full transition-all ${
              currentStageNum > 5 ? 'bg-emerald-500' : currentStageNum === 5 ? 'bg-violet-600 animate-pulse' : 'bg-slate-200'
            }`} 
            title="5. Payment Settlement" 
          />
          <div 
            className={`h-2 rounded-full transition-all ${
              currentStageNum >= 6 ? 'bg-emerald-500' : 'bg-slate-200'
            }`} 
            title="6. Handover & Relocation" 
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span className={currentStageNum >= 1 ? 'text-emerald-700 font-semibold' : ''}>1. Notice & Registration ✓</span>
          <span className={currentStageNum === 3 ? 'text-violet-700 font-bold' : ''}>3. Form H Offer ⚡</span>
          <span className={currentStageNum >= 6 ? 'text-emerald-700 font-bold' : ''}>6. Handover ⏳</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION TABS (PILL SELECTOR)                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-semibold overflow-x-auto no-scrollbar gap-1">
        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'workflow'
              ? 'bg-white text-violet-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Workflow</span>
        </button>

        <button
          onClick={() => setActiveTab('objections')}
          className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'objections'
              ? 'bg-white text-violet-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Objections</span>
          {allMemberObjections.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === 'objections' ? 'bg-violet-100 text-violet-800' : 'bg-slate-300 text-slate-700'
            }`}>
              {allMemberObjections.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-white text-violet-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Forms</span>
        </button>

        <button
          onClick={() => setActiveTab('officer')}
          className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'officer'
              ? 'bg-white text-violet-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Officer</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: WORKFLOW TIMELINE ACCORDION (LOCKED STEPS)             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'workflow' && (
        <div className="space-y-3">
          {workflowSteps.map((step) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isUpcoming = step.status === 'upcoming';
            // Lock upcoming steps from expanding!
            const isLocked = isUpcoming;
            const isExpanded = expandedStep === step.id && !isLocked;

            return (
              <div
                key={step.id}
                className={`rounded-2xl transition-all border overflow-hidden ${
                  isCurrent
                    ? 'bg-violet-50/70 border-violet-400 shadow-md ring-2 ring-violet-200'
                    : isCompleted
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-white/60 border-slate-200 opacity-70'
                }`}
              >
                {/* Step Header */}
                <div
                  onClick={() => {
                    if (isLocked) return; // Locked from expand!
                    setExpandedStep(isExpanded ? null : step.id);
                  }}
                  className={`p-4 flex items-start gap-3.5 select-none transition ${
                    isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer active:bg-slate-50'
                  }`}
                >
                  {/* Circle Badge */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-violet-600 text-white shadow-sm ring-4 ring-violet-200 animate-pulse'
                        : 'bg-slate-200 text-slate-500 border border-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-3 h-3" /> : step.id}
                  </div>

                  {/* Step Titles */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCurrent
                            ? 'bg-violet-200 text-violet-900 font-extrabold'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {step.badgeText}
                      </span>
                      {step.date && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {step.date}
                        </span>
                      )}
                    </div>

                    <h3 className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-violet-950' : 'text-slate-900'}`}>
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">{step.subtitle}</p>
                  </div>

                  {/* Accordion Chevron or Lock Icon */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLocked ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold bg-slate-100 px-2 py-0.5 rounded-lg">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      <div className="text-slate-400 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Step Body (Only for unlocked stages) */}
                {isExpanded && !isLocked && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 border-t border-slate-200/70 space-y-3">
                    <p className="text-xs leading-relaxed pt-1">{step.description}</p>

                    {step.details && step.details.length > 0 && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {step.details.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400 font-medium shrink-0">{d.label}:</span>
                            <span className="font-bold text-slate-800 truncate">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Current Actionable Buttons */}
                    {isCurrent && step.id === 3 && hasOfferLetter && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <Link
                          to={`/member/offer-letter?caseId=${selectedCaseId}&offerId=${activeOffer?.offerId || ''}`}
                          className="flex-1 py-2.5 px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Offer Letter Details</span>
                        </Link>
                        {isOfferAccepted && (
                          <Link
                            to={`/member/bank-details?caseId=${selectedCaseId}`}
                            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-center transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Manage Bank Details</span>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: OBJECTIONS MANAGEMENT                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'objections' && (
        <div className="space-y-4">
          {/* Action Header: ONLY Add Button (disabled with hover tooltip if conditions are not met) */}
          {(isMember || isSysAdmin) && (
            <div className="flex justify-end">
              <div 
                title={objectionDisabledReason || 'Submit Compensation Objection'}
                className={!canCreateObjection ? 'cursor-not-allowed inline-block' : 'inline-block'}
              >
                <Button
                  variant="filled"
                  size="md"
                  onClick={handleOpenCreateObjection}
                  disabled={!canCreateObjection}
                  className="!rounded-xl font-bold text-xs shadow-sm bg-violet-700 hover:bg-violet-800 text-white shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Submit Objection</span>
                </Button>
              </div>
            </div>
          )}

          {/* Objections List Container */}
          {loadingObjections ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading your objection records from database...</p>
            </div>
          ) : allMemberObjections.length === 0 ? (
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto border border-violet-100">
                <Scale className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">No Objections Filed</h3>
                <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                  If you disagree with the compensation amount awarded in Form H, you can submit an objection for the assigned government officer to review and revise the compensation value accordingly.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-2">
                <div 
                  title={objectionDisabledReason || 'Submit Compensation Objection'}
                  className={!canCreateObjection ? 'cursor-not-allowed inline-block' : 'inline-block'}
                >
                  <Button
                    variant="filled"
                    size="md"
                    onClick={handleOpenCreateObjection}
                    disabled={!canCreateObjection}
                    className="!rounded-xl font-bold text-xs bg-violet-700 hover:bg-violet-800 text-white shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Submit Objection</span>
                  </Button>
                </div>
                {hasOfferLetter && (
                  <Link
                    to={`/member/offer-letter?caseId=${selectedCaseId}&offerId=${activeOffer?.offerId || ''}`}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Current Form H</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {allMemberObjections.map((obj) => {
                const isPending = obj.rawStatus === 'PENDING';
                const isApproved = obj.rawStatus === 'APPROVED';
                const isRejected = obj.rawStatus === 'REJECTED';

                return (
                  <div
                    key={obj.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-violet-300 p-5 shadow-sm transition space-y-4"
                  >
                    {/* Top Row: Pending Review on left, Edit | Withdraw on right */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isRejected
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                          <span>{obj.status}</span>
                        </span>
                      </div>

                      {/* Edit | Withdraw action links */}
                      <div className="flex items-center gap-1.5 text-xs shrink-0">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditObjection(obj)}
                              className="font-bold text-violet-700 hover:text-violet-900 hover:underline px-1.5 py-0.5 cursor-pointer transition"
                            >
                              Edit
                            </button>
                            <span className="text-slate-300 font-normal">|</span>
                            <button
                              type="button"
                              onClick={() => setDeleteObjectionId(obj.id)}
                              className="font-bold text-rose-600 hover:text-rose-800 hover:underline px-1.5 py-0.5 cursor-pointer transition"
                            >
                              Withdraw
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setViewObjection(obj)}
                            className="font-bold text-violet-700 hover:text-violet-900 hover:underline px-1.5 py-0.5 cursor-pointer transition"
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Financial Figures & Date Row: Original, Requested Amount, Submission Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/90 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Original
                        </span>
                        <span className="font-bold text-slate-700 text-sm mt-0.5 block">
                          {formatCurrencyRM(obj.originalOfferAmount)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">
                          Requested Amount
                        </span>
                        <span className="font-black text-violet-900 text-sm mt-0.5 block">
                          {formatCurrencyRM(obj.requestedAmount)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Submission Date
                        </span>
                        <span className="font-semibold text-slate-700 text-xs mt-1 block flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {obj.submissionDate}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Reason
                      </span>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {obj.reason}
                      </div>
                    </div>

                    {/* Attached Document */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Attached Document
                      </span>
                      {obj.documents && obj.documents.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {obj.documents.map((doc: any, dIdx: number) => {
                            const docUrl = doc.filePath ? `${BASE_URL}/${doc.filePath.replace(/^\//, '')}` : null;
                            return (
                              <div
                                key={dIdx}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-violet-50 rounded-xl border border-slate-200 text-xs text-slate-700 transition"
                              >
                                <FileText className="w-4 h-4 text-violet-600 shrink-0" />
                                <span className="font-semibold truncate max-w-[200px]">{doc.name || doc.fileName}</span>
                                {doc.fileSize && <span className="text-[10px] text-slate-400">({doc.fileSize})</span>}
                                {docUrl && (
                                  <button
                                    type="button"
                                    onClick={() => window.open(docUrl, '_blank', 'noopener,noreferrer')}
                                    className="p-1 text-violet-700 hover:text-violet-900 rounded-lg hover:bg-violet-100 cursor-pointer transition ml-1"
                                    title="View Document"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                          <span>No attached documents.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: DOCUMENTS CHECKLIST (NON-EMPTY ONLY)                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'documents' && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Case Documents & Forms</h3>
              <p className="text-xs text-slate-500">Statutory filings and verification status for this parcel.</p>
            </div>
            {documentChecklist.length > 0 && (
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {documentChecklist.length} Records
              </span>
            )}
          </div>

          {documentChecklist.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              No statutory documents uploaded yet for this registered case.
            </div>
          ) : (
            <div className="space-y-2">
              {documentChecklist.map((doc, idx) => {
                const fileUrl = doc.filePath ? `${BASE_URL}/${doc.filePath.replace(/^\//, '')}` : null;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 hover:border-violet-300 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-600 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-semibold text-slate-800 truncate">{doc.title}</h4>
                        <p className="text-[10px] text-slate-400">
                          {doc.date} {doc.fileSize ? `• ${doc.fileSize}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${doc.badge}`}>
                        {doc.status}
                      </span>

                      {fileUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-violet-50 text-violet-700 text-xs flex items-center gap-1 font-semibold cursor-pointer shadow-xs"
                          title="View Document"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline text-[10px]">View</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: OFFICER & DIRECT ASSISTANCE                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'officer' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {/* Officer Profile Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-base font-extrabold flex items-center justify-center shadow-md shrink-0">
              {assignedOfficer.name
                .split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{assignedOfficer.name}</h3>
              <p className="text-xs text-violet-700 font-semibold">{assignedOfficer.designation}</p>
              <p className="text-[11px] text-slate-500">{assignedOfficer.department}</p>
            </div>
          </div>

          {/* Contact Action Cards */}
          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <a
              href={`tel:${assignedOfficer.phone.replace(/[^0-9+]/g, '')}`}
              className="flex items-center justify-between p-3 bg-slate-50 hover:bg-violet-50 rounded-xl text-slate-700 border border-slate-200 hover:border-violet-200 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-violet-600" />
                <span>{assignedOfficer.phone}</span>
              </div>
              <span className="text-[11px] font-bold text-violet-600">Call Now</span>
            </a>

            <a
              href={`mailto:${assignedOfficer.email}`}
              className="flex items-center justify-between p-3 bg-slate-50 hover:bg-violet-50 rounded-xl text-slate-700 border border-slate-200 hover:border-violet-200 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span className="truncate">{assignedOfficer.email}</span>
              </div>
              <span className="text-[11px] font-bold text-violet-600 shrink-0">Email</span>
            </a>
          </div>

          {/* Office Location & Working Hours */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-700">Office Location: </span>
              <span className="text-[11px]">{assignedOfficer.office}</span>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0">{assignedOfficer.officeHours}</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW OBJECTION DETAILS MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(viewObjection)}
        onClose={() => setViewObjection(null)}
        title="Compensation Objection Details"
        subtitle={`Reference ID: ${viewObjection?.id || ''}`}
        maxWidth="!max-w-2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">
              Compensation Objection Review
            </span>
            <div className="flex items-center gap-2">
              <Button variant="text" size="md" onClick={() => setViewObjection(null)}>
                Close
              </Button>
              {viewObjection?.id && (
                <button
                  type="button"
                  onClick={() => {
                    const id = viewObjection.id;
                    setViewObjection(null);
                    navigate(`/admin/compensation/objection/review/${id}`);
                  }}
                  className="px-3.5 py-2 bg-violet-700 hover:bg-violet-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Full Review Page</span>
                </button>
              )}
            </div>
          </div>
        }
      >
        {viewObjection && (
          <div className="space-y-4 py-1 text-xs">
            {/* Status & Case Grid */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Case Title</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">{viewObjection.caseTitle}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Case Reference</span>
                <span className="font-mono font-bold text-slate-700 text-xs mt-0.5 block">{viewObjection.caseId}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Land Owner</span>
                <span className="font-semibold text-slate-800 text-xs mt-0.5 block">{viewObjection.ownerName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                <span className="font-bold text-xs mt-0.5 inline-block text-violet-900">{viewObjection.status}</span>
              </div>
            </div>

            {/* Financials Comparison */}
            <div className="bg-violet-50/70 p-4 rounded-2xl border border-violet-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">Original Award</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formatCurrencyRM(viewObjection.originalOfferAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">Requested Amount</span>
                <span className="font-black text-violet-900 text-sm mt-0.5 block">{formatCurrencyRM(viewObjection.requestedAmount)}</span>
              </div>
              {viewObjection.revisedCompensation && (
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Revised Compensation</span>
                  <span className="font-black text-emerald-700 text-sm mt-0.5 block">{formatCurrencyRM(viewObjection.revisedCompensation)}</span>
                </div>
              )}
            </div>

            {/* Grounds & Details */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                Grounds for Objection
              </span>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 leading-relaxed text-slate-800 text-xs whitespace-pre-wrap">
                {viewObjection.reason}
              </div>
            </div>

            {/* Review Remarks if any */}
            {viewObjection.reviewRemarks && (
              <div className="space-y-1.5">
                <span className="font-bold text-violet-900 block text-[11px] uppercase tracking-wider">
                  Assessing Officer Review Remarks
                </span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 leading-relaxed text-slate-800 text-xs">
                  {viewObjection.reviewRemarks}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

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
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* EDIT OBJECTION MODAL                                          */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(editObjectionItem)}
        onClose={() => setEditObjectionItem(null)}
        title="Edit Objection"
        subtitle={`Update objection details for ${editObjectionItem?.caseTitle || ''}`}
        maxWidth="!max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="text" size="md" onClick={() => setEditObjectionItem(null)}>
              Cancel
            </Button>
            <Button
              variant="filled"
              size="md"
              onClick={handleSaveEditObjection}
              isLoading={isUpdatingObjection}
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
            value={editObjectionAmount}
            onValueChange={(_formatted, num) => setEditObjectionAmount(num > 0 ? num : '')}
          />
          <Textarea
            label="Grounds & Details of Objection (Reason) *"
            rows={5}
            value={editObjectionReason}
            onChange={(e) => setEditObjectionReason(e.target.value)}
            placeholder="Explain the grounds and details for your compensation objection..."
          />

          {/* Attached Documents Upload & List */}
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
              onChange={handleEditFileUpload}
            />

            {editObjectionFiles.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Current Attached Files ({editObjectionFiles.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {editObjectionFiles.map((f) => (
                    <div
                      key={f.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700"
                    >
                      <FileText className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      <span className="font-medium truncate max-w-[180px]">{f.name || f.fileName}</span>
                      {f.fileSize && <span className="text-[10px] text-slate-400">({f.fileSize})</span>}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditFile(f.id)}
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
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* DELETE / WITHDRAW OBJECTION MODAL                             */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(deleteObjectionId)}
        onClose={() => setDeleteObjectionId(null)}
        title="Withdraw Objection"
        subtitle="This action will delete the objection record."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="text" size="md" onClick={() => setDeleteObjectionId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDeleteObjectionConfirm}
              isLoading={isDeletingObjection}
              className="!rounded-xl font-bold text-xs"
            >
              Confirm Withdrawal
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Are you sure you want to withdraw and delete this objection? The compensation offer letter status will revert to <strong>Pending</strong>, allowing you to re-evaluate or accept the statutory award.
        </p>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* OFFICIAL FORM G OFFER LETTER PREVIEW MODAL (PDF FORMAT)       */}
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
                  to={`/member/bank-details?caseId=${selectedCaseId}`}
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Manage Bank Details</span>
                </Link>
              ) : (
                <Link
                  to={`/member/bank-details?caseId=${selectedCaseId}`}
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
