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
} from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import "../../style.css";
import "./case_management.css";

// --- Types ---
type Owner = {
  id: string;
  name: string;
  icNumber: string;
  address: string;
  phone: string;
  ownershipType: string;
};

type Document = {
  id: string;
  type: string;
  fileName: string;
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
  mukim: string;
  district: string;
  state: string;
  landArea: string;
  landCategory: string;
  gpsLatitude: string;
  gpsLongitude: string;
  // Owners
  owners: Owner[];
  // Documents
  documents: Document[];
};

const statusClassMap: Record<string, string> = {
  CASE_REGISTERED: "status-case-registered",
  VALUER_ASSIGNED: "status-valuer-assigned",
  VALUATION_IN_PROGRESS: "status-valuation-progress",
  PENDING_VALUATION_APPROVAL: "status-pending-valuation",
  VALUATION_APPROVED: "status-valuation-approved",
  VALUATION_REJECTED: "status-valuation-rejected",
  PENDING_COMPENSATION_APPROVAL: "status-pending-comp",
  COMPENSATION_APPROVED: "status-comp-approved",
  COMPENSATION_REJECTED: "status-comp-rejected",
  OFFER_ISSUED: "status-offer-issued",
  OFFER_REJECTED: "status-offer-rejected",
  PAYMENT_IN_PROGRESS: "status-payment-progress",
  PAYMENT_COMPLETED: "status-payment-completed",
  CASE_CLOSED: "status-case-closed",
};

const statusLabelMap: Record<string, string> = {
  CASE_REGISTERED: "Case Registered",
  VALUER_ASSIGNED: "Valuer Assigned",
  VALUATION_IN_PROGRESS: "Valuation In Progress",
  PENDING_VALUATION_APPROVAL: "Pending Valuation Approval",
  VALUATION_APPROVED: "Valuation Approved",
  VALUATION_REJECTED: "Valuation Rejected",
  PENDING_COMPENSATION_APPROVAL: "Pending Compensation Approval",
  COMPENSATION_APPROVED: "Compensation Approved",
  COMPENSATION_REJECTED: "Compensation Rejected",
  OFFER_ISSUED: "Offer Issued",
  OFFER_REJECTED: "Offer Rejected",
  PAYMENT_IN_PROGRESS: "Payment In Progress",
  PAYMENT_COMPLETED: "Payment Completed",
  CASE_CLOSED: "Case Closed",
};

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
          projectBudget: c.project?.budget ? `RM ${Number(c.project.budget).toLocaleString()}` : "—",
          fundingSource: c.project?.fundingSource || "—",
          landTitleNumber: c.landParcel?.landTitleNo || "—",
          lotNumber: c.landParcel?.lotNo || "—",
          mukim: c.landParcel?.mukim || "—",
          district: c.landParcel?.district || "—",
          state: c.landParcel?.state || "—",
          landArea: c.landParcel?.area ? `${c.landParcel.area} ${c.landParcel.areaUnit}` : "—",
          landCategory: c.landParcel?.category || "—",
          gpsLatitude: c.landParcel?.latitude?.toString() || "—",
          gpsLongitude: c.landParcel?.longitude?.toString() || "—",
          owners: (c.landParcel?.ownerships || []).map((o: any, idx: number) => ({
            id: o.landOwner?.ownerId || idx.toString(),
            name: o.landOwner?.name || "—",
            icNumber: o.landOwner?.nric || "—",
            address: o.landOwner?.address || "—",
            phone: o.landOwner?.contact || "—",
            ownershipType: o.ownershipType || "Individual",
          })),
          documents: (c.caseDocuments || []).map((d: any) => ({
            id: d.documentId,
            type: d.documentType,
            fileName: d.fileName,
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

  const handleEdit = (sectionKey?: string) => {
    if (!caseData) return;
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
            <span className="label">GPS Coordinates</span>
            <span className="value">
              {caseData.gpsLatitude}, {caseData.gpsLongitude}
            </span>
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
                  <strong>IC Number:</strong> {owner.icNumber}
                </span>
                <span className="detail-text">
                  <strong>Phone:</strong> {owner.phone}
                </span>
                <span className="detail-text" style={{ gridColumn: "1 / -1" }}>
                  <strong>Address:</strong> {owner.address}
                </span>
                <span className="detail-text">
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
        <div>
          {caseData.documents.map((doc) => (
            <div key={doc.id} className="doc-item">
              <File size={18} className="doc-icon" />
              <span className="doc-name">{doc.fileName}</span>
              <span className="doc-type">{doc.type}</span>
              {doc.fileSize && (
                <span style={{ fontSize: "12px", opacity: 0.6 }}>
                  {doc.fileSize}
                </span>
              )}
            </div>
          ))}
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
  const canEdit = Boolean(
    canEditCaseDetails && (isSysAdmin || (isOfficer && isCreator))
  );
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
              <h1 style={{ marginBottom: 0 }}>Case Details</h1>
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
              <h2 className="case-title">{caseData.title}</h2>
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
