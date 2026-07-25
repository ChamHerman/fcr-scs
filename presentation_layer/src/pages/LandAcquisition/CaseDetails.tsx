import * as Lucide from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Edit,
  Trash2,
  FileText,
  MapPin,
  Users,
  FolderOpen,
  File,
} from "lucide-react";
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

// --- Mock Data (replace with API call) ---
const mockCaseData: CaseData = {
  id: "LAC-2026-07-0024",
  title: "Kampung Baru Land Acquisition",
  status: "Case Registered",
  statusClass: "registered",
  registrationDate: "24 Jul 2026",
  projectName: "Kampung Baru Urban Renewal",
  projectType: "Urban Redevelopment",
  projectPurpose: "Mixed-use commercial and residential development",
  projectBudget: "RM 45,000,000",
  fundingSource: "Government (Ministry of Housing)",
  landTitleNumber: "PN 12345",
  lotNumber: "Lot 5678",
  mukim: "Kampung Baru",
  district: "Kuala Lumpur",
  state: "Wilayah Persekutuan Kuala Lumpur",
  landArea: "12.5",
  landCategory: "Residential / Commercial",
  gpsLatitude: "3.1390",
  gpsLongitude: "101.6869",
  owners: [
    {
      id: "1",
      name: "Ahmad Bin Abdullah",
      icNumber: "750101-10-5678",
      address: "No. 45, Jalan Kampung Baru, 50300 Kuala Lumpur",
      phone: "012-3456789",
      ownershipType: "Individual",
    },
    {
      id: "2",
      name: "Siti Binti Hassan",
      icNumber: "810202-08-1234",
      address: "No. 46, Jalan Kampung Baru, 50300 Kuala Lumpur",
      phone: "019-8765432",
      ownershipType: "Individual",
    },
  ],
  documents: [
    {
      id: "1",
      type: "Project Approval Letter",
      fileName: "approval_letter_2026.pdf",
      fileSize: "2.4 MB",
    },
    {
      id: "2",
      type: "Survey Plan",
      fileName: "survey_plan_kb.jpg",
      fileSize: "4.1 MB",
    },
    {
      id: "3",
      type: "Land Title Copy",
      fileName: "title_copy_pn12345.pdf",
      fileSize: "1.8 MB",
    },
  ],
};

export const CaseView: React.FC = () => {
  const [caseData] = useState<CaseData>(mockCaseData);
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    project: true,
    land: false,
    owners: false,
    documents: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleEdit = (section?: string) => {
    if (section) {
      alert(`Edit ${section} section`);
    } else {
      alert("Edit entire case");
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this case? This action cannot be undone.",
      )
    ) {
      alert("Case deleted successfully!");
      navigate('/admin/case');
    }
  };

  // Helper to render status badge
  const renderStatusBadge = (status: string, statusClass: string) => {
    return (
      <span className={`status-badge-lg ${statusClass}`}>
        <span className="dot"></span> {status}
      </span>
    );
  };

  // Section definitions for mapping
  const sections = [
    {
      key: "project",
      title: "Project Details",
      icon: <FolderOpen size={20} />,
      number: "A4",
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
      number: "A1",
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
            <span className="label">Land Area (hectares)</span>
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
      number: "A2",
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
        </div>
      ),
    },
    {
      key: "documents",
      title: "Supporting Documents",
      icon: <FileText size={20} />,
      number: "A3",
      content: (
        <div>
          {caseData.documents.map((doc) => (
            <div key={doc.id} className="doc-item">
              <File size={18} className="doc-icon" />
              <span className="doc-name">{doc.fileName}</span>
              <span className="doc-type">{doc.type}</span>
              {doc.fileSize && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--md-on-surface-variant)",
                    opacity: 0.6,
                  }}
                >
                  {doc.fileSize}
                </span>
              )}
              <a
                href="#"
                className="file-link"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--md-primary)",
                }}
              >
                Download
              </a>
            </div>
          ))}
          {caseData.documents.length === 0 && (
            <p
              style={{
                color: "var(--md-on-surface-variant)",
                opacity: 0.6,
                fontStyle: "italic",
              }}
            >
              No documents uploaded.
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      
      {/* Main Content */}
      <div className="main blur-shape-bg">
        <div className="case-view-container">
          {/* Top Bar / Case Header */}
          <div className="topbar" style={{ marginBottom: "16px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Case Details</h1>
              <div className="sub">
                View and manage the selected acquisition case
              </div>
            </div>
            <div className="topbar-right">
              <span className="date-badge"><Lucide.Calendar size={16} className="inline" /> 24 Jul 2026</span>
              <div className="avatar"><Lucide.User size={16} /></div>
            </div>
          </div>

          {/* Case Header */}
          <div className="case-header">
            <div className="case-header-left">
              <span className="case-id">{caseData.id}</span>
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

          {/* Accordion Sections */}
          <div className="case-sections">
            {sections.map((section) => (
              <div key={section.key} className="case-section">
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
                        handleEdit(section.title);
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
            ))}
          </div>

          {/* Footer note */}
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
            FCR-SCS · Case Management Module · All data is for demonstration
            purposes.
          </div>
        </div>
      </div>
    </div>
  );
};
