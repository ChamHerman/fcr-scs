import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
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
  PENDING: "status-pending-comp",
  APPROVED: "status-comp-approved",
  REJECTED: "status-comp-rejected",
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
          statusClass: statusClassMap[r.status] || "status-pending-comp",
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

  const confirmApprove = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      const res = await compensationApi.approveReport(report.id);
      const generatedOffer = res.offerLetter || res.report?.offerLetters?.[0];
      setShowApproveModal(false);

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
      alert(`Approval Failed: ${err.message}`);
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

    setSubmitting(true);
    try {
      await compensationApi.rejectReport(report.id, rejectReason);
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
          <Button variant="filled" onClick={() => navigate("/admin/compensation/report")}>
            Back to Compensation Reports
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
        title="Reject Compensation Report"
        subtitle="State the clear reason for rejecting this compensation calculation"
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
              <XCircle size={16} /> Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <Textarea
            label="Rejection Reason *"
            rows={3}
            placeholder="State the reason for rejection..."
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (reasonError) setReasonError("");
            }}
          />
          {reasonError && <div className="text-xs text-md-error pl-2">{reasonError}</div>}
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
          Approving this report will finalize the compensation total of <strong>{formatCurrency(report.totalAmount)}</strong> and automatically generate an official Offer Letter for the landowner.
        </p>
      </Modal>

      <div className="main blur-shape-bg">
        <div className="topbar" style={{ marginBottom: "20px" }}>
          <div className="topbar-left">
            <h1 style={{ marginBottom: 0 }}>Review Compensation Report</h1>
            <div className="sub">
              Review calculation components and approve or reject report
            </div>
          </div>
          <div className="topbar-right">
            <Button variant="outlined" size="sm" onClick={() => navigate("/admin/compensation/report")}>
              <ArrowLeft size={16} /> Back
            </Button>
          </div>
        </div>

        <div className="case-summary" style={{ background: "var(--md-surface-container)", padding: "20px", borderRadius: "16px", marginBottom: "24px" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="case-id font-mono text-xs">Report ID: {report.id}</span>
              <CopyButton value={report.id} />
            </div>
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
            <div><span className="label text-xs text-md-on-surface-variant">Land Value:</span> <div><strong>{formatCurrency(report.components.landValue)}</strong></div></div>
            <div><span className="label text-xs text-md-on-surface-variant">Building Value:</span> <div><strong>{formatCurrency(report.components.buildingValue)}</strong></div></div>
            <div><span className="label text-xs text-md-on-surface-variant">Disturbance:</span> <div><strong>{formatCurrency(report.components.disturbanceCompensation)}</strong></div></div>
            <div><span className="label text-xs text-md-on-surface-variant">Relocation:</span> <div><strong>{formatCurrency(report.components.relocationAllowance)}</strong></div></div>
          </div>

          <div style={{ padding: "16px", background: "rgba(103,80,164,0.08)", borderRadius: "12px", marginBottom: "24px" }}>
            <span className="label text-xs text-md-on-surface-variant">Total Compensation Package:</span>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--md-primary)" }}>
              {formatCurrency(report.totalAmount)}
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <span className="label text-xs text-md-on-surface-variant">Valuer Remarks:</span>
            <p style={{ marginTop: "4px", fontSize: "14px", color: "var(--md-on-surface)" }}>{report.remarks}</p>
          </div>

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
              <Button
                variant="filled"
                size="sm"
                onClick={() => navigate("/admin/compensation/offer/review", { state: { offerId: report.offerLetter?.id } })}
              >
                View Offer Letter
              </Button>
            </div>
          )}

          {report.status === "Pending Approval" && (
            <div className="flex gap-3 justify-end items-center mt-6 pt-4 border-t border-md-outline/10">
              <Button
                variant="danger"
                onClick={() => setShowRejectModal(true)}
              >
                <XCircle size={18} /> Reject Report
              </Button>

              <Button
                variant="filled"
                onClick={() => setShowApproveModal(true)}
              >
                <CheckCircle size={18} /> Approve Report
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
          FCR-SCS · Compensation Approval · Connected to Live Backend Service
        </div>
      </div>
    </>
  );
};
