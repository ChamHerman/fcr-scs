import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, Loader2, Edit2, Trash2, FileText, ExternalLink } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import { EditObjectionModal, DeleteObjectionModal } from "../../components/objection";
import "../../index.css";
import "./objection.css";

type ObjectionDetail = {
  id: string;
  caseId: string;
  offerId: string;
  caseTitle: string;
  caseCreatedById?: string;
  offerCreatedById?: string;
  submittedBy: string;
  submittedById: string;
  submittedDate: string;
  type: string;
  status: string;
  rawStatus: string;
  statusClass: string;
  objectionText: string;
  requestedAmount: number;
  revisedCompensation?: number;
  attachments: { fileName?: string; name?: string; fileSize?: string; size?: string }[];
  response?: string;
  responseDate?: string;
  respondedBy?: string;
};

import {
  OBJECTION_STATUS_CLASS_MAP as statusClassMap,
  OBJECTION_STATUS_LABEL_MAP as statusLabelMap,
} from "../../constants";

export const ObjectionReview: React.FC = () => {
  const { objectionId: paramId } = useParams<{ objectionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userId, isOfficer, isMember, isAdmin, isGovAdmin, isSysAdmin } = useRole();
  const { notify } = useNotification();

  const activeObjectionId = paramId || location.state?.objectionId;

  const [objection, setObjection] = useState<ObjectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState("");
  const [revisedAmount, setRevisedAmount] = useState<number | "">("");
  const [responseError, setResponseError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit & Delete Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    async function fetchObjection() {
      if (!activeObjectionId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await compensationApi.getObjectionById(activeObjectionId);
        const obj = res.objection;
        const offer = obj.offerLetter;
        const caseItem = offer?.acquisitionCase;
        const submitter = obj.submittedBy;
        const attachmentsList = (obj.documents || []).map((d: any) => ({
          fileName: d.fileName || d.name,
          name: d.fileName || d.name,
          fileSize: d.fileSize || d.size || "Unknown Size",
        }));

        const formatted: ObjectionDetail = {
          id: obj.objectionId,
          caseId: obj.caseId || caseItem?.caseId || "—",
          offerId: obj.offerId,
          caseTitle: caseItem?.caseTitle || "—",
          caseCreatedById: caseItem?.createdById,
          offerCreatedById: offer?.createdById,
          submittedBy: submitter?.name || "Displaced Community Member",
          submittedById: obj.submittedById,
          submittedDate: new Date(obj.submittedAt || obj.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          type: "Formal Objection",
          status: statusLabelMap[obj.status] || obj.status,
          rawStatus: obj.status,
          statusClass: statusClassMap[obj.status] || "status-objection-review",
          objectionText: obj.objectionReason || "No explanation provided.",
          requestedAmount: Number(obj.requestedAmount || 0),
          revisedCompensation: obj.revisedAmount ? Number(obj.revisedAmount) : undefined,
          attachments: attachmentsList,
          response: obj.responseNotes,
          responseDate: obj.reviewedAt
            ? new Date(obj.reviewedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : undefined,
          respondedBy: obj.reviewedBy?.name || (obj.reviewedById ? "Government Officer" : undefined),
        };

        setObjection(formatted);
      } catch (err: any) {
        console.error("Failed to load objection details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchObjection();
  }, [activeObjectionId]);

  const isResponsibleOfficer = Boolean(
    isSysAdmin ||
      (isOfficer &&
        userId &&
        (objection?.caseCreatedById === userId || objection?.offerCreatedById === userId))
  );
  // Government Administrators are strictly disallowed from accepting or rejecting objections
  const canReview = isResponsibleOfficer && !isGovAdmin;
  const canEditOrDelete = (isMember || isSysAdmin) && objection?.rawStatus === "PENDING";

  const handleApprove = async () => {
    if (!objection) return;
    if (isGovAdmin) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Government Administrators are not permitted to accept or reject objections. This action must be performed by the assigned Government Officer.',
      });
      return;
    }
    if (!canReview) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only the assigned Government Officer responsible for this case can approve this objection.',
      });
      return;
    }
    if (!responseText.trim()) {
      setResponseError("Please provide review remarks before approving.");
      return;
    }
    setResponseError("");
    setSubmitting(true);
    try {
      const revised = revisedAmount !== "" ? Number(revisedAmount) : objection.requestedAmount;
      const res = await compensationApi.approveObjection(objection.id, revised, responseText, userId);
      const updatedObj = res?.objection;
      setObjection((prev) =>
        prev
          ? {
              ...prev,
              status: "Approved",
              rawStatus: "APPROVED",
              statusClass: "status-obj-approved",
              revisedCompensation: revised,
              response: responseText,
              responseDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              respondedBy: updatedObj?.reviewedBy?.name || user?.name || "Government Officer",
            }
          : null
      );
      notify({
        type: 'success',
        title: 'Objection Approved',
        message: `Award amount updated to RM ${Number(revised).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, status reset to Pending.`,
      });
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

  const handleReject = async () => {
    if (!objection) return;
    if (isGovAdmin) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Government Administrators are not permitted to accept or reject objections. This action must be performed by the assigned Government Officer.',
      });
      return;
    }
    if (!canReview) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only the assigned Government Officer responsible for this case can reject this objection.',
      });
      return;
    }
    if (!responseText.trim()) {
      setResponseError("Please provide review remarks before rejecting.");
      return;
    }
    setResponseError("");
    setSubmitting(true);
    try {
      const res = await compensationApi.rejectObjection(objection.id, responseText, userId);
      const updatedObj = res?.objection;
      setObjection((prev) =>
        prev
          ? {
              ...prev,
              status: "Rejected",
              rawStatus: "REJECTED",
              statusClass: "status-obj-rejected",
              response: responseText,
              responseDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              respondedBy: updatedObj?.reviewedBy?.name || user?.name || "Government Officer",
            }
          : null
      );
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

  const handleOpenEdit = () => {
    setShowEditModal(true);
  };

  const formatCurrency = (val: number) => `RM ${val.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-10"
        style={{
          background: "var(--md-background)",
          color: "var(--md-on-surface)",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <Loader2 size={32} className="inline animate-spin mb-2" />
          <div>Fetching objection details from database...</div>
        </div>
      </div>
    );
  }

  if (!objection) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-10"
        style={{
          background: "var(--md-background)",
          color: "var(--md-on-surface)",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Objection Not Found</h3>
          <p style={{ marginBottom: "16px" }}>The requested objection record does not exist or has been removed.</p>
          <Button variant="filled" onClick={() => navigate("/admin/compensation/objection")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isActionable = objection.rawStatus === "PENDING";
  const isResolved = objection.rawStatus === "APPROVED" || objection.rawStatus === "REJECTED";

  return (
    <>
      {/* Edit Modal */}
      <EditObjectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        objection={
          objection
            ? {
                id: objection.id,
                caseTitle: objection.caseTitle,
                reason: objection.objectionText,
                requestedAmount: objection.requestedAmount,
              }
            : null
        }
        showFileUpload={false}
        onSuccess={(updated) => {
          setObjection((prev) =>
            prev
              ? {
                  ...prev,
                  objectionText: updated.reason,
                  requestedAmount: updated.requestedAmount,
                }
              : null
          );
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteObjectionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        objectionId={objection.id}
        title="Confirm Deletion"
        subtitle={`This operation cannot be reverted. Are you sure you want to permanently delete objection ${objection.id}?`}
        onSuccess={() => {
          navigate("/admin/compensation/objection");
        }}
      />

      <div className="main blur-shape-bg">
        <div className="objection-review">
          {/* Topbar */}
          <div className="topbar flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="topbar-left">
              <h1 className="text-2xl font-bold mb-1">Objection Details</h1>
              <div className="text-xs md:text-sm text-md-on-surface-variant">
                Objection Ref: <span className="font-mono font-bold text-md-primary">{objection.id}</span>
              </div>
            </div>
            <div className="topbar-right flex items-center gap-3">
              <Button variant="outlined" size="sm" onClick={() => navigate("/admin/compensation/objection")}>
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

          <div className="header-card flex justify-between items-center p-6 rounded-2xl mb-6 bg-md-surface-container shadow-sm flex-wrap gap-4">
            <div className="left">
              <div className="flex items-center gap-2 mb-1">
                <span className="objection-id font-mono text-sm font-bold text-md-primary">{objection.id}</span>
                <CopyButton value={objection.id} />
              </div>
              <div className="title text-lg md:text-xl font-bold mb-2">{objection.caseTitle}</div>
              <div className="meta flex gap-4 text-xs text-md-on-surface-variant flex-wrap">
                <span><Lucide.FolderOpen size={14} className="inline mr-1" /> {objection.caseId}</span>
                <span><Lucide.User size={14} className="inline mr-1" /> {objection.submittedBy}</span>
                <span><Lucide.Calendar size={14} className="inline mr-1" /> {objection.submittedDate}</span>
                <span><Lucide.FileText size={14} className="inline mr-1" /> {objection.type}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`status-badge-lg ${objection.statusClass}`}>
                <span className="dot"></span> {objection.status}
              </span>
            </div>
          </div>

          <div className="content-card bg-md-surface-container p-6 md:p-8 rounded-2xl mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="section-title text-base font-bold flex items-center gap-2 m-0">
                <Lucide.ClipboardList size={18} className="text-md-primary" /> Objection Submission Details
              </div>
              {canEditOrDelete && (
                <div className="flex gap-2">
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={handleOpenEdit}
                  >
                    <Edit2 size={14} /> Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              )}
            </div>

            <div className="detail-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-md-surface-container-low mb-6 border border-md-outline/10">
              <div className="detail-item flex flex-col gap-1">
                <span className="label text-xs text-md-on-surface-variant">Submitted By</span>
                <span className="value text-sm font-semibold">{objection.submittedBy}</span>
              </div>
              <div className="detail-item flex flex-col gap-1">
                <span className="label text-xs text-md-on-surface-variant">Requested Amount</span>
                <span className="value text-sm font-bold text-md-primary">
                  {formatCurrency(objection.requestedAmount)}
                </span>
              </div>
              <div className="detail-item flex flex-col gap-1">
                <span className="label text-xs text-md-on-surface-variant">Submission Date</span>
                <span className="value text-sm">{objection.submittedDate}</span>
              </div>
              <div className="detail-item flex flex-col gap-1">
                <span className="label text-xs text-md-on-surface-variant">Form Type</span>
                <span className="value text-sm">{objection.type}</span>
              </div>
            </div>

            <div className="objection-text mb-6">
              <div className="label text-xs text-md-on-surface-variant font-semibold uppercase mb-2">Objection Grounds & Statement</div>
              <div className="text text-sm p-4 rounded-xl bg-md-surface-container-low leading-relaxed border border-md-outline/10">{objection.objectionText}</div>
            </div>

            {/* Link references */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Button
                variant="outlined"
                size="sm"
                onClick={() => navigate(`/admin/case/details/${objection.caseId}`)}
              >
                <ExternalLink size={14} /> View Case Details
              </Button>
              <Button
                variant="outlined"
                size="sm"
                onClick={() => navigate("/admin/compensation/offer/review", { state: { offerId: objection.offerId } })}
              >
                <FileText size={14} /> View Associated Offer Letter
              </Button>
            </div>

            {objection.attachments.length > 0 && (
              <>
                <div className="section-title text-base font-bold flex items-center gap-2 mt-6 mb-3">
                  <Lucide.Paperclip size={18} className="text-md-primary" /> Supporting Documents
                </div>
                <div className="file-list flex flex-col gap-2">
                  {objection.attachments.map((a, i) => (
                    <div key={i} className="file-item flex items-center gap-2 p-2.5 rounded-xl bg-md-surface-container-low border border-md-outline/10 text-xs">
                      <Lucide.FileText size={16} className="text-md-primary" />
                      <span className="text-sm font-medium">{a.name || a.fileName || "Document"}</span>
                      <span className="text-xs text-md-on-surface-variant opacity-60 ml-2">
                        ({a.size || a.fileSize || "1.2 MB"})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Resolved Decision Card (Visible when review is completed) */}
            {isResolved && objection.response && (
              <div className="response-section mt-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="section-title font-bold text-sm text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Lucide.CheckCircle size={18} /> Official Officer Determination & Decision
                </div>
                <div className="response-text text-sm">
                  <div className="label text-xs opacity-75 mb-1">
                    Reviewed by {objection.respondedBy || "Government Officer"}
                  </div>
                  {objection.revisedCompensation && (
                    <div className="mb-2 text-base font-bold text-emerald-700 dark:text-emerald-400">
                      Approved Revised Compensation: {formatCurrency(objection.revisedCompensation)}
                    </div>
                  )}
                  <div className="p-3 bg-md-surface-container/60 rounded-xl leading-relaxed mt-2 text-sm">{objection.response}</div>
                  {objection.responseDate && (
                    <div className="text-xs opacity-60 mt-2">
                      Determination Recorded Date: {objection.responseDate}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* If Pending / Under Review */}
            {!isResolved && isActionable && (
              <>
                {/* Officer / Admin Review UI */}
                {canReview ? (
                  <div className="mt-6 pt-6 border-t border-md-outline/10">
                    <div className="section-title text-base font-bold flex items-center gap-2 mb-4">
                      <Lucide.MessageSquare size={18} className="text-md-primary" /> Officer Review & Decision
                    </div>

                    <div className="flex flex-col gap-4">
                      <div>
                        <CurrencyInput
                          label="Revised Compensation Amount (RM)"
                          id="revisedAmount"
                          value={revisedAmount}
                          placeholder="0.00"
                          onValueChange={(_formatted, num) => setRevisedAmount(num > 0 ? num : "")}
                        />
                      </div>

                      <div>
                        <Textarea
                          label="Review Remarks & Justification *"
                          id="responseText"
                          rows={4}
                          placeholder="Provide detailed justification for your decision..."
                          value={responseText}
                          error={responseError}
                          onChange={(e) => {
                            setResponseText(e.target.value);
                            if (responseError) setResponseError("");
                          }}
                        />
                      </div>

                      <div className="action-bar flex justify-end gap-3 pt-4 border-t border-md-outline/10">
                        <Button variant="danger" onClick={handleReject} isLoading={submitting}>
                          <XCircle size={18} /> Reject Objection
                        </Button>
                        <Button variant="filled" onClick={handleApprove} isLoading={submitting}>
                          <CheckCircle size={18} /> Approve Objection
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : isGovAdmin ? (
                  <div className="mt-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Lucide.ShieldAlert size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1">
                        Government Administrator View-Only Access
                      </div>
                      <p className="text-xs text-md-on-surface-variant leading-relaxed">
                        Government Administrators have supervisory access and cannot accept or reject objections. Official determinations must be performed by the assigned Government Officer.
                      </p>
                    </div>
                  </div>
                ) : isOfficer ? (
                  <div className="mt-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Lucide.ShieldAlert size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1">
                        Assigned Officer Review Only
                      </div>
                      <p className="text-xs text-md-on-surface-variant leading-relaxed">
                        This acquisition case is supervised by another government officer. Only the assigned officer responsible for this case can perform approval or rejection determinations.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Member Pending Information View */}
                {isMember && (
                  <div className="mt-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Lucide.Clock size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1">
                        Awaiting Government Officer Evaluation
                      </div>
                      <p className="text-xs text-md-on-surface-variant leading-relaxed">
                        Your objection has been received and is currently under active assessment by the assigned Land Acquisition Government Officer.
                        Once an official determination is made, the remarks and any approved revised compensation award will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </>
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
            FCR-SCS · Compensation Objection Assessment · Connected to Backend Service
          </div>
        </div>
      </div>
    </>
  );
};

