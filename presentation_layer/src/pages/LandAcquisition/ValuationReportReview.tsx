import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, X } from "lucide-react";
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

const mockReportDetail: ReportDetail = {
  id: "REP-001",
  caseId: "LAC-2026-07-0024",
  caseTitle: "Kampung Baru Land Acquisition",
  valuer: "Ahmad Faizal",
  valuerId: "V1",
  valuationDate: "24 Jul 2026",
  valuationMethod: "Comparison Method",
  marketValue: "RM 1,800,000",
  recommendedCompensation: "RM 2,200,000",
  remarks:
    "Property is located in a prime area with good infrastructure. Comparable sales indicate a market value of approximately RM 1.8M. Considering the size and location, recommended compensation is RM 2.2M to account for disturbance and relocation costs.",
  buildingAssessment: "building_assessment_report.pdf",
  siteInspection: "site_inspection_notes.pdf",
  status: "Pending Review",
  statusClass: "pending",
};

export const ValuationReportReview: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");
  const [acceptanceDays, setAcceptanceDays] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [daysError, setDaysError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setReport(mockReportDetail);
      setLoading(false);
    }, 500);
  }, [reportId]);

  const handleAccept = () => {
    // Simulate accept
    alert(
      '<Lucide.CheckCircle size={16} className="inline mr-1" /> Report accepted. Case status updated to "Compensation Approved".',
    );
    navigate("/case/valuation");
  };

  const openRejectModal = () => {
    setShowRejectModal(true);
    setReason("");
    setAcceptanceDays("");
    setReasonError("");
    setDaysError("");
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
  };

  const handleRejectSubmit = () => {
    let valid = true;
    if (!reason.trim()) {
      setReasonError("Reason is required.");
      valid = false;
    } else {
      setReasonError("");
    }
    if (!acceptanceDays.trim() || parseInt(acceptanceDays) <= 0) {
      setDaysError("Please enter a valid number of days (greater than 0).");
      valid = false;
    } else {
      setDaysError("");
    }
    if (!valid) return;

    setSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      alert(
        `<Lucide.XCircle size={16} className="inline mr-1" /> Report rejected.\n\nReason: ${reason}\nAcceptance Period: ${acceptanceDays} days\n\n` +
        `• Case status updated to "Valuation Rejected" (C3)\n` +
        `• Valuer notified (M1) to refine the report within ${acceptanceDays} days.`,
      );
      setSubmitting(false);
      setShowRejectModal(false);
      navigate("/case/valuation");
    }, 1200);
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
        <div
          style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}
        >
          Loading report...
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
        <div
          style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}
        >
          Report not found.
        </div>
      </div>
    );
  }

  return (
    <>
      {showRejectModal && (
        <div className="reject-modal-overlay" onClick={closeRejectModal}>
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
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
                {submitting ? "Submitting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
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
                <span className="date-badge"><Lucide.Calendar size={16} className="inline mr-1" /> 24 Jul 2026</span>
                <div className="avatar">AO</div>
              </div>
            </div>

            <div className="case-summary">
              <div className="left">
                <div className="case-id">{report.caseId}</div>
                <div className="case-title">{report.caseTitle}</div>
                <div className="meta">
                  <span><Lucide.FileText size={16} className="inline mr-1" /> Report: {report.id}</span>
                  <span><Lucide.Scale size={16} className="inline mr-1" /> Valuer: {report.valuer}</span>
                  <span><Lucide.Calendar size={16} className="inline mr-1" /> {report.valuationDate}</span>
                </div>
              </div>
              <span className={`status-badge-lg ${report.statusClass}`}>
                <Lucide.Hourglass size={16} className="inline mr-1" /> {report.status}
              </span>
            </div>

            <div className="report-card">
              <div className="section-title"><Lucide.ClipboardList size={16} className="inline mr-1" /> Report Details</div>
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
                  <span className="value">
                    {report.recommendedCompensation}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Status</span>
                  <span
                    className="value"
                    style={{ fontWeight: 600, color: "var(--md-warning-text)" }}
                  >
                    <Lucide.Hourglass size={16} className="inline mr-1" /> {report.status}
                  </span>
                </div>
                <div className="detail-item full-width">
                  <span className="label">Remarks</span>
                  <span className="value">{report.remarks}</span>
                </div>
              </div>

              <div style={{ marginTop: "20px" }}>
                <div className="section-title" style={{ marginBottom: "8px" }}>
                  <Lucide.Paperclip size={16} className="inline mr-1" /> Attachments (C2)
                </div>
                <div className="file-list">
                  <div className="file-item">
                    <Lucide.FileText size={16} className="file-icon inline mr-1" />{" "}
                    {report.buildingAssessment}
                  </div>
                  <div className="file-item">
                    <Lucide.FileText size={16} className="file-icon inline mr-1" />{" "}
                    {report.siteInspection}
                  </div>
                </div>
              </div>

              <div className="action-bar">
                <button className="btn-accept" onClick={handleAccept}>
                  <CheckCircle size={18} /> Accept
                </button>
                <button className="btn-reject" onClick={openRejectModal}>
                  <XCircle size={18} /> Reject
                </button>
              </div>
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
              FCR-SCS · Valuation Report Review · For Administrators
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
