import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Eye,
  Edit,
  X,
  File,
  Sparkles,
  FileText,
  Folder,
  Tag,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Check,
} from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { valuateProperty } from "../../services/predictionApi";
import { CaseSelectionModal } from "./CaseSelectionModal";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { AreaInput } from "../../components/ui/AreaInput";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { Textarea } from "../../components/ui/Textarea";
import { FileUpload } from "../../components/ui/FileUpload";
import { CopyButton } from "../../components/ui/CopyButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../components/ui/NotificationSystem";
import { formatCurrencyWithDecimals, formatCurrencyRM, parseCurrencyToNumber, formatAreaWithoutDecimals, formatLiveInteger } from "../../utils/currency";
import type { ValuationFormData } from "./types/land-acquisition.types";
import { useValuationForm } from "./hooks/useValuationForm";
import "../../index.css";
import "../../styles/shared-report.css";
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
  state?: string;
  category?: string;
  tenureType?: string;
  rawArea?: number;
};

type ReportRecord = {
  reportId: string;
  caseId: string;
  valuerId: string;
  valuerName: string;
  valuationDate: string;
  valuationMethod: string;
  locationType?: string;
  buildingAge?: number;
  landArea: string;
  acquisitionArea: string;
  builtUpArea: string;
  marketRatePerSqMeter: string;
  compensationRatePerSqMeter: string;
  aiValuationPrice: string;
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

import { VALUATION_METHOD_OPTIONS, LOCATION_TYPE_OPTIONS } from "../../constants";

export const ValuationCreate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotification();

  // Retrieve pre-selected caseId if passed from router navigation
  const initialCaseId = location.state?.caseId as string | undefined;

  // --- State ---
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId || null);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loadingCase, setLoadingCase] = useState<boolean>(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState<boolean>(!initialCaseId);

  const {
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    isCalculatingAi,
    handleInputChange,
    validateForm,
    calculateAiPrediction,
  } = useValuationForm();

  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [savedReport, setSavedReport] = useState<ReportRecord | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Computed Totals (Derived strictly from area and rates - stored in database on submit)
  const calculatedMarketTotal = useMemo(() => {
    const acq = parseCurrencyToNumber(formData.acquisitionArea);
    const rate = parseCurrencyToNumber(formData.marketRatePerSqMeter);
    return Math.round(acq * rate * 100) / 100;
  }, [formData.acquisitionArea, formData.marketRatePerSqMeter]);

  const calculatedCompTotal = useMemo(() => {
    const acq = parseCurrencyToNumber(formData.acquisitionArea);
    const rate = parseCurrencyToNumber(formData.compensationRatePerSqMeter);
    return Math.round(acq * rate * 100) / 100;
  }, [formData.acquisitionArea, formData.compensationRatePerSqMeter]);

  // Fetch case details from database when caseId is selected
  const loadCaseDetails = useCallback(
    async (cId: string) => {
      setLoadingCase(true);
      try {
        const res = await landAcquisitionApi.getCaseById(cId);
        const c = res.case;
        if (c) {
          const parcelAreaNum = c.landParcel?.area ? Number(c.landParcel.area) : 0;
          const parcelAreaStr = parcelAreaNum > 0 ? formatAreaWithoutDecimals(parcelAreaNum) : "";

          setCaseData({
            id: c.caseId,
            title: c.caseTitle,
            project: c.project?.projectName || "—",
            projectType: c.project?.projectType || "—",
            registrationDate: c.registrationDate
              ? new Date(c.registrationDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—",
            assignedDate: c.updatedAt
              ? new Date(c.updatedAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—",
            status: c.status,
            statusClass: "status-valuation-progress",
            landTitleNumber: c.landParcel?.landTitleNo || "—",
            owner: c.landParcel?.ownerships?.[0]?.landOwner?.name || "—",
            ownerIc: c.landParcel?.ownerships?.[0]?.landOwner?.icNumber || "—",
            address: c.landParcel?.address || "—",
            state: c.landParcel?.state || "Selangor",
            category: c.landParcel?.category || "AGRICULTURE",
            tenureType: c.landParcel?.tenureType || "FREEHOLD",
            rawArea: parcelAreaNum,
          });

          // Only land area is set from land parcel table; all other fields remain empty
          setFormData((prev) => ({
            ...prev,
            landArea: parcelAreaStr || "",
            acquisitionArea: "",
            builtUpArea: "",
            valuationMethod: "",
            locationType: "",
            buildingAge: "",
            marketRatePerSqMeter: "",
            compensationRatePerSqMeter: "",
            remarks: "",
            aiValuationPrice: "",
          }));
        }
      } catch (err: any) {
        console.error("Failed to fetch case details:", err);
      } finally {
        setLoadingCase(false);
      }
    },
    []
  );

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

  const handleGeneratePreview = async () => {
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
    if (!caseData) return;

    let predictedAiPrice = "";

    try {
      predictedAiPrice = await calculateAiPrediction({
        state: caseData.state || "Selangor",
        category: caseData.category || "AGRICULTURE",
        tenureType: caseData.tenureType || "FREEHOLD",
        rawArea: caseData.rawArea,
      });
    } catch (err) {
      console.error("AI valuation prediction failed:", err);
      notify({
        type: "error",
        title: "AI Benchmarking Warning",
        message: "AI prediction failed, continuing with manual valuation.",
      });
    }

    setFormData((prev) => ({
      ...prev,
      landArea: formatAreaWithoutDecimals(prev.landArea),
      acquisitionArea: formatAreaWithoutDecimals(prev.acquisitionArea),
      builtUpArea: formatAreaWithoutDecimals(prev.builtUpArea),
      marketRatePerSqMeter: formatCurrencyWithDecimals(prev.marketRatePerSqMeter),
      compensationRatePerSqMeter: formatCurrencyWithDecimals(prev.compensationRatePerSqMeter),
      buildingAge: formatLiveInteger(prev.buildingAge),
      aiValuationPrice: predictedAiPrice,
    }));

    setShowPreview(true);
  };

  const handleEditFromPreview = () => {
    setIsEditMode(true);
    setShowPreview(false);
  };

  const handleConfirmSave = async () => {
    if (!caseData) {
      notify({
        type: "general",
        title: "No Case Selected",
        message: "No case selected.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const landNum = parseCurrencyToNumber(formData.landArea);
      const acqNum = parseCurrencyToNumber(formData.acquisitionArea);
      const builtNum = parseCurrencyToNumber(formData.builtUpArea);
      const mRateNum = parseCurrencyToNumber(formData.marketRatePerSqMeter);
      const cRateNum = parseCurrencyToNumber(formData.compensationRatePerSqMeter);
      const aiNum = parseCurrencyToNumber(formData.aiValuationPrice);
      const bldgAgeNum = parseInt(formData.buildingAge, 10) || 0;

      const res = await landAcquisitionApi.createValuationReport({
        caseId: caseData.id,
        valuationMethod: formData.valuationMethod,
        locationType: formData.locationType,
        buildingAge: bldgAgeNum,
        landArea: landNum,
        acquisitionArea: acqNum,
        builtUpArea: builtNum,
        marketRatePerSqMeter: mRateNum,
        compensationRatePerSqMeter: cRateNum,
        aiValuationPrice: aiNum,
        marketValue: calculatedMarketTotal,
        recommendedCompensation: calculatedCompTotal,
        remarks: formData.remarks || "",
        createdById: user?.userId,
        valuerId: user?.userId,
      });

      // Upload attached files if present
      if (formData.buildingAssessment) {
        try {
          await landAcquisitionApi.uploadDocument(
            caseData.id,
            formData.buildingAssessment,
            "Building Assessment",
            user?.userId
          );
        } catch (fileErr) {
          console.warn("File upload notice (building assessment):", fileErr);
        }
      }
      if (formData.siteInspection) {
        try {
          await landAcquisitionApi.uploadDocument(
            caseData.id,
            formData.siteInspection,
            "Site Inspection",
            user?.userId
          );
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
        locationType: formData.locationType,
        buildingAge: bldgAgeNum,
        landArea: formatAreaWithoutDecimals(formData.landArea),
        acquisitionArea: formatAreaWithoutDecimals(formData.acquisitionArea),
        builtUpArea: formatAreaWithoutDecimals(formData.builtUpArea),
        marketRatePerSqMeter: formatCurrencyWithDecimals(formData.marketRatePerSqMeter),
        compensationRatePerSqMeter: formatCurrencyWithDecimals(formData.compensationRatePerSqMeter),
        aiValuationPrice: formData.aiValuationPrice ? formatCurrencyWithDecimals(formData.aiValuationPrice) : "—",
        marketValue: formatCurrencyWithDecimals(calculatedMarketTotal),
        recommendedCompensation: formatCurrencyWithDecimals(calculatedCompTotal),
        remarks: formData.remarks || "",
        buildingAssessment: formData.buildingAssessment ? formData.buildingAssessment.name : "Not uploaded",
        siteInspection: formData.siteInspection ? formData.siteInspection.name : "Not uploaded",
        status: "Pending Valuation Approval",
      };

      setSavedReport(newReport);
      setShowPreview(false);
      setIsEditMode(false);
      notify({
        type: "success",
        title: "Report Created",
        message: `Valuation report created successfully for case ${caseData.id}.`,
      });
    } catch (err: any) {
      console.error("Failed to save valuation report:", err);
      notify({
        type: "error",
        title: "Save Failed",
        message: err.message || "Could not reach backend",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (formData.valuationMethod || formData.remarks || formData.acquisitionArea || formData.marketRatePerSqMeter) {
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

  // Preview Modal showing ONLY Land Area, Final Market Value, Final AI Prediction Value, Final Recommended Value
  const renderPreviewModal = () => {
    if (!caseData) return null;

    return (
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Valuation Summary"
        subtitle="Review the calculated valuation totals before confirming"
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
          {/* Land Area */}
          <div className="flex justify-between items-center p-4 rounded-xl bg-md-surface-container-low border border-md-outline/15">
            <span className="text-sm font-semibold text-md-on-surface-variant">Land Area</span>
            <span className="text-base font-bold text-md-on-surface font-mono">
              {formData.landArea ? `${formatAreaWithoutDecimals(formData.landArea)} m²` : "—"}
            </span>
          </div>

          {/* Final Market Value */}
          <div className="flex justify-between items-center p-4 rounded-xl bg-md-surface-container-low border border-md-outline/15">
            <span className="text-sm font-semibold text-md-on-surface-variant">Final Market Value</span>
            <span className="text-base font-bold text-md-on-surface">
              {formatCurrencyRM(calculatedMarketTotal)}
            </span>
          </div>

          {/* Final AI Prediction Value */}
          <div className="flex justify-between items-center p-4 rounded-xl bg-md-surface-container-low border border-md-primary/30">
            <span className="text-sm font-semibold text-md-primary flex items-center gap-1.5">
              <Sparkles size={14} /> Final AI Prediction Value
            </span>
            <span className="text-base font-bold text-md-primary">
              {isCalculatingAi ? (
                <span className="text-xs text-md-on-surface-variant flex items-center gap-1 font-sans font-normal">
                  <Loader2 size={13} className="animate-spin inline" /> Estimating...
                </span>
              ) : formData.aiValuationPrice ? (
                formatCurrencyRM(formData.aiValuationPrice)
              ) : (
                "—"
              )}
            </span>
          </div>

          {/* Final Recommended Value */}
          <div className="flex justify-between items-center p-4 rounded-xl bg-md-surface-container-low border border-green-500/30">
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">Final Recommended Value</span>
            <span className="text-base font-bold text-green-700 dark:text-green-400">
              {formatCurrencyRM(calculatedCompTotal)}
            </span>
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
          Are you sure you want to discard your draft valuation report and return to the valuation dashboard?
        </p>
      </Modal>
    );
  };

  const renderSuccessState = () => (
    <div className="bg-md-surface-container rounded-xl p-7 border border-md-outline/15 shadow-sm space-y-6">
      <div className="success-banner">
        <span className="check-icon">
          <CheckCircle size={20} className="inline mr-1" />
        </span>
        <div>
          <strong>New Valuation Report Created Successfully!</strong>
          <span style={{ marginLeft: "12px", fontWeight: 400 }}>
            Case status updated to <strong>Pending Valuation Approval</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/10 text-center">
          <span className="text-xs text-md-on-surface-variant uppercase font-semibold">Final Market Value</span>
          <div className="text-xl font-bold text-md-on-surface mt-1">{formatCurrencyRM(savedReport?.marketValue)}</div>
          <span className="text-xs text-md-on-surface-variant/70 font-mono mt-0.5 block">
            {savedReport?.marketRatePerSqMeter ? `${formatCurrencyRM(savedReport.marketRatePerSqMeter)} /m²` : '—'}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-primary/30 text-center">
          <span className="text-xs text-md-primary uppercase font-semibold flex items-center justify-center gap-1">
            <Sparkles size={12} /> Final AI Prediction Value
          </span>
          <div className="text-xl font-bold text-md-primary mt-1">
            {savedReport?.aiValuationPrice ? formatCurrencyRM(savedReport.aiValuationPrice) : "—"}
          </div>
          <span className="text-xs text-md-on-surface-variant/70 mt-0.5 block">Model Benchmark</span>
        </div>
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-green-500/30 text-center">
          <span className="text-xs text-green-700 dark:text-green-400 uppercase font-semibold">Final Recommended Value</span>
          <div className="text-xl font-bold text-green-700 dark:text-green-400 mt-1">
            {formatCurrencyRM(savedReport?.recommendedCompensation)}
          </div>
          <span className="text-xs text-md-on-surface-variant/70 font-mono mt-0.5 block">
            {savedReport?.compensationRatePerSqMeter ? `${formatCurrencyRM(savedReport.compensationRatePerSqMeter)} /m²` : '—'}
          </span>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: "14px", color: "var(--md-on-surface-variant)" }}>
          <div className="mb-2">
            <span className="text-sm">Assigned Report ID:</span>{" "}
            <span className="font-mono text-base font-bold text-md-primary">{savedReport?.reportId}</span>
            <CopyButton value={savedReport?.reportId || ""} />
          </div>
          <div className="text-xs text-md-on-surface-variant/70 mt-2 max-w-md mx-auto">
            This report was saved with complete area measurements, rate parameters, and instant calculated totals.
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outlined"
            onClick={() => navigate("/admin/case/valuation/review", { state: { reportId: savedReport?.reportId } })}
          >
            <Eye size={16} /> View New Report
          </Button>
          <Button variant="filled" onClick={handleBackToDashboard}>
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

      <div className="main blur-shape-bg">
        <div className="report-generator-container">
          {/* Top Bar */}
          <PageHeader
            title="Create New Valuation Report"
            subtitle="Fill in the area measurements, valuation methodology, and compensation rates for the acquisition case"
            backPath="/admin/case/valuation"
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
                  No case selected yet. Please select a case to generate a report.
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
              {caseData?.status === "VALUATION_REJECTED" && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="text-sm">
                    <div className="font-semibold text-amber-800 dark:text-amber-300 mb-0.5">
                      Revision Report Creation
                    </div>
                    <div className="text-xs text-amber-700/90 dark:text-amber-300/80">
                      The previous valuation report for this case was rejected. Submitting this form will generate a{" "}
                      <strong>new report record</strong> in the database while preserving historical traces.
                    </div>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────── */}
              {/* UNIFIED CONTAINER: Report Details (bold)                     */}
              {/* ──────────────────────────────────────────────────────────── */}
              <div className="bg-md-surface-container rounded-xl p-7 border border-md-outline/15 shadow-sm space-y-7">
                {/* Main Header (Retain this icon only) */}
                <div className="flex items-center gap-3 pb-4 border-b border-md-outline/15">
                  <div className="p-2.5 rounded-xl bg-md-primary text-white shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-md-on-surface tracking-tight">Report Details</h2>
                    <p className="text-xs text-md-on-surface-variant">
                      Fill in the required property parameters and valuation rates below
                    </p>
                  </div>
                </div>

                {/* 1. Area Details (No icon, No Metric badge, Title Case) */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-md-on-surface">Area Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AreaInput
                      label="Land Area (m²) *"
                      id="landArea"
                      name="landArea"
                      value={formData.landArea}
                      disabled
                      placeholder="e.g. 10,000"
                      error={validationErrors.landArea}
                    />
                    <AreaInput
                      label="Acquisition Area (m²) *"
                      id="acquisitionArea"
                      name="acquisitionArea"
                      value={formData.acquisitionArea}
                      onChange={handleInputChange}
                      placeholder="e.g. 3,000"
                      error={validationErrors.acquisitionArea}
                    />
                    <AreaInput
                      label="Built-Up Area (m²) *"
                      id="builtUpArea"
                      name="builtUpArea"
                      value={formData.builtUpArea}
                      onChange={handleInputChange}
                      placeholder="e.g. 250 (or 0)"
                      error={validationErrors.builtUpArea}
                    />
                  </div>
                </div>

                {/* DIVIDER 1 */}
                <hr className="border-t border-md-outline/30 my-6" />

                {/* 2. Valuation & Compensation */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-md-on-surface">Valuation & Compensation</h3>

                  <div className="space-y-4">
                    {/* Row 1: Valuation Method */}
                    <div>
                      <Select
                        label="Valuation Method *"
                        value={formData.valuationMethod}
                        options={VALUATION_METHOD_OPTIONS}
                        error={validationErrors.valuationMethod}
                        onChange={(val) => {
                          setFormData((prev) => ({ ...prev, valuationMethod: val }));
                          if (validationErrors.valuationMethod) {
                            setValidationErrors((prev) => {
                              const n = { ...prev };
                              delete n.valuationMethod;
                              return n;
                            });
                          }
                        }}
                        placeholder="Select method"
                      />
                    </div>

                    {/* Row 2: Location Type | Building Age */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Select
                          label="Location Type *"
                          value={formData.locationType}
                          options={LOCATION_TYPE_OPTIONS}
                          error={validationErrors.locationType}
                          onChange={(val) => {
                            setFormData((prev) => ({ ...prev, locationType: val }));
                            if (validationErrors.locationType) {
                              setValidationErrors((prev) => {
                                const n = { ...prev };
                                delete n.locationType;
                                return n;
                              });
                            }
                          }}
                          placeholder="Select location type"
                        />
                      </div>

                      <div>
                        <Input
                          label="Building Age (Years) *"
                          id="buildingAge"
                          name="buildingAge"
                          type="number"
                          min="0"
                          value={formData.buildingAge}
                          onChange={handleInputChange}
                          placeholder="e.g. 5 (or 0)"
                          error={validationErrors.buildingAge}
                        />
                      </div>
                    </div>

                    {/* Row 3: Market Price | Recommended Compensation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <CurrencyInput
                          label="Market Price (RM /m²) *"
                          id="marketRatePerSqMeter"
                          name="marketRatePerSqMeter"
                          value={formData.marketRatePerSqMeter}
                          onChange={handleInputChange}
                          placeholder="e.g. 266.67"
                          error={validationErrors.marketRatePerSqMeter}
                        />
                      </div>

                      <div>
                        <CurrencyInput
                          label="Recommended Compensation (RM /m²) *"
                          id="compensationRatePerSqMeter"
                          name="compensationRatePerSqMeter"
                          value={formData.compensationRatePerSqMeter}
                          onChange={handleInputChange}
                          placeholder="e.g. 273.33"
                          error={validationErrors.compensationRatePerSqMeter}
                        />
                      </div>
                    </div>

                    {/* Row 4: Remarks (Optional) */}
                    <div>
                      <Textarea
                        label="Remarks & Valuation Notes"
                        id="remarks"
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                        placeholder="Optional notes, observations, or valuation justifications..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* DIVIDER 2 */}
                <hr className="border-t border-md-outline/30 my-6" />

                {/* 3. Supporting Documents */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-md-on-surface">Supporting Documents</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileUpload
                      label="Building Assessment (Optional)"
                      id="buildingAssessment"
                      fileName={formData.buildingAssessment?.name}
                      onChange={(file) => setFormData((prev) => ({ ...prev, buildingAssessment: file }))}
                      onClear={() => setFormData((prev) => ({ ...prev, buildingAssessment: null }))}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <FileUpload
                      label="Site Inspection Report (Optional)"
                      id="siteInspection"
                      fileName={formData.siteInspection?.name}
                      onChange={(file) => setFormData((prev) => ({ ...prev, siteInspection: file }))}
                      onClear={() => setFormData((prev) => ({ ...prev, siteInspection: null }))}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-md-outline/30">
                  <Button variant="text" onClick={handleCancel}>
                    <X size={16} /> Cancel
                  </Button>
                  <Button
                    variant="filled"
                    onClick={handleGeneratePreview}
                    disabled={isSaving || isCalculatingAi || !caseData}
                  >
                    {isCalculatingAi ? (
                      <>
                        <Loader2 size={18} className="animate-spin inline mr-1" /> Generating Report...
                      </>
                    ) : (
                      <>
                        <Eye size={18} /> Generate Report
                      </>
                    )}
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
            FCR-SCS · Valuation Report Generator · For Land Valuers only
          </div>
        </div>
      </div>
    </>
  );
};

export const ValuationReportGenerator = ValuationCreate;
