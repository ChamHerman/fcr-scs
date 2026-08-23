import * as Lucide from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, Edit, X, File } from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { CaseSelectionModal } from "./CaseSelectionModal";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
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

const VALUATION_METHOD_OPTIONS: SelectOption[] = [
  { value: "", label: "Select method" },
  { value: "Comparison Method", label: "Comparison Method" },
  { value: "Income Capitalization", label: "Income Capitalization" },
  { value: "Cost Approach", label: "Cost Approach" },
  { value: "Residual Method", label: "Residual Method" },
  { value: "Profit Method", label: "Profit Method" },
  { value: "Other", label: "Other" },
];

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
          statusClass: "status-valuation-progress",
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

  const renderPreviewModal = () => {
    if (!caseData) return null;

    return (
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Valuation Report Preview"
        subtitle="Review the valuation report details before submitting"
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="text" onClick={handleEditFromPreview}>
              <Edit size={16} /> Edit
            </Button>
            <Button
              variant="filled"
              onClick={handleConfirmSave}
              isLoading={isSaving}
            >
              <Lucide.Check size={16} /> Confirm & Save
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">Report ID</span>
            <span className="text-sm font-mono text-md-on-surface">REP-{Date.now().toString().slice(-6)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">Case ID</span>
            <span className="text-sm font-mono text-md-on-surface">{caseData.id}</span>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">Case Title</span>
            <span className="text-sm font-semibold text-md-on-surface">{caseData.title}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">Valuer</span>
            <span className="text-sm text-md-on-surface">{mockValuer.name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">Valuation Date</span>
            <span className="text-sm text-md-on-surface">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">Valuation Method</span>
            <span className="text-sm text-md-on-surface">{formData.valuationMethod}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">Market Value</span>
            <span className="text-sm font-semibold text-md-primary">RM {formData.marketValue}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">Recommended Compensation</span>
            <span className="text-sm font-semibold text-md-primary">RM {formData.recommendedCompensation}</span>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">Remarks</span>
            <span className="text-sm text-md-on-surface">{formData.remarks}</span>
          </div>
        </div>
      </Modal>
    );
  };

  const renderCancelModal = () => {
    return (
      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel without saving?"
        subtitle="You have unsaved changes. Any entered information will be lost."
        footer={
          <>
            <Button variant="text" onClick={() => setShowCancelConfirm(false)}>
              Continue Editing
            </Button>
            <Button variant="danger" onClick={confirmCancel}>
              Yes, Cancel
            </Button>
          </>
        }
      >
        <p className="text-sm text-md-on-surface-variant">
          Are you sure you want to discard your draft valuation report and return to the dashboard?
        </p>
      </Modal>
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
        <div className="mt-6 flex justify-center">
          <Button
            variant="filled"
            onClick={handleBackToDashboard}
          >
            Back to Dashboard
          </Button>
        </div>
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
              <div className="topbar-right flex items-center gap-3">
                <span className="date-badge">
                  <Lucide.Calendar size={16} className="inline mr-1" />
                  {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <Button variant="outlined" size="sm" onClick={() => navigate("/admin/case/valuation")}>
                  <Lucide.ArrowLeft size={16} /> Back to List
                </Button>
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className="case-id font-mono text-sm">{caseData.id}</span>
                      <CopyButton value={caseData.id} />
                    </div>
                    <span className="case-title">{caseData.title}</span>
                    <div className="case-meta">
                      <span><Lucide.Folder size={16} className="inline mr-1" /> {caseData.project}</span>
                      <span><Lucide.Tag size={16} className="inline mr-1" /> {caseData.landTitleNumber}</span>
                      <span><Lucide.User size={16} className="inline mr-1" /> {caseData.owner}</span>
                      <span><Lucide.Calendar size={16} className="inline mr-1" /> {caseData.registrationDate}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                    <span className={`status-badge-lg ${caseData.statusClass}`}>
                      <span className="dot"></span> {caseData.status}
                    </span>
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => setIsCaseModalOpen(true)}
                    >
                      <Lucide.RefreshCw size={12} /> Change Case
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="case-summary-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "var(--md-on-surface-variant)" }}>
                    <Lucide.AlertCircle size={20} className="inline mr-2 text-amber-500" />
                    No case selected yet. Please select a case to generate a report.
                  </div>
                  <Button
                    variant="filled"
                    size="sm"
                    onClick={() => setIsCaseModalOpen(true)}
                  >
                    Select Case
                  </Button>
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

                <div className="flex flex-col gap-5 mt-4">
                  {/* Valuation Method */}
                  <div>
                    <Select
                      label="Valuation Method *"
                      value={formData.valuationMethod}
                      options={VALUATION_METHOD_OPTIONS}
                      onChange={(val) => {
                        setFormData((prev) => ({ ...prev, valuationMethod: val }));
                        if (validationErrors.valuationMethod) {
                          setValidationErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.valuationMethod;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Select method"
                    />
                    {validationErrors.valuationMethod && (
                      <div className="text-xs text-md-error pl-2 mt-1">
                        {validationErrors.valuationMethod}
                      </div>
                    )}
                  </div>

                  {/* Market Value */}
                  <div>
                    <Input
                      label="Market Value (RM) *"
                      id="marketValue"
                      name="marketValue"
                      value={formData.marketValue}
                      onChange={handleInputChange}
                      placeholder="e.g., 1,500,000"
                    />
                    {validationErrors.marketValue && (
                      <div className="text-xs text-md-error pl-2 mt-1">
                        {validationErrors.marketValue}
                      </div>
                    )}
                  </div>

                  {/* Recommended Compensation */}
                  <div>
                    <Input
                      label="Recommended Compensation (RM) *"
                      id="recommendedCompensation"
                      name="recommendedCompensation"
                      value={formData.recommendedCompensation}
                      onChange={handleInputChange}
                      placeholder="e.g., 2,200,000"
                    />
                    {validationErrors.recommendedCompensation && (
                      <div className="text-xs text-md-error pl-2 mt-1">
                        {validationErrors.recommendedCompensation}
                      </div>
                    )}
                  </div>

                  {/* Remarks */}
                  <div>
                    <Textarea
                      label="Remarks *"
                      id="remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      placeholder="Additional notes, observations, or justifications..."
                    />
                    {validationErrors.remarks && (
                      <div className="text-xs text-md-error pl-2 mt-1">
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
                  <div className="form-actions flex items-center justify-end gap-3 pt-4 border-t border-md-outline/10">
                    <Button variant="text" onClick={handleCancel}>
                      <X size={16} /> Cancel
                    </Button>
                    <Button
                      variant="filled"
                      onClick={handleGeneratePreview}
                      disabled={isSaving || !caseData}
                    >
                      <Eye size={18} /> Generate Report
                    </Button>
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
