import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  PlusCircle,
  AlertCircle,
  Mail,
  FileText,
  Folder,
  Tag,
  User,
  Calendar,
  Scale,
  ClipboardList,
  Wallet,
  Layers,
  Info,
} from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import { formatCurrencyRM } from "../../utils/currency";
import {
  COMPENSATION_STATUS_CLASS_MAP as statusClassMap,
  COMPENSATION_STATUS_LABEL_MAP as statusLabelMap,
} from "../../constants";
import "../../index.css";
import "./compensation.css";
import "../LandAcquisition/valuation_report.css";

export type ProjectBudgetSummary = {
  projectId: string;
  projectName: string;
  projectType: string;
  totalBudget: number;
  totalApprovedUnderProject: number;
  remainingFund: number;
  remainingFundBefore: number;
  remainingFundAfter: number;
  currentReportAmount: number;
  isOverBudget: boolean;
};

type CompensationDetail = {
  id: string;
  caseId: string;
  caseTitle: string;
  owner: string;
  ownerIc: string;
  ownerAddress: string;
  ownerPhone: string;
  landTitle: string;
  project: string;
  projectId?: string;
  projectBudgetSummary?: ProjectBudgetSummary;
  status: string;
  statusClass: string;
  generatedDate: string;
  totalAmount: number;
  components: {
    landValue: number;
    buildingValue: number;
    cropValue: number;
    businessDisruption: number;
    disturbanceCompensation: number;
    relocationAllowance: number;
    otherEligible: number;
  };
  valuer: string;
  valuationMethod: string;
  marketValue: number;
  recommendedCompensation: number;
  remarks: string;
  offerLetter?: {
    id: string;
    offerReferenceNo: string;
    offerAmount: number;
    status: string;
  } | null;
};

