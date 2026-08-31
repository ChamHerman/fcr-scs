import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  Edit,
  Trash2,
  FileText,
  MapPin,
  Users,
  FolderOpen,
  File,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { BASE_URL } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import "../../index.css";
import "./case_management.css";

// --- Types ---
type Owner = {
  id: string;
  name: string;
  icNumber: string;
  address: string;
  phone: string;
  email: string;
  share: string;
  ownershipType: string;
};

type Document = {
  id: string;
  type: string;
  fileName: string;
  filePath?: string;
  fileSize?: string;
};

type CaseData = {
  id: string;
  title: string;
  status: string;
  rawStatus: string;
  createdById?: string;
  statusClass: string;
  registrationDate: string;
  // Project
  projectName: string;
  projectType: string;
  projectPurpose: string;
  projectBudget: string;
  fundingSource: string;
  // Land
  landTitleNumber: string;
  lotNumber: string;
  tempat: string;
  mukim: string;
  district: string;
  state: string;
  landArea: string;
  landCategory: string;
  tenureType: string;
  // Owners
  owners: Owner[];
  // Documents
  documents: Document[];
};

import {
  CASE_STATUS_CLASS_MAP as statusClassMap,
  CASE_STATUS_LABEL_MAP as statusLabelMap,
} from "../../constants";

