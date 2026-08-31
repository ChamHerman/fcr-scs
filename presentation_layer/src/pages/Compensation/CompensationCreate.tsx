import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Eye,
  Edit,
  X,
  FileText,
  Folder,
  Tag,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Check,
  Mail,
} from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { CaseSelectionModal } from "../LandAcquisition/CaseSelectionModal";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import {
  formatCurrencyWithDecimals,
  formatCurrencyRM,
  parseCurrencyToNumber,
} from "../../utils/currency";
import { CASE_STATUS_CLASS_MAP } from "../../constants";
import "../../index.css";
import "./compensation.css";
import "../LandAcquisition/valuation_report.css";

// --- Types ---
type CaseData = {
  id: string;
  title: string;
  project: string;
  owner: string;
  ownerIc: string;
  landTitleNumber: string;
  registrationDate: string;
  status: string;
  statusClass: string;
};

type ValuationReport = {
  reportId?: string;
  valuationMethod: string;
  marketValue: number;
  recommendedCompensation: number;
  landValue: number;
  buildingValue: number;
  cropValue: number;
};

type CompensationFormData = {
  landValue: string;
  buildingValue: string;
  cropValue: string;
  businessDisruption: string;
  disturbanceCompensation: string;
  relocationAllowance: string;
  otherEligible: string;
  remarks: string;
};

type SavedCompensationReport = {
  reportId: string;
  totalCompensation: number;
  status: string;
  offerId?: string;
  offerReferenceNo?: string;
  requiresApproval?: boolean;
};