export const CompensationReview: React.FC = () => {
  const { reportId: paramReportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userId, isGovAdmin, isOfficer, isAdmin } = useRole();
  const { notify } = useNotification();
  const canApproveOrReject = isGovAdmin || isAdmin;

  const activeReportId = location.state?.reportId || paramReportId;

  const [report, setReport] = useState<CompensationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      if (!activeReportId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await compensationApi.getReportById(activeReportId);
        const rep = res.report;
        const c = rep.acquisitionCase;
        const ownerInfo = c?.landParcel?.ownerships?.[0]?.landOwner;
        const comps = rep.compensationComponents?.[0] || {};
        const vr = rep.valuationReport;
        const generatedOffer = rep.offerLetters?.[0];

        const rawStatus = rep.reportStatus || rep.status || "PENDING";
        const totalAmountNum = Number(rep.totalCompensation || 0);

        // Compute or use project budget summary from backend
        let budgetSummary: ProjectBudgetSummary | undefined = rep.projectBudgetSummary;
        if (!budgetSummary && c?.project) {
          const totalBudget = Number(c.project.budget || 0);
          const remainingFund = totalBudget;
          const remainingFundAfter = totalBudget - totalAmountNum;
          budgetSummary = {
            projectId: c.project.projectId || "",
            projectName: c.project.projectName || "—",
            projectType: c.project.projectType || "—",
            totalBudget,
            totalApprovedUnderProject: 0,
            remainingFund,
            remainingFundBefore: totalBudget,
            remainingFundAfter,
            currentReportAmount: totalAmountNum,
            isOverBudget: remainingFundAfter < 0,
          };
        }

        const formatted: CompensationDetail = {
          id: rep.compensationReportId || rep.reportId,
          caseId: rep.caseId,
          caseTitle: c?.caseTitle || "—",
          owner: ownerInfo?.name || "—",
          ownerIc: ownerInfo?.nric || ownerInfo?.icNumber || "—",
          ownerAddress: c?.landParcel?.address || ownerInfo?.address || "—",
          ownerPhone: ownerInfo?.contact || "—",
          landTitle: c?.landParcel?.landTitleNo || "—",
          project: c?.project?.projectName || "—",
          projectId: c?.project?.projectId,
          projectBudgetSummary: budgetSummary,
          status: statusLabelMap[rawStatus] || rawStatus,
          statusClass: statusClassMap[rawStatus] || "status-pending-comp",
          generatedDate: rep.createdAt
            ? new Date(rep.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—",
          totalAmount: totalAmountNum,
          components: {
            landValue: Number(rep.landValue ?? comps.landValue ?? 0),
            buildingValue: Number(rep.buildingValue ?? comps.buildingValue ?? 0),
            cropValue: Number(rep.cropValue ?? comps.cropValue ?? 0),
            businessDisruption: Number(rep.businessDisruption ?? comps.businessDisruption ?? 0),
            disturbanceCompensation: Number(rep.disturbanceCompensation ?? comps.disturbanceCompensation ?? 0),
            relocationAllowance: Number(rep.relocationAllowance ?? comps.relocationAllowance ?? 0),
            otherEligible: Number(rep.otherEligible ?? comps.otherEligible ?? 0),
          },
          valuer: vr?.valuer?.name || "Valuer",
          valuationMethod: vr?.valuationMethod || "Sales Comparison Method",
          marketValue: Number(vr?.marketValue || 0),
          recommendedCompensation: Number(vr?.recommendedCompensation || 0),
          remarks: rep.remarks || "No remarks provided.",
          offerLetter: generatedOffer
            ? {
                id: generatedOffer.offerId,
                offerReferenceNo: generatedOffer.offerReferenceNo,
                offerAmount: Number(generatedOffer.offerAmount || rep.totalCompensation),
                status: generatedOffer.status,
              }
            : null,
        };

        setReport(formatted);
      } catch (err: any) {
        console.error("Failed to load compensation report:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [activeReportId]);

  const confirmApprove = async () => {
    if (!report) return;
    if (!canApproveOrReject) {
      notify({
        type: "error",
        title: "Access Denied",
        message: "Only Government Administrators can approve compensation reports.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await compensationApi.approveReport(report.id, userId);
      const generatedOffer = res.offerLetter || res.report?.offerLetters?.[0];
      setShowApproveModal(false);

      notify({
        type: "success",
        title: "Report Approved",
        message: "Compensation report approved and Offer Letter generated.",
      });

      setReport((prev) =>
        prev
          ? {
              ...prev,
              status: "Approved",
              statusClass: "status-comp-approved",
              offerLetter: generatedOffer
                ? {
                    id: generatedOffer.offerId,
                    offerReferenceNo: generatedOffer.offerReferenceNo,
                    offerAmount: Number(generatedOffer.offerAmount || prev.totalAmount),
                    status: "Pending Response",
                  }
                : prev.offerLetter,
            }
          : null
      );
    } catch (err: any) {
      console.error("Approve failed:", err);
      notify({
        type: "error",
        title: "Approval Failed",
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setReasonError("Rejection reason is required.");
      return;
    }
    if (!report) return;
    if (!canApproveOrReject) {
      notify({
        type: "error",
        title: "Access Denied",
        message: "Only Government Administrators can reject compensation reports.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await compensationApi.rejectReport(report.id, rejectReason, userId);
      notify({
        type: "success",
        title: "Report Rejected",
        message: `Reason: ${rejectReason}`,
      });
      setShowRejectModal(false);
      navigate("/admin/compensation/report");
    } catch (err: any) {
      console.error("Reject failed:", err);
      notify({
        type: "error",
        title: "Rejection Failed",
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-md-background text-md-on-surface">
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <Loader2 size={32} className="inline animate-spin mb-2" />
          <div>Loading compensation report details from backend...</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-md-background text-md-on-surface">
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <h3 className="text-lg font-bold mb-2">Compensation Report Not Found</h3>
          <p className="mb-4">No report selected or valid ID provided.</p>
          <Button variant="filled" onClick={() => navigate("/admin/compensation/report")}>
            Back to Compensation Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Report"
        subtitle="State the clear reason for rejecting this compensation report"
        footer={
          <>
            <Button variant="text" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectSubmit}
              isLoading={submitting}
            >
              <XCircle size={16} /> Confirm Reject
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Textarea
            label="Reason for Rejection *"
            rows={3}
            placeholder="Enter the reason for rejecting this compensation report..."
            value={rejectReason}
            error={reasonError}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (reasonError) setReasonError("");
            }}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Compensation Report"
        subtitle="Confirm approval and trigger automatic offer letter generation"
        footer={
          <>
            <Button variant="text" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={confirmApprove}
              isLoading={submitting}
            >
              <CheckCircle size={16} /> Confirm Approval
            </Button>
          </>
        }
      >
        <p className="text-sm text-md-on-surface-variant">
          Approving this report will finalize the compensation total of{" "}
          <strong>{formatCurrencyRM(report.totalAmount)}</strong> and automatically generate an official Form H Offer Letter for the landowner.
        </p>
      </Modal>

      <div className="main blur-shape-bg">
        <div className="review-container space-y-6">
          {/* Topbar */}
          <div className="topbar" style={{ marginBottom: "0px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Review Compensation Report</h1>
              <div className="sub">Review the report details and take action</div>
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
          <div className="case-summary">
            <div className="left">
              <div className="flex items-center gap-2 mb-1">
                <span className="case-id font-mono text-sm">Case ID: {report.caseId}</span>
                <CopyButton value={report.caseId} />
              </div>
              <div className="case-title">{report.caseTitle}</div>
              <div className="meta flex items-center flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1">
                  <FileText size={14} className="inline" /> Report ID: {report.id}
                  <CopyButton value={report.id} size="sm" />
                </span>
                <span>
                  <Tag size={14} className="inline mr-1" /> Title No: {report.landTitle}
                </span>
                <span>
                  <User size={14} className="inline mr-1" /> Owner: {report.owner}
                </span>
                <span>
                  <Calendar size={14} className="inline mr-1" /> {report.generatedDate}
                </span>
              </div>
            </div>
            <span className={`status-badge-lg ${report.statusClass}`}>
              <span className="dot"></span> {report.status}
            </span>
          </div>

          {/* Report Card */}
          <div className="report-card">
            <div className="section-title">
              <ClipboardList size={16} className="inline mr-1" /> Report Details
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Valuation Method</span>
                <span className="value">{report.valuationMethod}</span>
              </div>
              <div className="detail-item">
                <span className="label">Approved Recommended Valuation</span>
                <span className="value">{formatCurrencyRM(report.recommendedCompensation)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Land Value</span>
                <span className="value">{formatCurrencyRM(report.components.landValue)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Building / Structure Value</span>
                <span className="value">{formatCurrencyRM(report.components.buildingValue)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Crop / Plantation Value</span>
                <span className="value">{formatCurrencyRM(report.components.cropValue)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Business Disruption</span>
                <span className="value">{formatCurrencyRM(report.components.businessDisruption)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Disturbance Compensation</span>
                <span className="value">{formatCurrencyRM(report.components.disturbanceCompensation)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Relocation Allowance</span>
                <span className="value">{formatCurrencyRM(report.components.relocationAllowance)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Other Eligible Items</span>
                <span className="value">{formatCurrencyRM(report.components.otherEligible)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Total Compensation</span>
                <span className="value font-bold text-green-700 dark:text-green-400">
                  {formatCurrencyRM(report.totalAmount)}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Status</span>
                <span className="value font-semibold">{report.status}</span>
              </div>
              <div className="detail-item full-width">
                <span className="label">Remarks</span>
                <span className="value">{report.remarks}</span>
              </div>
            </div>

            {/* Offer Letter Auto-Generated Banner (if exists) */}
            {report.offerLetter && (
              <div
                style={{
                  marginTop: "20px",
                  marginBottom: "8px",
                  padding: "16px 20px",
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#15803d",
                      fontWeight: 600,
                      fontSize: "14px",
                      marginBottom: "2px",
                    }}
                  >
                    <Mail size={16} /> Compensation Offer Letter Auto-Generated
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--md-on-surface-variant)" }}>
                    Reference: <strong>{report.offerLetter.offerReferenceNo}</strong> · Amount:{" "}
                    <strong>{formatCurrencyRM(report.offerLetter.offerAmount)}</strong> · Status:{" "}
                    <strong>{report.offerLetter.status}</strong>
                  </div>
                </div>
                <Button
                  variant="filled"
                  size="sm"
                  onClick={() =>
                    navigate("/admin/compensation/offer/review", { state: { offerId: report.offerLetter?.id } })
                  }
                >
                  <Mail size={15} /> View Offer Letter
                </Button>
              </div>
            )}

            {/* Action Bar for Rejected */}
            {report.status === "Rejected" && (isOfficer || isAdmin) && (
              <div className="action-bar flex items-center justify-between flex-wrap gap-4 mt-6 pt-4 border-t border-md-outline/10">
                <div className="flex items-start gap-2 max-w-lg">
                  <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      This compensation report was rejected.
                    </div>
                    <div className="text-xs text-md-on-surface-variant/80 mt-0.5">
                      You can create a new revised compensation report. Submitting will assign a{" "}
                      <strong>new Report ID</strong> and save as a new row in the database, preserving this rejected report in the history.
                    </div>
                  </div>
                </div>
                <Button
                  variant="filled"
                  onClick={() => navigate("/admin/compensation/report/create", { state: { caseId: report.caseId } })}
                >
                  <PlusCircle size={18} /> Create Revised Report (New Record)
                </Button>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* PROJECT BUDGET & REMAINING FUND SECTION (Only shown when pending action) */}
          {/* ──────────────────────────────────────────────────────────── */}
          {report.status === "Pending Approval" && (
            report.projectBudgetSummary ? (
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
                          <Folder size={13} className="inline" /> {report.project}
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
                    <span className="metric-value font-mono">
                      {formatCurrencyRM(report.projectBudgetSummary.totalBudget)}
                    </span>
                    <span className="metric-sub">Allocated Project Budget</span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-label">Total Approved Under Project</span>
                    <span className="metric-value font-mono text-amber-700 dark:text-amber-400">
                      {formatCurrencyRM(report.projectBudgetSummary.totalApprovedUnderProject)}
                    </span>
                    <span className="metric-sub">Across All Project Cases</span>
                  </div>

                  <div className="metric-box highlight-current">
                    <span className="metric-label">Remaining Fund</span>
                    <span className="metric-value font-mono text-blue-700 dark:text-blue-400">
                      {formatCurrencyRM(report.projectBudgetSummary.remainingFund)}
                    </span>
                    <span className="metric-sub">Prior to This Approval</span>
                  </div>

                  <div
                    className={`metric-box highlight-after ${
                      report.projectBudgetSummary.remainingFundAfter < 0 ? "warning" : "success"
                    }`}
                  >
                    <span className="metric-label">Remaining Fund After Approval</span>
                    <span
                      className={`metric-value font-mono font-bold ${
                        report.projectBudgetSummary.remainingFundAfter < 0
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {formatCurrencyRM(report.projectBudgetSummary.remainingFundAfter)}
                    </span>
                    <span className="metric-sub font-semibold">
                      {report.projectBudgetSummary.remainingFundAfter < 0
                        ? `Difference: ${formatCurrencyRM(report.projectBudgetSummary.remainingFundAfter)}`
                        : "Estimated Post-Approval Balance"}
                    </span>
                  </div>
                </div>

                {/* Visual Budget Allocation Progress Bar */}
                {report.projectBudgetSummary.totalBudget > 0 && (
                  <div className="budget-progress-section">
                    <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                      <span className="text-md-on-surface-variant flex items-center gap-1.5">
                        <Layers size={14} /> Project Budget Allocation
                      </span>
                      <span className="font-mono font-semibold text-md-on-surface">
                        {(
                          ((report.projectBudgetSummary.totalApprovedUnderProject + report.totalAmount) /
                            report.projectBudgetSummary.totalBudget) *
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
                            (report.projectBudgetSummary.totalApprovedUnderProject /
                              report.projectBudgetSummary.totalBudget) *
                              100
                          )}%`,
                        }}
                        title={`Previously Approved: ${formatCurrencyRM(
                          report.projectBudgetSummary.totalApprovedUnderProject
                        )}`}
                      />
                      <div
                        className="budget-bar-current"
                        style={{
                          width: `${Math.min(
                            100 -
                              Math.min(
                                100,
                                (report.projectBudgetSummary.totalApprovedUnderProject /
                                  report.projectBudgetSummary.totalBudget) *
                                  100
                              ),
                            (report.totalAmount / report.projectBudgetSummary.totalBudget) * 100
                          )}%`,
                        }}
                        title={`This Report: ${formatCurrencyRM(report.totalAmount)}`}
                      />
                    </div>

                    <div className="budget-legend flex items-center justify-between text-xs mt-2.5 flex-wrap gap-2 text-md-on-surface-variant">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <span className="legend-dot approved" /> Approved Cases:{" "}
                          <strong>{formatCurrencyRM(report.projectBudgetSummary.totalApprovedUnderProject)}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="legend-dot current" /> This Report:{" "}
                          <strong>{formatCurrencyRM(report.totalAmount)}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="legend-dot remaining" /> Remaining After Approval:{" "}
                          <strong
                            className={
                              report.projectBudgetSummary.remainingFundAfter < 0
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-emerald-700 dark:text-emerald-400"
                            }
                          >
                            {formatCurrencyRM(report.projectBudgetSummary.remainingFundAfter)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────────── */}
                {/* ACTION BUTTONS (Moved under Project Budget & Remaining Fund section) */}
                {/* ──────────────────────────────────────────────────────────── */}
                {canApproveOrReject && (
                  <div className="action-bar flex items-center justify-between flex-wrap gap-4 mt-6 pt-5 border-t border-md-outline/15">
                    <div className="text-xs text-md-on-surface-variant flex items-center gap-1.5">
                      <Info size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Budget figures are provided for project fund allocation reference.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="danger" onClick={() => setShowRejectModal(true)}>
                        <XCircle size={18} /> Reject
                      </Button>
                      <Button variant="filled" onClick={() => setShowApproveModal(true)}>
                        <CheckCircle size={18} /> Accept & Approve
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              canApproveOrReject && (
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button variant="danger" onClick={() => setShowRejectModal(true)}>
                    <XCircle size={18} /> Reject
                  </Button>
                  <Button variant="filled" onClick={() => setShowApproveModal(true)}>
                    <CheckCircle size={18} /> Accept & Approve
                  </Button>
                </div>
              )
            )
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
            FCR-SCS · Compensation Report Review · Connected to Live Backend Service
          </div>
        </div>
      </div>
    </>
  );
};

export const CompensationApproval = CompensationReview;
export default CompensationReview;
