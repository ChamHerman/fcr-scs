import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, X, ArrowLeft, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { useModalPopIn } from "../../hooks/useModalPopIn";
import "../../style.css";
import "./compensation.css";

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

const statusClassMap: Record<string, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const CompensationApproval: React.FC = () => {
  const { reportId: paramReportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const activeReportId = location.state?.reportId || paramReportId;

  const [report, setReport] = useState<CompensationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
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
        const r = res.report;

        const o = r.offerLetters?.[0] || r.acquisitionCase?.offerLetters?.[0];
        const offerObj = o
          ? {
              id: o.offerId,
              offerReferenceNo: o.offerReferenceNo,
              offerAmount: Number(o.offerAmount || 0),
              status: statusLabelMap[o.status] || o.status,
            }
          : null;

        const formatted: CompensationDetail = {
          id: r.compensationReportId,
          caseId: r.caseId,
          caseTitle: r.acquisitionCase?.caseTitle || "—",
          owner: r.acquisitionCase?.landParcel?.ownerships?.[0]?.landOwner?.name || "—",
          ownerIc: r.acquisitionCase?.landParcel?.ownerships?.[0]?.landOwner?.nric || r.acquisitionCase?.landParcel?.ownerships?.[0]?.landOwner?.icNumber || "—",
          ownerAddress: r.acquisitionCase?.landParcel?.address || r.acquisitionCase?.landParcel?.ownerships?.[0]?.landOwner?.address || "—",
          ownerPhone: r.acquisitionCase?.landParcel?.ownerships?.[0]?.landOwner?.contact || "—",
          landTitle: r.acquisitionCase?.landParcel?.landTitleNo || "—",
          project: r.acquisitionCase?.project?.projectName || "—",
          status: statusLabelMap[r.status] || r.status,
          statusClass: statusClassMap[r.status] || "pending",
          generatedDate: r.createdAt
            ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          totalAmount: Number(r.totalCompensation || 0),
          components: {
            landValue: Number(r.totalCompensation || 0) * 0.7,
            buildingValue: Number(r.totalCompensation || 0) * 0.15,
            cropValue: 0,
            businessDisruption: Number(r.totalCompensation || 0) * 0.05,
            disturbanceCompensation: Number(r.totalCompensation || 0) * 0.05,
            relocationAllowance: Number(r.totalCompensation || 0) * 0.05,
            otherEligible: 0,
          },
          valuer: r.valuationReport?.valuer?.name || "Senior Valuer",
          valuationMethod: r.valuationReport?.valuationMethod || "Comparison Method",
          marketValue: Number(r.valuationReport?.marketValue || 0),
          recommendedCompensation: Number(r.valuationReport?.recommendedCompensation || 0),
          remarks: r.remarks || "No remarks provided.",
          offerLetter: offerObj,
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

  const handleApprove = async () => {
    if (!report) return;
    if (window.confirm("Approve this compensation report? An offer letter will be auto-generated.")) {
      try {
        const res = await compensationApi.approveReport(report.id);
        const generatedOffer = res.offerLetter || res.report?.offerLetters?.[0];
        const offerRef = generatedOffer?.offerReferenceNo || "Auto-Generated";

        alert(`Compensation Report Approved!\n\nOffer Letter Auto-Generated (${offerRef}).\nCase status updated to 'OFFER_ISSUED'.`);

        setReport((prev) =>
          prev
            ? {
                ...prev,
                status: "Approved",
                statusClass: "approved",
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
        alert(`Approval Failed: ${err.message}`);
      }
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setReasonError("Rejection reason is required.");
      return;
    }
    if (!report) return;

    setSubmitting(true);
    try {
      await compensationApi.rejectReport(report.id, rejectReason);
      alert(`Compensation Report Rejected!\n\nCase status updated to 'COMPENSATION_REJECTED'.`);
      setShowRejectModal(false);
      navigate("/admin/compensation/report");
    } catch (err: any) {
      console.error("Reject failed:", err);
      alert(`Rejection Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return "RM " + val.toLocaleString("en-MY", { minimumFractionDigits: 2 });
  };

  const rejectModalRef = useModalPopIn(showRejectModal);

  const renderRejectModal = () => {
    if (!showRejectModal) return null;
    return createPortal(
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
        onClick={() => setShowRejectModal(false)}
      >
        <div
          ref={rejectModalRef}
          className="preview-modal"
          style={{
            position: "relative",
            maxWidth: "480px",
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
          <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--md-on-surface)" }}>
              Reject Compensation Report
            </h3>
            <button className="close-btn" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setShowRejectModal(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label htmlFor="rejectReason" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "var(--md-on-surface-variant)" }}>
              Rejection Reason <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              id="rejectReason"
              rows={3}
              placeholder="State the reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1.5px solid rgba(121, 116, 126, 0.25)",
                background: "var(--md-surface-container-low)",
                fontSize: "14px",
                fontFamily: "inherit",
                color: "var(--md-on-surface)",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            {reasonError && <div className="error-text" style={{ fontSize: "12px", color: "#dc2626", marginTop: "4px" }}>{reasonError}</div>}
          </div>
          <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid rgba(121,116,126,0.1)" }}>
            <button
              className="btn-cancel"
              style={{
                padding: "8px 24px",
                borderRadius: "9999px",
                border: "1.5px solid rgba(121, 116, 126, 0.3)",
                background: "transparent",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
              onClick={() => setShowRejectModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn-submit"
              style={{
                padding: "8px 24px",
                borderRadius: "9999px",
                border: "none",
                background: "#dc2626",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(220, 38, 38, 0.25)",
              }}
              onClick={handleRejectSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  if (loading) {
    return (
      <div className="main blur-shape-bg" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <Loader2 size={32} className="inline animate-spin mb-2" />
          <div>Fetching compensation report details from backend...</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="main blur-shape-bg">
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <h2>Report Details Not Found</h2>
          <p style={{ color: "var(--md-on-surface-variant)", marginBottom: "20px" }}>
            No report selected or valid ID provided.
          </p>
          <button className="btn-primary" onClick={() => navigate("/admin/compensation/report")}>
            Back to Compensation Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {renderRejectModal()}

      <div className="main blur-shape-bg">
        <div className="topbar" style={{ marginBottom: "20px" }}>
          <div className="topbar-left">
            <h1 style={{ marginBottom: 0 }}>Review Compensation Report</h1>
            <div className="sub">
              Review calculation components and approve or reject report
            </div>
          </div>
          <div className="topbar-right">
            <button className="btn-outline" onClick={() => navigate("/admin/compensation/report")}>
              <ArrowLeft size={16} className="inline mr-1" /> Back
            </button>
          </div>
        </div>

        <div className="case-summary" style={{ background: "var(--md-surface-container)", padding: "20px", borderRadius: "16px", marginBottom: "24px" }}>
          <div>
            <span className="case-id" style={{ fontSize: "12px" }}>Report ID: {report.id}</span>
            <h2 className="case-title" style={{ fontSize: "20px", margin: "4px 0" }}>{report.caseTitle}</h2>
            <div style={{ fontSize: "13px", color: "var(--md-on-surface-variant)" }}>
              Owner: <strong>{report.owner}</strong> ({report.ownerIc}) · Project: <strong>{report.project}</strong>
            </div>
          </div>
          <span className={`status-badge-lg ${report.statusClass}`}>
            <span className="dot"></span> {report.status}
          </span>
        </div>

        <div className="report-card" style={{ background: "var(--md-surface-container)", padding: "24px", borderRadius: "16px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Compensation Breakdown</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div><span className="label">Land Value:</span> <div><strong>{formatCurrency(report.components.landValue)}</strong></div></div>
            <div><span className="label">Building Value:</span> <div><strong>{formatCurrency(report.components.buildingValue)}</strong></div></div>
            <div><span className="label">Disturbance:</span> <div><strong>{formatCurrency(report.components.disturbanceCompensation)}</strong></div></div>
            <div><span className="label">Relocation:</span> <div><strong>{formatCurrency(report.components.relocationAllowance)}</strong></div></div>
          </div>

          <div style={{ padding: "16px", background: "rgba(99,102,241,0.08)", borderRadius: "12px", marginBottom: "24px" }}>
            <span className="label">Total Compensation Package:</span>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--md-primary)" }}>
              {formatCurrency(report.totalAmount)}
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <span className="label">Valuer Remarks:</span>
            <p style={{ marginTop: "4px", fontSize: "14px", color: "var(--md-on-surface)" }}>{report.remarks}</p>
          </div>

          {/* Auto-Generated Offer Letter Card Banner */}
          {report.offerLetter && (
            <div
              style={{
                marginTop: "20px",
                marginBottom: "20px",
                padding: "18px 20px",
                background: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#15803d", fontWeight: 600, fontSize: "15px", marginBottom: "4px" }}>
                  <Lucide.Mail size={18} /> Compensation Offer Letter Auto-Generated
                </div>
                <div style={{ fontSize: "13px", color: "var(--md-on-surface-variant)" }}>
                  Reference: <strong>{report.offerLetter.offerReferenceNo}</strong> · Amount: <strong>{formatCurrency(report.offerLetter.offerAmount)}</strong> · Status: <strong>{report.offerLetter.status}</strong>
                </div>
              </div>
              <button
                className="btn-primary"
                style={{
                  padding: "8px 20px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                onClick={() => navigate("/admin/compensation/offer/review", { state: { offerId: report.offerLetter?.id } })}
              >
                View Offer Letter
              </button>
            </div>
          )}

          {report.status === "Pending Approval" && (
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(121, 116, 126, 0.1)" }}>
              <button
                className="btn-reject"
                style={{
                  padding: "10px 24px",
                  borderRadius: "9999px",
                  border: "1.5px solid rgba(239, 68, 68, 0.3)",
                  background: "rgba(239, 68, 68, 0.05)",
                  color: "#dc2626",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
                onClick={() => setShowRejectModal(true)}
              >
                <XCircle size={18} /> Reject Report
              </button>

              <button
                className="btn-accept"
                style={{
                  padding: "10px 28px",
                  borderRadius: "9999px",
                  border: "none",
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                  transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
                onClick={handleApprove}
              >
                <CheckCircle size={18} /> Approve Report
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
          FCR-SCS · Compensation Approval · Connected to Live Backend Service
        </div>
      </div>
    </>
  );
};
