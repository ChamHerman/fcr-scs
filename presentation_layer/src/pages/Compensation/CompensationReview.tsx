import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
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

import {
  COMPENSATION_STATUS_CLASS_MAP as statusClassMap,
  COMPENSATION_STATUS_LABEL_MAP as statusLabelMap,
} from "../../constants";

export const CompensationApproval: React.FC = () => {
  const { reportId: paramReportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userId, isGovAdmin, isAdmin } = useRole();
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

        const formatted: CompensationDetail = {
          id: rep.reportId,
          caseId: rep.caseId,
          caseTitle: c?.caseTitle || "—",
          owner: ownerInfo?.name || "—",
          ownerIc: ownerInfo?.nric || ownerInfo?.icNumber || "—",
          ownerAddress: c?.landParcel?.address || ownerInfo?.address || "—",
          ownerPhone: ownerInfo?.contact || "—",
          landTitle: c?.landParcel?.landTitleNo || "—",
          project: c?.project?.projectName || "—",
          status: statusLabelMap[rep.reportStatus] || rep.reportStatus,
          statusClass: statusClassMap[rep.reportStatus] || "status-pending-comp",
          generatedDate: new Date(rep.generatedDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          totalAmount: Number(rep.totalCompensation || 0),
          components: {
            landValue: Number(comps.landValue || 0),
            buildingValue: Number(comps.buildingValue || 0),
            cropValue: Number(comps.cropValue || 0),
            businessDisruption: Number(comps.businessDisruption || 0),
            disturbanceCompensation: Number(comps.disturbanceCompensation || 0),
            relocationAllowance: Number(comps.relocationAllowance || 0),
            otherEligible: Number(comps.otherEligible || 0),
          },
          valuer: vr?.valuer?.name || "Valuer",
          valuationMethod: vr?.valuationMethod || "Comparison Method",
          marketValue: Number(vr?.marketValue || 0),
          recommendedCompensation: Number(vr?.recommendedCompensation || 0),
          remarks: rep.notes || vr?.remarks || "No remarks provided.",
          offerLetter: generatedOffer
            ? {
                id: generatedOffer.offerId,
                offerReferenceNo: generatedOffer.offerReferenceNo,
                offerAmount: Number(generatedOffer.offerAmount || rep.totalCompensation),
                status: generatedOffer.status,
              }
            : undefined,
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
        type: 'error',
        title: 'Access Denied',
        message: 'Only Government Administrators can approve compensation reports.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await compensationApi.approveReport(report.id, userId);
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
      notify({
        type: 'error',
        title: 'Approval Failed',
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
        type: 'error',
        title: 'Access Denied',
        message: 'Only Government Administrators can reject compensation reports.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await compensationApi.rejectReport(report.id, rejectReason, userId);
      setShowRejectModal(false);
      navigate("/admin/compensation/report");
    } catch (err: any) {
      console.error("Reject failed:", err);
      notify({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message,
      });
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
          <div className="topbar-right flex items-center gap-3">
            <Button variant="outlined" size="sm" onClick={() => navigate("/admin/compensation/report")}>
              <ArrowLeft size={16} /> Back
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

          {report.status === "Pending Approval" && canApproveOrReject ? (
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
          ) : null}
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
