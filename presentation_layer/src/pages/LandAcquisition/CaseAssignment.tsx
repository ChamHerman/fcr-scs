import React, { useState } from "react";
import { CheckCircle, Send } from "lucide-react";
import "../../style.css";
import "./case_management.css";
import { Sidebar } from "../Shared";

// --- Types ---
type UnassignedCase = {
  id: string;
  title: string;
  project: string;
  registrationDate: string;
};

type ValuerStaff = {
  id: string;
  name: string;
  email: string;
  specialization: string;
};

type AssignmentRecord = {
  assignmentId: string;
  caseId: string;
  valuerId: string;
  valuerName: string;
  assignedBy: string;
  assignedDate: string;
  acceptancePeriod: number;
  status: string;
};

// --- Mock Data ---
const mockUnassignedCases: UnassignedCase[] = [
  {
    id: "LAC-2026-07-0025",
    title: "Desa Melati Acquisition",
    project: "Transportation Development",
    registrationDate: "25 Jul 2026",
  },
  {
    id: "LAC-2026-07-0026",
    title: "Taman Sentosa Land Parcel",
    project: "Urban Redevelopment",
    registrationDate: "26 Jul 2026",
  },
  {
    id: "LAC-2026-07-0027",
    title: "Kampung Baru Phase 2",
    project: "Public Amenities",
    registrationDate: "27 Jul 2026",
  },
  {
    id: "LAC-2026-07-0028",
    title: "Sungai Puyu Development",
    project: "Tourism Development",
    registrationDate: "28 Jul 2026",
  },
];

const mockValuers: ValuerStaff[] = [
  {
    id: "V1",
    name: "Ahmad Faizal",
    email: "ahmad.faizal@fcr-scs.gov.my",
    specialization: "Senior Valuer",
  },
  {
    id: "V2",
    name: "Nurul Huda",
    email: "nurul.huda@fcr-scs.gov.my",
    specialization: "Valuer",
  },
  {
    id: "V3",
    name: "Raj Kumar",
    email: "raj.kumar@fcr-scs.gov.my",
    specialization: "Assistant Valuer",
  },
  {
    id: "V4",
    name: "Sarah Tan",
    email: "sarah.tan@fcr-scs.gov.my",
    specialization: "Valuer",
  },
];

