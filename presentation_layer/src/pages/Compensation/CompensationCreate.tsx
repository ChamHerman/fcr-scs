import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Eye,
  FileText,
  Folder,
  Tag,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  Wallet,
  Layers,
  Info,
} from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { CaseSelectionModal } from "../LandAcquisition/CaseSelectionModal";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import {
  formatCurrencyWithDecimals,
  formatCurrencyRM,
  parseCurrencyToNumber,
} from "../../utils/currency";
import type { SavedCompensationReport } from "./types/compensation.types";
import { useCompensationForm } from "./hooks/useCompensationForm";
import { useCompensationCase } from "./hooks/useCompensationCase";
import { CompensationPreviewModal } from "./components/CompensationPreviewModal";
import { CompensationSuccessState } from "./components/CompensationSuccessState";
import "../../index.css";
import "./compensation.css";
import "../../styles/shared-report.css";

export const CompensationCreate: React.FC = () => {
  const { userId } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotification();

  // Retrieve pre-selected caseId if passed from router navigation
  const initialCaseId = location.state?.caseId as string | undefined;

  // --- State ---
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId || null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState<boolean>(!initialCaseId);

  const {
    formData,
    setFormData,
    validationErrors,
    calculatedTotal,
    handleInputChange,
    validateForm,
  } = useCompensationForm();

  const {
    caseData,
    valuationReport,
    valuationReportId,
    loadingCase,
  } = useCompensationCase(selectedCaseId, setFormData);

  const [showPreview, setShowPreview] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedReport, setSavedReport] = useState<SavedCompensationReport | null>(null);

  // Project Budget & Remaining Funds
  const projectBudget = caseData?.projectBudgetSummary?.totalBudget || 0;
  const totalApprovedUnderProject = caseData?.projectBudgetSummary?.totalApprovedUnderProject || 0;
  const currentRemainingFund = caseData?.projectBudgetSummary?.remainingFund ?? projectBudget;
  const remainingFundAfterReport = currentRemainingFund - calculatedTotal;

  // Land value difference vs approved recommended valuation
  const recommendedValuation = valuationReport?.recommendedCompensation || 0;
  const landValueNum = parseCurrencyToNumber(formData.landValue);
  const landDiffFromRecommended = Math.abs(landValueNum - recommendedValuation);
  const isLandDiffOver100k = recommendedValuation > 0 && landDiffFromRecommended > 100_000;

  useEffect(() => {
    if (!selectedCaseId) {
      setIsCaseModalOpen(true);
    }
  }, [selectedCaseId]);

  // --- Handlers ---
  const handleSelectCaseFromModal = (caseId: string) => {
    setSelectedCaseId(caseId);
    setIsCaseModalOpen(false);
    setSavedReport(null);
    setShowPreview(false);
  };

  const handleGeneratePreview = () => {
    if (!validateForm(Boolean(caseData))) {
      if (!caseData) {
        notify({
          type: "general",
          title: "No Case Selected",
          message: "Please select an acquisition case before generating the report.",
        });
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      landValue: formatCurrencyWithDecimals(prev.landValue),
      buildingValue: prev.buildingValue ? formatCurrencyWithDecimals(prev.buildingValue) : "",
      cropValue: prev.cropValue ? formatCurrencyWithDecimals(prev.cropValue) : "",
      businessDisruption: prev.businessDisruption ? formatCurrencyWithDecimals(prev.businessDisruption) : "",
      disturbanceCompensation: prev.disturbanceCompensation ? formatCurrencyWithDecimals(prev.disturbanceCompensation) : "",
      relocationAllowance: prev.relocationAllowance ? formatCurrencyWithDecimals(prev.relocationAllowance) : "",
      otherEligible: prev.otherEligible ? formatCurrencyWithDecimals(prev.otherEligible) : "",
    }));

    setShowPreview(true);
  };

  const handleConfirmSave = async () => {
    if (!caseData) return;

    setIsSaving(true);
    try {
      const componentsNumeric = {
        landValue: parseCurrencyToNumber(formData.landValue),
        buildingValue: parseCurrencyToNumber(formData.buildingValue),
        cropValue: parseCurrencyToNumber(formData.cropValue),
        businessDisruption: parseCurrencyToNumber(formData.businessDisruption),
        disturbanceCompensation: parseCurrencyToNumber(formData.disturbanceCompensation),
        relocationAllowance: parseCurrencyToNumber(formData.relocationAllowance),
        otherEligible: parseCurrencyToNumber(formData.otherEligible),
      };

      const res = await compensationApi.createReport({
        caseId: caseData.id,
        valuationReportId: valuationReportId || "",
        components: componentsNumeric,
        remarks: formData.remarks.trim() || "Generated via Compensation Report Generator",
        createdById: userId,
      });

      const repId = res.report?.compensationReportId || res.reportId;
      const offer = res.offerLetter || res.report?.offerLetters?.[0];

      setSavedReport({
        reportId: repId,
        totalCompensation: calculatedTotal,
        status: res.requiresApproval ? "Pending Compensation Approval" : "Compensation Approved",
        offerId: offer?.offerId,
        offerReferenceNo: offer?.offerReferenceNo,
        requiresApproval: res.requiresApproval,
      });

      setShowPreview(false);
      notify({
        type: "success",
        title: "Report Created",
        message: res.requiresApproval
          ? `Compensation Report ${repId} created and sent to Gov Admin for review & approval.`
          : `Compensation Report ${repId} created and Offer Letter auto-generated.`,
      });
    } catch (err: any) {
      console.error("Failed to generate compensation report:", err);
      notify({
        type: "error",
        title: "Save Failed",
        message: err.message || "Could not reach backend service.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (formData.landValue || formData.buildingValue || formData.remarks) {
      setShowCancelConfirm(true);
    } else {
      navigate("/admin/compensation/report");
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    navigate("/admin/compensation/report");
  };

  return (
    <>
      <CompensationPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onEdit={() => setShowPreview(false)}
        onConfirm={handleConfirmSave}
        isSaving={isSaving}
        formData={formData}
        calculatedTotal={calculatedTotal}
        projectBudgetSummary={caseData?.projectBudgetSummary}
        recommendedValuation={recommendedValuation}
        isLandDiffOver100k={isLandDiffOver100k}
        landDiffFromRecommended={landDiffFromRecommended}
        currentRemainingFund={currentRemainingFund}
        remainingFundAfterReport={remainingFundAfterReport}
        projectBudget={projectBudget}
      />

      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel without saving?"
        subtitle="You have entered information. Any changes will be discarded."
        footer={
          <>
            <Button variant="text" onClick={() => setShowCancelConfirm(false)}>
              Continue Editing
            </Button>
            <Button variant="danger" onClick={confirmCancel}>
              Yes, Discard & Cancel
            </Button>
          </>
        }
      >
        <p className="text-sm text-md-on-surface-variant">
          Are you sure you want to discard your draft compensation report and return to the compensation dashboard?
        </p>
      </Modal>

      <CaseSelectionModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSelectCase={handleSelectCaseFromModal}
        allowedStatuses={["VALUATION_APPROVED", "COMPENSATION_REJECTED"]}
        title="Select Case for Compensation Report"
        subtitle="Choose an eligible case with approved valuation to itemize and create the compensation report."
        emptyMessage="No eligible cases in Valuation Approved or Compensation Rejected status were found."
      />

      <div className="main blur-shape-bg">
        <div className="report-generator-container">
          <PageHeader
            title="Create Compensation Report"
            subtitle="Itemize compensation components, review against approved valuation benchmarks, and create the compensation report"
            backPath="/admin/compensation/report"
          />

          {/* Case Summary */}
          {!savedReport &&
            (loadingCase ? (
              <div className="case-summary-card" style={{ padding: "20px", textAlign: "center" }}>
                <Loader2 size={24} className="inline animate-spin mr-2" /> Loading selected case details...
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
                    <span>
                      <Folder size={16} className="inline mr-1" /> {caseData.project}
                    </span>
                    <span>
                      <Tag size={16} className="inline mr-1" /> {caseData.landTitleNumber}
                    </span>
                    <span>
                      <User size={16} className="inline mr-1" /> {caseData.owner}
                    </span>
                    <span>
                      <Calendar size={16} className="inline mr-1" /> {caseData.registrationDate}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                  <span className={`status-badge-lg ${caseData.statusClass}`}>
                    <span className="dot"></span> {caseData.status}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="case-summary-card"
                style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div style={{ color: "var(--md-on-surface-variant)" }}>
                  <AlertCircle size={20} className="inline mr-2 text-amber-500" />
                  No case selected yet. Please select a case in Valuation Approved status.
                </div>
                <Button variant="filled" size="sm" onClick={() => setIsCaseModalOpen(true)}>
                  Select Case
                </Button>
              </div>
            ))}

          {/* Report Form or Success State */}
          {savedReport ? (
            <CompensationSuccessState
              savedReport={savedReport}
              recommendedValuation={recommendedValuation}
              landDiffFromRecommended={landDiffFromRecommended}
              isLandDiffOver100k={isLandDiffOver100k}
              onBackToDashboard={() => navigate("/admin/compensation/report")}
            />
          ) : (
            <div className="space-y-6">
              {caseData?.status === "COMPENSATION_REJECTED" && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="text-sm">
                    <div className="font-semibold text-amber-800 dark:text-amber-300 mb-0.5">
                      Revision Report Creation
                    </div>
                    <div className="text-xs text-amber-700/90 dark:text-amber-300/80">
                      The previous compensation report for this case was rejected. Submitting this form will generate a{" "}
                      <strong>new report record</strong> in the database while preserving historical traces.
                    </div>
                  </div>
                </div>
              )}

              {/* Report Details */}
              <div className="bg-md-surface-container rounded-xl p-7 border border-md-outline/15 shadow-sm space-y-7">
                {/* Main Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-md-outline/15">
                  <div className="p-2.5 rounded-xl bg-md-primary text-white shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-md-on-surface tracking-tight">Report Details</h2>
                    <p className="text-xs text-md-on-surface-variant">
                      Itemize compensation breakdown amounts based on approved valuation and assessment
                    </p>
                  </div>
                </div>

                {/* 1. Valuation Benchmark */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-md-on-surface">Valuation Benchmark</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="detail-item">
                      <span className="label">Valuation Method</span>
                      <span className="value">{valuationReport?.valuationMethod || "—"}</span>
                    </div>

                    <div className="detail-item">
                      <span className="label">Approved Market Value</span>
                      <span className="value">
                        {valuationReport ? formatCurrencyRM(valuationReport.marketValue) : "—"}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="label">Approved Recommended Value</span>
                      <span className="value">
                        {valuationReport ? formatCurrencyRM(valuationReport.recommendedCompensation) : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-t border-md-outline/30 my-6" />

                {/* 2. Compensation Components */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-md-on-surface">Compensation Components</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CurrencyInput
                      label="Land Value (RM) *"
                      id="landValue"
                      name="landValue"
                      value={formData.landValue}
                      onChange={handleInputChange}
                      error={validationErrors.landValue}
                      placeholder="0.00"
                    />
                    <CurrencyInput
                      label="Building/Structure Value (RM)"
                      id="buildingValue"
                      name="buildingValue"
                      value={formData.buildingValue}
                      onChange={handleInputChange}
                      error={validationErrors.buildingValue}
                      placeholder="0.00"
                    />
                    <CurrencyInput
                      label="Crop/Plantation Value (RM)"
                      id="cropValue"
                      name="cropValue"
                      value={formData.cropValue}
                      onChange={handleInputChange}
                      error={validationErrors.cropValue}
                      placeholder="0.00"
                    />
                    <CurrencyInput
                      label="Business Disruption (RM)"
                      id="businessDisruption"
                      name="businessDisruption"
                      value={formData.businessDisruption}
                      onChange={handleInputChange}
                      error={validationErrors.businessDisruption}
                      placeholder="0.00"
                    />
                    <CurrencyInput
                      label="Disturbance Compensation (RM)"
                      id="disturbanceCompensation"
                      name="disturbanceCompensation"
                      value={formData.disturbanceCompensation}
                      onChange={handleInputChange}
                      error={validationErrors.disturbanceCompensation}
                      placeholder="0.00"
                    />
                    <CurrencyInput
                      label="Relocation Allowance (RM)"
                      id="relocationAllowance"
                      name="relocationAllowance"
                      value={formData.relocationAllowance}
                      onChange={handleInputChange}
                      error={validationErrors.relocationAllowance}
                      placeholder="0.00"
                    />
                    <div className="md:col-span-2">
                      <CurrencyInput
                        label="Other Eligible Items (RM)"
                        id="otherEligible"
                        name="otherEligible"
                        value={formData.otherEligible}
                        onChange={handleInputChange}
                        error={validationErrors.otherEligible}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Total Card */}
                <div className="p-4 rounded-xl bg-md-surface-container-low border border-green-500/30 flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">Total Compensation Value</span>
                  <span className="text-xl font-bold text-green-700 dark:text-green-400">
                    {formatCurrencyRM(calculatedTotal)}
                  </span>
                </div>

                <hr className="border-t border-md-outline/30 my-6" />

                {/* 3. Remarks */}
                <div className="space-y-2">
                  <Textarea
                    label="Remarks / Justification"
                    id="remarks"
                    name="remarks"
                    rows={3}
                    placeholder="Enter any additional remarks, justification or notes for this compensation assessment..."
                    value={formData.remarks}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Project Budget Card */}
              {caseData?.projectBudgetSummary && (
                <div className="project-budget-card">
                  <div className="budget-header flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="budget-icon-badge">
                        <Wallet size={20} />
                      </div>
                      <div>
                        <div className="budget-title flex items-center gap-2 flex-wrap">
                          <span>Project Budget & Remaining Fund</span>
                          <span className="project-pill flex items-center gap-1">
                            <Folder size={13} className="inline" /> {caseData.project}
                          </span>
                        </div>
                        <div className="budget-subtitle">
                          Project fund overview and remaining allocation reference
                        </div>
                      </div>
                    </div>

                    <div className="budget-status-pill">
                      <span className="status-pill info">
                        <Info size={14} className="inline mr-1" /> Budget Reference
                      </span>
                    </div>
                  </div>

                  {/* 4 Key Metrics Grid */}
                  <div className="budget-metrics-grid">
                    <div className="metric-box">
                      <span className="metric-label">Total Project Budget</span>
                      <span className="metric-value">
                        {formatCurrencyRM(projectBudget)}
                      </span>
                      <span className="metric-sub">Allocated Project Budget</span>
                    </div>

                    <div className="metric-box">
                      <span className="metric-label">Total Approved Under Project</span>
                      <span className="metric-value text-amber-700 dark:text-amber-400">
                        {formatCurrencyRM(totalApprovedUnderProject)}
                      </span>
                      <span className="metric-sub">Across All Project Cases</span>
                    </div>

                    <div className="metric-box highlight-current">
                      <span className="metric-label">Remaining Fund</span>
                      <span className="metric-value text-blue-700 dark:text-blue-400">
                        {formatCurrencyRM(currentRemainingFund)}
                      </span>
                      <span className="metric-sub">Prior to This Report</span>
                    </div>

                    <div
                      className={`metric-box highlight-after ${
                        remainingFundAfterReport < 0 ? "warning" : "success"
                      }`}
                    >
                      <span className="metric-label">Remaining Fund After Report</span>
                      <span
                        className={`metric-value font-bold ${
                          remainingFundAfterReport < 0
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {formatCurrencyRM(remainingFundAfterReport)}
                      </span>
                      <span className="metric-sub font-semibold">
                        {remainingFundAfterReport < 0
                          ? `Difference: ${formatCurrencyRM(remainingFundAfterReport)}`
                          : "Estimated Post-Approval Balance"}
                      </span>
                    </div>
                  </div>

                  {/* Visual Budget Progress Bar */}
                  {projectBudget > 0 && (
                    <div className="budget-progress-section">
                      <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                        <span className="text-md-on-surface-variant flex items-center gap-1.5">
                          <Layers size={14} /> Project Budget Allocation
                        </span>
                        <span className="font-mono font-semibold text-md-on-surface">
                          {(
                            ((totalApprovedUnderProject + calculatedTotal) / projectBudget) *
                            100
                          ).toFixed(1)}
                          % Total
                        </span>
                      </div>

                      <div className="budget-progress-track">
                        <div
                          className="budget-bar-approved"
                          style={{
                            width: `${Math.min(
                              100,
                              (totalApprovedUnderProject / projectBudget) * 100
                            )}%`,
                          }}
                          title={`Previously Approved: ${formatCurrencyRM(totalApprovedUnderProject)}`}
                        />
                        {calculatedTotal > 0 && (
                          <div
                            className="budget-bar-current"
                            style={{
                              width: `${Math.min(
                                100 - Math.min(100, (totalApprovedUnderProject / projectBudget) * 100),
                                (calculatedTotal / projectBudget) * 100
                              )}%`,
                            }}
                            title={`This Report: ${formatCurrencyRM(calculatedTotal)}`}
                          />
                        )}
                      </div>

                      <div className="budget-legend flex items-center justify-between text-xs mt-2.5 flex-wrap gap-2 text-md-on-surface-variant">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <span className="legend-dot approved" /> Approved Cases:{" "}
                            <strong>{formatCurrencyRM(totalApprovedUnderProject)}</strong>
                          </span>
                          {calculatedTotal > 0 && (
                            <span className="flex items-center gap-1.5">
                              <span className="legend-dot current" /> This Report:{" "}
                              <strong>{formatCurrencyRM(calculatedTotal)}</strong>
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <span className="legend-dot remaining" /> Remaining After Report:{" "}
                            <strong
                              className={
                                remainingFundAfterReport < 0
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-emerald-700 dark:text-emerald-400"
                              }
                            >
                              {formatCurrencyRM(remainingFundAfterReport)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-md-outline/15">
                    <Button variant="outlined" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button variant="filled" onClick={handleGeneratePreview}>
                      <Eye size={16} /> Review & Confirm
                    </Button>
                  </div>
                </div>
              )}

              {!caseData?.projectBudgetSummary && (
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button variant="outlined" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button variant="filled" onClick={handleGeneratePreview}>
                    <Eye size={16} /> Review & Confirm
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: "24px",
              fontSize: "13px",
              color: "var(--md-on-surface-variant)",
              opacity: 0.6,
              textAlign: "center",
              borderTop: "1px solid rgba(121,116,126,0.08)",
              paddingTop: "18px",
            }}
          >
            FCR-SCS · Compensation Report Generator · Connected to Live Backend Service
          </div>
        </div>
      </div>
    </>
  );
};

export default CompensationCreate;