export const CaseView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ caseId?: string }>();
  const [searchParams] = useSearchParams();
  const stateCaseId = params.caseId || searchParams.get("caseId") || location.state?.caseId;
  const { notify } = useNotification();

  const { user, canEditCaseDetails, canDeleteCase, isOfficer, isSysAdmin, isAdmin } = useRole();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    project: true,
    land: true,
    owners: true,
    documents: true,
  });

  useEffect(() => {
    async function fetchDetails() {
      if (!stateCaseId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await landAcquisitionApi.getCaseById(stateCaseId);
        const c = res.case;

        const formatted: CaseData = {
          id: c.caseId,
          title: c.caseTitle,
          status: statusLabelMap[c.status] || c.status,
          rawStatus: c.status,
          createdById: c.createdById,
          statusClass: statusClassMap[c.status] || "registered",
          registrationDate: c.registrationDate
            ? new Date(c.registrationDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—",
          projectName: c.project?.projectName || "—",
          projectType: c.project?.projectType || "—",
          projectPurpose: c.project?.purpose || "—",
          projectBudget: c.project?.budget != null
            ? `RM ${Number(c.project.budget).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—",
          fundingSource: c.project?.fundingSource === "GOVERNMENT" ? "Government" : c.project?.fundingSource === "PRIVATE" ? "Private" : c.project?.fundingSource === "OTHERS" ? "Others" : c.project?.fundingSource || "—",
          landTitleNumber: c.landParcel?.landTitleNo || "—",
          lotNumber: c.landParcel?.lotNo || "—",
          tempat: c.landParcel?.tempat || "—",
          mukim: c.landParcel?.mukim || "—",
          district: c.landParcel?.district || "—",
          state: c.landParcel?.state || "—",
          landArea: c.landParcel?.area
            ? `${c.landParcel.area} ${c.landParcel.areaUnit === "SQUARE_METER" ? "m²" : c.landParcel.areaUnit === "HECTARE" ? "hectares" : c.landParcel.areaUnit === "ACRE" ? "acres" : c.landParcel.areaUnit || "m²"}`
            : "—",
          landCategory: c.landParcel?.category === "AGRICULTURE" ? "Agriculture" : c.landParcel?.category === "BUILDING" ? "Building" : c.landParcel?.category === "INDUSTRY" ? "Industry" : (c.landParcel?.category || "—"),
          tenureType: c.landParcel?.tenureType === "FREEHOLD" ? "Freehold" : c.landParcel?.tenureType === "LEASEHOLD" ? "Leasehold" : c.landParcel?.tenureType === "MALAY_RESERVE" ? "Malay Reserve" : (c.landParcel?.tenureType || "—"),
          owners: (c.landParcel?.ownerships || []).map((o: any, idx: number) => ({
            id: o.landOwner?.ownerId || idx.toString(),
            name: o.landOwner?.name || "—",
            icNumber: o.landOwner?.nric || "—",
            address: o.landOwner?.address || "—",
            phone: o.landOwner?.contact || "—",
            email: o.landOwner?.email || "—",
            share: o.share || "—",
            ownershipType: o.ownershipType === "JOINT_OWNERSHIP"
              ? "Joint Ownership"
              : o.ownershipType === "CORPORATE_ENTITY"
              ? "Corporate Entity"
              : o.ownershipType === "ESTATE_OF_DECEASED"
              ? "Estate of Deceased"
              : o.ownershipType === "TRUSTEE"
              ? "Trustee"
              : o.ownershipType === "INDIVIDUAL_CITIZEN"
              ? "Individual Citizen"
              : (o.ownershipType || "Individual Citizen"),
          })),
          documents: (c.caseDocuments || []).map((d: any) => ({
            id: d.documentId,
            type: d.documentType,
            fileName: d.fileName,
            filePath: d.filePath,
            fileSize: `${(d.fileSize / 1024 / 1024).toFixed(2)} MB`,
          })),
        };

        setCaseData(formatted);
      } catch (err: any) {
        console.error("Error fetching case details:", err);
        setError(err.message || "Failed to load case details");
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [stateCaseId]);

  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  useEffect(() => {
    const updatedSection = location.state?.updatedSection;
    if (updatedSection) {
      setExpandedSections((prev) => ({ ...prev, [updatedSection]: true }));
      setHighlightedSection(updatedSection);

      setTimeout(() => {
        const el = document.getElementById(`section-${updatedSection}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 250);

      const timer = setTimeout(() => {
        setHighlightedSection(null);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  const handleStartEditTitle = () => {
    if (!caseData) return;
    if (!canEdit) {
      if (!isCaseEditableStatus) {
        notify({
          type: 'general',
          title: 'Case Locked',
          message: `This case is in '${caseData.status}' status and cannot be modified.`,
        });
      } else if (!isSysAdmin && !isOfficer) {
        notify({
          type: 'error',
          title: 'Access Restricted',
          message: 'Only Government Officers and System Administrators can edit the case name.',
        });
      } else if (isOfficer && !isCreator && caseData.createdById) {
        notify({
          type: 'error',
          title: 'Access Restricted',
          message: 'Only the Government Officer who created this case (or System Administrator) can edit it.',
        });
      }
      return;
    }
    setEditingTitleValue(caseData.title);
    setIsEditingTitle(true);
  };

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleSaveTitle = async () => {
    if (!caseData || isSavingTitle) return;
    const trimmed = editingTitleValue.trim();
    if (!trimmed) {
      notify({
        type: 'error',
        title: 'Validation Error',
        message: 'Case title cannot be empty.',
      });
      return;
    }
    if (trimmed === caseData.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    try {
      await landAcquisitionApi.updateCaseTitle(caseData.id, trimmed);
      setCaseData((prev) => (prev ? { ...prev, title: trimmed } : null));
      notify({
        type: 'success',
        title: 'Case Title Updated',
        message: `Case title updated to "${trimmed}".`,
      });
      setIsEditingTitle(false);
    } catch (err: any) {
      console.error("Failed to update case title:", err);
      notify({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update case title in database.',
      });
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditingTitle(false);
      setEditingTitleValue(caseData?.title || "");
    }
  };

  const handleEdit = (sectionKey?: string) => {
    if (!caseData || !canEdit) return;
    const url = sectionKey
      ? `/admin/case/${encodeURIComponent(caseData.id)}/edit?section=${encodeURIComponent(sectionKey)}`
      : `/admin/case/${encodeURIComponent(caseData.id)}/edit`;
    navigate(url, {
      state: { caseId: caseData.id, section: sectionKey },
    });
  };

  const confirmDelete = async () => {
    if (!caseData) return;
    setDeleting(true);
    try {
      await landAcquisitionApi.deleteCase(caseData.id);
      setShowDeleteModal(false);
      navigate("/admin/case");
    } catch (err: any) {
      console.error("Failed to delete case:", err);
      notify({
        type: 'error',
        title: 'Delete Failed',
        message: err.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const renderStatusBadge = (status: string, statusClass: string) => {
    return (
      <span className={`status-badge-lg ${statusClass}`}>
        <span className="dot"></span> {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="main blur-shape-bg" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <Loader2 size={32} className="inline animate-spin mb-2" />
          <div>Fetching live case details from backend database...</div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="main blur-shape-bg">
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <h2>Case Details Not Found</h2>
          <p style={{ color: "var(--md-on-surface-variant)", marginBottom: "20px" }}>
            {error || "No case selected or case ID was not provided in navigation state."}
          </p>
          <Button variant="filled" onClick={() => navigate("/admin/case")}>
            Back to Case Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const sections = [
    {
      key: "project",
      title: "Project Details",
      icon: <FolderOpen size={20} />,
      content: (
        <div className="detail-grid">
          <div className="detail-item">
            <span className="label">Project Name</span>
            <span className="value">{caseData.projectName}</span>
          </div>
          <div className="detail-item">
            <span className="label">Project Type</span>
            <span className="value">{caseData.projectType}</span>
          </div>
          <div className="detail-item">
            <span className="label">Project Purpose</span>
            <span className="value">{caseData.projectPurpose}</span>
          </div>
          <div className="detail-item">
            <span className="label">Project Budget</span>
            <span className="value">{caseData.projectBudget}</span>
          </div>
          <div className="detail-item">
            <span className="label">Funding Source</span>
            <span className="value">{caseData.fundingSource}</span>
          </div>
        </div>
      ),
    },
    {
      key: "land",
      title: "Land Information",
      icon: <MapPin size={20} />,
      content: (
        <div className="detail-grid">
          <div className="detail-item">
            <span className="label">Land Title Number</span>
            <span className="value">{caseData.landTitleNumber}</span>
          </div>
          <div className="detail-item">
            <span className="label">Lot Number</span>
            <span className="value">{caseData.lotNumber}</span>
          </div>
          <div className="detail-item">
            <span className="label">Tempat</span>
            <span className="value">{caseData.tempat}</span>
          </div>
          <div className="detail-item">
            <span className="label">Mukim</span>
            <span className="value">{caseData.mukim}</span>
          </div>
          <div className="detail-item">
            <span className="label">District</span>
            <span className="value">{caseData.district}</span>
          </div>
          <div className="detail-item">
            <span className="label">State</span>
            <span className="value">{caseData.state}</span>
          </div>
          <div className="detail-item">
            <span className="label">Land Area</span>
            <span className="value">{caseData.landArea}</span>
          </div>
          <div className="detail-item">
            <span className="label">Land Category</span>
            <span className="value">{caseData.landCategory}</span>
          </div>
          <div className="detail-item">
            <span className="label">Tenure Type</span>
            <span className="value">{caseData.tenureType}</span>
          </div>
        </div>
      ),
    },
    {
      key: "owners",
      title: "Land Owner Information",
      icon: <Users size={20} />,
      content: (
        <div>
          {caseData.owners.map((owner, index) => (
            <div key={owner.id} className="owner-card">
              <div className="owner-name">
                Owner #{index + 1}: {owner.name}
              </div>
              <div className="owner-details">
                <span className="detail-text">
                  <strong>Identification Number:</strong> {owner.icNumber}
                </span>
                <span className="detail-text">
                  <strong>Phone:</strong> {owner.phone}
                </span>
                <span className="detail-text">
                  <strong>Email:</strong> {owner.email}
                </span>
                <span className="detail-text">
                  <strong>Ownership Share:</strong> {owner.share}
                </span>
                <span className="detail-text" style={{ gridColumn: "1 / -1" }}>
                  <strong>Address:</strong> {owner.address}
                </span>
                <span className="detail-text" style={{ gridColumn: "1 / -1" }}>
                  <strong>Ownership Type:</strong> {owner.ownershipType}
                </span>
              </div>
            </div>
          ))}
          {caseData.owners.length === 0 && (
            <p style={{ fontStyle: "italic", opacity: 0.6 }}>No owner records found.</p>
          )}
        </div>
      ),
    },
    {
      key: "documents",
      title: "Supporting Documents",
      icon: <FileText size={20} />,
      content: (
        <div className="space-y-3">
          {caseData.documents.map((doc) => {
            const fileUrl = doc.filePath ? `${BASE_URL}/${doc.filePath.replace(/^\//, '')}` : "";
            return (
              <div
                key={doc.id}
                className="doc-item flex items-center justify-between p-3.5 bg-md-surface-container rounded-xl border border-md-outline/10 hover:border-md-primary/40 transition-colors cursor-pointer group"
                onClick={() => {
                  if (fileUrl) {
                    window.open(fileUrl, "_blank", "noopener,noreferrer");
                  }
                }}
                title={fileUrl ? `Click to view ${doc.fileName} in new browser tab` : undefined}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <File size={18} className="text-md-primary flex-shrink-0" />
                  <span className="doc-name font-medium text-sm text-md-on-surface group-hover:text-md-primary transition-colors truncate">
                    {doc.fileName}
                  </span>
                  <span className="doc-type text-xs px-2.5 py-0.5 rounded-full bg-md-primary/10 text-md-primary font-semibold flex-shrink-0">
                    {doc.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {doc.fileSize && (
                    <span style={{ fontSize: "12px", opacity: 0.6 }}>
                      {doc.fileSize}
                    </span>
                  )}
                  {fileUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(fileUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="text-xs text-md-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink size={14} /> View
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {caseData.documents.length === 0 && (
            <p style={{ fontStyle: "italic", opacity: 0.6 }}>
              No supporting documents uploaded for this case.
            </p>
          )}
        </div>
      ),
    },
  ];

  const isCreator = Boolean(
    user?.userId &&
    caseData?.createdById &&
    caseData.createdById === user.userId
  );
  const isAuthorizedRole = Boolean(
    isSysAdmin || (isOfficer && (isCreator || !caseData?.createdById))
  );
  // Status check: Backend CaseStateMachine allows editing only in CASE_REGISTERED and VALUER_ASSIGNED
  const isCaseEditableStatus = Boolean(
    caseData?.rawStatus && ["CASE_REGISTERED", "VALUER_ASSIGNED"].includes(caseData.rawStatus)
  );
  // Both role authorization AND case status editability must be satisfied
  const canEdit = isAuthorizedRole && isCaseEditableStatus;
  const canDelete = Boolean(
    canDeleteCase({ createdById: caseData?.createdById, status: caseData?.rawStatus }) &&
    caseData?.rawStatus === "CASE_REGISTERED"
  );

  return (
    <div>
      <div className="main blur-shape-bg">
        <div className="case-view-container">
          <div className="topbar" style={{ marginBottom: "16px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Review Case Details</h1>
              <div className="sub">
                Live case record from backend database
              </div>
            </div>
            <div className="topbar-right flex items-center gap-3">
              <Button variant="outlined" size="sm" onClick={() => navigate("/admin/case")}>
                <Lucide.ArrowLeft size={16} /> Back
              </Button>
              <span className="date-badge">
                <Lucide.Calendar size={16} className="inline mr-1" />
                {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              <div
                className="avatar"
                title={user ? `${user.name} (${user.role.replace(/_/g, " ")})` : "User"}
              >
                {user?.name ? (
                  <span className="text-xs font-bold uppercase">
                    {user.name
                      .split(/\s+/)
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                ) : (
                  <Lucide.User size={16} />
                )}
              </div>
            </div>
          </div>

          <div className="case-header">
            <div className="case-header-left">
              <div className="flex items-center gap-2">
                <span className="case-id font-mono text-sm">{caseData.id}</span>
                <CopyButton value={caseData.id} />
              </div>
              {isEditingTitle ? (
                <div className="case-title-edit-container my-1">
                  <div className="flex items-center gap-2">
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      disabled={isSavingTitle}
                      className="case-title-input px-3 py-1.5 text-2xl font-bold rounded-xl border-2 border-md-primary bg-md-surface-container text-md-on-surface focus:outline-none w-full max-w-xl transition-all shadow-sm"
                      placeholder="Enter case name / title"
                    />
                    {isSavingTitle && <Loader2 size={20} className="animate-spin text-md-primary flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-md-on-surface-variant mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block px-1.5 py-0.5 bg-md-primary/10 text-md-primary rounded font-mono font-medium text-[11px]">Enter</span> to save
                    <span className="mx-1 opacity-40">•</span>
                    <span className="inline-block px-1.5 py-0.5 bg-md-outline/10 text-md-on-surface-variant rounded font-mono font-medium text-[11px]">Esc</span> to cancel
                  </div>
                </div>
              ) : (
                <div
                  className={`group relative inline-flex items-center gap-2.5 ${canEdit ? 'cursor-pointer' : ''}`}
                  onDoubleClick={handleStartEditTitle}
                  title={canEdit ? "Double-click to edit case name" : undefined}
                >
                  <h2 className="case-title m-0">
                    {caseData.title}
                  </h2>
                  {canEdit && (
                    <span
                      onClick={handleStartEditTitle}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-md-on-surface-variant hover:text-md-primary hover:bg-md-primary/10 rounded-full cursor-pointer"
                      title="Click or double-click to edit case name"
                    >
                      <Edit size={16} />
                    </span>
                  )}
                </div>
              )}
              <div className="case-meta">
                <span className="meta-item">
                  <strong>Registered:</strong> {caseData.registrationDate}
                </span>
                <span className="meta-item">
                  {renderStatusBadge(caseData.status, caseData.statusClass)}
                </span>
              </div>
            </div>
            <div className="case-header-actions flex items-center gap-3">
              {canEdit && (
                <Button variant="filled" onClick={() => handleEdit()}>
                  <Edit size={16} /> Edit Case
                </Button>
              )}
              {canDelete && (
                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                  <Trash2 size={16} /> Delete Case
                </Button>
              )}
            </div>
          </div>

          <div className="case-sections">
            {sections.map((section) => {
              const isHighlighted = highlightedSection === section.key;
              return (
                <div
                  key={section.key}
                  id={`section-${section.key}`}
                  className={`case-section transition-all duration-500 ${
                    isHighlighted ? "ring-2 ring-md-primary shadow-lg bg-md-primary/5" : ""
                  }`}
                >
                  <div
                    className="case-section-header"
                    onClick={() => toggleSection(section.key)}
                  >
                    <div className="section-title">
                      {section.icon}
                      {section.title}
                    </div>
                    <div className="section-actions flex items-center gap-2">
                      {canEdit && (
                        <Button
                          variant="outlined"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(section.key);
                          }}
                        >
                          <Edit size={14} /> Edit
                        </Button>
                      )}
                      <ChevronDown
                        size={20}
                        className={`toggle-icon ${expandedSections[section.key] ? "open" : ""}`}
                      />
                    </div>
                  </div>
                  <div
                    className={`case-section-content ${expandedSections[section.key] ? "open" : ""}`}
                  >
                    {section.content}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Delete Case"
            subtitle={`Are you sure you want to delete case "${caseData.title}"?`}
            footer={
              <>
                <Button variant="text" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" isLoading={deleting} onClick={confirmDelete}>
                  <Trash2 size={16} /> Confirm Delete
                </Button>
              </>
            }
          >
            <p className="text-sm text-md-on-surface-variant">
              This action will permanently remove the case, associated land parcels, owner data, and documents from the backend database. This action cannot be undone.
            </p>
          </Modal>

          <div
            style={{
              marginTop: "32px",
              fontSize: "13px",
              color: "var(--md-on-surface-variant)",
              opacity: 0.6,
              textAlign: "center",
              borderTop: "1px solid rgba(121,116,126,0.08)",
              paddingTop: "18px",
            }}
          >
            FCR-SCS · Land Acquisition Module · Connected to Live Backend Service
          </div>
        </div>
      </div>
    </div>
  );
};
