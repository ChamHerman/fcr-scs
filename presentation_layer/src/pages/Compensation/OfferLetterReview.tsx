import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  User,
  Users,
  AlertTriangle,
  FileText,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Tag,
  Folder,
  Landmark,
  ShieldCheck,
  FileCheck,
  Calendar,
  UploadCloud,
  UserCheck,
} from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { FileUpload } from "../../components/ui/FileUpload";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import { BASE_URL } from "../../services/api";
import { formatCurrencyRM } from "../../utils/currency";
import {
  OFFER_STATUS_CLASS_MAP as statusClassMap,
  OFFER_STATUS_LABEL_MAP as statusLabelMap,
} from "../../constants";
import { OfferLetterPreview, type OfferDetail, type OwnerApprovalStatus } from "./OfferLetterPreview";
import "../../index.css";
import "./compensation.css";
import "./offer_letter.css";
import "../../styles/shared-report.css";

export type { OwnerApprovalStatus, OfferDetail };

export const OfferLetterReview: React.FC = () => {
  const { offerId: paramOfferId } = useParams<{ offerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isMember, canRespondToOffer } = useRole();
  const { notify } = useNotification();

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
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [signedFileError, setSignedFileError] = useState<string>("");

  const handleOpenSignedPdf = useCallback(() => {
    if (!signedFile) return;
    const blobUrl = URL.createObjectURL(signedFile);
    const win = window.open(blobUrl, "_blank");
    if (!win || win.closed || typeof win.closed === "undefined") {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 300);
    }
  }, [signedFile]);

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
      const o = res.offerLetter || res;
      const c = o.acquisitionCase;
      const lp = c?.landParcel || o.landOwnership?.landParcel;
      const cr = o.compensationReport;
      const vr = cr?.valuationReport || c?.valuationReports?.[0];

      // Extract all owners from landParcel.ownerships
      const parcelOwnerships = lp?.ownerships || [];
      const parcelOwners = parcelOwnerships
        .map((ow: any) => {
          if (!ow?.landOwner) return null;
          const rawShare = ow.share != null ? String(ow.share) : ow.sharePercentage != null ? String(ow.sharePercentage) : "";
          const formattedShare = rawShare
            ? (rawShare.endsWith("%") ? rawShare : `${rawShare}%`)
            : "100%";
          return {
            ...ow.landOwner,
            sharePercentage: formattedShare,
          };
        })
        .filter(Boolean);

      const allOwners =
        parcelOwners.length > 0
          ? parcelOwners
          : o.landOwnership?.landOwner
          ? [
              {
                ...o.landOwnership.landOwner,
                sharePercentage: o.landOwnership.share != null
                  ? (String(o.landOwnership.share).endsWith("%") ? String(o.landOwnership.share) : `${o.landOwnership.share}%`)
                  : o.landOwnership.sharePercentage
                  ? (String(o.landOwnership.sharePercentage).endsWith("%") ? String(o.landOwnership.sharePercentage) : `${o.landOwnership.sharePercentage}%`)
                  : "100%",
              },
            ]
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
          sharePercentage: owner.sharePercentage || "100%",
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

      const rawStatus = o.status || "PENDING";

      const formatted: OfferDetail = {
        id: o.offerId,
        offerReferenceNo: o.offerReferenceNo,
        caseId: o.caseId,
        caseTitle: c?.caseTitle || "—",
        projectName: c?.project?.projectName || "East Coast Rail Link (ECRL) Project",
        acquiringAuthority:
          c?.project?.acquiringAgency || "Department of Lands and Mines (JKPTG)",
        ownerName,
        ownerIc,
        ownerAddress,
        ownerPhone,
        landTitle: lp?.landTitleNo || "—",
        lotNo: lp?.lotNo || "—",
        tempat: lp?.tempat || "—",
        mukim: lp?.mukim || "—",
        district: lp?.district || "—",
        state: lp?.state || "—",
        landArea:
          lp?.area != null
            ? `${Number(lp.area).toLocaleString("en-US", { maximumFractionDigits: 0 })} m²`
            : lp?.landArea != null
            ? `${Number(lp.landArea).toLocaleString("en-US", { maximumFractionDigits: 0 })} m²`
            : vr?.landArea != null
            ? `${Number(vr.landArea).toLocaleString("en-US", { maximumFractionDigits: 0 })} m²`
            : "—",
        acquisitionArea:
          vr?.acquisitionArea != null
            ? `${Number(vr.acquisitionArea).toLocaleString("en-US", { maximumFractionDigits: 0 })} m²`
            : lp?.acquisitionArea != null
            ? `${Number(lp.acquisitionArea).toLocaleString("en-US", { maximumFractionDigits: 0 })} m²`
            : lp?.area != null
            ? `${Number(lp.area).toLocaleString("en-US", { maximumFractionDigits: 0 })} m²`
            : "—",
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
        enquiryDate: c?.registrationDate
          ? new Date(c.registrationDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : c?.createdAt
          ? new Date(c.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
        awardDate: o.offerDate
          ? new Date(o.offerDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
        awardReference: "",
        status: statusLabelMap[rawStatus] || rawStatus,
        statusClass: statusClassMap[rawStatus] || "status-offer-pending",
        totalCompensation: Number(o.offerAmount || cr?.totalCompensation || 0),
        components: {
          landValue: Number(cr?.landValue || o.offerAmount || 0),
          buildingValue: Number(cr?.buildingValue || 0),
          cropValue: Number(cr?.cropValue || 0),
          businessDisruption: Number(cr?.businessDisruption || 0),
          disturbanceCompensation: Number(cr?.disturbanceCompensation || 0),
          relocationAllowance: Number(cr?.relocationAllowance || 0),
          otherEligible: Number(cr?.otherEligible || 0),
        },
        valuationReferences: {
          marketValue: Number(vr?.marketValue || cr?.landValue || 0),
          aiValuationPrice: vr?.aiValuationPrice ? Number(vr.aiValuationPrice) : undefined,
          recommendedCompensation: Number(vr?.recommendedCompensation || cr?.totalCompensation || 0),
          approvedCompensation: Number(cr?.totalCompensation || o.offerAmount || 0),
          valuationMethod: vr?.valuationMethod || "Sales Comparison Method",
        },
        paymentConditions:
          "Payment will be initiated upon formal acceptance. Funds will be transferred directly to the registered beneficiary bank account.",
        remarks: o.remarks || cr?.remarks,
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
        rawStatus,
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
      notify({
        type: "error",
        title: "Access Denied",
        message: "Only land owners (Displaced Community Members) can accept this offer.",
      });
      return;
    }
    if (!signedFile) {
      setSignedFileError("Please upload the signed Form H PDF before accepting the offer.");
      notify({
        type: "error",
        title: "Signed Document Required",
        message: "Please upload the signed Form H PDF before submitting your acceptance.",
      });
      return;
    }
    setSignedFileError("");
    setShowAcceptConfirmModal(true);
  };

  const handleConfirmAccept = async (force?: boolean) => {
    setShowAcceptConfirmModal(false);
    await handleAccept(force);
  };

  const handleAccept = async (force?: boolean) => {
    if (!offer) return;
    if (!canRespondToOffer) {
      notify({
        type: "error",
        title: "Access Denied",
        message: "Only land owners (Displaced Community Members) can accept this offer.",
      });
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
      await compensationApi.acceptOffer(offer.id, signedFile, force, {
        ownerNric: user?.identificationNumber,
        userId: user?.userId,
      });
      setShowObjectionPrompt(false);
      await fetchOffer();
      notify({
        type: "success",
        title: "Offer Accepted",
        message: "Your formal acceptance has been recorded successfully.",
      });
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
        notify({
          type: "error",
          title: "Accept Failed",
          message: err.message || err,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAcceptanceSubmit = async () => {
    if (!offer) return;
    if (!canRespondToOffer) {
      notify({
        type: "error",
        title: "Access Denied",
        message: "Only land owners (Displaced Community Members) can cancel offer approvals.",
      });
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
      notify({
        type: "success",
        title: "Approval Cancelled",
        message: "Your approval has been cancelled. You can now re-evaluate or submit a Form N objection if needed.",
      });
    } catch (err: any) {
      console.error("Cancel approval failed:", err);
      notify({
        type: "error",
        title: "Cancellation Failed",
        message: err.message || err,
      });
    } finally {
      setCancellingApproval(false);
    }
  };

  const handleWithdrawObjectionAndAccept = async () => {
    if (!activeObjection || !offer) return;
    if (!canRespondToOffer) {
      notify({
        type: "error",
        title: "Access Denied",
        message: "Only land owners (Displaced Community Members) can perform this action.",
      });
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
      notify({
        type: "error",
        title: "Withdrawal Failed",
        message: `Could not withdraw objection: ${err.message || err}`,
      });
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
      notify({
        type: "error",
        title: "Access Denied",
        message: "Only land owners (Displaced Community Members) can reject this offer.",
      });
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
      notify({
        type: "success",
        title: "Offer Rejected",
        message: "Offer rejection recorded. Case marked as OFFER_REJECTED.",
      });
    } catch (err: any) {
      console.error("Reject failed:", err);
      notify({
        type: "error",
        title: "Rejection Failed",
        message: err.message || err,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-md-background text-md-on-surface">
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <Loader2 size={32} className="inline animate-spin mb-2" />
          <div>Loading offer letter details from backend...</div>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-md-background text-md-on-surface">
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <h3 className="text-lg font-bold mb-2">Offer Letter Not Found</h3>
          <p className="mb-4">No offer letter selected or valid ID provided.</p>
          <Button variant="filled" onClick={() => navigate("/admin/compensation/offer")}>
            Back to Offer Letters
          </Button>
        </div>
      </div>
    );
  }

  const otherCompensationSum =
    offer.components.cropValue +
    offer.components.businessDisruption +
    offer.components.disturbanceCompensation +
    offer.components.relocationAllowance +
    offer.components.otherEligible;

  return (
    <>
      {/* Accept Modal */}
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
            <Button variant="filled" onClick={() => handleConfirmAccept()} isLoading={submitting}>
              <CheckCircle size={16} /> Confirm & Accept Award
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2 text-sm text-md-on-surface-variant">
          <p>
            You are formally accepting the compensation award of{" "}
            <strong className="text-md-primary font-bold">{formatCurrencyRM(offer.totalCompensation)}</strong>.
          </p>

          {signedFile && (
            <div className="p-3 bg-md-surface-container-low rounded-xl text-xs flex items-center justify-between border border-md-outline/10">
              <div className="flex items-center gap-2 text-md-on-surface min-w-0">
                <FileCheck size={16} className="text-md-primary flex-shrink-0" />
                <span className="font-medium truncate">{signedFile.name}</span>
                <span className="text-md-on-surface-variant flex-shrink-0">
                  ({(signedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <span className="text-green-600 font-semibold text-[11px] bg-green-500/10 px-2 py-0.5 rounded flex-shrink-0 ml-2">
                Signed Attachment Attached
              </span>
            </div>
          )}

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
            <div className="font-bold flex items-center gap-2 mb-1 text-amber-700 dark:text-amber-300">
              <AlertTriangle size={16} /> 1-Day Approval Policy
            </div>
            You have a <strong>24-hour grace window</strong> to cancel this acceptance. After 24 hours, the approval is permanently finalized.
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
            <Button variant="danger" onClick={handleCancelAcceptanceSubmit} isLoading={cancellingApproval}>
              <XCircle size={16} /> Yes, Cancel Approval
            </Button>
          </>
        }
      >
        <p className="text-sm text-md-on-surface-variant py-2">
          Are you sure you want to cancel your previous acceptance of this compensation offer? Status will be reset to Pending.
        </p>
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
            <Button variant="filled" onClick={handleWithdrawObjectionAndAccept} isLoading={withdrawingObjection}>
              Withdraw Objection & Accept Offer
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2 text-sm text-md-on-surface-variant">
          <p>You currently have an active Form N objection filed for this case.</p>
          <div className="p-3 bg-md-surface-container rounded-xl text-xs flex flex-col gap-1 border border-md-outline/10">
            <div>
              Objection ID: <strong className="font-mono text-md-primary">{activeObjection?.objectionId}</strong>
            </div>
            <div>Reason: <em>"{activeObjection?.objectionReason || "Under review"}"</em></div>
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
        <div className="space-y-3">
          <Textarea
            label="Reason for Rejection *"
            rows={3}
            placeholder="State the formal reason for rejecting this offer..."
            value={reason}
            error={reasonError}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError("");
            }}
          />
        </div>
      </Modal>

      <div className="main blur-shape-bg">
        <div className="review-container">
          {/* Top Bar */}
          <div className="topbar" style={{ marginBottom: "16px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Review Offer Letter</h1>
              <div className="sub">
                Review official Form H notice of award and offer of compensation details
              </div>
            </div>
            <div className="topbar-right flex items-center gap-3">
              <Button variant="outlined" size="sm" onClick={() => navigate("/admin/compensation/offer")}>
                <ArrowLeft size={16} /> Back
              </Button>
              <span className="date-badge">
                <Calendar size={16} className="inline mr-1" />
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
                  <User size={16} />
                )}
              </div>
            </div>
          </div>

          {/* Case Summary: Exactly matching ValuationReview design with 3 requested detail items */}
          <div className="case-summary">
            <div className="left">
              <div className="flex items-center gap-2 mb-1">
                <span className="case-id font-mono text-sm">Case ID: {offer.caseId}</span>
                <CopyButton value={offer.caseId} />
              </div>
              <div className="case-title">{offer.caseTitle}</div>
              <div className="meta flex items-center flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1">
                  <FileText size={14} className="inline" /> Offer Ref ID: {offer.offerReferenceNo}
                  <CopyButton value={offer.offerReferenceNo} size="sm" />
                </span>
                <span>
                  <User size={14} className="inline mr-1" /> Land Owner: {offer.ownerName}
                </span>
                <span>
                  <Tag size={14} className="inline mr-1" /> Land Title: {offer.landTitle}
                </span>
              </div>
            </div>
            <span className={`status-badge-lg ${offer.statusClass}`}>
              <span className="dot"></span> {offer.status}
            </span>
          </div>

          {/* Modular Form H PDF Preview & Viewer */}
          <OfferLetterPreview offer={offer} />

            {/* Interactive Response Action Bar for Landowner */}
            {canRespondToOffer && (() => {
              const isOfferAccepted =
                offer.rawStatus === "ACCEPTED" ||
                offer.status === "Accepted" ||
                offer.status === "ACCEPTED" ||
                offer.currentUserStatus === "ACCEPTED";

              const isOfferRejected =
                offer.rawStatus === "REJECTED" ||
                offer.status === "Rejected" ||
                offer.status === "REJECTED" ||
                offer.currentUserStatus === "REJECTED";

              const isOfferPending = !isOfferAccepted && !isOfferRejected;

              return (
                <div className="mt-8 p-6 bg-md-surface-container rounded-2xl border border-md-outline/15 shadow-sm space-y-5">
                  <div className="flex justify-between items-start flex-wrap gap-4 border-b border-md-outline/10 pb-4">
                    <div>
                      <div className="text-base font-bold text-md-on-surface flex items-center gap-2">
                        <UserCheck size={18} className="text-md-primary" />
                        <span>Landowner Response Actions</span>
                      </div>
                      <div className="text-xs text-md-on-surface-variant mt-0.5">
                        {isOfferAccepted
                          ? "You have accepted this offer. You may cancel approval within the 24-hour grace period if needed."
                          : isOfferRejected
                          ? "You have rejected this offer."
                          : "Download and sign the Form H document above, then upload the signed PDF before submitting your acceptance."}
                      </div>
                    </div>

                    {isOfferAccepted ? (
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {offer.rawOffer?.signedDocument && (
                          <Button
                            variant="outlined"
                            onClick={() => {
                              const cleanPath = offer.rawOffer.signedDocument.replace(/^\/+/, '');
                              const docUrl = `${BASE_URL}/${cleanPath}`;
                              window.open(docUrl, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <FileText size={15} /> View Signed Document
                          </Button>
                        )}
                        {offer.isWithinOneDay ? (
                          <Button
                            variant="outlined"
                            onClick={() => setShowCancelApprovalModal(true)}
                            isLoading={cancellingApproval}
                          >
                            <XCircle size={16} /> Cancel Approval (Grace Period)
                          </Button>
                        ) : (
                          <div className="px-3.5 py-1.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            <CheckCircle size={15} /> Acceptance Finalized
                          </div>
                        )}
                      </div>
                    ) : isOfferRejected ? (
                      <div className="px-3.5 py-1.5 bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <XCircle size={15} /> Offer Formally Rejected
                      </div>
                    ) : null}
                  </div>

                  {/* If Pending / Not Responded Yet: Show Signed Document Upload Field + Action Buttons */}
                  {isOfferPending && (
                    <div className="space-y-4">
                      <div className="bg-md-surface-container-low p-4 rounded-xl border border-md-outline/10 space-y-3">
                        <div className="text-xs font-semibold text-md-on-surface flex items-center gap-1.5">
                          <UploadCloud size={16} className="text-md-primary" />
                          <span>Upload Signed Form H Acceptance Document (PDF)</span>
                        </div>
                        <FileUpload
                          label="Signed Form H PDF Document *"
                          fileName={signedFile?.name}
                          onView={handleOpenSignedPdf}
                          placeholder="Select signed Form H PDF or scanned copy (PDF, JPG, PNG)"
                          accept=".pdf,.png,.jpg,.jpeg"
                          error={signedFileError}
                          onChange={(file) => {
                            setSignedFile(file);
                            if (file) setSignedFileError("");
                          }}
                          onClear={() => {
                            setSignedFile(null);
                            setSignedFileError("");
                          }}
                        />
                        <p className="text-[11px] text-md-on-surface-variant">
                          * Please make sure the declaration & signature block on Page 3 is signed and dated before uploading.
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                        {/* Left Side: Submit Objection */}
                        <div>
                          <Button
                            variant="outlined"
                            onClick={() =>
                              navigate("/member/compensation/objections/new", {
                                state: { offerId: offer.id, caseId: offer.caseId },
                              })
                            }
                          >
                            <AlertTriangle size={16} /> File Form N Objection
                          </Button>
                        </div>

                        {/* Right Side: Reject and Accept */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <Button variant="danger" onClick={() => setShowRejectModal(true)}>
                            <XCircle size={16} /> Reject Offer
                          </Button>
                          <Button variant="filled" onClick={handleAcceptClick} isLoading={submitting}>
                            <CheckCircle size={16} /> Accept Compensation Award
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Footer */}
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
            FCR-SCS · Form H Offer of Compensation Review · Land Acquisition Act 1960
          </div>
        </div>
      </div>
    </>
  );
};

export const OfferLetterDetail = OfferLetterReview;
export default OfferLetterReview;
