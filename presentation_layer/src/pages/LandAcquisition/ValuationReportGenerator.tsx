import * as Lucide from "lucide-react";
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, X, File } from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
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

// --- Mock Case Data (simulate navigation from dashboard) ---
// In real app, this would come from route state or API
const mockSelectedCase: CaseData = {
  id: "LAC-2026-07-0024",
  title: "Kampung Baru Land Acquisition",
  project: "KL Sentral Redevelopment",
  projectType: "Urban Redevelopment",
  registrationDate: "24 Jul 2026",
  assignedDate: "25 Jul 2026",
  status: "Valuer Assigned",
  statusClass: "valuation",
  landTitleNumber: "PN 12345",
  owner: "Ahmad Bin Abdullah",
  ownerIc: "750101-10-5678",
  address: "No. 45, Jalan Kampung Baru, 50300 Kuala Lumpur",
};

const mockValuer = {
  id: "V1",
  name: "Ahmad Faizal",
};

export const ValuationReportGenerator: React.FC = () => {
  const navigate = useNavigate();

  // --- State ---
  const [caseData] = useState<CaseData>(mockSelectedCase);
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
    // A1: Edit – close preview, keep form data for editing
    setIsEditMode(true);
    setShowPreview(false);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const res = await landAcquisitionApi.createValuationReport({
        caseId: caseData.id,
        valuationMethod: formData.valuationMethod,
        marketValue: parseFloat(formData.marketValue.replace(/[^0-9.]/g, "")) || 0,
        recommendedCompensation: parseFloat(formData.recommendedCompensation.replace(/[^0-9.]/g, "")) || 0,
        remarks: formData.remarks,
      });

      const rep = res.report;
      const newReport: ReportRecord = {
        reportId: rep.reportId,
        caseId: rep.caseId,
        valuerId: rep.valuerId,
        valuerName: mockValuer.name,
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
      navigate("/case/valuation"); // Go back to dashboard
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    navigate("/case/valuation");
  };

  const handleBackToDashboard = () => {
    navigate("/case/valuation");
  };

  // --- Render ---
  const renderPreviewModal = () => {
    if (!showPreview) return null;

    return (
      <div
        className="preview-modal-overlay"
        onClick={() => setShowPreview(false)}
      >
        <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
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
                  ? `<Lucide.Paperclip size={16} className="inline mr-1" /> ${formData.buildingAssessment.name}`
                  : "— Not uploaded"}
              </div>
            </div>
            <div className="preview-item">
              <div className="label">Site Inspection</div>
              <div className="value">
                {formData.siteInspection
                  ? `<Lucide.Paperclip size={16} className="inline mr-1" /> ${formData.siteInspection.name}`
                  : "— Not uploaded"}
              </div>
            </div>
            <div className="preview-item full-width">
              <div className="label">Status (C4)</div>
              <div className="status-preview">
                <Lucide.Hourglass size={16} className="inline mr-1" /> Pending Valuation Approval
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-edit" onClick={handleEditFromPreview}>
              <Edit size={16} /> Edit (A1)
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
      </div>
    );
  };

  const renderCancelModal = () => {
    if (!showCancelConfirm) return null;
    return (
      <div
        className="cancel-confirm-overlay"
        onClick={() => setShowCancelConfirm(false)}
      >
        <div
          className="cancel-confirm-modal"
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
      </div>
    );
  };

  const renderSuccessState = () => (
    <div className="report-form-card">
      <div className="success-banner">
        <span className="check-icon"><Lucide.CheckCircle size={16} className="inline mr-1" /></span>
        <div>
          <strong>Report saved successfully!</strong>
          <span style={{ marginLeft: "12px", fontWeight: 400 }}>
            Case status updated to <strong>Pending Valuation Approval</strong>{" "}
            (C4)
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

      <div
        className="flex min-h-screen"
        style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}
      >
        {/* Sidebar */}


        {/* Main Content */}
        <main className="main blur-shape-bg">
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
                <span className="date-badge"><Lucide.Calendar size={16} className="inline mr-1" /> 24 Jul 2026</span>
                <div className="avatar">AF</div>
              </div>
            </div>

            {/* Case Summary */}
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
              <span className="status-badge-lg"><Lucide.Hourglass size={16} className="inline mr-1" /> {caseData.status}</span>
            </div>

            {/* Report Form or Success State */}
            {savedReport ? (
              renderSuccessState()
            ) : (
              <div className="report-form-card">
                <div className="form-title">
                  {isEditMode ? (
                    <>
                      <Edit size={18} className="inline mr-2" /> Edit Report
                      (A1)
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
                      <File size={18} /> Attach Supporting Information (C2)
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
                      disabled={isSaving}
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
