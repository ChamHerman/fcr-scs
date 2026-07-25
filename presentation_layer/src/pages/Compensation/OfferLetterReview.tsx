import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, X } from "lucide-react";
import "../../style.css";
import "./offer_letter.css";


type OfferDetail = {
  id: string;
  caseId: string;
  caseTitle: string;
  ownerName: string;
  ownerIc: string;
  ownerAddress: string;
  ownerPhone: string;
  landTitle: string;
  landAddress: string;
  issueDate: string;
  expiryDate: string;
  status: "Pending" | "Accepted" | "Rejected" | "Expired";
  statusClass: "pending" | "accepted" | "rejected" | "expired";
  components: {
    landValue: number;
    buildingValue: number;
    cropValue: number;
    businessDisruption: number;
    disturbanceCompensation: number;
    relocationAllowance: number;
    otherEligible: number;
  };
  totalCompensation: number;
  paymentConditions: string;
};

const mockOfferDetail: OfferDetail = {
  id: "OL-2026-001",
  caseId: "LAC-2026-07-0024",
  caseTitle: "Kampung Baru Land Acquisition",
  ownerName: "Ahmad Bin Abdullah",
  ownerIc: "750101-10-5678",
  ownerAddress: "No. 45, Jalan Kampung Baru, 50300 Kuala Lumpur",
  ownerPhone: "012-3456789",
  landTitle: "PN 12345",
  landAddress: "Lot 5678, Kampung Baru, Kuala Lumpur",
  issueDate: "20 Jul 2026",
  expiryDate: "03 Aug 2026",
  status: "Pending",
  statusClass: "pending",
  components: {
    landValue: 1500000,
    buildingValue: 200000,
    cropValue: 50000,
    businessDisruption: 100000,
    disturbanceCompensation: 150000,
    relocationAllowance: 80000,
    otherEligible: 20000,
  },
  totalCompensation: 2200000,
  paymentConditions:
    "Payment will be made within 30 days upon acceptance of this offer. Compensation will be transferred to the registered bank account provided during case registration.",
};

const formatCurrency = (val: number) => `RM ${val.toLocaleString()}`;

