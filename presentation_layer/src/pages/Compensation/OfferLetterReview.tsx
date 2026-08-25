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
  PENDING: "status-offer-pending",
  ACCEPTED: "status-offer-accepted",
  REJECTED: "status-offer-rejected",
  EXPIRED: "status-expired",
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
  const { user, isMember, isAdmin } = useRole();

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
          statusClass: statusClassMap[o.status] || "status-offer-pending",
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

  const handleAccept = async (force?: boolean) => {
    if (!offer) return;
    if (!isMember && !isAdmin) {
      alert("Only Displaced Community Members (Land Owners) and Administrators can accept this offer.");
      return;
    }

    if (!force) {
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
      setOffer((prev) => (prev ? { ...prev, status: "Accepted", statusClass: "status-offer-accepted" } : null));
      setShowObjectionPrompt(false);
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
    if (!isMember && !isAdmin) {
      alert("Only Displaced Community Members (Land Owners) and Administrators can perform this action.");
      return;
    }
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
    if (!isMember && !isAdmin) {
      alert("Only Displaced Community Members (Land Owners) and Administrators can reject this offer.");
      return;
    }

    setSubmitting(true);
    try {
      await compensationApi.rejectOffer(offer.id, reason);
      setOffer((prev) => (prev ? { ...prev, status: "Rejected", statusClass: "status-offer-rejected" } : null));
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
      <div className="main blur-shape-bg flex justify-center items-center min-h-[80vh]">
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <Loader2 size={32} className="inline animate-spin mb-2" />
          <div>Fetching offer letter details from backend...</div>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="main blur-shape-bg p-8">
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <h2 className="text-xl font-bold mb-2">Offer Letter Not Found</h2>
          <p style={{ color: "var(--md-on-surface-variant)", marginBottom: "20px" }}>
            No offer letter selected or valid ID provided.
          </p>
          <Button variant="filled" onClick={() => navigate("/admin/compensation/offer")}>
            Back to Offer Letters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Active Objection Warning Modal */}
      <Modal
        isOpen={Boolean(showObjectionPrompt && activeObjection)}
        onClose={() => setShowObjectionPrompt(false)}
        title="Active Objection Detected"
        subtitle="Cannot accept offer while an active Form N objection is under review"
        footer={
          <>
            <Button variant="text" onClick={() => setShowObjectionPrompt(false)}>
              Keep Objection
            </Button>
            <Button
              variant="filled"
              onClick={handleWithdrawObjectionAndAccept}
              isLoading={withdrawingObjection}
            >
              Withdraw Objection & Accept Offer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm text-md-on-surface-variant">
            You currently have a pending objection submitted for this case:
          </p>
          <div className="p-3 bg-md-surface-container rounded-xl text-xs flex flex-col gap-1 border border-md-outline/10">
            <div>
              <span className="text-md-on-surface-variant">Objection ID: </span>
              <strong className="font-mono text-md-primary">{activeObjection?.objectionId || activeObjection?.id}</strong>
            </div>
            <div>
              <span className="text-md-on-surface-variant">Reason: </span>
              <em>"{activeObjection?.objectionReason || activeObjection?.reason || "Disagreement on valuation component"}"</em>
            </div>
            {activeObjection?.requestedAmount && (
              <div>
                <span className="text-md-on-surface-variant">Requested Amount: </span>
                <strong className="text-md-primary">RM {Number(activeObjection.requestedAmount).toLocaleString("en-MY")}</strong>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Offer"
        subtitle="Formal rejection recording"
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
              Confirm Reject
            </Button>
          </>
        }
      >
        <div>
          <Textarea
            label="Reason for Rejection *"
            id="reason"
            rows={3}
            placeholder="State the reason for rejecting this offer..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError("");
            }}
          />
          {reasonError && <div className="text-xs text-md-error pl-2 mt-1">{reasonError}</div>}
        </div>
      </Modal>

      <div className="main blur-shape-bg">
        <div className="topbar" style={{ marginBottom: "20px" }}>
          <div className="topbar-left">
            <h1 style={{ marginBottom: 0 }}>Form H — Notice of Award & Offer</h1>
            <div className="sub">
              Formal Compensation Offer (Ref: {offer.offerReferenceNo})
            </div>
          </div>
          <div className="topbar-right flex items-center gap-3">
            <Button variant="outlined" size="sm" onClick={() => navigate("/admin/compensation/offer")}>
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

        <div className="case-summary bg-md-surface-container p-5 rounded-2xl mb-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="case-id font-mono text-xs">Ref No: {offer.offerReferenceNo}</span>
              <CopyButton value={offer.offerReferenceNo} />
            </div>
            <h2 className="case-title text-lg font-bold my-1">{offer.caseTitle}</h2>
            <div className="text-xs text-md-on-surface-variant">
              Land Owner: <strong>{offer.ownerName}</strong> ({offer.ownerIc}) · Land Title: <strong>{offer.landTitle}</strong>
            </div>
          </div>
          <span className={`status-badge-lg ${offer.statusClass}`}>
            <span className="dot"></span> {offer.status}
          </span>
        </div>

        <div className="report-card bg-md-surface-container p-6 rounded-2xl mb-6">
          <h3 className="text-base font-bold mb-4">Award Details</h3>

          <div className="p-5 bg-md-primary/5 rounded-xl mb-6">
            <span className="label text-xs text-md-on-surface-variant font-semibold">Total Award Amount:</span>
            <div className="text-2xl font-bold text-md-primary mt-1">
              {formatCurrency(offer.totalCompensation)}
            </div>
            <div className="text-xs text-md-on-surface-variant mt-1">
              Issued: {offer.issueDate} · Expires: {offer.expiryDate}
            </div>
          </div>

          <div className="mb-6">
            <span className="label text-xs text-md-on-surface-variant font-semibold">Terms & Payment Conditions:</span>
            <p className="mt-1 text-sm text-md-on-surface leading-relaxed">{offer.paymentConditions}</p>
          </div>

          {(isMember || isAdmin) ? (
            <div className="flex gap-3 justify-end flex-wrap items-center pt-4 border-t border-md-outline/10">
              <Button
                variant="outlined"
                onClick={() => navigate(`/admin/compensation/objection/create?offerId=${offer.id}`)}
              >
                <Lucide.AlertCircle size={18} /> Submit Objection (Form N)
              </Button>
              {offer.status === "Pending" && (
                <>
                  <Button variant="danger" onClick={() => setShowRejectModal(true)} isLoading={submitting}>
                    <XCircle size={18} /> Reject Offer
                  </Button>
                  <Button variant="filled" onClick={() => handleAccept()} isLoading={submitting}>
                    <CheckCircle size={18} /> Accept Offer
                  </Button>
                </>
              )}
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
          FCR-SCS · Form H Award Notice · Connected to Live Backend Service
        </div>
      </div>
    </>
  );
};
