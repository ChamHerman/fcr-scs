import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, Send, Loader2 } from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import "../../style.css";
import "./case_management.css";

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

export const CaseAssignment: React.FC = () => {
  // --- State ---
  const [unassignedCases, setUnassignedCases] = useState<UnassignedCase[]>([]);
  const [valuers, setValuers] = useState<ValuerStaff[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedValuerId, setSelectedValuerId] = useState<string | null>(null);
  const [acceptancePeriod, setAcceptancePeriod] = useState<string>("7");
  const [isAssigning, setIsAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assignmentRecord, setAssignmentRecord] = useState<AssignmentRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Load backend data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, valuersRes] = await Promise.all([
        landAcquisitionApi.getUnassignedCases(),
        landAcquisitionApi.getAvailableValuers(),
      ]);

      const formattedCases: UnassignedCase[] = (casesRes.cases || []).map((c: any) => ({
        id: c.caseId,
        title: c.caseTitle,
        project: c.project?.projectName || "—",
        registrationDate: c.registrationDate
          ? new Date(c.registrationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
      }));

      const formattedValuers: ValuerStaff[] = (valuersRes.valuers || []).map((v: any) => ({
        id: v.userId,
        name: v.name,
        email: v.email,
        specialization: "Land Valuer",
      }));

      setUnassignedCases(formattedCases);
      setValuers(formattedValuers);
    } catch (err: any) {
      console.error("Failed to load assignment data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Computed ---
  const selectedCase = unassignedCases.find((c) => c.id === selectedCaseId);
  const filteredCases = unassignedCases.filter(
    (c) =>
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Handlers ---
  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    setAssignmentRecord(null);
    setSelectedValuerId(null);
    setAcceptancePeriod("7");
  };

  const handleSelectValuer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValuerId(e.target.value);
  };

  const handleAcceptancePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAcceptancePeriod(e.target.value);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedCaseId) {
      alert("Please select a case to assign.");
      return;
    }
    if (!selectedValuerId) {
      alert("Please select a land valuer.");
      return;
    }
    if (!acceptancePeriod || parseInt(acceptancePeriod, 10) <= 0) {
      alert("Please enter a valid acceptance period (greater than 0 days).");
      return;
    }

    setIsAssigning(true);

    try {
      const res = await landAcquisitionApi.assignValuer({
        caseId: selectedCaseId,
        valuerId: selectedValuerId,
        acceptancePeriodDays: parseInt(acceptancePeriod, 10),
      });

      const assignedValuer = valuers.find((v) => v.id === selectedValuerId);
      const newAssignment: AssignmentRecord = {
        assignmentId: res.assignment.assignmentId,
        caseId: selectedCaseId,
        valuerId: selectedValuerId,
        valuerName: assignedValuer?.name || res.assignment.assignedTo?.name || "Valuer",
        assignedBy: "System Administrator",
        assignedDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        acceptancePeriod: parseInt(acceptancePeriod, 10),
        status: "Valuer Assigned",
      };

      setAssignmentRecord(newAssignment);
      setUnassignedCases((prev) => prev.filter((c) => c.id !== selectedCaseId));
      setSelectedCaseId(null);
      setSelectedValuerId(null);
      setAcceptancePeriod("7");
    } catch (err: any) {
      console.error("Assignment failed:", err);
      alert(`Assignment Failed: ${err.message || "Could not reach backend"}`);
    } finally {
      setIsAssigning(false);
    }
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
        <span className="search-icon"></span>
        <input
          type="text"
          placeholder="Search cases..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px 16px 8px 36px", fontSize: "13px" }}
        />
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: "30px 0" }}>
          <Loader2 size={24} className="inline animate-spin mb-2" />
          <p style={{ fontSize: "13px" }}>Loading unassigned cases...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <h4>No unassigned cases</h4>
          <p style={{ fontSize: "13px" }}>
            All cases have been assigned to valuers in the database.
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
              <span className="case-id" style={{ fontSize: "11px" }}>{c.id.slice(0, 8)}...</span>
              <span className="case-title">{c.title}</span>
              <div className="case-meta">
                <span>{c.project}</span>
                <span><Lucide.Calendar size={14} className="inline mr-1" /> {c.registrationDate}</span>
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
        Select an active land valuer and set acceptance terms
      </div>

      {selectedCase ? (
        <>
          <div className="selected-case-summary">
            <div className="label">Selected Case</div>
            <div className="value">
              {selectedCase.title}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--md-on-surface-variant)",
                marginTop: "4px",
              }}
            >
              {selectedCase.project} · <Lucide.Calendar size={14} className="inline mr-1" /> {selectedCase.registrationDate}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="valuerSelect">Available Land Valuer Staff *</label>
            <select
              id="valuerSelect"
              value={selectedValuerId || ""}
              onChange={handleSelectValuer}
            >
              <option value="">— Select a valuer —</option>
              {valuers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.email})
                </option>
              ))}
            </select>
            {valuers.length === 0 && !loading && (
              <div className="helper-text" style={{ color: "var(--md-error-text)" }}>
                <Lucide.AlertTriangle size={14} className="inline mr-1" /> No active valuer staff found in database.
              </div>
            )}
          </div>

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
              Number of days for the valuer to accept and complete valuation.
            </div>
          </div>

          <button
            className="btn-assign"
            onClick={handleConfirmAssignment}
            disabled={isAssigning || !selectedValuerId}
          >
            {isAssigning ? (
              "Assigning in Backend..."
            ) : (
              <>
                <Send size={18} /> Confirm Assignment
              </>
            )}
          </button>
        </>
      ) : (
        <div className="empty-state" style={{ padding: "40px 0" }}>
          <div className="empty-icon"><Lucide.ArrowLeft size={16} className="inline mr-1" /></div>
          <h4>Select a case</h4>
          <p style={{ fontSize: "13px" }}>
            Choose an unassigned case from the list to begin assignment.
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
        <h3>Assignment Saved in Database</h3>
        <p style={{ color: "var(--md-on-surface-variant)" }}>
          Case status updated to <strong>VALUER_ASSIGNED</strong>.
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
                <strong>Acceptance Period:</strong> {assignmentRecord.acceptancePeriod} days
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
      style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}
    >
      <main className="main blur-shape-bg">
        <div className="topbar" style={{ marginBottom: "20px" }}>
          <div className="topbar-left">
            <h1 style={{ marginBottom: 0 }}>Case Assignment</h1>
            <div className="sub">
              Assign unassigned acquisition cases to land valuers (Phase 3 Backend Integration)
            </div>
          </div>
          <div className="topbar-right">
            <span className="date-badge"><Lucide.Calendar size={16} className="inline mr-1" /> 24 Jul 2026</span>
            <div className="avatar">AO</div>
          </div>
        </div>

        {assignmentRecord ? (
          renderSuccessState()
        ) : (
          <div className="assignment-layout">
            {renderCaseList()}
            {renderAssignmentForm()}
          </div>
        )}

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
          FCR-SCS · Case Assignment Module · Connected to Business Logic Backend
        </div>
      </main>
    </div>
  );
};
