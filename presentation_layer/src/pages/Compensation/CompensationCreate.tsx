import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { compensationApi } from "../../services/compensationApi";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { CaseSelectionModal } from "../LandAcquisition/CaseSelectionModal";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { CopyButton } from "../../components/ui/CopyButton";
import { Calculator, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import { parseCurrencyToNumber } from "../../utils/currency";
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

export const CompensationCreate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userId, isOfficer, isAdmin } = useRole();
  const { notify } = useNotification();

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
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [generatedOfferId, setGeneratedOfferId] = useState<string | null>(null);
  const [generatedOfferRef, setGeneratedOfferRef] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<string>("");

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

        const mainOwner = c.landParcel?.ownerships?.[0]?.landOwner;
        setOwner({
          name: mainOwner?.name || "—",
          ic: mainOwner?.nric || mainOwner?.icNumber || "—",
          address: c.landParcel?.address || mainOwner?.address || "—",
          phone: mainOwner?.contact || "—",
        });

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
            cropValue: 0,
          });

          setAiPredicted(recComp > 0 ? recComp : 0);
          setComponents({
            landValue: recComp > 0 ? Math.round(recComp * 0.7) : 0,
            buildingValue: recComp > 0 ? Math.round(recComp * 0.2) : 0,
            cropValue: 0,
            businessDisruption: 0,
            disturbanceCompensation: 0,
            relocationAllowance: 0,
            otherEligible: 0,
          });
        } else {
          setValuationReportId(null);
          setValuationReport(null);
          setAiPredicted(0);
        }
      }
    } catch (err: any) {
      console.error("Failed to load case details for compensation:", err);
    } finally {
      setLoadingCase(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId, loadCaseDetails]);

  const handleSelectCaseFromModal = (caseId: string) => {
    setSelectedCaseId(caseId);
    setIsCaseModalOpen(false);
    setGeneratedReportId(null);
    setGeneratedOfferId(null);
    setShowSummary(false);
    setCalculatedTotal(null);
  };

  const handleComponentChange = (field: keyof CompensationComponents, value: string | number) => {
    const num = typeof value === "number" ? value : parseCurrencyToNumber(value);
    setComponents((prev) => ({ ...prev, [field]: num }));
  };

  const calculateTotal = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const sum =
        components.landValue +
        components.buildingValue +
        components.cropValue +
        components.businessDisruption +
        components.disturbanceCompensation +
        components.relocationAllowance +
        components.otherEligible;

      setCalculatedTotal(sum);
      setShowSummary(true);
      setIsCalculating(false);

      if (aiPredicted > 0) {
        const diff = Math.abs(sum - aiPredicted) / aiPredicted;
        if (diff > 0.2) {
          setShowWarning(true);
        } else {
          setShowWarning(false);
        }
      }
    }, 300);
  };

  const generateReport = async () => {
    if (!caseData || calculatedTotal === null) return;
    setIsGenerating(true);
    try {
      const res = await compensationApi.createReport({
        caseId: caseData.id,
        valuationReportId: valuationReportId || "",
        components,
        remarks: "Generated via Compensation Report Generator",
        createdById: userId,
      });

      const repId = res.report?.compensationReportId || res.reportId;
      setGeneratedReportId(repId);

      const offer = res.offerLetter || res.report?.offerLetters?.[0];
      if (offer) {
        setGeneratedOfferId(offer.offerId);
        setGeneratedOfferRef(offer.offerReferenceNo);
      }

      setStatusUpdate(res.requiresApproval ? "Pending Compensation Approval" : "Compensation Approved");
    } catch (err: any) {
      console.error("Failed to generate compensation report:", err);
      notify({
        type: 'error',
        title: 'Generation Failed',
        message: err.message || "Could not reach backend",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateClick = () => {
    if (calculatedTotal === null) {
      notify({
        type: 'general',
        title: 'Action Required',
        message: 'Please calculate compensation first.',
      });
      return;
    }
    if (showWarning) {
      notify({
        type: 'general',
        title: 'Action Required',
        message: 'Please review the warning first. Either review the components or dismiss.',
      });
      return;
    }
    generateReport();
  };

  const formatCurrency = (val: number) => {
    return `RM ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      {/* Case Selection Modal */}
      <CaseSelectionModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSelectCase={(cId) => {
          setSelectedCaseId(cId);
          setIsCaseModalOpen(false);
        }}
        allowedStatuses={["VALUATION_APPROVED", "COMPENSATION_REJECTED"]}
        title="Select Case for Compensation Report"
        subtitle="Choose a case in Valuation Approved or Compensation Rejected status to create a report."
        emptyMessage="No eligible cases created by you are currently ready for compensation report."
      />

      {/* Warning Modal */}
      <Modal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        title="AI Compensation Variance Warning"
        subtitle="Compensation total deviates by more than 20% from AI prediction"
        footer={
          <>
            <Button variant="text" onClick={() => setShowWarning(false)}>
              Adjust Components
            </Button>
            <Button
              variant="filled"
              onClick={() => {
                setShowWarning(false);
                generateReport();
              }}
            >
              Proceed Anyway
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 py-2">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">High Variance Detected</p>
              <p className="text-md-on-surface-variant">
                Calculated total (<strong>{formatCurrency(calculatedTotal || 0)}</strong>) differs by{" "}
                <strong>
                  {aiPredicted > 0 && calculatedTotal !== null
                    ? `${((Math.abs(calculatedTotal - aiPredicted) / aiPredicted) * 100).toFixed(1)}%`
                    : "N/A"}
                </strong>{" "}
                from the AI-recommended compensation (<strong>{formatCurrency(aiPredicted || 0)}</strong>).
              </p>
            </div>
          </div>
          <p className="text-xs text-md-on-surface-variant/80">
            Please review the component values carefully. A significant variance may require further justification during approval.
          </p>
        </div>
      </Modal>

      <div className="flex min-h-screen" style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}>
        <main className="main blur-shape-bg" style={{ width: "100%", padding: "24px" }}>
          <div className="compensation-generator">
            <div className="topbar" style={{ marginBottom: "20px" }}>
              <div className="topbar-left">
                <h1 style={{ marginBottom: 0 }}>Compensation Report Generator</h1>
                <div className="sub">Create compensation reports for acquisition cases</div>
              </div>
              <div className="topbar-right flex items-center gap-3">
                <Button variant="outlined" size="sm" onClick={() => navigate("/admin/compensation/report")}>
                  <Lucide.ArrowLeft size={16} /> Back
                </Button>
                <span className="date-badge">
                  <Lucide.Calendar size={16} className="inline mr-1" />
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
                    <Lucide.User size={16} />
                  )}
                </div>
              </div>
            </div>

            {loadingCase ? (
              <div className="case-summary-card" style={{ padding: "20px", textAlign: "center" }}>
                <Lucide.Loader2 size={24} className="inline animate-spin mr-2" /> Loading selected case details...
              </div>
            ) : caseData ? (
              <div className="case-summary-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--md-surface-container)", padding: "16px 20px", borderRadius: "12px", marginBottom: "20px" }}>
                <div className="case-info">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="case-id font-mono text-xs">{caseData.id}</span>
                    <CopyButton value={caseData.id} />
                  </div>
                  <h3 className="case-title" style={{ margin: "2px 0 6px", fontSize: "18px" }}>{caseData.title}</h3>
                  <div className="case-meta" style={{ display: "flex", gap: "16px", fontSize: "13px", color: "var(--md-on-surface-variant)" }}>
                    <span><Lucide.Folder size={14} className="inline mr-1" /> {caseData.project}</span>
                    <span><Lucide.Tag size={14} className="inline mr-1" /> {caseData.landTitle}</span>
                    <span><Lucide.User size={14} className="inline mr-1" /> {caseData.owner}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                  <span className="status-badge-lg status-val-approved">
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
              <div className="case-summary-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--md-surface-container)", borderRadius: "12px", marginBottom: "20px" }}>
                <div style={{ color: "var(--md-on-surface-variant)" }}>
                  <Lucide.AlertCircle size={20} className="inline mr-2 text-amber-500" />
                  No case selected yet. Select a case in Valuation Approved or Compensation Rejected status.
                </div>
                <Button
                  variant="filled"
                  size="sm"
                  onClick={() => setIsCaseModalOpen(true)}
                >
                  Select Case
                </Button>
              </div>
            )}

            {caseData && valuationReport && owner ? (
              <div className="layout">
                <div className="left-panel">
                  <div className="info-card">
                    <div className="card-title"><Lucide.ClipboardList size={16} className="inline mr-1" /> Case Information</div>
                    <div className="detail-row">
                      <div className="item"><span className="label">Case ID</span><span className="value font-mono text-xs">{caseData.id}</span></div>
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
                      <div className="item"><span className="label">Recommended Compensation</span><span className="value font-semibold text-md-primary">{formatCurrency(valuationReport.recommendedCompensation)}</span></div>
                    </div>
                  </div>
                </div>

                <div className="right-panel">
                  <div className="form-card">
                    <div className="form-title">Compensation Components</div>
                    <div className="form-subtitle">Enter or edit the compensation breakdown amounts</div>

                    <div className="comp-grid">
                      <div className="comp-group">
                        <CurrencyInput
                          label="Land Value (RM) *"
                          id="landValue"
                          value={components.landValue}
                          onValueChange={(_formatted, num) => handleComponentChange("landValue", num)}
                          placeholder="0.00"
                        />
                        <div className="helper">Pre-filled from valuation</div>
                      </div>
                      <div className="comp-group">
                        <CurrencyInput
                          label="Building/Structure Value (RM) *"
                          id="buildingValue"
                          value={components.buildingValue}
                          onValueChange={(_formatted, num) => handleComponentChange("buildingValue", num)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="comp-group">
                        <CurrencyInput
                          label="Crop/Plantation Value (RM) *"
                          id="cropValue"
                          value={components.cropValue}
                          onValueChange={(_formatted, num) => handleComponentChange("cropValue", num)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="comp-group">
                        <CurrencyInput
                          label="Business Disruption (RM)"
                          id="businessDisruption"
                          value={components.businessDisruption}
                          onValueChange={(_formatted, num) => handleComponentChange("businessDisruption", num)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="comp-group">
                        <CurrencyInput
                          label="Disturbance Compensation (RM)"
                          id="disturbance"
                          value={components.disturbanceCompensation}
                          onValueChange={(_formatted, num) => handleComponentChange("disturbanceCompensation", num)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="comp-group">
                        <CurrencyInput
                          label="Relocation Allowance (RM)"
                          id="relocation"
                          value={components.relocationAllowance}
                          onValueChange={(_formatted, num) => handleComponentChange("relocationAllowance", num)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="comp-group" style={{ gridColumn: "1 / -1" }}>
                        <CurrencyInput
                          label="Other Eligible Items (Special Damages) (RM)"
                          id="otherEligible"
                          value={components.otherEligible}
                          onValueChange={(_formatted, num) => handleComponentChange("otherEligible", num)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="actions flex items-center gap-3 pt-4 border-t border-md-outline/10">
                      <Button
                        variant="tonal"
                        onClick={calculateTotal}
                        isLoading={isCalculating}
                      >
                        <Calculator size={18} /> Calculate Compensation
                      </Button>
                      <Button
                        variant="filled"
                        onClick={handleGenerateClick}
                        disabled={isGenerating || calculatedTotal === null}
                        isLoading={isGenerating}
                      >
                        <FileText size={18} /> Generate Compensation Report
                      </Button>
                    </div>
                  </div>

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
                            <div className="flex items-center gap-1.5 my-1">
                              <strong>Report ID:</strong> <span className="font-mono">{generatedReportId}</span>
                              <CopyButton value={generatedReportId} />
                            </div>
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
                              <Button
                                variant="filled"
                                size="sm"
                                onClick={() => navigate("/admin/compensation/offer/review", { state: { offerId: generatedOfferId } })}
                              >
                                View Offer Letter
                              </Button>
                            )}
                            <Button
                              variant="outlined"
                              size="sm"
                              onClick={() => navigate("/admin/compensation/report")}
                            >
                              Go to Compensation Reports
                            </Button>
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
                <Button
                  variant="filled"
                  style={{ marginTop: "16px" }}
                  onClick={() => setIsCaseModalOpen(true)}
                >
                  Select Case
                </Button>
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

export const CompensationReportGenerator = CompensationCreate;
