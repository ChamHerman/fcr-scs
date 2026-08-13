import * as Lucide from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, Edit, X, File } from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { CaseSelectionModal } from "./CaseSelectionModal";
import { useModalPopIn } from "../../hooks/useModalPopIn";
import "../../style.css";
import "./valuation_report.css";

// --- Types ---
type CaseData = {
  id: string;
  title: string;
  project: string;
  projectType: string;
  registrationDate: string;
  assignedDate: string;
  status: string;
  statusClass: string;
  landTitleNumber: string;
  owner: string;
  ownerIc: string;
  address: string;
};

type ReportFormData = {
  valuationMethod: string;
  marketValue: string;
  recommendedCompensation: string;
  remarks: string;
  buildingAssessment: File | null;
  siteInspection: File | null;
};

type ReportRecord = {
  reportId: string;
  caseId: string;
  valuerId: string;
  valuerName: string;
  valuationDate: string;
  valuationMethod: string;
  marketValue: string;
  recommendedCompensation: string;
  remarks: string;
  buildingAssessment: string;
  siteInspection: string;
  status: string;
};

const mockValuer = {
  id: "V1",
  name: "Ahmad Faizal",
};

export const ValuationReportGenerator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve pre-selected caseId if passed from router navigation
  const initialCaseId = location.state?.caseId as string | undefined;

  // --- State ---
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId || null);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loadingCase, setLoadingCase] = useState<boolean>(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState<boolean>(!initialCaseId);

  const [formData, setFormData] = useState<ReportFormData>({
    valuationMethod: "",
    marketValue: "",
    recommendedCompensation: "",
    remarks: "",
    buildingAssessment: null,
    siteInspection: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [savedReport, setSavedReport] = useState<ReportRecord | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const buildingInputRef = useRef<HTMLInputElement>(null);
  const siteInputRef = useRef<HTMLInputElement>(null);

  // Fetch case details from database when caseId is selected
  const loadCaseDetails = useCallback(async (cId: string) => {
    setLoadingCase(true);
    try {
      const res = await landAcquisitionApi.getCaseById(cId);
      const c = res.case;
      if (c) {
        setCaseData({
          id: c.caseId,
          title: c.caseTitle,
          project: c.project?.projectName || "—",
          projectType: c.project?.projectType || "—",
          registrationDate: c.registrationDate
            ? new Date(c.registrationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          assignedDate: c.updatedAt
            ? new Date(c.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          status: c.status,
          statusClass: "valuation",
          landTitleNumber: c.landParcel?.landTitleNo || "—",
          owner: c.landParcel?.ownerships?.[0]?.landOwner?.name || "—",
          ownerIc: c.landParcel?.ownerships?.[0]?.landOwner?.icNumber || "—",
          address: c.landParcel?.address || "—",
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch case details:", err);
    } finally {
      setLoadingCase(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetails(selectedCaseId);
    } else {
      setIsCaseModalOpen(true);
    }
  }, [selectedCaseId, loadCaseDetails]);

  // Handle case selection from modal
  const handleSelectCaseFromModal = (cId: string) => {
    setSelectedCaseId(cId);
    setIsCaseModalOpen(false);
  };

  // --- Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "buildingAssessment" | "siteInspection",
  ) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, [field]: file }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!caseData) {
      alert("Please select a case before generating the report.");
      return false;
    }
    if (!formData.valuationMethod.trim()) {
      errors.valuationMethod = "Valuation method is required.";
    }
    if (!formData.marketValue.trim()) {
      errors.marketValue = "Market value is required.";
    }
    if (!formData.recommendedCompensation.trim()) {
      errors.recommendedCompensation = "Recommended compensation is required.";
    }
    if (!formData.remarks.trim()) {
      errors.remarks = "Remarks are required.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGeneratePreview = () => {
    if (!validateForm()) return;
    setShowPreview(true);
  };

  const handleEditFromPreview = () => {
    setIsEditMode(true);
    setShowPreview(false);
  };

  const handleConfirmSave = async () => {
    if (!caseData) {
      alert("No case selected.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await landAcquisitionApi.createValuationReport({
        caseId: caseData.id,
        valuationMethod: formData.valuationMethod,
        marketValue: parseFloat(formData.marketValue.replace(/[^0-9.]/g, "")) || 0,
        recommendedCompensation: parseFloat(formData.recommendedCompensation.replace(/[^0-9.]/g, "")) || 0,
        remarks: formData.remarks,
      });

      // Upload attached files if present
      if (formData.buildingAssessment) {
        try {
          await landAcquisitionApi.uploadDocument(caseData.id, formData.buildingAssessment, "Building Assessment");
        } catch (fileErr) {
          console.warn("File upload notice (building assessment):", fileErr);
        }
      }
      if (formData.siteInspection) {
        try {
          await landAcquisitionApi.uploadDocument(caseData.id, formData.siteInspection, "Site Inspection");
        } catch (fileErr) {
          console.warn("File upload notice (site inspection):", fileErr);
        }
      }

      const rep = res.report;
      const newReport: ReportRecord = {
        reportId: rep.reportId,
        caseId: rep.caseId,
        valuerId: rep.valuerId || "V1",
        valuerName: rep.valuer?.name || mockValuer.name,
        valuationDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        valuationMethod: formData.valuationMethod,
        marketValue: formData.marketValue,
        recommendedCompensation: formData.recommendedCompensation,
        remarks: formData.remarks,
        buildingAssessment: formData.buildingAssessment ? formData.buildingAssessment.name : "Not uploaded",
        siteInspection: formData.siteInspection ? formData.siteInspection.name : "Not uploaded",
        status: "Pending Valuation Approval",
      };

      setSavedReport(newReport);
      setShowPreview(false);
      setIsEditMode(false);
    } catch (err: any) {
      console.error("Failed to save valuation report:", err);
      alert(`Report Save Failed: ${err.message || "Could not reach backend"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (formData.valuationMethod || formData.marketValue || formData.remarks) {
      setShowCancelConfirm(true);
    } else {
      navigate("/admin/case/valuation");
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    navigate("/admin/case/valuation");
  };

  const handleBackToDashboard = () => {
    navigate("/admin/case/valuation");
  };

  // --- Render ---
  const previewModalRef = useModalPopIn(showPreview);
  const cancelModalRef = useModalPopIn(showCancelConfirm);

  const renderPreviewModal = () => {
    if (!showPreview || !caseData) return null;

    return createPortal(
      <div
        className="preview-modal-overlay"
        onClick={() => setShowPreview(false)}
      >
        <div ref={previewModalRef} className="preview-modal" style={{ borderRadius: "28px" }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2><Lucide.FileText size={20} className="inline mr-1" /> Valuation Report</h2>
            <button className="close-btn" onClick={() => setShowPreview(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="preview-grid">
            <div className="preview-item">
              <div className="label">Report ID</div>
              <div className="value">REP-{Date.now().toString().slice(-6)}</div>
            </div>
            <div className="preview-item">
              <div className="label">Case ID</div>
              <div className="value">{caseData.id}</div>
            </div>
            <div className="preview-item">
              <div className="label">Case Title</div>
              <div className="value">{caseData.title}</div>
            </div>
            <div className="preview-item">
              <div className="label">Valuer</div>
              <div className="value">{mockValuer.name}</div>
            </div>
            <div className="preview-item">
              <div className="label">Valuation Date</div>
              <div className="value">
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="preview-item">
              <div className="label">Valuation Method</div>
              <div className="value">{formData.valuationMethod}</div>
            </div>
            <div className="preview-item">
              <div className="label">Market Value</div>
              <div className="value">RM {formData.marketValue}</div>
            </div>
            <div className="preview-item">
              <div className="label">Recommended Compensation</div>
              <div className="value">RM {formData.recommendedCompensation}</div>
            </div>
            <div className="preview-item full-width">
              <div className="label">Remarks</div>
              <div className="value">{formData.remarks}</div>
            </div>
            <div className="preview-item">
              <div className="label">Building Assessment</div>
              <div className="value">
                {formData.buildingAssessment
                  ? formData.buildingAssessment.name
                  : "— Not uploaded"}
              </div>
            </div>
            <div className="preview-item">
              <div className="label">Site Inspection</div>
              <div className="value">
                {formData.siteInspection
                  ? formData.siteInspection.name
                  : "— Not uploaded"}
              </div>
            </div>
            <div className="preview-item full-width">
              <div className="label">Status</div>
              <div className="status-preview">
                <Lucide.Hourglass size={16} className="inline mr-1" /> Pending Valuation Approval
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-edit" onClick={handleEditFromPreview}>
              <Edit size={16} /> Edit
            </button>
            <button
              className="btn-confirm"
              onClick={handleConfirmSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : <><Lucide.Check size={16} className="inline mr-1" /> Confirm & Save</>}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderCancelModal = () => {
    if (!showCancelConfirm) return null;
    return createPortal(
      <div
        className="cancel-confirm-overlay"
        onClick={() => setShowCancelConfirm(false)}
      >
        <div
          ref={cancelModalRef}
          className="cancel-confirm-modal"
          style={{ borderRadius: "28px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3>Cancel without saving?</h3>
          <p>
            You have unsaved changes. Any entered information will be lost. Are
            you sure you want to cancel?
          </p>
          <div className="modal-actions">
            <button
              className="btn-modal-cancel"
              onClick={() => setShowCancelConfirm(false)}
            >
              Continue Editing
            </button>
            <button className="btn-modal-confirm" onClick={confirmCancel}>
              Yes, Cancel
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderSuccessState = () => (
    <div className="report-form-card">
      <div className="success-banner">
        <span className="check-icon"><Lucide.CheckCircle size={16} className="inline mr-1" /></span>
        <div>
          <strong>Report saved successfully!</strong>
          <span style={{ marginLeft: "12px", fontWeight: 400 }}>
            Case status updated to <strong>Pending Valuation Approval</strong>
          </span>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div
          style={{ fontSize: "14px", color: "var(--md-on-surface-variant)" }}
        >
          <div>
            <strong>Report ID:</strong> {savedReport?.reportId}
          </div>
          <div>
            <strong>Recommended Compensation:</strong> RM{" "}
            {savedReport?.recommendedCompensation}
          </div>
        </div>
        <button
          className="btn-generate"
          onClick={handleBackToDashboard}
          style={{ margin: "20px auto 0" }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <>
      {renderPreviewModal()}
      {renderCancelModal()}
      <CaseSelectionModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSelectCase={handleSelectCaseFromModal}
      />

      <div
        className="flex min-h-screen"
        style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}
      >
        {/* Main Content */}
        <main className="main blur-shape-bg" style={{ width: "100%", padding: "24px" }}>
          <div className="report-generator-container">
            {/* Top Bar */}
            <div className="topbar" style={{ marginBottom: "20px" }}>
              <div className="topbar-left">
                <h1 style={{ marginBottom: 0 }}>Valuation Report Generator</h1>
                <div className="sub">
                  Create a valuation report for the selected case
                </div>
              </div>
              <div className="topbar-right">
                <span className="date-badge">
                  <Lucide.Calendar size={16} className="inline mr-1" />
                  {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <div className="avatar">AF</div>
              </div>
            </div>

            {/* Case Summary (hidden after report is saved successfully) */}
            {!savedReport &&
              (loadingCase ? (
                <div className="case-summary-card" style={{ padding: "20px", textAlign: "center" }}>
                  <Lucide.Loader2 size={24} className="inline animate-spin mr-2" /> Loading selected case details...
                </div>
              ) : caseData ? (
                <div className="case-summary-card">
                  <div className="case-info">
                    <span className="case-id">{caseData.id}</span>
                    <span className="case-title">{caseData.title}</span>
                    <div className="case-meta">
                      <span><Lucide.Folder size={16} className="inline mr-1" /> {caseData.project}</span>
                      <span><Lucide.Tag size={16} className="inline mr-1" /> {caseData.landTitleNumber}</span>
                      <span><Lucide.User size={16} className="inline mr-1" /> {caseData.owner}</span>
                      <span><Lucide.Calendar size={16} className="inline mr-1" /> {caseData.registrationDate}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                    <span className="status-badge-lg">
                      <Lucide.Hourglass size={16} className="inline mr-1" /> {caseData.status}
                    </span>
                    <button
                      className="btn-filter"
                      style={{ fontSize: "12px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={() => setIsCaseModalOpen(true)}
                    >
                      <Lucide.RefreshCw size={12} /> Change Case
                    </button>
                  </div>
                </div>
              ) : (
                <div className="case-summary-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "var(--md-on-surface-variant)" }}>
                    <Lucide.AlertCircle size={20} className="inline mr-2 text-amber-500" />
                    No case selected yet. Please select a case to generate a report.
                  </div>
                  <button
                    className="btn-primary"
                    style={{ padding: "6px 16px", fontSize: "13px" }}
                    onClick={() => setIsCaseModalOpen(true)}
                  >
                    Select Case
                  </button>
                </div>
              ))}

            {/* Report Form or Success State */}
            {savedReport ? (
              renderSuccessState()
            ) : (
              <div className="report-form-card">
                <div className="form-title">
                  {isEditMode ? (
                    <>
                      <Edit size={18} className="inline mr-2" /> Edit Report
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 400,
                          marginLeft: "8px",
                          padding: "2px 10px",
                          borderRadius: "var(--radius-full)",
                          background: "#fff3e0",
                          color: "#a8600b",
                        }}
                      >
                        Editing
                      </span>
                    </>
                  ) : (
                    "Enter Report Details"
                  )}
                </div>
                <div className="form-subtitle">
                  {isEditMode
                    ? "Update the report details below. Fields are pre-filled with existing values."
                    : "Fill in the valuation information below. All fields marked with * are required."}
                </div>

                <div className="form-grid">
                  {/* Valuation Method */}
                  <div className="form-group">
                    <label htmlFor="valuationMethod">
                      Valuation Method <span className="required">*</span>
                    </label>
                    <select
                      id="valuationMethod"
                      name="valuationMethod"
                      value={formData.valuationMethod}
                      onChange={handleInputChange}
                      className={
                        validationErrors.valuationMethod ? "error" : ""
                      }
                    >
                      <option value="">Select method</option>
                      <option value="Comparison Method">
                        Comparison Method
                      </option>
                      <option value="Income Capitalization">
                        Income Capitalization
                      </option>
                      <option value="Cost Approach">Cost Approach</option>
                      <option value="Residual Method">Residual Method</option>
                      <option value="Profit Method">Profit Method</option>
                      <option value="Other">Other</option>
                    </select>
                    {validationErrors.valuationMethod && (
                      <div className="error-text">
                        {validationErrors.valuationMethod}
                      </div>
                    )}
                  </div>

                  {/* Market Value */}
                  <div className="form-group">
                    <label htmlFor="marketValue">
                      Market Value (RM) <span className="required">*</span>
                    </label>
                    <input
                      id="marketValue"
                      type="text"
                      name="marketValue"
                      value={formData.marketValue}
                      onChange={handleInputChange}
                      placeholder="e.g., 1,500,000"
                      className={validationErrors.marketValue ? "error" : ""}
                    />
                    {validationErrors.marketValue && (
                      <div className="error-text">
                        {validationErrors.marketValue}
                      </div>
                    )}
                  </div>

                  {/* Recommended Compensation */}
                  <div className="form-group">
                    <label htmlFor="recommendedCompensation">
                      Recommended Compensation (RM){" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      id="recommendedCompensation"
                      type="text"
                      name="recommendedCompensation"
                      value={formData.recommendedCompensation}
                      onChange={handleInputChange}
                      placeholder="e.g., 2,200,000"
                      className={
                        validationErrors.recommendedCompensation ? "error" : ""
                      }
                    />
                    {validationErrors.recommendedCompensation && (
                      <div className="error-text">
                        {validationErrors.recommendedCompensation}
                      </div>
                    )}
                  </div>

                  {/* Remarks */}
                  <div className="form-group">
                    <label htmlFor="remarks">
                      Remarks <span className="required">*</span>
                    </label>
                    <textarea
                      id="remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      placeholder="Additional notes, observations, or justifications..."
                      rows={2}
                      className={validationErrors.remarks ? "error" : ""}
                    />
                    {validationErrors.remarks && (
                      <div className="error-text">
                        {validationErrors.remarks}
                      </div>
                    )}
                  </div>

                  {/* Attach Section */}
                  <div className="attach-section">
                    <div className="attach-title">
                      <File size={18} /> Attach Supporting Information
                    </div>
                    <div className="attach-grid">
                      <label>Building Assessment</label>
                      <input
                        ref={buildingInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) =>
                          handleFileChange(e, "buildingAssessment")
                        }
                      />

                      <label>Site Inspection Report</label>
                      <input
                        ref={siteInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => handleFileChange(e, "siteInspection")}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={handleCancel}>
                      <X size={16} /> Cancel
                    </button>
                    <button
                      className="btn-generate"
                      onClick={handleGeneratePreview}
                      disabled={isSaving || !caseData}
                    >
                      <Eye size={18} /> Generate Report
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            FCR-SCS · Valuation Report Generator · For Land Valuers only
          </div>
        </main>
      </div>
    </>
  );
};