export const OfferLetterDetail: React.FC = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionPerformed, setActionPerformed] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setOffer(mockOfferDetail);
      setLoading(false);
    }, 500);
  }, [offerId]);

  const handleAccept = () => {
    if (offer?.status !== "Pending") return;
    setSubmitting(true);
    setTimeout(() => {
      setOffer((prev) =>
        prev ? { ...prev, status: "Accepted", statusClass: "accepted" } : null,
      );
      setActionPerformed(true);
      setSubmitting(false);
      alert(
        "Offer accepted successfully. You will be contacted for the next steps.",
      );
    }, 1000);
  };

  const openRejectModal = () => {
    if (offer?.status !== "Pending") return;
    setShowRejectModal(true);
    setReason("");
    setReasonError("");
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
  };

  const handleRejectSubmit = () => {
    if (!reason.trim()) {
      setReasonError("Please provide a reason for rejection.");
      return;
    }
    setReasonError("");
    setSubmitting(true);
    setTimeout(() => {
      setOffer((prev) =>
        prev ? { ...prev, status: "Rejected", statusClass: "rejected" } : null,
      );
      setActionPerformed(true);
      setSubmitting(false);
      setShowRejectModal(false);
      alert("Offer rejected. The authority will be notified.");
    }, 1000);
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen"
        style={{
          background: "#f8f5fa",
          color: "var(--md-on-surface)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}
        >
          Loading offer letter...
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div
        className="flex min-h-screen"
        style={{
          background: "#f8f5fa",
          color: "var(--md-on-surface)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}
        >
          Offer letter not found.
        </div>
      </div>
    );
  }

  const isPending = offer.status === "Pending";
  const isActionable = isPending && !actionPerformed;

  return (
    <>
      {showRejectModal && (
        <div className="reject-modal-overlay" onClick={closeRejectModal}>
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Offer</h3>
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
                rows={4}
                placeholder="Please explain why you are rejecting this offer..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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
      )}

      <div
        className="flex min-h-screen"
        style={{ background: "#f8f5fa", color: "var(--md-on-surface)" }}
      >
        

        <main className="main blur-shape-bg">
          <div className="offer-detail">
            <div className="header-card">
              <div className="left">
                <div className="offer-id">{offer.id}</div>
                <div className="title">{offer.caseTitle}</div>
                <div className="meta">
                  <span><Lucide.FolderOpen size={16} className="inline mr-1" /> {offer.caseId}</span>
                  <span><Lucide.User size={16} className="inline mr-1" /> {offer.ownerName}</span>
                  <span><Lucide.Calendar size={16} className="inline mr-1" /> Issued: {offer.issueDate}</span>
                  <span><Lucide.Clock size={16} className="inline mr-1" /> Expires: {offer.expiryDate}</span>
                </div>
              </div>
              <span className={`status-badge-lg ${offer.statusClass}`}>
                {offer.status === "Pending" ? <><Lucide.Hourglass size={16} className="inline mr-1" /> </> : ""}
                {offer.status}
              </span>
            </div>

            <div className="content-card">
              <div className="section-title"><Lucide.ClipboardList size={16} className="inline mr-1" /> Offer Details</div>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Land Title</span>
                  <span className="value">{offer.landTitle}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Land Address</span>
                  <span className="value">{offer.landAddress}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Owner Name</span>
                  <span className="value">{offer.ownerName}</span>
                </div>
                <div className="detail-item">
                  <span className="label">IC Number</span>
                  <span className="value">{offer.ownerIc}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="label">Address</span>
                  <span className="value">{offer.ownerAddress}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Phone</span>
                  <span className="value">{offer.ownerPhone}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Issue Date</span>
                  <span className="value">{offer.issueDate}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Expiry Date</span>
                  <span className="value">{offer.expiryDate}</span>
                </div>
              </div>

              <div style={{ marginTop: "20px" }}>
                <div className="section-title"><Lucide.DollarSign size={16} className="inline mr-1" /> Compensation Breakdown</div>
                <div className="comp-breakdown">
                  <div className="comp-row">
                    <span className="label">Land Value</span>
                    <span className="value">
                      {formatCurrency(offer.components.landValue)}
                    </span>
                  </div>
                  <div className="comp-row">
                    <span className="label">Building/Structure Value</span>
                    <span className="value">
                      {formatCurrency(offer.components.buildingValue)}
                    </span>
                  </div>
                  <div className="comp-row">
                    <span className="label">Crop/Plantation Value</span>
                    <span className="value">
                      {formatCurrency(offer.components.cropValue)}
                    </span>
                  </div>
                  <div className="comp-row">
                    <span className="label">Business Disruption</span>
                    <span className="value">
                      {formatCurrency(offer.components.businessDisruption)}
                    </span>
                  </div>
                  <div className="comp-row">
                    <span className="label">Disturbance Compensation</span>
                    <span className="value">
                      {formatCurrency(offer.components.disturbanceCompensation)}
                    </span>
                  </div>
                  <div className="comp-row">
                    <span className="label">Relocation Allowance</span>
                    <span className="value">
                      {formatCurrency(offer.components.relocationAllowance)}
                    </span>
                  </div>
                  <div className="comp-row">
                    <span className="label">Other Eligible Items</span>
                    <span className="value">
                      {formatCurrency(offer.components.otherEligible)}
                    </span>
                  </div>
                  <div className="comp-row">
                    <span className="label">Total Compensation</span>
                    <span className="value">
                      {formatCurrency(offer.totalCompensation)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <div className="section-title"><Lucide.Pin size={16} className="inline mr-1" /> Payment Conditions</div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--md-on-surface-variant)",
                    lineHeight: "1.6",
                  }}
                >
                  {offer.paymentConditions}
                </p>
              </div>

              <div className="action-bar">
                {!isPending && !actionPerformed ? (
                  <span className="btn-disabled" style={{ marginLeft: "auto" }}>
                    {offer.status === "Accepted" && <><Lucide.CheckCircle size={16} className="inline mr-1" /> Already Accepted</>}
                    {offer.status === "Rejected" && <><Lucide.XCircle size={16} className="inline mr-1" /> Already Rejected</>}
                    {offer.status === "Expired" && "Offer Expired"}
                  </span>
                ) : isPending && actionPerformed ? (
                  <span className="btn-disabled" style={{ marginLeft: "auto" }}>
                    {offer.status === "Accepted"
                      ? <><Lucide.CheckCircle size={16} className="inline mr-1" /> Accepted</>
                      : <><Lucide.XCircle size={16} className="inline mr-1" /> Rejected</>}
                  </span>
                ) : (
                  <>
                    <button
                      className="btn-accept"
                      onClick={handleAccept}
                      disabled={submitting}
                    >
                      <CheckCircle size={18} />{" "}
                      {submitting ? "Processing..." : "Accept Offer"}
                    </button>
                    <button
                      className="btn-reject"
                      onClick={openRejectModal}
                      disabled={submitting}
                    >
                      <XCircle size={18} /> Reject Offer
                    </button>
                  </>
                )}
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
              FCR-SCS · Offer Letter · For Displaced Community Members
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