export const CompensationCreate: React.FC = () => {
  const { user } = useAuth();
  const { userId } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotification();

  // Retrieve pre-selected caseId if passed from router navigation
  const initialCaseId = location.state?.caseId as string | undefined;

  // --- State ---
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId || null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState<boolean>(!initialCaseId);
  const [loadingCase, setLoadingCase] = useState<boolean>(false);

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [valuationReport, setValuationReport] = useState<ValuationReport | null>(null);
  const [valuationReportId, setValuationReportId] = useState<string | null>(null);

  // Initial form data: Land value prefilled from recommended value; others left empty
  const [formData, setFormData] = useState<CompensationFormData>({
    landValue: "",
    buildingValue: "",
    cropValue: "",
    businessDisruption: "",
    disturbanceCompensation: "",
    relocationAllowance: "",
    otherEligible: "",
    remarks: "",
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [showPreview, setShowPreview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedReport, setSavedReport] = useState<SavedCompensationReport | null>(null);

  // --- Computed Totals ---
  const calculatedTotal = useMemo(() => {
    const lv = parseCurrencyToNumber(formData.landValue);
    const bv = parseCurrencyToNumber(formData.buildingValue);
    const cv = parseCurrencyToNumber(formData.cropValue);
    const bd = parseCurrencyToNumber(formData.businessDisruption);
    const dc = parseCurrencyToNumber(formData.disturbanceCompensation);
    const ra = parseCurrencyToNumber(formData.relocationAllowance);
    const oe = parseCurrencyToNumber(formData.otherEligible);
    return Math.round((lv + bv + cv + bd + dc + ra + oe) * 100) / 100;
  }, [formData]);

  // Land value difference vs approved recommended valuation
  const recommendedValuation = valuationReport?.recommendedCompensation || 0;
  const landValueNum = parseCurrencyToNumber(formData.landValue);
  const landDiffFromRecommended = Math.abs(landValueNum - recommendedValuation);
  const isLandDiffOver100k = recommendedValuation > 0 && landDiffFromRecommended > 100_000;

  // --- Fetch Case & Approved Valuation Details ---
  const loadCaseDetails = useCallback(async (cId: string) => {
    setLoadingCase(true);
    try {
      const res = await landAcquisitionApi.getCaseById(cId);
      const c = res?.case || res;
      if (c && (c.caseId || c.id)) {
        const cIdValue = c.caseId || c.id;
        const statusClass = CASE_STATUS_CLASS_MAP[c.status] || "status-valuation-approved";

        setCaseData({
          id: cIdValue,
          title: c.caseTitle || "—",
          project: c.project?.projectName || "—",
          owner: c.landParcel?.ownerships?.[0]?.landOwner?.name || "—",
          ownerIc: c.landParcel?.ownerships?.[0]?.landOwner?.icNumber || "—",
          landTitleNumber: c.landParcel?.landTitleNo || "—",
          registrationDate: c.registrationDate
            ? new Date(c.registrationDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—",
          status: c.status,
          statusClass,
        });

        const valReports = c.valuationReports || [];
        const approvedVal = valReports.find((r: any) => r.reportStatus === "APPROVED") || valReports[0];

        if (approvedVal) {
          const recComp = Number(approvedVal.recommendedCompensation || 0);
          const mktVal = Number(approvedVal.marketValue || 0);

          setValuationReportId(approvedVal.reportId);
          setValuationReport({
            reportId: approvedVal.reportId,
            valuationMethod: approvedVal.valuationMethod || "Sales Comparison Method",
            marketValue: mktVal,
            recommendedCompensation: recComp,
            landValue: recComp,
            buildingValue: 0,
            cropValue: 0,
          });

          // Land value directly taken from recommended value; other 6 fields remain empty
          setFormData({
            landValue: recComp > 0 ? formatCurrencyWithDecimals(recComp) : "",
            buildingValue: "",
            cropValue: "",
            businessDisruption: "",
            disturbanceCompensation: "",
            relocationAllowance: "",
            otherEligible: "",
            remarks: "",
          });
        } else {
          setValuationReportId(null);
          setValuationReport(null);
          setFormData({
            landValue: "",
            buildingValue: "",
            cropValue: "",
            businessDisruption: "",
            disturbanceCompensation: "",
            relocationAllowance: "",
            otherEligible: "",
            remarks: "",
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to load case details for compensation:", err);
      notify({
        type: "error",
        title: "Load Failed",
        message: "Failed to fetch case and valuation information.",
      });
    } finally {
      setLoadingCase(false);
    }
  }, [notify]);

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetails(selectedCaseId);
    } else {
      setIsCaseModalOpen(true);
    }
  }, [selectedCaseId, loadCaseDetails]);

  // --- Handlers ---
  const handleSelectCaseFromModal = (caseId: string) => {
    setSelectedCaseId(caseId);
    setIsCaseModalOpen(false);
    setSavedReport(null);
    setShowPreview(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!caseData) {
      notify({
        type: "general",
        title: "No Case Selected",
        message: "Please select an acquisition case before generating the report.",
      });
      return false;
    }

    const landVal = parseCurrencyToNumber(formData.landValue);
    const bldgValNum = parseCurrencyToNumber(formData.buildingValue);
    const cropValNum = parseCurrencyToNumber(formData.cropValue);
    const bdValNum = parseCurrencyToNumber(formData.businessDisruption);
    const dcValNum = parseCurrencyToNumber(formData.disturbanceCompensation);
    const raValNum = parseCurrencyToNumber(formData.relocationAllowance);
    const oeValNum = parseCurrencyToNumber(formData.otherEligible);

    // Land Value must be filled in and not negative
    if (!formData.landValue.trim() || isNaN(landVal) || landVal <= 0) {
      errors.landValue = "Land Value is required, must be filled in, and cannot be negative or zero.";
    }

    if (bldgValNum < 0) {
      errors.buildingValue = "Building Value cannot be negative.";
    }

    if (cropValNum < 0) {
      errors.cropValue = "Crop Value cannot be negative.";
    }

    if (bdValNum < 0) {
      errors.businessDisruption = "Business Disruption cannot be negative.";
    }

    if (dcValNum < 0) {
      errors.disturbanceCompensation = "Disturbance Compensation cannot be negative.";
    }

    if (raValNum < 0) {
      errors.relocationAllowance = "Relocation Allowance cannot be negative.";
    }

    if (oeValNum < 0) {
      errors.otherEligible = "Other Eligible cannot be negative.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGeneratePreview = () => {
    if (!validateForm()) return;

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

  const handleEditFromPreview = () => {
    setIsEditMode(true);
    setShowPreview(false);
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

  const handleBackToDashboard = () => {
    navigate("/admin/compensation/report");
  };

  // --- Modals ---
  const renderPreviewModal = () => {
    if (!caseData) return null;

    return (
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Compensation Summary"
        subtitle="Review the calculated compensation breakdown before confirming"
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="text" onClick={handleEditFromPreview}>
              <Edit size={16} /> Edit
            </Button>
            <Button variant="filled" onClick={handleConfirmSave} isLoading={isSaving}>
              <Check size={16} /> Confirm & Save
            </Button>
          </>
        }
      >
        <div className="space-y-3.5 py-2">
          {/* Breakdown Items */}
          <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/15 space-y-2 text-sm">
            <div className="flex justify-between items-center text-md-on-surface-variant">
              <span>Land Value</span>
              <span className="font-mono font-semibold text-md-on-surface">
                {formData.landValue ? formatCurrencyRM(formData.landValue) : "RM 0.00"}
              </span>
            </div>
            <div className="flex justify-between items-center text-md-on-surface-variant">
              <span>Building / Structure Value</span>
              <span className="font-mono font-semibold text-md-on-surface">
                {formData.buildingValue ? formatCurrencyRM(formData.buildingValue) : "RM 0.00"}
              </span>
            </div>
            <div className="flex justify-between items-center text-md-on-surface-variant">
              <span>Crop / Plantation Value</span>
              <span className="font-mono font-semibold text-md-on-surface">
                {formData.cropValue ? formatCurrencyRM(formData.cropValue) : "RM 0.00"}
              </span>
            </div>
            {(parseCurrencyToNumber(formData.businessDisruption) > 0 ||
              parseCurrencyToNumber(formData.disturbanceCompensation) > 0 ||
              parseCurrencyToNumber(formData.relocationAllowance) > 0 ||
              parseCurrencyToNumber(formData.otherEligible) > 0) && (
              <div className="flex justify-between items-center text-md-on-surface-variant pt-1 border-t border-md-outline/10">
                <span>Other Allowances & Disturbance</span>
                <span className="font-mono font-semibold text-md-on-surface">
                  {formatCurrencyRM(
                    parseCurrencyToNumber(formData.businessDisruption) +
                      parseCurrencyToNumber(formData.disturbanceCompensation) +
                      parseCurrencyToNumber(formData.relocationAllowance) +
                      parseCurrencyToNumber(formData.otherEligible)
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Total Calculated Compensation */}
          <div className="flex justify-between items-center p-4 rounded-xl bg-md-surface-container-low border border-green-500/30">
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">Total Compensation Value</span>
            <span className="text-base font-bold text-green-700 dark:text-green-400 font-mono">
              {formatCurrencyRM(calculatedTotal)}
            </span>
          </div>

          {/* Approved Valuation Recommended Reference */}
          <div className="flex justify-between items-center p-4 rounded-xl bg-md-surface-container-low border border-md-primary/30">
            <span className="text-sm font-semibold text-md-primary">Approved Recommended Valuation</span>
            <span className="text-base font-bold text-md-primary font-mono">
              {recommendedValuation > 0 ? formatCurrencyRM(recommendedValuation) : "—"}
            </span>
          </div>

          {/* RM 100,000 Difference Warning Indicator */}
          {recommendedValuation > 0 && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                isLandDiffOver100k
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                  : "bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-200"
              }`}
            >
              {isLandDiffOver100k ? (
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle size={16} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
              )}
              <div>
                <strong>
                  {isLandDiffOver100k
                    ? `RM ${landDiffFromRecommended.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Difference Detected (> RM 100,000 Threshold)`
                    : "Land Value within RM 100,000 threshold"}
                </strong>
                <p className="mt-0.5 opacity-80">
                  {isLandDiffOver100k
                    ? "The proposed Land Value deviates by more than RM 100,000 from the Approved Recommended Valuation. Proceeding will route this report to Government Admin for review and approval. The offer letter will not be generated yet."
                    : "The proposed Land Value is aligned within RM 100,000 of the Approved Recommended Valuation."}
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  const renderCancelModal = () => (
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
  );

  const renderSuccessState = () => (
    <div className="bg-md-surface-container rounded-xl p-7 border border-md-outline/15 shadow-sm space-y-6">
      <div className="success-banner">
        <span className="check-icon">
          <CheckCircle size={20} className="inline mr-1" />
        </span>
        <div>
          <strong>
            {savedReport?.requiresApproval
              ? "New Compensation Report Created and Sent for Approval!"
              : "New Compensation Report Created Successfully!"}
          </strong>
          <span style={{ marginLeft: "12px", fontWeight: 400 }}>
            Case status updated to <strong>{savedReport?.status}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-green-500/30 text-center">
          <span className="text-xs text-green-700 dark:text-green-400 uppercase font-semibold">Total Compensation</span>
          <div className="text-xl font-bold text-green-700 dark:text-green-400 mt-1">
            {formatCurrencyRM(savedReport?.totalCompensation)}
          </div>
          <span className="text-xs text-md-on-surface-variant/70 font-mono mt-0.5 block">Approved Breakdown</span>
        </div>
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-primary/30 text-center">
          <span className="text-xs text-md-primary uppercase font-semibold">Recommended Valuation</span>
          <div className="text-xl font-bold text-md-primary mt-1">
            {recommendedValuation > 0 ? formatCurrencyRM(recommendedValuation) : "—"}
          </div>
          <span className="text-xs text-md-on-surface-variant/70 mt-0.5 block">Benchmark</span>
        </div>
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/10 text-center">
          <span className="text-xs text-md-on-surface-variant uppercase font-semibold">Land Value Difference</span>
          <div className="text-xl font-bold text-md-on-surface mt-1">
            RM {landDiffFromRecommended.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-md-on-surface-variant/70 mt-0.5 block">
            {isLandDiffOver100k ? "Exceeds RM 100k (Requires Admin Review)" : "Within Threshold"}
          </span>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: "14px", color: "var(--md-on-surface-variant)" }}>
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="text-sm">Assigned Report ID:</span>{" "}
            <span className="font-mono text-base font-bold text-md-primary">{savedReport?.reportId}</span>
            <CopyButton value={savedReport?.reportId || ""} />
          </div>

          {savedReport?.offerReferenceNo ? (
            <div className="mt-3 p-3 max-w-md mx-auto rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-800 dark:text-green-300 flex items-center justify-center gap-2">
              <Mail size={16} />
              <span>
                Offer Letter Auto-Generated: <strong>{savedReport.offerReferenceNo}</strong>
              </span>
              <CopyButton value={savedReport.offerReferenceNo} />
            </div>
          ) : savedReport?.requiresApproval ? (
            <div className="mt-3 p-3 max-w-lg mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 text-center">
              Because the Land Value differs by more than RM 100,000 from the Recommended Valuation (or total exceeds RM 1,000,000), this report has been routed to <strong>Government Admin</strong> for review and approval. The Offer Letter will be issued once approved.
            </div>
          ) : null}

          <div className="text-xs text-md-on-surface-variant/70 mt-3 max-w-md mx-auto">
            This compensation report has been recorded with all 7 itemized components in the database with audit trails.
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          {savedReport?.offerId && (
            <Button
              variant="filled"
              onClick={() =>
                navigate("/admin/compensation/offer/review", { state: { offerId: savedReport.offerId } })
              }
            >
              <Mail size={16} /> View Offer Letter
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() =>
              navigate("/admin/compensation/report/review", { state: { reportId: savedReport?.reportId } })
            }
          >
            <Eye size={16} /> View New Report
          </Button>
          <Button variant="outlined" onClick={handleBackToDashboard}>
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
        allowedStatuses={["VALUATION_APPROVED", "COMPENSATION_REJECTED"]}
        title="Select Case for Compensation Report"
        subtitle="Choose an eligible case with approved valuation to itemize and create the compensation report."
        emptyMessage="No eligible cases in Valuation Approved or Compensation Rejected status were found."
      />

      <div className="main blur-shape-bg">
        <div className="report-generator-container">
          {/* Top Bar */}
          <div className="topbar" style={{ marginBottom: "20px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Create Compensation Report</h1>
              <div className="sub">
                Itemize compensation components, review against approved valuation benchmarks, and create the compensation report
              </div>
            </div>
            <div className="topbar-right flex items-center gap-3">
              <Button variant="outlined" size="sm" onClick={() => navigate("/admin/compensation/report")}>
                <ArrowLeft size={16} /> Back
              </Button>
              <span className="date-badge">
                <Calendar size={16} className="inline mr-1" />
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
                  <User size={16} />
                )}
              </div>
            </div>
          </div>

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
            renderSuccessState()
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

              {/* ──────────────────────────────────────────────────────────── */}
              {/* UNIFIED CONTAINER: Report Details (bold)                     */}
              {/* ──────────────────────────────────────────────────────────── */}
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

                {/* 1. Approved Valuation Benchmark */}
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

                {/* DIVIDER 1 */}
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
                        label="Other Eligible Items (Special Damages) (RM)"
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

                {/* DIVIDER 2 */}
                <hr className="border-t border-md-outline/30 my-6" />

                {/* 3. Additional Remarks */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-md-on-surface">Additional Remarks</h3>
                  <Textarea
                    label="Officer Notes / Remarks (Optional)"
                    id="remarks"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Add any statutory justification, special assessment notes, or details regarding the compensation breakdown..."
                    rows={3}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-md-outline/30">
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
            FCR-SCS · Compensation Report Module · For Compensation Officers only
          </div>
        </div>
      </div>
    </>
  );
};

export const CompensationReportGenerator = CompensationCreate;
export default CompensationCreate;
