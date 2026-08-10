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
  CASE_REGISTERED: "registered",
  VALUER_ASSIGNED: "valuation",
  VALUATION_IN_PROGRESS: "valuation",
  PENDING_VALUATION_APPROVAL: "pending",
  VALUATION_APPROVED: "approved",
  VALUATION_REJECTED: "rejected",
  PENDING_COMPENSATION_APPROVAL: "pending",
  COMPENSATION_APPROVED: "approved",
  COMPENSATION_REJECTED: "rejected",
  OFFER_ISSUED: "offer",
  OFFER_REJECTED: "rejected",
  PAYMENT_IN_PROGRESS: "payment",
  PAYMENT_COMPLETED: "approved",
  CASE_CLOSED: "closed",
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

  const handleDelete = async () => {
    if (!caseData) return;
    if (
      window.confirm(
        "Are you sure you want to delete this case? This action will remove it from the backend database."
      )
    ) {
      try {
        await landAcquisitionApi.deleteCase(caseData.id);
        alert("Case deleted successfully from database!");
        navigate("/admin/case");
      } catch (err: any) {
        console.error("Failed to delete case:", err);
        alert(`Delete Failed: ${err.message}`);
      }
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
          <button className="btn-primary" onClick={() => navigate("/admin/case")}>
            Back to Case Dashboard
          </button>
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
            <div className="topbar-right">
              <button className="btn-outline" onClick={() => navigate("/admin/case")}>
                <Lucide.ArrowLeft size={16} className="inline mr-1" /> Back to List
              </button>
            </div>
          </div>

          <div className="case-header">
            <div className="case-header-left">
              <span className="case-id" style={{ fontSize: "13px" }}>{caseData.id}</span>
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
            <div className="case-header-actions">
              <button className="btn-edit" onClick={() => handleEdit()}>
                <Edit size={16} /> Edit Case
              </button>
              <button className="btn-delete" onClick={handleDelete}>
                <Trash2 size={16} /> Delete Case
              </button>
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
                    <div className="section-actions">
                      <button
                        className="edit-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(section.key);
                        }}
                      >
                        <Edit size={14} /> Edit
                      </button>
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
