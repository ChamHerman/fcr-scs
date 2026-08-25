import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import "../../style.css";
import "./valuation_report.css";

type ReportDetail = {
  id: string;
  caseId: string;
  caseTitle: string;
  valuer: string;
  valuerId: string;
  valuationDate: string;
  valuationMethod: string;
  marketValue: string;
  recommendedCompensation: string;
  remarks: string;
  buildingAssessment: string;
  siteInspection: string;
  status: string;
  statusClass: string;
};

const statusClassMap: Record<string, string> = {
  PENDING: "status-pending-valuation",
  APPROVED: "status-valuation-approved",
  REJECTED: "status-valuation-rejected",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const ValuationReportReview: React.FC = () => {
  const { user, userId, isAdmin, isOfficer, isValuer } = useRole();
  const { reportId: paramReportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const activeReportId = location.state?.reportId || paramReportId;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");
  const [acceptanceDays, setAcceptanceDays] = useState("7");
  const [reasonError, setReasonError] = useState("");
  const [daysError, setDaysError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Only Government Officer (and Admin) can approve or reject
  const canApproveOrReject = isOfficer || isAdmin;

  useEffect(() => {
    async function fetchReport() {
      if (!activeReportId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await landAcquisitionApi.getValuationReportById(activeReportId);
        const rep = res.report;

        const formatted: ReportDetail = {
          id: rep.reportId,
          caseId: rep.caseId,
          caseTitle: rep.acquisitionCase?.caseTitle || "—",
          valuer: rep.valuer?.name || "Unassigned",
          valuerId: rep.valuerId || "",
          valuationDate: rep.valuationDate
            ? new Date(rep.valuationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          valuationMethod: rep.valuationMethod || "—",
          marketValue: rep.marketValue ? `RM ${Number(rep.marketValue).toLocaleString()}` : "—",
          recommendedCompensation: rep.recommendedCompensation
            ? `RM ${Number(rep.recommendedCompensation).toLocaleString()}`
            : "—",
          remarks: rep.remarks || "No remarks provided.",
          buildingAssessment: "building_assessment_report.pdf",
          siteInspection: "site_inspection_notes.pdf",
          status: statusLabelMap[rep.reportStatus] || rep.reportStatus,
          statusClass: statusClassMap[rep.reportStatus] || "status-pending-valuation",
        };

        setReport(formatted);
      } catch (err: any) {
        console.error("Failed to load valuation report:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [activeReportId]);

  const handleAccept = async () => {
    if (!report) return;
    if (!canApproveOrReject) {
      alert("Only Government Officers are authorized to approve valuation reports.");
      return;
    }
    try {
      await landAcquisitionApi.approveValuationReport(report.id, userId);
      alert("Valuation Report Approved!\n\nCase status updated to 'VALUATION_APPROVED'.");
      navigate("/admin/case/valuation");
    } catch (err: any) {
      console.error("Failed to approve report:", err);
      alert(`Approval Failed: ${err.message}`);
    }
  };

  const openRejectModal = () => {
    if (!canApproveOrReject) {
      alert("Only Government Officers are authorized to reject valuation reports.");
      return;
    }
    setShowRejectModal(true);
    setReason("");
    setAcceptanceDays("7");
    setReasonError("");
    setDaysError("");
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
  };

  const handleRejectSubmit = async () => {
    if (!canApproveOrReject) {
      alert("Only Government Officers are authorized to reject valuation reports.");
      return;
    }
    let valid = true;
    if (!reason.trim()) {
      setReasonError("Reason is required.");
      valid = false;
    } else {
      setReasonError("");
    }
    if (!acceptanceDays.trim() || parseInt(acceptanceDays, 10) <= 0) {
      setDaysError("Please enter a valid number of days (greater than 0).");
      valid = false;
    } else {
      setDaysError("");
    }
    if (!valid || !report) return;

    setSubmitting(true);
    try {
      await landAcquisitionApi.rejectValuationReport(report.id, reason, parseInt(acceptanceDays, 10), userId);
      alert(`Valuation Report Rejected!\n\nReason: ${reason}\nCase status updated to 'VALUATION_REJECTED'.`);
      setShowRejectModal(false);
      navigate("/admin/case/valuation");
    } catch (err: any) {
      console.error("Failed to reject report:", err);
      alert(`Rejection Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-md-background text-md-on-surface"
      >
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <Loader2 size={32} className="inline animate-spin mb-2" />
          <div>Loading valuation report details from backend...</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-md-background text-md-on-surface"
      >
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <h3 className="text-lg font-bold mb-2">Valuation Report Not Found</h3>
          <p className="mb-4">No report selected or valid ID provided.</p>
          <Button variant="filled" onClick={() => navigate("/admin/case/valuation")}>
            Back to Valuation Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Modal
        isOpen={showRejectModal}
        onClose={closeRejectModal}
        title="Reject Report"
        subtitle="Provide reason for rejection and specify revision timeline"
        footer={
          <>
            <Button variant="text" onClick={closeRejectModal}>
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
            placeholder="Enter the reason for rejecting this report..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError("");
            }}
          />
          {reasonError && <div className="text-xs text-md-error pl-2">{reasonError}</div>}

          <div>
            <Input
              label="Acceptance Period (days) *"
              type="number"
              min="1"
              placeholder="e.g., 7"
              value={acceptanceDays}
              onChange={(e) => {
                setAcceptanceDays(e.target.value);
                if (daysError) setDaysError("");
              }}
            />
            {daysError && <div className="text-xs text-md-error pl-2 mt-1">{daysError}</div>}
            <div className="text-xs text-md-on-surface-variant/60 mt-1 pl-2">
              Number of days for the valuer to revise and resubmit.
            </div>
          </div>
        </div>
      </Modal>

      <div className="main blur-shape-bg">
        <div className="review-container">
            <div className="topbar" style={{ marginBottom: "16px" }}>
              <div className="topbar-left">
                <h1 style={{ marginBottom: 0 }}>Review Valuation Report</h1>
                <div className="sub">
                  Review the report details and take action
                </div>
              </div>
              <div className="topbar-right flex items-center gap-3">
                <Button variant="outlined" size="sm" onClick={() => navigate("/admin/case/valuation")}>
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

            <div className="case-summary">
              <div className="left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="case-id font-mono text-sm">Case ID: {report.caseId}</span>
                  <CopyButton value={report.caseId} />
                </div>
                <div className="case-title">{report.caseTitle}</div>
                <div className="meta flex items-center flex-wrap gap-3 mt-2">
                  <span className="flex items-center gap-1">
                    <Lucide.FileText size={14} className="inline" /> Report ID: {report.id}
                    <CopyButton value={report.id} size="sm" />
                  </span>
                  <span><Lucide.Scale size={14} className="inline mr-1" /> Valuer: {report.valuer}</span>
                  <span><Lucide.Calendar size={14} className="inline mr-1" /> {report.valuationDate}</span>
                </div>
              </div>
              <span className={`status-badge-lg ${report.statusClass}`}>
                <span className="dot"></span> {report.status}
              </span>
            </div>

            <div className="report-card">
              <div className="section-title">
                <Lucide.ClipboardList size={16} className="inline mr-1" /> Report Details
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Valuation Method</span>
                  <span className="value">{report.valuationMethod}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Market Value</span>
                  <span className="value">{report.marketValue}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Recommended Compensation</span>
                  <span className="value">{report.recommendedCompensation}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status</span>
                  <span
                    className="value font-semibold"
                  >
                    {report.status}
                  </span>
                </div>
                <div className="detail-item full-width">
                  <span className="label">Remarks</span>
                  <span className="value">{report.remarks}</span>
                </div>
              </div>

              {report.status === "Pending Review" && (
                canApproveOrReject ? (
                  <div className="action-bar flex items-center justify-end gap-3 mt-6 pt-4 border-t border-md-outline/10">
                    <Button variant="danger" onClick={openRejectModal}>
                      <XCircle size={18} /> Reject
                    </Button>
                    <Button variant="filled" onClick={handleAccept}>
                      <CheckCircle size={18} /> Accept & Approve
                    </Button>
                  </div>
                ) : null
              )}

              {report.status === "Rejected" && (isValuer || isAdmin) && (
                <div className="action-bar flex items-center justify-between flex-wrap gap-4 mt-6 pt-4 border-t border-md-outline/10">
                  <div className="flex items-start gap-2 max-w-lg">
                    <Lucide.AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                        This valuation report was rejected.
                      </div>
                      <div className="text-xs text-md-on-surface-variant/80 mt-0.5">
                        You can create a new revised valuation report. Submitting will assign a <strong>new Report ID</strong> and save as a new row in the database, preserving this rejected report in the history.
                      </div>
                    </div>
                  </div>
                  <Button variant="filled" onClick={() => navigate("/admin/case/valuation/create", { state: { caseId: report.caseId } })}>
                    <Lucide.PlusCircle size={18} /> Create Revised Report (New Record)
                  </Button>
                </div>
              )}
            </div>

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
              FCR-SCS · Valuation Report Review · Connected to Live Backend Service
            </div>
          </div>
        </div>
    </>
  );
};
