import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, X, ArrowLeft, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { useModalPopIn } from "../../hooks/useModalPopIn";
import "../../style.css";
import "./compensation.css";


type OfferDetail = {
  id: string;
  offerReferenceNo: string;
  caseId: string;
  caseTitle: string;
  ownerName: string;
  ownerIc: string;
  ownerAddress: string;
  ownerPhone: string;
  landTitle: string;
  issueDate: string;
  expiryDate: string;
  status: string;
  statusClass: string;
  totalCompensation: number;
  paymentConditions: string;
};

const statusClassMap: Record<string, string> = {
  PENDING: "pending",
  ACCEPTED: "approved",
  REJECTED: "rejected",
  EXPIRED: "closed",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export const OfferLetterDetail: React.FC = () => {
  const { offerId: paramOfferId } = useParams<{ offerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const activeOfferId = location.state?.offerId || paramOfferId;

  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Active Objection Check state
  const [activeObjection, setActiveObjection] = useState<any | null>(null);
  const [showObjectionPrompt, setShowObjectionPrompt] = useState(false);
  const [withdrawingObjection, setWithdrawingObjection] = useState(false);

  useEffect(() => {
    async function fetchOffer() {
      if (!activeOfferId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await compensationApi.getOfferLetterById(activeOfferId);
        const o = res.offerLetter;

        const formatted: OfferDetail = {
          id: o.offerId,
          offerReferenceNo: o.offerReferenceNo,
          caseId: o.caseId,
          caseTitle: o.acquisitionCase?.caseTitle || "—",
          ownerName: o.landOwnership?.landOwner?.name || "—",
          ownerIc: o.landOwnership?.landOwner?.nric || "—",
          ownerAddress: o.landOwnership?.landOwner?.address || "—",
          ownerPhone: o.landOwnership?.landOwner?.contact || "—",
          landTitle: o.landOwnership?.landParcel?.landTitleNo || "—",
          issueDate: o.offerDate
            ? new Date(o.offerDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          expiryDate: o.expiryDate
            ? new Date(o.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          status: statusLabelMap[o.status] || o.status,
          statusClass: statusClassMap[o.status] || "pending",
          totalCompensation: Number(o.offerAmount || 0),
          paymentConditions:
            "Payment will be initiated upon formal acceptance. Funds will be transferred directly to the registered beneficiary bank account.",
        };

        setOffer(formatted);
      } catch (err: any) {
        console.error("Failed to load offer letter:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOffer();
  }, [activeOfferId]);

  const handleAccept = async (force: boolean = false) => {
    if (!offer) return;

    if (!force) {
      // Check if there are any active (unresolved) objections for this offer/case
      try {
        const objRes = await compensationApi.getAllObjections({ search: offer.id });
        const list = objRes.objections || [];
        const pending = list.find((o: any) => o.status === "SUBMITTED" || o.status === "UNDER_REVIEW");

        if (pending) {
          setActiveObjection(pending);
          setShowObjectionPrompt(true);
          return;
        }
      } catch (e) {
        console.warn("Could not pre-check objections:", e);
      }
    }

    setSubmitting(true);
    try {
      await compensationApi.acceptOffer(offer.id, undefined, force);
      setOffer((prev) => (prev ? { ...prev, status: "Accepted", statusClass: "approved" } : null));
      setShowObjectionPrompt(false);
      alert("Offer Letter Accepted Successfully!\n\nCase status updated to 'PAYMENT_IN_PROGRESS'.");
      navigate("/admin/compensation/offer");
    } catch (err: any) {
      console.error("Accept failed:", err);
      if (err.code === "ACTIVE_OBJECTION_EXISTS" || err.activeObjection) {
        setActiveObjection(err.activeObjection || { objectionId: "OBJ-PENDING", objectionReason: "Active objection exists" });
        setShowObjectionPrompt(true);
      } else {
        alert(`Accept Failed: ${err.message || err}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawObjectionAndAccept = async () => {
    if (!activeObjection || !offer) return;
    setWithdrawingObjection(true);
    try {
      if (activeObjection.objectionId) {
        await compensationApi.deleteObjection(activeObjection.objectionId);
      }
      setShowObjectionPrompt(false);
      await handleAccept(true);
    } catch (err: any) {
      console.error("Failed to withdraw objection:", err);
      alert(`Could not withdraw objection: ${err.message || err}`);
    } finally {
      setWithdrawingObjection(false);
    }
  };


  const handleRejectSubmit = async () => {
    if (!reason.trim()) {
      setReasonError("Reason is required.");
      return;
    }
    if (!offer) return;

    setSubmitting(true);
    try {
      await compensationApi.rejectOffer(offer.id, reason);
      setOffer((prev) => (prev ? { ...prev, status: "Rejected", statusClass: "rejected" } : null));
      alert("Offer Letter Rejected.\n\nCase status updated to 'OFFER_REJECTED'.");
      setShowRejectModal(false);
      navigate("/admin/compensation/offer");
    } catch (err: any) {
      console.error("Reject failed:", err);
      alert(`Reject Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => `RM ${val.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="main blur-shape-bg" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <Loader2 size={32} className="inline animate-spin mb-2" />
          <div>Fetching offer letter details from backend...</div>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="main blur-shape-bg">
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <h2>Offer Letter Not Found</h2>
          <p style={{ color: "var(--md-on-surface-variant)", marginBottom: "20px" }}>
            No offer letter selected or valid ID provided.
          </p>
          <button className="btn-primary" onClick={() => navigate("/admin/compensation/offer")}>
            Back to Offer Letters
          </button>
        </div>
      </div>
    );
  }

  const promptModalRef = useModalPopIn(showObjectionPrompt);
  const rejectModalRef = useModalPopIn(showRejectModal);

  return (
    <>
      {/* Active Objection Warning Modal */}
      {showObjectionPrompt && activeObjection &&
        createPortal(
          <div className="reject-modal-overlay" onClick={() => setShowObjectionPrompt(false)}>
            <div ref={promptModalRef} className="reject-modal" style={{ maxWidth: "580px", borderRadius: "28px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ color: "#d32f2f", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Lucide.AlertTriangle size={22} /> Active Objection Detected
                </h3>
                <button className="close-btn" onClick={() => setShowObjectionPrompt(false)}>
                  <X size={22} />
                </button>
              </div>
              <div style={{ padding: "12px 0", color: "var(--md-on-surface)" }}>
                <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.5" }}>
                  An active formal objection (Form N) is currently linked to this case/offer letter. You must review or withdraw the objection before accepting this offer.
                </p>
                <div style={{ background: "var(--md-surface-container-low)", padding: "14px", borderRadius: "12px", fontSize: "13px" }}>
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    Objection ID: <span style={{ color: "var(--md-primary)" }}>{(activeObjection.objectionId || activeObjection.id || "").slice(0, 8)}...</span>
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    Reason: <em>"{activeObjection.objectionReason || activeObjection.reason || "Disagreement on valuation component"}"</em>
                  </div>
                  {activeObjection.requestedAmount && (
                    <div>
                      Requested Amount: <strong style={{ color: "var(--md-primary)" }}>RM {Number(activeObjection.requestedAmount).toLocaleString("en-MY")}</strong>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <button
                  className="btn-cancel"
                  style={{ background: "#d32f2f", color: "#ffffff", border: "none" }}
                  onClick={handleWithdrawObjectionAndAccept}
                  disabled={withdrawingObjection}
                >
                  {withdrawingObjection ? "Withdrawing..." : "Withdraw Objection & Accept"}
                </button>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    className="btn-cancel"
                    onClick={() => navigate(`/admin/compensation/objection/review/${activeObjection.objectionId || activeObjection.id}`)}
                  >
                    Review Objection
                  </button>
                  <button className="btn-submit" onClick={() => setShowObjectionPrompt(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showRejectModal &&
        createPortal(
          <div className="reject-modal-overlay" onClick={() => setShowRejectModal(false)}>
            <div ref={rejectModalRef} className="reject-modal" style={{ borderRadius: "28px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Reject Offer</h3>
                <button className="close-btn" onClick={() => setShowRejectModal(false)}>
                  <X size={22} />
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="reason">Reason for Rejection *</label>
                <textarea
                  id="reason"
                  rows={3}
                  placeholder="State the reason for rejecting this offer..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {reasonError && <div className="error-text">{reasonError}</div>}
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button className="btn-submit" onClick={handleRejectSubmit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}



      <div className="main blur-shape-bg">
        <div className="topbar" style={{ marginBottom: "20px" }}>
          <div className="topbar-left">
            <h1 style={{ marginBottom: 0 }}>Form H — Notice of Award & Offer</h1>
            <div className="sub">
              Formal Compensation Offer (Ref: {offer.offerReferenceNo})
            </div>
          </div>
          <div className="topbar-right">
            <button className="btn-outline" onClick={() => navigate("/admin/compensation/offer")}>
              <ArrowLeft size={16} className="inline mr-1" /> Back
            </button>
          </div>
        </div>

        <div className="case-summary" style={{ background: "var(--md-surface-container)", padding: "20px", borderRadius: "16px", marginBottom: "24px" }}>
          <div>
            <span className="case-id" style={{ fontSize: "12px" }}>Ref No: {offer.offerReferenceNo}</span>
            <h2 className="case-title" style={{ fontSize: "20px", margin: "4px 0" }}>{offer.caseTitle}</h2>
            <div style={{ fontSize: "13px", color: "var(--md-on-surface-variant)" }}>
              Land Owner: <strong>{offer.ownerName}</strong> ({offer.ownerIc}) · Land Title: <strong>{offer.landTitle}</strong>
            </div>
          </div>
          <span className={`status-badge-lg ${offer.statusClass}`}>
            <span className="dot"></span> {offer.status}
          </span>
        </div>

        <div className="report-card" style={{ background: "var(--md-surface-container)", padding: "24px", borderRadius: "16px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Award Details</h3>

          <div style={{ padding: "20px", background: "rgba(99,102,241,0.08)", borderRadius: "12px", marginBottom: "24px" }}>
            <span className="label">Total Award Amount:</span>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--md-primary)" }}>
              {formatCurrency(offer.totalCompensation)}
            </div>
            <div style={{ fontSize: "13px", color: "var(--md-on-surface-variant)", marginTop: "4px" }}>
              Issued: {offer.issueDate} · Expires: {offer.expiryDate}
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <span className="label">Terms & Payment Conditions:</span>
            <p style={{ marginTop: "4px", fontSize: "14px", color: "var(--md-on-surface)" }}>{offer.paymentConditions}</p>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              className="btn-outline"
              onClick={() => navigate(`/admin/compensation/objection/create?offerId=${offer.id}`)}
              style={{ padding: "8px 20px" }}
            >
              <Lucide.AlertCircle size={18} className="inline mr-1" /> Submit Objection (Form N)
            </button>
            {offer.status === "Pending" && (
              <>
                <button className="btn-reject" onClick={() => setShowRejectModal(true)} disabled={submitting}>
                  <XCircle size={18} className="inline mr-1" /> Reject Offer
                </button>
                <button className="btn-accept" onClick={() => handleAccept()} disabled={submitting}>
                  <CheckCircle size={18} className="inline mr-1" /> Accept Offer
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
          FCR-SCS · Form H Award Notice · Connected to Live Backend Service
        </div>
      </div>
    </>
  );
};
