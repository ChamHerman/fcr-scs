import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  Clock,
  User,
  Users,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import "../../style.css";
import "./compensation.css";

export type OwnerApprovalStatus = {
  ownerId: string;
  name: string;
  nric: string;
  contact: string;
  address: string;
  status: "ACCEPTED" | "REJECTED" | "PENDING";
  remarks?: string;
  respondedAt?: string;
  respondedAtDate?: Date | null;
  isCurrentUser: boolean;
};

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
  remarks?: string;
  rawOffer: any;
  owners: OwnerApprovalStatus[];
  isMultiOwner: boolean;
  acceptedCount: number;
  totalOwners: number;
  hasRejectedOwner: boolean;
  acceptedAtDate?: Date | null;
  currentUserAcceptedAtDate?: Date | null;
  isWithinOneDay?: boolean;
  rejectedOwnerInfo: {
    name: string;
    nric: string;
    remarks?: string;
    respondedAt?: string;
  } | null;
  currentUserStatus: "ACCEPTED" | "REJECTED" | "PENDING" | null;
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
  const { user, isMember, isAdmin, isGovAdmin, isSysAdmin, isOfficer } = useRole();
  const canRespondToOffer = (isMember || isSysAdmin) && !isGovAdmin && !isOfficer;

  const activeOfferId = location.state?.offerId || paramOfferId;

  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAcceptConfirmModal, setShowAcceptConfirmModal] = useState(false);
  const [showCancelApprovalModal, setShowCancelApprovalModal] = useState(false);
  const [cancellingApproval, setCancellingApproval] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Active Objection Check state
  const [activeObjection, setActiveObjection] = useState<any | null>(null);
  const [showObjectionPrompt, setShowObjectionPrompt] = useState(false);
  const [withdrawingObjection, setWithdrawingObjection] = useState(false);

  const fetchOffer = useCallback(async () => {
    if (!activeOfferId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await compensationApi.getOfferLetterById(activeOfferId);
      const o = res.offerLetter;

      // Extract all owners from landParcel.ownerships
      const parcelOwners =
        o.acquisitionCase?.landParcel?.ownerships
          ?.map((ow: any) => ow.landOwner)
          .filter(Boolean) || [];
      const allOwners =
        parcelOwners.length > 0
          ? parcelOwners
          : o.landOwnership?.landOwner
          ? [o.landOwnership.landOwner]
          : [];

      const userIcClean = (user?.identificationNumber || "").replace(/[^a-zA-Z0-9]/g, "");

      const memberResponses: any[] = o.memberResponses || [];

      // Map each owner to their individual response
      const ownersList: OwnerApprovalStatus[] = allOwners.map((owner: any) => {
        const oIcClean = (owner.nric || "").replace(/[^a-zA-Z0-9]/g, "");
        const isCurrent =
          isMember && Boolean(userIcClean) && (oIcClean === userIcClean || owner.ownerId === user?.userId);

        const resp = memberResponses.find((r) => r.ownerId === owner.ownerId);

        let status: "ACCEPTED" | "REJECTED" | "PENDING" = "PENDING";
        if (resp) {
          status = resp.status === "ACCEPTED" ? "ACCEPTED" : resp.status === "REJECTED" ? "REJECTED" : "PENDING";
        } else if (o.status === "ACCEPTED" && allOwners.length === 1) {
          status = "ACCEPTED";
        } else if (o.status === "REJECTED" && allOwners.length === 1) {
          status = "REJECTED";
        }

        return {
          ownerId: owner.ownerId,
          name: owner.name,
          nric: owner.nric,
          contact: owner.contact || "—",
          address: owner.address || "—",
          status,
          remarks: resp?.remarks,
          respondedAt: resp?.respondedAt
            ? new Date(resp.respondedAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined,
          respondedAtDate: resp?.respondedAt ? new Date(resp.respondedAt) : null,
          isCurrentUser: isCurrent,
        };
      });

      const isMultiOwner = ownersList.length > 1;
      const acceptedCount = ownersList.filter((ow) => ow.status === "ACCEPTED").length;
      const rejectedOwner = ownersList.find((ow) => ow.status === "REJECTED");
      const hasRejectedOwner = Boolean(rejectedOwner || o.status === "REJECTED");

      const currentUserOwner = ownersList.find((ow) => ow.isCurrentUser);
      const currentUserStatus = currentUserOwner ? currentUserOwner.status : null;

      // 1-day grace period computation:
      const acceptedDate = isMultiOwner && currentUserOwner?.respondedAtDate
        ? currentUserOwner.respondedAtDate
        : o.acceptedAt
        ? new Date(o.acceptedAt)
        : null;

      const isWithinOneDay = acceptedDate
        ? (new Date().getTime() - acceptedDate.getTime()) <= (24 * 60 * 60 * 1000)
        : false;

      const ownerName =
        parcelOwners.length > 0
          ? parcelOwners.map((ow: any) => ow.name).join(", ")
          : o.landOwnership?.landOwner?.name || "—";
      const ownerIc =
        parcelOwners.length > 0
          ? parcelOwners.map((ow: any) => ow.nric).join(", ")
          : o.landOwnership?.landOwner?.nric || "—";
      const ownerAddress = o.landOwnership?.landOwner?.address || parcelOwners[0]?.address || "—";
      const ownerPhone =
        parcelOwners.length > 0
          ? parcelOwners.map((ow: any) => ow.contact).filter(Boolean).join(", ")
          : o.landOwnership?.landOwner?.contact || "—";

      const formatted: OfferDetail = {
        id: o.offerId,
        offerReferenceNo: o.offerReferenceNo,
        caseId: o.caseId,
        caseTitle: o.acquisitionCase?.caseTitle || "—",
        ownerName,
        ownerIc,
        ownerAddress,
        ownerPhone,
        landTitle:
          o.landOwnership?.landParcel?.landTitleNo ||
          o.acquisitionCase?.landParcel?.landTitleNo ||
          "—",
        issueDate: o.offerDate
          ? new Date(o.offerDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
        expiryDate: o.expiryDate
          ? new Date(o.expiryDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
        status: statusLabelMap[o.status] || o.status,
        statusClass: statusClassMap[o.status] || "status-offer-pending",
        totalCompensation: Number(o.offerAmount || 0),
        paymentConditions:
          "Payment will be initiated upon formal acceptance. Funds will be transferred directly to the registered beneficiary bank account.",
        remarks: o.remarks,
        rawOffer: o,
        owners: ownersList,
        isMultiOwner,
        acceptedCount,
        totalOwners: ownersList.length,
        hasRejectedOwner,
        acceptedAtDate: o.acceptedAt ? new Date(o.acceptedAt) : null,
        currentUserAcceptedAtDate: acceptedDate,
        isWithinOneDay,
        rejectedOwnerInfo: rejectedOwner
          ? {
              name: rejectedOwner.name,
              nric: rejectedOwner.nric,
              remarks: rejectedOwner.remarks || o.remarks,
              respondedAt: rejectedOwner.respondedAt,
            }
          : o.status === "REJECTED"
          ? {
              name: ownerName,
              nric: ownerIc,
              remarks: o.remarks,
              respondedAt: o.rejectedAt
                ? new Date(o.rejectedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : undefined,
            }
          : null,
        currentUserStatus,
      };

      setOffer(formatted);
    } catch (err: any) {
      console.error("Failed to load offer letter:", err);
    } finally {
      setLoading(false);
    }
  }, [activeOfferId, user?.identificationNumber, user?.userId, isMember]);

  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);

  const handleAcceptClick = () => {
    if (!offer) return;
    if (!canRespondToOffer) {
      alert(
        "Government Administrators and Officers cannot accept offer letters. Only land owners (Displaced Community Members) can accept this offer."
      );
      return;
    }
    setShowAcceptConfirmModal(true);
  };

  const handleConfirmAccept = async (force?: boolean) => {
    setShowAcceptConfirmModal(false);
    await handleAccept(force);
  };

  const handleAccept = async (force?: boolean) => {
    if (!offer) return;
    if (!canRespondToOffer) {
      alert(
        "Government Administrators and Officers cannot accept offer letters. Only land owners (Displaced Community Members) can accept this offer."
      );
      return;
    }

    if (!force) {
      try {
        const objRes = await compensationApi.getAllObjections({ search: offer.id });
        const list = objRes.objections || [];
        const pending = list.find((o: any) => o.status === "PENDING" || o.status === "Pending Review" || o.rawStatus === "PENDING");

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
      await compensationApi.acceptOffer(offer.id, undefined, force, {
        ownerNric: user?.identificationNumber,
        userId: user?.userId,
      });
      setShowObjectionPrompt(false);
      await fetchOffer();
    } catch (err: any) {
      console.error("Accept failed:", err);
      if (err.code === "ACTIVE_OBJECTION_EXISTS" || err.activeObjection) {
        setActiveObjection(
          err.activeObjection || {
            objectionId: "OBJ-PENDING",
            objectionReason: "Active objection exists",
          }
        );
        setShowObjectionPrompt(true);
      } else {
        alert(`Accept Failed: ${err.message || err}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAcceptanceSubmit = async () => {
    if (!offer) return;
    if (!canRespondToOffer) {
      alert("Only land owners (Displaced Community Members) can cancel offer approvals.");
      return;
    }

    setCancellingApproval(true);
    try {
      await compensationApi.cancelOfferAcceptance(offer.id, {
        ownerNric: user?.identificationNumber,
        userId: user?.userId,
      });
      setShowCancelApprovalModal(false);
      await fetchOffer();
      alert("Your approval has been cancelled. You can now re-evaluate or submit a Form N objection if needed.");
    } catch (err: any) {
      console.error("Cancel approval failed:", err);
      alert(`Cancellation failed: ${err.message || err}`);
    } finally {
      setCancellingApproval(false);
    }
  };

  const handleWithdrawObjectionAndAccept = async () => {
    if (!activeObjection || !offer) return;
    if (!canRespondToOffer) {
      alert("Only land owners (Displaced Community Members) can perform this action.");
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
    if (!canRespondToOffer) {
      alert(
        "Government Administrators and Officers cannot reject offer letters. Only land owners (Displaced Community Members) can reject this offer."
      );
      return;
    }

    setSubmitting(true);
    try {
      await compensationApi.rejectOffer(offer.id, reason, {
        ownerNric: user?.identificationNumber,
        userId: user?.userId,
      });
      setShowRejectModal(false);
      await fetchOffer();
    } catch (err: any) {
      console.error("Reject failed:", err);
      alert(`Reject Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    `RM ${val.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

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

  // Multi-owner action availability check for current member
  const currentMemberHasResponded =
    isMember && (offer.currentUserStatus === "ACCEPTED" || offer.currentUserStatus === "REJECTED");

  return (
    <>
      {/* Accept Confirmation Modal (1-Day Rule Notice) */}
      <Modal
        isOpen={showAcceptConfirmModal}
        onClose={() => setShowAcceptConfirmModal(false)}
        title="Confirm Formal Acceptance"
        subtitle="1-Day Grace Period Policy Notice"
        footer={
          <>
            <Button variant="text" onClick={() => setShowAcceptConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={() => handleConfirmAccept()}
              isLoading={submitting}
            >
              <CheckCircle size={16} /> Confirm & Accept Award
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2 text-sm text-md-on-surface-variant">
          <p>
            You are formally accepting the compensation award of{" "}
            <strong className="text-md-primary font-bold">{formatCurrency(offer.totalCompensation)}</strong>.
          </p>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center gap-2 mb-1.5 text-amber-700 dark:text-amber-300">
              <Lucide.AlertCircle size={18} /> Important: 1-Day Approval Policy
            </div>
            <p className="text-xs leading-relaxed">
              Once you confirm acceptance, you have a <strong>1-day (24-hour) window</strong> to cancel this approval if needed.
            </p>
            <p className="text-xs font-semibold mt-2 text-amber-800 dark:text-amber-200">
              After 1 day, your approval is permanently finalized. No further objections or changes will be permitted under the Land Acquisition Act.
            </p>
          </div>
        </div>
      </Modal>

      {/* Cancel Approval Modal */}
      <Modal
        isOpen={showCancelApprovalModal}
        onClose={() => setShowCancelApprovalModal(false)}
        title="Cancel Compensation Approval"
        subtitle="Withdraw your formal acceptance within the 1-day grace period"
        footer={
          <>
            <Button variant="text" onClick={() => setShowCancelApprovalModal(false)}>
              Keep Approved
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelAcceptanceSubmit}
              isLoading={cancellingApproval}
            >
              <XCircle size={16} /> Yes, Cancel Approval
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2 text-sm text-md-on-surface-variant">
          <p>
            Are you sure you want to cancel your previous acceptance of this compensation offer?
          </p>
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-xl text-xs text-blue-800 dark:text-blue-200">
            Cancelling your approval will reset your status to <strong>Pending</strong>, allowing you to re-evaluate the offer or submit a Form N objection.
          </div>
        </div>
      </Modal>

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
              <strong className="font-mono text-md-primary">
                {activeObjection?.objectionId || activeObjection?.id}
              </strong>
            </div>
            <div>
              <span className="text-md-on-surface-variant">Reason: </span>
              <em>
                "{activeObjection?.objectionReason || activeObjection?.reason || "Disagreement on valuation component"}"
              </em>
            </div>
            {activeObjection?.requestedAmount && (
              <div>
                <span className="text-md-on-surface-variant">Requested Amount: </span>
                <strong className="text-md-primary">
                  RM {Number(activeObjection.requestedAmount).toLocaleString("en-MY")}
                </strong>
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
            <Button variant="danger" onClick={handleRejectSubmit} isLoading={submitting}>
              Confirm Reject
            </Button>
          </>
        }
      >
        <div>
          <p className="text-xs text-md-on-surface-variant mb-3">
            {offer.isMultiOwner
              ? "Please note: If any co-owner rejects this offer, the case will immediately be marked as 'OFFER_REJECTED' for all parties."
              : "State the formal reason for rejecting this compensation offer."}
          </p>
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
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
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

        {/* Case Summary Header */}
        <div className="case-summary bg-md-surface-container p-5 rounded-2xl mb-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="case-id font-mono text-xs">Ref No: {offer.offerReferenceNo}</span>
              <CopyButton value={offer.offerReferenceNo} />
            </div>
            <h2 className="case-title text-lg font-bold my-1">{offer.caseTitle}</h2>
            <div className="text-xs text-md-on-surface-variant flex items-center gap-2 flex-wrap">
              <span>
                Land Owner{offer.isMultiOwner ? "s" : ""}: <strong>{offer.ownerName}</strong> ({offer.ownerIc})
              </span>
              <span>·</span>
              <span>
                Land Title: <strong>{offer.landTitle}</strong>
              </span>
              {offer.isMultiOwner && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-md-primary">
                    <Users size={13} /> {offer.totalOwners} Co-Owners
                  </span>
                </>
              )}
            </div>
          </div>
          <span className={`status-badge-lg ${offer.statusClass}`}>
            <span className="dot"></span> {offer.status}
          </span>
        </div>

        {/* Multi-Owner Rejection Notice Banner */}
        {offer.isMultiOwner && offer.hasRejectedOwner && offer.rejectedOwnerInfo && (
          <div className="p-4 rounded-2xl mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-start gap-3.5 shadow-sm">
            <XCircle size={24} className="shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-sm text-rose-600 dark:text-rose-400">
                Offer Rejected by {offer.rejectedOwnerInfo.name} ({offer.rejectedOwnerInfo.nric})
              </div>
              <p className="text-xs mt-1 text-md-on-surface-variant leading-relaxed">
                {offer.rejectedOwnerInfo.remarks ? (
                  <>
                    <strong>Reason:</strong> "{offer.rejectedOwnerInfo.remarks}"
                  </>
                ) : (
                  "A co-owner has rejected this compensation offer. The case has been marked as OFFER_REJECTED."
                )}
                {offer.rejectedOwnerInfo.respondedAt && (
                  <span className="ml-2 text-md-on-surface-variant/70">
                    · Recorded on {offer.rejectedOwnerInfo.respondedAt}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Multi-Owner All Accepted Banner */}
        {offer.isMultiOwner && offer.status === "Accepted" && (
          <div className="p-4 rounded-2xl mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-start gap-3.5 shadow-sm">
            <CheckCircle size={24} className="shrink-0 text-emerald-500 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                All Co-Owners Have Accepted
              </div>
              <p className="text-xs mt-1 text-md-on-surface-variant leading-relaxed">
                All {offer.totalOwners} registered co-owners have formally agreed to this award. The case status has progressed to <strong>OFFER_ACCEPTED</strong> and is ready for payment initiation.
              </p>
            </div>
          </div>
        )}

        {/* Multi-Owner Pending Banner for Current Member who Accepted */}
        {offer.isMultiOwner &&
          offer.status === "Pending" &&
          offer.currentUserStatus === "ACCEPTED" && (
            <div className="p-4 rounded-2xl mb-6 bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-200 flex items-start gap-3.5 shadow-sm">
              <FileCheck size={24} className="shrink-0 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-sm text-blue-600 dark:text-blue-400">
                  Your Acceptance Recorded
                </div>
                <p className="text-xs mt-1 text-md-on-surface-variant leading-relaxed">
                  You have accepted this compensation offer. Waiting for remaining {offer.totalOwners - offer.acceptedCount} co-owner(s) to accept before the case can proceed to payment.
                </p>
              </div>
            </div>
          )}

        {/* Revised Compensation Notice Banner */}
        {offer.remarks && (offer.remarks.includes("Objection") || offer.remarks.includes("revised") || offer.remarks.includes("Revised")) && (
          <div className="p-4 rounded-2xl mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3.5 shadow-sm">
            <Lucide.Sparkles size={24} className="shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-sm text-amber-700 dark:text-amber-300">
                Compensation Award Revised via Approved Form N Objection
              </div>
              <p className="text-xs mt-1 text-md-on-surface-variant leading-relaxed">
                The total compensation award has been updated to <strong>{formatCurrency(offer.totalCompensation)}</strong> following official Government Officer determination.
                All registered land owner(s) are required to review and formally approve this revised award notice.
              </p>
              <div className="text-[11px] text-md-on-surface-variant/80 mt-1 italic">
                Note: {offer.remarks}
              </div>
            </div>
          </div>
        )}

        {/* Award Details Card */}
        <div className="report-card bg-md-surface-container p-6 rounded-2xl mb-6">
          <h3 className="text-base font-bold mb-4">Award Details</h3>

          <div className="p-5 bg-md-primary/5 rounded-xl mb-6">
            <span className="label text-xs text-md-on-surface-variant font-semibold">
              Total Award Amount:
            </span>
            <div className="text-2xl font-bold text-md-primary mt-1">
              {formatCurrency(offer.totalCompensation)}
            </div>
            <div className="text-xs text-md-on-surface-variant mt-1">
              Issued: {offer.issueDate} · Expires: {offer.expiryDate}
            </div>
          </div>

          <div className="mb-6">
            <span className="label text-xs text-md-on-surface-variant font-semibold">
              Terms & Payment Conditions:
            </span>
            <p className="mt-1 text-sm text-md-on-surface leading-relaxed">
              {offer.paymentConditions}
            </p>
          </div>

          {/* Co-Owners Approval Section (Only for >1 owner) */}
          {offer.isMultiOwner && (
            <div className="mb-6 p-5 bg-md-surface-container-low rounded-xl border border-md-outline/10">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-md-on-surface flex items-center gap-2">
                    <Users size={16} className="text-md-primary" /> Co-Owners Approval Status
                  </h4>
                  <p className="text-xs text-md-on-surface-variant mt-0.5">
                    All {offer.totalOwners} registered co-owners must accept the offer before the case advances to payment with status "OFFER_ACCEPTED".
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-md-primary/10 text-md-primary font-mono">
                  {offer.acceptedCount}/{offer.totalOwners} Accepted
                </span>
              </div>

              <div className="divide-y divide-md-outline/10 border-t border-b border-md-outline/10">
                {offer.owners.map((ow, idx) => (
                  <div
                    key={ow.ownerId || idx}
                    className="py-3.5 flex justify-between items-center flex-wrap gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-md-surface-container-high flex items-center justify-center text-md-on-surface-variant">
                        <User size={15} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-md-on-surface flex items-center gap-2">
                          <span>{ow.name}</span>
                          {ow.isCurrentUser && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-md-primary text-white">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-md-on-surface-variant mt-0.5">
                          IC: <span className="font-mono">{ow.nric}</span> · Contact: {ow.contact}
                        </div>
                        {ow.status === "REJECTED" && ow.remarks && (
                          <div className="text-[11px] text-rose-500 mt-1 font-medium">
                            Rejection Reason: "{ow.remarks}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {ow.status === "ACCEPTED" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                          <CheckCircle size={14} /> Accepted
                          {ow.respondedAt ? ` (${ow.respondedAt})` : ""}
                        </span>
                      ) : ow.status === "REJECTED" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20">
                          <XCircle size={14} /> Rejected
                          {ow.respondedAt ? ` (${ow.respondedAt})` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
                          <Clock size={14} /> Awaiting Response
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {canRespondToOffer ? (
            <div className="flex gap-3 justify-end flex-wrap items-center pt-4 border-t border-md-outline/10">
              {/* If already accepted within 1 day, provide option to Cancel Approval */}
              {((offer.status === "Accepted" && (offer.isWithinOneDay || !offer.isMultiOwner && offer.isWithinOneDay)) ||
                (offer.isMultiOwner && offer.currentUserStatus === "ACCEPTED" && offer.isWithinOneDay)) && (
                <div className="flex items-center gap-3">
                  <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-medium">
                    <Clock size={13} className="inline mr-1 -mt-0.5" /> 1-Day Grace Period Active
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => setShowCancelApprovalModal(true)}
                    isLoading={cancellingApproval}
                  >
                    <XCircle size={16} /> Cancel Approval
                  </Button>
                </div>
              )}

              {/* Notice if accepted and 1-day period has passed */}
              {((offer.status === "Accepted" && !offer.isWithinOneDay) ||
                (offer.isMultiOwner && offer.currentUserStatus === "ACCEPTED" && !offer.isWithinOneDay)) && (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5">
                  <CheckCircle size={14} /> Formal approval finalized (1-day cancellation window has ended).
                </div>
              )}

              {/* Submit objection button: available when pending or within 1 day if not finalized */}
              {(offer.status === "Pending" || (offer.status !== "Accepted" && offer.status !== "Rejected")) && (
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/admin/compensation/objection/create?offerId=${offer.id}`)}
                >
                  <Lucide.AlertCircle size={18} /> Submit Objection (Form N)
                </Button>
              )}

              {offer.status === "Pending" && (
                <>
                  {offer.isMultiOwner && currentMemberHasResponded ? (
                    <div className="text-xs text-md-on-surface-variant font-medium italic">
                      Your response has been submitted ({offer.currentUserStatus}).
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="danger"
                        onClick={() => setShowRejectModal(true)}
                        isLoading={submitting}
                      >
                        <XCircle size={18} /> Reject Offer
                      </Button>
                      <Button variant="filled" onClick={handleAcceptClick} isLoading={submitting}>
                        <CheckCircle size={18} /> Accept Offer
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          ) : isGovAdmin ? (
            <div className="mt-4 p-4 rounded-xl bg-md-surface-container-low border border-md-outline/10 text-xs text-md-on-surface-variant flex items-center justify-between">
              <span>
                Government Administrators have view-only access to compensation award notices.
                Acceptance or rejection determinations must be decided directly by the registered land owner(s).
              </span>
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
