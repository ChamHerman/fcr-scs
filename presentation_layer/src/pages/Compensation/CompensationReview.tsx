import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, X } from "lucide-react";
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
};

const mockDetail: CompensationDetail = {
  id: "CMP-001",
  caseId: "LAC-2026-07-0024",
  caseTitle: "Kampung Baru Land Acquisition",
  owner: "Ahmad Bin Abdullah",
  ownerIc: "750101-10-5678",
  ownerAddress: "No. 45, Jalan Kampung Baru, 50300 Kuala Lumpur",
  ownerPhone: "012-3456789",
  landTitle: "PN 12345",
  project: "KL Sentral Redevelopment",
  status: "Pending Approval",
  statusClass: "pending",
  generatedDate: "24 Jul 2026",
  totalAmount: 2200000,
  components: {
    landValue: 1500000,
    buildingValue: 200000,
    cropValue: 50000,
    businessDisruption: 100000,
    disturbanceCompensation: 150000,
    relocationAllowance: 100000,
    otherEligible: 100000,
  },
  valuer: "Ahmad Faizal",
  valuationMethod: "Comparison Method",
  marketValue: 1800000,
  recommendedCompensation: 2200000,
  remarks:
    "Property is located in a prime area with good infrastructure. Comparable sales indicate a market value of approximately RM 1.8M. Considering the size and location, recommended compensation is RM 2.2M to account for disturbance and relocation costs.",
};

export const CompensationApproval: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<CompensationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setReport(mockDetail);
      setLoading(false);
    }, 500);
  }, [reportId]);

  const handleApprove = () => {
    if (
      window.confirm(
        "Approve this compensation report? This will update the case status.",
      )
    ) {
      alert(
        `Report ${report?.id} approved.\nCase status updated to "Compensation Approved".\n\nNotification sent to assigned officer.`,
      );
      navigate("/compensation/report");
    }
  };

  const openRejectModal = () => {
    setShowRejectModal(true);
    setRejectReason("");
    setReasonError("");
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      setReasonError("Please provide a reason for rejection.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      alert(
        `<Lucide.XCircle size={16} className="inline mr-1" /> Report ${report?.id} rejected.\nReason: ${rejectReason}\n\nCase status updated to "Compensation Rejected".`,
      );
      setSubmitting(false);
      setShowRejectModal(false);
      navigate("/compensation/report");
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

  const formatCurrency = (val: number) =>
    `RM ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      {showRejectModal && (
        <div className="compensation-approval">
          <div className="reject-modal-overlay" onClick={closeRejectModal}>
            <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Reject Compensation Report</h3>
                <button className="close-btn" onClick={closeRejectModal}>
                  <X size={22} />
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="rejectReason">
                  Reason for Rejection <span className="required">*</span>
                </label>
                <textarea
                  id="rejectReason"
                  rows={3}
                  placeholder="Enter the reason for rejecting this compensation report..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className={reasonError ? "error" : ""}
                />
                {reasonError && <div className="error-text">{reasonError}</div>}
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
        </div>
      )}

      <div
        className="flex min-h-screen"
        style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}
      >
        

        <main className="main blur-shape-bg">
          <div className="compensation-approval">
            <div className="topbar" style={{ marginBottom: "16px" }}>
              <div className="topbar-left">
                <h1 style={{ marginBottom: 0 }}>Compensation Approval</h1>
                <div className="sub">
                  Review and take action on compensation reports
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
                  <span><Lucide.User size={16} className="inline mr-1" /> {report.owner}</span>
                  <span><Lucide.Tag size={16} className="inline mr-1" /> {report.landTitle}</span>
                  <span><Lucide.Calendar size={16} className="inline mr-1" /> {report.generatedDate}</span>
                </div>
              </div>
              <span className="status-badge-lg"><Lucide.Hourglass size={16} className="inline mr-1" /> {report.status}</span>
            </div>

            <div className="report-card">
              <div className="section-title"><Lucide.ClipboardList size={16} className="inline mr-1" /> Case & Owner Information</div>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Project</span>
                  <span className="value">{report.project}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Owner</span>
                  <span className="value">{report.owner}</span>
                </div>
                <div className="detail-item">
                  <span className="label">IC Number</span>
                  <span className="value">{report.ownerIc}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Phone</span>
                  <span className="value">{report.ownerPhone}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="label">Address</span>
                  <span className="value">{report.ownerAddress}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Land Title</span>
                  <span className="value">{report.landTitle}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Valuer</span>
                  <span className="value">{report.valuer}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Valuation Method</span>
                  <span className="value">{report.valuationMethod}</span>
                </div>
              </div>
            </div>

            <div className="report-card">
              <div className="section-title"><Lucide.DollarSign size={16} className="inline mr-1" /> Compensation Breakdown</div>
              <div className="comp-breakdown">
                <div className="row">
                  <span className="lbl">Land Value</span>
                  <span className="val">
                    {formatCurrency(report.components.landValue)}
                  </span>
                </div>
                <div className="row">
                  <span className="lbl">Building/Structure Value</span>
                  <span className="val">
                    {formatCurrency(report.components.buildingValue)}
                  </span>
                </div>
                <div className="row">
                  <span className="lbl">Crop/Plantation Value</span>
                  <span className="val">
                    {formatCurrency(report.components.cropValue)}
                  </span>
                </div>
                <div className="row">
                  <span className="lbl">Business Disruption</span>
                  <span className="val">
                    {formatCurrency(report.components.businessDisruption)}
                  </span>
                </div>
                <div className="row">
                  <span className="lbl">Disturbance Compensation</span>
                  <span className="val">
                    {formatCurrency(report.components.disturbanceCompensation)}
                  </span>
                </div>
                <div className="row">
                  <span className="lbl">Relocation Allowance</span>
                  <span className="val">
                    {formatCurrency(report.components.relocationAllowance)}
                  </span>
                </div>
                <div className="row">
                  <span className="lbl">Other Eligible</span>
                  <span className="val">
                    {formatCurrency(report.components.otherEligible)}
                  </span>
                </div>
                <div className="row" style={{ borderBottom: "none" }}>
                  <span className="lbl">Market Value (reference)</span>
                  <span className="val">
                    {formatCurrency(report.marketValue)}
                  </span>
                </div>
                <div className="total">
                  <span>Total Compensation</span>
                  <span>{formatCurrency(report.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="report-card">
              <div className="section-title"><Lucide.FileEdit size={16} className="inline mr-1" /> Remarks</div>
              <p
                style={{
                  margin: 0,
                  lineHeight: 1.6,
                  color: "var(--md-on-surface)",
                }}
              >
                {report.remarks}
              </p>
            </div>

            <div className="action-bar">
              <button className="btn-approve" onClick={handleApprove}>
                <CheckCircle size={18} /> Approve
              </button>
              <button className="btn-reject" onClick={openRejectModal}>
                <XCircle size={18} /> Reject
              </button>
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
              FCR-SCS · Compensation Approval · For Administrators
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
