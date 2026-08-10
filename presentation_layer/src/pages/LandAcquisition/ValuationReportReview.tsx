import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, X, Loader2 } from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { useModalPopIn } from "../../hooks/useModalPopIn";
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
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const ValuationReportReview: React.FC = () => {
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
          statusClass: statusClassMap[rep.reportStatus] || "pending",
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
    try {
      await landAcquisitionApi.approveValuationReport(report.id);
      alert("Valuation Report Approved!\n\nCase status updated to 'VALUATION_APPROVED'.");
      navigate("/admin/case/valuation");
    } catch (err: any) {
      console.error("Failed to approve report:", err);
      alert(`Approval Failed: ${err.message}`);
    }
  };

  const openRejectModal = () => {
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
      await landAcquisitionApi.rejectValuationReport(report.id, reason, parseInt(acceptanceDays, 10));
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
        className="flex min-h-screen"
        style={{
          background: "var(--md-background)",
          color: "var(--md-on-surface)",
          alignItems: "center",
          justifyContent: "center",
        }}
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
        className="flex min-h-screen"
        style={{
          background: "var(--md-background)",
          color: "var(--md-on-surface)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <h3>Valuation Report Not Found</h3>
          <p style={{ marginBottom: "16px" }}>No report selected or valid ID provided.</p>
          <button className="btn-primary" onClick={() => navigate("/admin/case/valuation")}>
            Back to Valuation Dashboard
          </button>
        </div>
      </div>
    );
  }

  const rejectModalRef = useModalPopIn(showRejectModal);

  return (
    <>
      {showRejectModal &&
        createPortal(
          <div className="reject-modal-overlay" onClick={closeRejectModal}>
            <div ref={rejectModalRef} className="reject-modal" style={{ borderRadius: "28px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Reject Report</h3>
                <button className="close-btn" onClick={closeRejectModal}>
                  <X size={22} />
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="reason">
                  Reason for Rejection <span className="required">*</span>
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  placeholder="Enter the reason for rejecting this report..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={reasonError ? "error" : ""}
                />
                {reasonError && <div className="error-text">{reasonError}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="days">
                  Acceptance Period (days) <span className="required">*</span>
                </label>
                <input
                  id="days"
                  type="number"
                  min="1"
                  placeholder="e.g., 7"
                  value={acceptanceDays}
                  onChange={(e) => setAcceptanceDays(e.target.value)}
                  className={daysError ? "error" : ""}
                />
                {daysError && <div className="error-text">{daysError}</div>}
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--md-on-surface-variant)",
                    opacity: 0.6,
                    marginTop: "4px",
                  }}
                >
                  Number of days for the valuer to revise and resubmit.
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={closeRejectModal}>
                  Cancel
                </button>
                <button
                  className="btn-submit"
                  onClick={handleRejectSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Submitting to Backend..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div
        className="flex min-h-screen"
        style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}
      >
        <main className="main blur-shape-bg">
          <div className="review-container">
            <div className="topbar" style={{ marginBottom: "16px" }}>
              <div className="topbar-left">
                <h1 style={{ marginBottom: 0 }}>Review Valuation Report</h1>
                <div className="sub">
                  Review the report details and take action
                </div>
              </div>
              <div className="topbar-right">
                <span className="date-badge">
                  <Lucide.Calendar size={16} className="inline mr-1" />
                  {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <div className="avatar">AO</div>
              </div>
            </div>

            <div className="case-summary">
              <div className="left">
                <div className="case-id" style={{ fontSize: "12px" }}>Case ID: {report.caseId}</div>
                <div className="case-title">{report.caseTitle}</div>
                <div className="meta">
                  <span><Lucide.FileText size={14} className="inline mr-1" /> Report ID: {report.id.slice(0, 8)}...</span>
                  <span><Lucide.Scale size={14} className="inline mr-1" /> Valuer: {report.valuer}</span>
                  <span><Lucide.Calendar size={14} className="inline mr-1" /> {report.valuationDate}</span>
                </div>
              </div>
              <span className={`status-badge-lg ${report.statusClass}`}>
                <Lucide.Hourglass size={16} className="inline mr-1" /> {report.status}
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
                    className="value"
                    style={{ fontWeight: 600, color: report.status === "Approved" ? "var(--md-success-text)" : "var(--md-warning-text)" }}
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
                <div className="action-bar">
                  <button className="btn-accept" onClick={handleAccept}>
                    <CheckCircle size={18} /> Accept & Approve
                  </button>
                  <button className="btn-reject" onClick={openRejectModal}>
                    <XCircle size={18} /> Reject
                  </button>
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
        </main>
      </div>
    </>
  );
};
