import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { compensationApi } from "../../services/compensationApi";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { CaseSelectionModal } from "../LandAcquisition/CaseSelectionModal";
import { Calculator, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { useModalPopIn } from "../../hooks/useModalPopIn";
import "../../style.css";
import "./compensation.css";

// Types
type AcquisitionCase = {
  id: string;
  title: string;
  project: string;
  owner: string;
  landTitle: string;
  status: string;
};

type ValuationReport = {
  valuationMethod: string;
  marketValue: number;
  recommendedCompensation: number;
  landValue: number;
  buildingValue: number;
  cropValue: number;
};

type Owner = {
  name: string;
  ic: string;
  address: string;
  phone: string;
};

type CompensationComponents = {
  landValue: number;
  buildingValue: number;
  cropValue: number;
  businessDisruption: number;
  disturbanceCompensation: number;
  relocationAllowance: number;
  otherEligible: number;
};

export const CompensationReportGenerator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialCaseId = location.state?.caseId as string | undefined;

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId || null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState<boolean>(!initialCaseId);
  const [loadingCase, setLoadingCase] = useState<boolean>(false);

  const [caseData, setCaseData] = useState<AcquisitionCase | null>(null);
  const [valuationReport, setValuationReport] = useState<ValuationReport | null>(null);
  const [valuationReportId, setValuationReportId] = useState<string | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [aiPredicted, setAiPredicted] = useState<number>(0);

  const [components, setComponents] = useState<CompensationComponents>({
    landValue: 0,
    buildingValue: 0,
    cropValue: 0,
    businessDisruption: 0,
    disturbanceCompensation: 0,
    relocationAllowance: 0,
    otherEligible: 0,
  });

  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [, setWarningAction] = useState<"review" | "cancel" | null>(null);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [generatedOfferId, setGeneratedOfferId] = useState<string | null>(null);
  const [generatedOfferRef, setGeneratedOfferRef] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<string>("");

  // Load case data when selectedCaseId changes
  const loadCaseDetails = useCallback(async (cId: string) => {
    setLoadingCase(true);
    try {
      const res = await landAcquisitionApi.getCaseById(cId);
      const c = res?.case || res;
      if (c && (c.caseId || c.id)) {
        setCaseData({
          id: c.caseId,
          title: c.caseTitle || "—",
          project: c.project?.projectName || "—",
          owner: c.landParcel?.ownerships?.[0]?.landOwner?.name || "—",
          landTitle: c.landParcel?.landTitleNo || "—",
          status: c.status,
        });

        // Set owner info
        const mainOwner = c.landParcel?.ownerships?.[0]?.landOwner;
        setOwner({
          name: mainOwner?.name || "—",
          ic: mainOwner?.nric || mainOwner?.icNumber || "—",
          address: c.landParcel?.address || mainOwner?.address || "—",
          phone: mainOwner?.contact || "—",
        });

        // Set valuation report details if available
        const valReports = c.valuationReports || [];
        const approvedVal = valReports.find((r: any) => r.reportStatus === "APPROVED") || valReports[0];

        if (approvedVal) {
          const recComp = Number(approvedVal.recommendedCompensation || 0);
          const mktVal = Number(approvedVal.marketValue || 0);

          setValuationReportId(approvedVal.reportId);
          setValuationReport({
            valuationMethod: approvedVal.valuationMethod || "Comparison Method",
            marketValue: mktVal,
            recommendedCompensation: recComp,
            landValue: recComp > 0 ? Math.round(recComp * 0.7) : 0,
            buildingValue: recComp > 0 ? Math.round(recComp * 0.2) : 0,
            cropValue: recComp > 0 ? Math.round(recComp * 0.1) : 0,
          });

          setAiPredicted(recComp > 0 ? recComp : 2100000);

          setComponents({
            landValue: recComp > 0 ? Math.round(recComp * 0.7) : 0,
            buildingValue: recComp > 0 ? Math.round(recComp * 0.2) : 0,
            cropValue: recComp > 0 ? Math.round(recComp * 0.1) : 0,
            businessDisruption: 0,
            disturbanceCompensation: 0,
            relocationAllowance: 0,
            otherEligible: 0,
          });
        } else {
          setValuationReportId(null);
          setValuationReport({
            valuationMethod: "Comparison Method",
            marketValue: 1800000,
            recommendedCompensation: 2000000,
            landValue: 1400000,
            buildingValue: 400000,
            cropValue: 200000,
          });
          setAiPredicted(2000000);
          setComponents({
            landValue: 1400000,
            buildingValue: 400000,
            cropValue: 200000,
            businessDisruption: 0,
            disturbanceCompensation: 0,
            relocationAllowance: 0,
            otherEligible: 0,
          });
        }

        setCalculatedTotal(null);
        setShowSummary(false);
        setGeneratedReportId(null);
        setGeneratedOfferId(null);
        setGeneratedOfferRef(null);
        setStatusUpdate("");
      }
    } catch (err: any) {
      console.error("Failed to load case details:", err);
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

  const handleComponentChange = (field: keyof CompensationComponents, value: string) => {
    const num = parseFloat(value) || 0;
    setComponents((prev) => ({ ...prev, [field]: num }));
    if (calculatedTotal !== null) {
      setCalculatedTotal(null);
      setShowSummary(false);
    }
  };

  const calculateTotal = () => {
    setIsCalculating(true);
    const total =
      components.landValue +
      components.buildingValue +
      components.cropValue +
      components.businessDisruption +
      components.disturbanceCompensation +
      components.relocationAllowance +
      components.otherEligible;
    setCalculatedTotal(total);
    setShowSummary(true);
    setIsCalculating(false);

    const targetRef = aiPredicted > 0 ? aiPredicted : 2100000;
    const diff = Math.abs(total - targetRef);
    const percent = targetRef > 0 ? (diff / targetRef) * 100 : 0;
    if (percent > 20) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  };

  const handleWarningReview = () => {
    setShowWarning(false);
    setWarningAction("review");
  };

  const handleWarningCancel = () => {
    setShowWarning(false);
    setWarningAction("cancel");
    setStatusUpdate("Pending Compensation Approval");
  };

  const generateReport = async () => {
    if (calculatedTotal === null || !selectedCaseId) return;
    setIsGenerating(true);
    try {
      let valId = valuationReportId;

      if (!valId) {
        try {
          const valRes = await landAcquisitionApi.getAllValuationReports({ search: selectedCaseId });
          valId = valRes.reports?.[0]?.reportId;
        } catch {
          // ignore
        }
      }

      if (!valId) {
        valId = "00000000-0000-0000-0000-000000000001";
      }

      const res = await compensationApi.createReport({
        caseId: selectedCaseId,
        valuationReportId: valId,
        components,
        remarks: "Generated via Compensation Report Generator",
      });

      const repId = res.report?.compensationReportId || res.reportId;
      setGeneratedReportId(repId);

      const offer = res.offerLetter || res.report?.offerLetters?.[0];
      if (offer) {
        setGeneratedOfferId(offer.offerId);
        setGeneratedOfferRef(offer.offerReferenceNo);
      } else {
        setGeneratedOfferId(null);
        setGeneratedOfferRef(null);
      }

      const statusStr = res.requiresApproval
        ? "Pending Compensation Approval"
        : "Compensation Approved";
      setStatusUpdate(statusStr);
    } catch (err: any) {
      console.error("Failed to generate compensation report:", err);
      alert(`Report Generation Failed: ${err.message || "Could not reach backend"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateClick = () => {
    if (calculatedTotal === null) {
      alert("Please calculate compensation first.");
      return;
    }
    if (showWarning) {
      alert("Please review the warning first. Either review the components or cancel.");
      return;
    }
    generateReport();
  };

  const formatCurrency = (val: number) => {
    return `RM ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const warningModalRef = useModalPopIn(showWarning);

  const handleSelectCaseFromModal = (cId: string) => {
    setSelectedCaseId(cId);
    setIsCaseModalOpen(false);
  };

  return (
    <>
      {/* Case Selection Modal */}
      <CaseSelectionModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSelectCase={handleSelectCaseFromModal}
        allowedStatuses={["VALUATION_APPROVED", "COMPENSATION_REJECTED"]}
        title="Select Case for Compensation Report"
        subtitle="Choose a case in Valuation Approved or Compensation Rejected status to calculate compensation."
        emptyMessage="No cases currently in Valuation Approved or Compensation Rejected status."
      />

      {/* Warning Modal */}
      {showWarning &&
        createPortal(
          <div
            className="preview-modal-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
            }}
            onClick={() => setShowWarning(false)}
          >
            <div
              ref={warningModalRef}
              className="preview-modal"
              style={{
                position: "relative",
                maxWidth: "460px",
                width: "90%",
                padding: "24px",
                borderRadius: "28px",
                background: "var(--md-surface-container, #ffffff)",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
                display: "flex",
                flexDirection: "column",
                margin: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <AlertTriangle size={28} color="#d97706" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Difference Exceeds 20%</h3>
              </div>
              <p style={{ fontSize: "14px", color: "var(--md-on-surface-variant)", lineHeight: "1.5", margin: "0 0 20px 0" }}>
                The calculated compensation amount differs from the recommended valuation amount by more than 20%.
                Please review the components or proceed with caution.
              </p>
              <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid rgba(121, 116, 126, 0.1)" }}>
                <button
                  style={{
                    padding: "8px 20px",
                    borderRadius: "9999px",
                    border: "1.5px solid rgba(121, 116, 126, 0.3)",
                    background: "transparent",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                  onClick={handleWarningCancel}
                >
                  Dismiss Warning
                </button>
                <button
                  style={{
                    padding: "8px 24px",
                    borderRadius: "9999px",
                    border: "none",
                    background: "var(--md-primary, #6750a4)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(103, 80, 164, 0.25)",
                  }}
                  onClick={handleWarningReview}
                >
                  Review Components
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div className="flex min-h-screen" style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}>
        <main className="main blur-shape-bg" style={{ width: "100%", padding: "24px" }}>
          <div className="compensation-generator">
            <div className="topbar" style={{ marginBottom: "20px" }}>
              <div className="topbar-left">
                <h1 style={{ marginBottom: 0 }}>Compensation Report Generator</h1>
                <div className="sub">Create compensation reports for acquisition cases</div>
              </div>
              <div className="topbar-right">
                <span className="date-badge">
                  <Lucide.Calendar size={16} className="inline mr-1" />
                  {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <div className="avatar">AO</div>
              </div>
            </div>

            {/* Case Summary Header */}
            {loadingCase ? (
              <div className="case-summary-card" style={{ padding: "20px", textAlign: "center" }}>
                <Lucide.Loader2 size={24} className="inline animate-spin mr-2" /> Loading selected case details...
              </div>
            ) : caseData ? (
              <div className="case-summary-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--md-surface-container)", padding: "16px 20px", borderRadius: "12px", marginBottom: "20px" }}>
                <div className="case-info">
                  <span className="case-id" style={{ fontSize: "12px", fontWeight: 600, color: "var(--md-primary)" }}>{caseData.id}</span>
                  <h3 className="case-title" style={{ margin: "2px 0 6px", fontSize: "18px" }}>{caseData.title}</h3>
                  <div className="case-meta" style={{ display: "flex", gap: "16px", fontSize: "13px", color: "var(--md-on-surface-variant)" }}>
                    <span><Lucide.Folder size={14} className="inline mr-1" /> {caseData.project}</span>
                    <span><Lucide.Tag size={14} className="inline mr-1" /> {caseData.landTitle}</span>
                    <span><Lucide.User size={14} className="inline mr-1" /> {caseData.owner}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                  <span className="status-badge-lg" style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: "rgba(59,130,246,0.1)", color: "var(--md-primary)" }}>
                    {caseData.status}
                  </span>
                  <button
                    className="btn-filter"
                    style={{ fontSize: "12px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                    onClick={() => setIsCaseModalOpen(true)}
                  >
                    <Lucide.RefreshCw size={12} /> Change Case
                  </button>
                </div>
              </div>
            ) : (
              <div className="case-summary-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--md-surface-container)", borderRadius: "12px", marginBottom: "20px" }}>
                <div style={{ color: "var(--md-on-surface-variant)" }}>
                  <Lucide.AlertCircle size={20} className="inline mr-2 text-amber-500" />
                  No case selected yet. Select a case in Valuation Approved or Compensation Rejected status.
                </div>
                <button
                  className="btn-primary"
                  style={{ padding: "6px 16px", fontSize: "13px", cursor: "pointer" }}
                  onClick={() => setIsCaseModalOpen(true)}
                >
                  Select Case
                </button>
              </div>
            )}

            {caseData && valuationReport && owner ? (
              <div className="layout">
                {/* Left Panel: Case & Owner Info, Valuation Report Summary */}
                <div className="left-panel">
                  <div className="info-card">
                    <div className="card-title"><Lucide.ClipboardList size={16} className="inline mr-1" /> Case Information</div>
                    <div className="detail-row">
                      <div className="item"><span className="label">Case ID</span><span className="value">{caseData.id}</span></div>
                      <div className="item"><span className="label">Title</span><span className="value">{caseData.title}</span></div>
                      <div className="item"><span className="label">Project</span><span className="value">{caseData.project}</span></div>
                      <div className="item"><span className="label">Status</span><span className="value">{caseData.status}</span></div>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="card-title"><Lucide.User size={16} className="inline mr-1" /> Owner Information</div>
                    <div className="detail-row">
                      <div className="item"><span className="label">Name</span><span className="value">{owner.name}</span></div>
                      <div className="item"><span className="label">IC</span><span className="value">{owner.ic}</span></div>
                      <div className="item" style={{ flex: "1 1 100%" }}><span className="label">Address</span><span className="value">{owner.address}</span></div>
                      <div className="item"><span className="label">Phone</span><span className="value">{owner.phone}</span></div>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="card-title"><Lucide.BarChart2 size={16} className="inline mr-1" /> Valuation Report Summary</div>
                    <div className="detail-row">
                      <div className="item"><span className="label">Method</span><span className="value">{valuationReport.valuationMethod}</span></div>
                      <div className="item"><span className="label">Market Value</span><span className="value">{formatCurrency(valuationReport.marketValue)}</span></div>
                      <div className="item"><span className="label">Recommended Compensation</span><span className="value">{formatCurrency(valuationReport.recommendedCompensation)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Compensation Form & Summary */}
                <div className="right-panel">
                  <div className="form-card">
                    <div className="form-title">Compensation Components</div>
                    <div className="form-subtitle">Enter or edit the compensation breakdown amounts</div>

                    <div className="comp-grid">
                      <div className="comp-group">
                        <label htmlFor="landValue">Land Value <span className="required">*</span></label>
                        <input id="landValue" type="number" value={components.landValue} onChange={(e) => handleComponentChange("landValue", e.target.value)} />
                        <div className="helper">Pre-filled from valuation</div>
                      </div>
                      <div className="comp-group">
                        <label htmlFor="buildingValue">Building/Structure Value <span className="required">*</span></label>
                        <input id="buildingValue" type="number" value={components.buildingValue} onChange={(e) => handleComponentChange("buildingValue", e.target.value)} />
                      </div>
                      <div className="comp-group">
                        <label htmlFor="cropValue">Crop/Plantation Value <span className="required">*</span></label>
                        <input id="cropValue" type="number" value={components.cropValue} onChange={(e) => handleComponentChange("cropValue", e.target.value)} />
                      </div>
                      <div className="comp-group">
                        <label htmlFor="businessDisruption">Business Disruption</label>
                        <input id="businessDisruption" type="number" value={components.businessDisruption} onChange={(e) => handleComponentChange("businessDisruption", e.target.value)} />
                      </div>
                      <div className="comp-group">
                        <label htmlFor="disturbance">Disturbance Compensation</label>
                        <input id="disturbance" type="number" value={components.disturbanceCompensation} onChange={(e) => handleComponentChange("disturbanceCompensation", e.target.value)} />
                      </div>
                      <div className="comp-group">
                        <label htmlFor="relocation">Relocation Allowance</label>
                        <input id="relocation" type="number" value={components.relocationAllowance} onChange={(e) => handleComponentChange("relocationAllowance", e.target.value)} />
                      </div>
                      <div className="comp-group" style={{ gridColumn: "1 / -1" }}>
                        <label htmlFor="otherEligible">Other Eligible Items (Special Damages)</label>
                        <input id="otherEligible" type="number" value={components.otherEligible} onChange={(e) => handleComponentChange("otherEligible", e.target.value)} />
                      </div>
                    </div>

                    <div className="actions">
                      <button className="btn-calc" onClick={calculateTotal} disabled={isCalculating}>
                        <Calculator size={18} /> {isCalculating ? "Calculating..." : "Calculate Compensation"}
                      </button>
                      <button className="btn-generate" onClick={handleGenerateClick} disabled={isGenerating || calculatedTotal === null}>
                        <FileText size={18} /> {isGenerating ? "Generating..." : "Generate Compensation Report"}
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  {showSummary && calculatedTotal !== null && (
                    <div className="summary-card">
                      <div className="summary-title"><Lucide.BarChart2 size={16} className="inline mr-1" /> Compensation Summary</div>
                      <div className="summary-grid">
                        <div className="summary-item"><span className="label">Land Value</span><span className="value">{formatCurrency(components.landValue)}</span></div>
                        <div className="summary-item"><span className="label">Building/Structure</span><span className="value">{formatCurrency(components.buildingValue)}</span></div>
                        <div className="summary-item"><span className="label">Crop/Plantation</span><span className="value">{formatCurrency(components.cropValue)}</span></div>
                        <div className="summary-item"><span className="label">Business Disruption</span><span className="value">{formatCurrency(components.businessDisruption)}</span></div>
                        <div className="summary-item"><span className="label">Disturbance Compensation</span><span className="value">{formatCurrency(components.disturbanceCompensation)}</span></div>
                        <div className="summary-item"><span className="label">Relocation Allowance</span><span className="value">{formatCurrency(components.relocationAllowance)}</span></div>
                        <div className="summary-item"><span className="label">Other Eligible</span><span className="value">{formatCurrency(components.otherEligible)}</span></div>
                      </div>
                      <div className="summary-total">
                        <span>Total Compensation</span>
                        <span>{formatCurrency(calculatedTotal)}</span>
                      </div>

                      {/* AI / Valuation Comparison */}
                      <div className="ai-comparison">
                        <span className="ai-label"><Lucide.Bot size={16} className="inline mr-1" /> AI / Valuation Reference:</span>
                        <span className="ai-value">{formatCurrency(aiPredicted)}</span>
                        {!showWarning ? (
                          <span className="ok"><CheckCircle size={16} className="inline mr-1" /> Within acceptable range</span>
                        ) : (
                          <span className="warning"><AlertTriangle size={16} className="inline mr-1" /> Difference exceeds 20%</span>
                        )}
                      </div>

                      {generatedReportId && (
                        <div style={{ marginTop: "16px", padding: "16px", background: "rgba(34,197,94,0.1)", borderRadius: "12px", border: "1px solid rgba(34,197,94,0.3)", color: "var(--md-on-surface)" }}>
                          <div style={{ fontWeight: 600, color: "#16a34a", marginBottom: "4px" }}>
                            <CheckCircle size={18} className="inline mr-2" /> Report Saved Successfully!
                          </div>
                          <div style={{ fontSize: "13px", color: "var(--md-on-surface-variant)" }}>
                            <strong>Report ID:</strong> {generatedReportId}<br />
                            <strong>Status:</strong> {statusUpdate}
                            {generatedOfferRef && (
                              <>
                                <br />
                                <span style={{ color: "#15803d", fontWeight: 600 }}>
                                  <Lucide.Mail size={14} className="inline mr-1" />
                                  Offer Letter Auto-Generated:
                                </span>{" "}
                                <strong>{generatedOfferRef}</strong>
                              </>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                            {generatedOfferId && (
                              <button
                                className="btn-primary"
                                style={{ fontSize: "13px", padding: "6px 16px", cursor: "pointer", background: "#16a34a" }}
                                onClick={() => navigate("/admin/compensation/offer/review", { state: { offerId: generatedOfferId } })}
                              >
                                View Offer Letter
                              </button>
                            )}
                            <button
                              className="btn-outline"
                              style={{ fontSize: "13px", padding: "6px 16px", cursor: "pointer" }}
                              onClick={() => navigate("/admin/compensation/report")}
                            >
                              Go to Compensation Reports
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedCaseId ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--md-on-surface-variant)" }}>Loading case data...</div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}><Lucide.FolderPlus size={48} className="inline" /></div>
                <h4 style={{ fontWeight: 600, color: "var(--md-on-surface)", opacity: 0.8 }}>Select a case to begin</h4>
                <p style={{ fontSize: "14px" }}>Choose an acquisition case in Valuation Approved or Compensation Rejected status.</p>
                <button
                  className="btn-primary"
                  style={{ marginTop: "16px", padding: "8px 20px" }}
                  onClick={() => setIsCaseModalOpen(true)}
                >
                  Select Case
                </button>
              </div>
            )}

            <div style={{ marginTop: "24px", fontSize: "13px", color: "var(--md-on-surface-variant)", opacity: 0.6, textAlign: "center", borderTop: "1px solid rgba(121,116,126,0.08)", paddingTop: "18px" }}>
              FCR-SCS · Compensation Report Module · Linked to Backend Services
            </div>
          </div>
        </main>
      </div>
    </>
  );
};