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
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
} from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { Textarea } from "../../components/ui/Textarea";
import { FileUpload } from "../../components/ui/FileUpload";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import { BASE_URL } from "../../services/api";
import { formatCurrencyRM } from "../../utils/currency";
import { OfferResponseModals } from "../../components/OfferResponseModals";
import {
  OFFER_STATUS_CLASS_MAP as statusClassMap,
  OFFER_STATUS_LABEL_MAP as statusLabelMap,
} from "../../constants";
import {
  OfferLetterPreview,
  type OfferDetail,
  type OwnerApprovalStatus,
  type OfferLetterPreviewHandle,
} from "./OfferLetterPreview";
import { useOfferResponse } from "./hooks/useOfferResponse";
import "../../index.css";
import "./compensation.css";
import "./offer_letter.css";
import "../../styles/shared-report.css";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export type { OwnerApprovalStatus, OfferDetail };

export const OfferLetterReview: React.FC = () => {
  useDocumentTitle("Offer Letter Review");
  const { offerId: paramOfferId } = useParams<{ offerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isMember, canRespondToOffer } = useRole();
  const { notify } = useNotification();

  const activeOfferId = location.state?.offerId || paramOfferId;

  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"pdf" | "html">("pdf");
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const previewRef = useRef<OfferLetterPreviewHandle>(null);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 10, 70));
  const handleResetZoom = () => setZoomScale(100);

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
      const matchingOwner =
        (userIcClean
          ? parcelOwners.find(
              (ow: any) =>
                (ow.nric || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === userIcClean.toLowerCase()
            )
          : null) ||
        parcelOwners.find((ow: any) => ow.ownerId === user?.userId || ow.landOwnerId === user?.userId) ||
        parcelOwners[0] ||
        o.landOwnership?.landOwner;

      const declarationOwnerName =
        matchingOwner?.name || parcelOwners[0]?.name || (o.landOwnership?.landOwner?.name) || ownerName;
      const declarationOwnerIc =
        matchingOwner?.nric || parcelOwners[0]?.nric || (o.landOwnership?.landOwner?.nric) || ownerIc;

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
        declarationOwnerName,
        declarationOwnerIc,
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

  const {
    showRejectModal,
    setShowRejectModal,
    showAcceptConfirmModal,
    setShowAcceptConfirmModal,
    showCancelApprovalModal,
    setShowCancelApprovalModal,
    cancellingApproval,
    submitting,
    reason,
    setReason,
    reasonError,
    setReasonError,
    signedFile,
    setSignedFile,
    signedFileError,
    setSignedFileError,
    activeObjection,
    showObjectionPrompt,
    setShowObjectionPrompt,
    withdrawingObjection,
    handleOpenSignedPdf,
    handleAcceptClick,
    handleConfirmAccept,
    handleReject,
    handleCancelApproval: handleCancelAcceptanceSubmit,
    handleWithdrawObjectionAndAccept,
  } = useOfferResponse({
    offer,
    canRespondToOffer,
    user,
    onRefresh: fetchOffer,
  });

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
      <OfferResponseModals
        // Accept
        showAcceptConfirmModal={showAcceptConfirmModal}
        onCloseAcceptModal={() => setShowAcceptConfirmModal(false)}
        onConfirmAccept={() => handleConfirmAccept()}
        submitting={submitting}
        totalCompensation={offer.totalCompensation}
        signedFile={signedFile}
        // Cancel Approval
        showCancelApprovalModal={showCancelApprovalModal}
        onCloseCancelModal={() => setShowCancelApprovalModal(false)}
        onCancelApproval={handleCancelAcceptanceSubmit}
        cancellingApproval={cancellingApproval}
        // Active Objection
        showObjectionPrompt={showObjectionPrompt}
        activeObjection={activeObjection}
        onCloseObjectionModal={() => setShowObjectionPrompt(false)}
        onWithdrawObjectionAndAccept={handleWithdrawObjectionAndAccept}
        withdrawingObjection={withdrawingObjection}
        // Reject
        showRejectModal={showRejectModal}
        onCloseRejectModal={() => setShowRejectModal(false)}
        onConfirmReject={handleReject}
        reason={reason}
        onReasonChange={(val) => { setReason(val); if (reasonError) setReasonError(""); }}
        reasonError={reasonError}
      />

      <div className="main blur-shape-bg">
        <div className="review-container">
          {/* Top Bar */}
          <PageHeader
            title="Review Offer Letter"
            subtitle="Review official Form H notice of award and offer of compensation details"
            backPath="/admin/compensation/offer"
          />

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

          {/* Modular Form H PDF Preview & Viewer with Admin Header Toolbar (Image 1) */}
          <div className="pdf-preview-container bg-md-surface-container rounded-2xl border border-md-outline/15 shadow-sm overflow-hidden mb-6">
            {/* TOP COMPACT TOOLBAR BAR (IMAGE 1) */}
            <div className="pdf-preview-toolbar px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between flex-wrap gap-3 bg-md-surface border-b border-md-outline/15">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-md-primary font-bold text-sm sm:text-base">
                  <FileText size={18} />
                  <span>
                    {(offer.rawStatus === "ACCEPTED" || offer.status === "Accepted" || offer.status === "ACCEPTED" || offer.currentUserStatus === "ACCEPTED") && offer.rawOffer?.signedDocument
                      ? "Form H: Uploaded Signed Acceptance Document"
                      : "Form H: Notice of Award and Offer of Compensation"}
                  </span>
                </div>

                {/* View Mode Switcher (Draft Template Only) */}
                {!((offer.rawStatus === "ACCEPTED" || offer.status === "Accepted" || offer.status === "ACCEPTED" || offer.currentUserStatus === "ACCEPTED") && offer.rawOffer?.signedDocument) && (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode("pdf")}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                        viewMode === "pdf"
                          ? "bg-md-primary text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      <FileText size={13} /> PDF Viewer
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("html")}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                        viewMode === "html"
                          ? "bg-md-primary text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      <Layers size={13} /> Sheet View
                    </button>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {viewMode === "html" && !((offer.rawStatus === "ACCEPTED" || offer.status === "Accepted" || offer.status === "ACCEPTED" || offer.currentUserStatus === "ACCEPTED") && offer.rawOffer?.signedDocument) && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      disabled={zoomScale <= 70}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-40"
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="w-10 text-center font-mono text-[11px] font-semibold">{zoomScale}%</span>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      disabled={zoomScale >= 150}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-40"
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded ml-0.5"
                      title="Reset Zoom"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                )}

                {viewMode === "pdf" && (
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={() => previewRef.current?.refreshPdf()}
                    title="Re-generate PDF Document"
                  >
                    <RefreshCw size={14} /> Refresh PDF
                  </Button>
                )}

                <Button
                  variant="tonal"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="hidden sm:inline-flex"
                >
                  {isCollapsed ? (
                    <>
                      <Eye size={15} /> Show Preview <ChevronDown size={14} />
                    </>
                  ) : (
                    <>
                      <EyeOff size={15} /> Collapse Preview <ChevronUp size={14} />
                    </>
                  )}
                </Button>

                <Button
                  variant="filled"
                  size="sm"
                  onClick={() => previewRef.current?.downloadPdf()}
                  isLoading={downloadingPdf}
                >
                  <Download size={15} /> {downloadingPdf ? "Generating PDF..." : "Download PDF"}
                </Button>
              </div>
            </div>

            {/* Collapsible Preview Content */}
            {!isCollapsed && (
              <div className="pdf-preview-panel border-t border-md-outline/15 flex flex-col items-center p-4 sm:p-6 bg-slate-900/10 dark:bg-slate-950/40 w-full min-h-[500px]">
                <OfferLetterPreview
                  ref={previewRef}
                  offer={offer}
                  uploadedPdf={
                    (offer.rawStatus === "ACCEPTED" || offer.status === "Accepted" || offer.status === "ACCEPTED" || offer.currentUserStatus === "ACCEPTED")
                      ? offer.rawOffer?.signedDocument
                      : null
                  }
                  viewMode={viewMode}
                  zoomScale={zoomScale}
                  onDownloadingChange={setDownloadingPdf}
                />
              </div>
            )}
          </div>

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
                          placeholder="Select signed Form H PDF document (.pdf only)"
                          accept=".pdf,application/pdf"
                          error={signedFileError}
                          onChange={(file) => {
                            if (file) {
                              const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
                              if (!isPdf) {
                                setSignedFile(null);
                                setSignedFileError("Only PDF files (.pdf) are allowed.");
                                notify({
                                  type: "error",
                                  title: "Invalid File Type",
                                  message: "Only PDF documents (.pdf) can be uploaded.",
                                });
                                return;
                              }
                            }
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

                      <div className="flex items-center justify-end gap-3 flex-wrap pt-2">
                        <Button
                          variant="danger"
                          onClick={() =>
                            navigate(`/member/offer-letter?caseId=${encodeURIComponent(offer.caseId)}&offerId=${encodeURIComponent(offer.id)}`)
                          }
                          className="font-bold !bg-rose-600 hover:!bg-rose-700 text-white"
                        >
                          <AlertTriangle size={16} /> Reject with Objection (Form N)
                        </Button>
                        <Button variant="filled" onClick={handleAcceptClick} isLoading={submitting} className="font-bold">
                          <CheckCircle size={16} /> Accept Compensation Award
                        </Button>
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