export const CaseAssignment: React.FC = () => {
  // --- State ---
  const [unassignedCases, setUnassignedCases] = useState(mockUnassignedCases);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedValuerId, setSelectedValuerId] = useState<string | null>(null);
  const [acceptancePeriod, setAcceptancePeriod] = useState<string>("7");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentRecord, setAssignmentRecord] =
    useState<AssignmentRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- Computed ---
  const selectedCase = unassignedCases.find((c) => c.id === selectedCaseId);
  const filteredCases = unassignedCases.filter(
    (c) =>
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.project.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // --- Handlers ---
  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    // Reset assignment state when a new case is selected
    setAssignmentRecord(null);
    setSelectedValuerId(null);
    setAcceptancePeriod("7");
  };

  const handleSelectValuer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValuerId(e.target.value);
  };

  const handleAcceptancePeriodChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setAcceptancePeriod(e.target.value);
  };

  const handleConfirmAssignment = () => {
    // Validation
    if (!selectedCaseId) {
      alert("Please select a case to assign.");
      return;
    }
    if (!selectedValuerId) {
      alert("Please select a land valuer.");
      return;
    }
    if (!acceptancePeriod || parseInt(acceptancePeriod) <= 0) {
      alert("Please enter a valid acceptance period (greater than 0 days).");
      return;
    }

    setIsAssigning(true);

    // Simulate API call
    setTimeout(() => {
      const valuer = mockValuers.find((v) => v.id === selectedValuerId);
      const newAssignment: AssignmentRecord = {
        assignmentId: `ASG-${Date.now().toString().slice(-6)}`,
        caseId: selectedCaseId!,
        valuerId: selectedValuerId!,
        valuerName: valuer?.name || "Unknown Valuer",
        assignedBy: "Administrator (AO)",
        assignedDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        acceptancePeriod: parseInt(acceptancePeriod),
        status: "Pending Acceptance",
      };

      // Update state
      setAssignmentRecord(newAssignment);
      // Remove the assigned case from the unassigned list
      setUnassignedCases((prev) => prev.filter((c) => c.id !== selectedCaseId));
      // Clear selection
      setSelectedCaseId(null);
      setSelectedValuerId(null);
      setAcceptancePeriod("7");
      setIsAssigning(false);

      // Simulate notification (FR-LAM-023)
      alert(
        `✅ Assignment successful!\n\n` +
          `Assignment ID: ${newAssignment.assignmentId}\n` +
          `Case: ${newAssignment.caseId}\n` +
          `Assigned to: ${newAssignment.valuerName}\n` +
          `Notification sent to ${valuer?.email || "valuer email"}.\n\n` +
          `📨 The valuer has been notified (FR-LAM-023).`,
      );

      // Simulate dashboard update (FR-LAM-021) - the unassigned count would decrease
      // In a real app, you'd dispatch a Redux action or refetch the dashboard data.
      console.log(
        "FR-LAM-021: Dashboard updated. Unassigned cases remaining:",
        unassignedCases.length - 1,
      );
      console.log(
        "FR-LAM-022: Assignment record stored in database:",
        newAssignment,
      );
    }, 1200);
  };

  const handleReset = () => {
    setAssignmentRecord(null);
    setSelectedCaseId(null);
    setSelectedValuerId(null);
    setAcceptancePeriod("7");
  };

  // --- Render ---
  const renderCaseList = () => (
    <div className="assignment-case-list">
      <div className="list-header">
        <h3>Unassigned Cases</h3>
        <span className="badge-count">{unassignedCases.length}</span>
      </div>

      {/* Search */}
      <div className="search-wrap" style={{ marginBottom: "12px" }}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search cases..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px 16px 8px 36px", fontSize: "13px" }}
        />
      </div>

      {filteredCases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h4>No unassigned cases</h4>
          <p style={{ fontSize: "13px" }}>
            All cases have been assigned to valuers.
          </p>
        </div>
      ) : (
        filteredCases.map((c) => (
          <div
            key={c.id}
            className={`assignment-case-item ${selectedCaseId === c.id ? "selected" : ""}`}
            onClick={() => handleSelectCase(c.id)}
          >
            <div className="case-info">
              <span className="case-id">{c.id}</span>
              <span className="case-title">{c.title}</span>
              <div className="case-meta">
                <span>📁 {c.project}</span>
                <span>📅 {c.registrationDate}</span>
              </div>
            </div>
            <button
              className={`btn-select ${selectedCaseId === c.id ? "selected" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCase(c.id);
              }}
            >
              {selectedCaseId === c.id ? "Selected" : "Select"}
            </button>
          </div>
        ))
      )}
    </div>
  );

  const renderAssignmentForm = () => (
    <div className="assignment-panel">
      <div className="panel-title">Assign Case</div>
      <div className="panel-subtitle">
        Select a valuer and set acceptance terms
      </div>

      {selectedCase ? (
        <>
          {/* Selected Case Summary */}
          <div className="selected-case-summary">
            <div className="label">Selected Case</div>
            <div className="value">
              {selectedCase.id} – {selectedCase.title}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--md-on-surface-variant)",
                marginTop: "4px",
              }}
            >
              📁 {selectedCase.project} · 📅 {selectedCase.registrationDate}
            </div>
          </div>

          {/* Valuer Selection */}
          <div className="form-group">
            <label htmlFor="valuerSelect">Available Land Valuer Staff *</label>
            <select
              id="valuerSelect"
              value={selectedValuerId || ""}
              onChange={handleSelectValuer}
            >
              <option value="">— Select a valuer —</option>
              {mockValuers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.specialization})
                </option>
              ))}
            </select>
            {mockValuers.length === 0 && (
              <div
                className="helper-text"
                style={{ color: "var(--md-error-text)" }}
              >
                ⚠️ No available staff (A1: No Available Staff)
              </div>
            )}
          </div>

          {/* Acceptance Period */}
          <div className="form-group">
            <label htmlFor="acceptancePeriod">Acceptance Period (days) *</label>
            <input
              id="acceptancePeriod"
              type="number"
              min="1"
              value={acceptancePeriod}
              onChange={handleAcceptancePeriodChange}
              placeholder="e.g., 7"
            />
            <div className="helper-text">
              Number of days for the valuer to accept the assignment.
            </div>
          </div>

          {/* Assign Button */}
          <button
            className="btn-assign"
            onClick={handleConfirmAssignment}
            disabled={isAssigning || !selectedValuerId}
          >
            {isAssigning ? (
              "Assigning..."
            ) : (
              <>
                <Send size={18} /> Confirm Assignment
              </>
            )}
          </button>
        </>
      ) : (
        <div className="empty-state" style={{ padding: "40px 0" }}>
          <div className="empty-icon">👈</div>
          <h4>Select a case</h4>
          <p style={{ fontSize: "13px" }}>
            Choose an unassigned case from the list to begin.
          </p>
        </div>
      )}
    </div>
  );

  const renderSuccessState = () => (
    <div className="assignment-panel">
      <div className="assignment-success">
        <div className="check-icon">
          <CheckCircle size={40} />
        </div>
        <h3>Assignment Confirmed</h3>
        <p style={{ color: "var(--md-on-surface-variant)" }}>
          The case has been successfully assigned.
        </p>
        {assignmentRecord && (
          <>
            <div className="assignment-id">
              ID: {assignmentRecord.assignmentId}
            </div>
            <div className="details">
              <div>
                <strong>Case ID:</strong> {assignmentRecord.caseId}
              </div>
              <div>
                <strong>Assigned To:</strong> {assignmentRecord.valuerName}
              </div>
              <div>
                <strong>Assigned By:</strong> {assignmentRecord.assignedBy}
              </div>
              <div>
                <strong>Assigned Date:</strong> {assignmentRecord.assignedDate}
              </div>
              <div>
                <strong>Acceptance Period:</strong>{" "}
                {assignmentRecord.acceptancePeriod} days
              </div>
              <div>
                <strong>Status:</strong> {assignmentRecord.status}
              </div>
            </div>
          </>
        )}
        <button className="btn-reset" onClick={handleReset}>
          Assign Another Case
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#f8f5fa", color: "#1c1b1f" }}
    >
      <Sidebar />

      {/* Main Content */}
      <main className="main blur-shape-bg">
        {/* Top Bar */}
        <div className="topbar" style={{ marginBottom: "20px" }}>
          <div className="topbar-left">
            <h1 style={{ marginBottom: 0 }}>Case Assignment</h1>
            <div className="sub">
              Assign unassigned acquisition cases to land valuers
            </div>
          </div>
          <div className="topbar-right">
            <span className="date-badge">📅 24 Jul 2026</span>
            <div className="avatar">AO</div>
          </div>
        </div>

        {/* Assignment Layout */}
        {assignmentRecord ? (
          renderSuccessState()
        ) : (
          <div className="assignment-layout">
            {renderCaseList()}
            {renderAssignmentForm()}
          </div>
        )}

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
          FCR-SCS · Case Assignment Module · Only visible to administrators
        </div>
      </main>
    </div>
  );
};
