import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, Loader2, Edit2, Trash2, X, FileText, ExternalLink } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { useModalPopIn } from "../../hooks/useModalPopIn";
import "../../style.css";
import "./objection.css";


type ObjectionDetail = {
  id: string;
  caseId: string;
  offerId: string;
  caseTitle: string;
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

const statusClassMap: Record<string, string> = {
  SUBMITTED: "review",
  UNDER_REVIEW: "review",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const statusLabelMap: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved / Revised",
  REJECTED: "Rejected",
};

export const ObjectionReview: React.FC = () => {
  const { objectionId: paramId } = useParams<{ objectionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const activeObjectionId = paramId || location.state?.objectionId;

  const [objection, setObjection] = useState<ObjectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState("");
  const [revisedAmount, setRevisedAmount] = useState<number | "">("");
  const [responseError, setResponseError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [updating, setUpdating] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editModalRef = useModalPopIn(showEditModal);
  const deleteModalRef = useModalPopIn(showDeleteModal);

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

        const formatted: ObjectionDetail = {
          id: obj.objectionId,
          caseId: obj.caseId,
          offerId: obj.offerId,
          caseTitle: obj.acquisitionCase?.caseTitle || "—",
          submittedBy: obj.offerLetter?.landOwnership?.landOwner?.name || "—",
          submittedById: obj.createdById || "—",
          submittedDate: obj.createdAt
            ? new Date(obj.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          type: "Form N",
          status: statusLabelMap[obj.status] || obj.status,
          rawStatus: obj.status,
          statusClass: statusClassMap[obj.status] || "review",
          objectionText: obj.objectionReason || "—",
          requestedAmount: Number(obj.requestedAmount || 0),
          revisedCompensation: obj.revisedCompensation ? Number(obj.revisedCompensation) : undefined,
          attachments: (obj.objectionDocuments || []).map((doc: any) => ({
            name: doc.fileName || doc.documentType || "Document",
            size: doc.fileSize || "1.2 MB",
          })),
          response: obj.reviewRemarks || undefined,
          responseDate: obj.reviewDate
            ? new Date(obj.reviewDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : undefined,
          respondedBy: obj.reviewedBy?.name || "Government Officer",
        };

        setObjection(formatted);
        setRevisedAmount(formatted.requestedAmount);
      } catch (err: any) {
        console.error("Failed to load objection:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchObjection();
  }, [activeObjectionId]);

  const handleApprove = async () => {
    if (!objection) return;
    if (!responseText.trim()) {
      setResponseError("Please provide review remarks before approving.");
      return;
    }
    setResponseError("");
    setSubmitting(true);
    try {
      const revised = revisedAmount !== "" ? Number(revisedAmount) : objection.requestedAmount;
      await compensationApi.approveObjection(objection.id, revised, responseText);
      setObjection((prev) =>
        prev
          ? {
              ...prev,
              status: "Approved / Revised",
              rawStatus: "APPROVED",
              statusClass: "approved",
              revisedCompensation: revised,
              response: responseText,
              responseDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              respondedBy: "Government Officer",
            }
          : null
      );
      alert("Objection approved successfully! Status updated to APPROVED.");
    } catch (err: any) {
      console.error("Approve failed:", err);
      alert(`Approve failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!objection) return;
    if (!responseText.trim()) {
      setResponseError("Please provide review remarks before rejecting.");
      return;
    }
    setResponseError("");
    setSubmitting(true);
    try {
      await compensationApi.rejectObjection(objection.id, responseText);
      setObjection((prev) =>
        prev
          ? {
              ...prev,
              status: "Rejected",
              rawStatus: "REJECTED",
              statusClass: "rejected",
              response: responseText,
              responseDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              respondedBy: "Government Officer",
            }
          : null
      );
      alert("Objection rejected. Status updated to REJECTED.");
    } catch (err: any) {
      console.error("Reject failed:", err);
      alert(`Reject failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = () => {
    if (!objection) return;
    setEditReason(objection.objectionText);
    setEditAmount(objection.requestedAmount);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!objection) return;
    if (typeof editAmount === "number" && editAmount <= 0) {
      alert("Requested amount must be greater than 0.");
      return;
    }
    setUpdating(true);
    try {
      await compensationApi.updateObjection(objection.id, {
        objectionReason: editReason,
        requestedAmount: Number(editAmount),
      });
      setObjection((prev) =>
        prev
          ? {
              ...prev,
              objectionText: editReason,
              requestedAmount: Number(editAmount),
            }
          : null
      );
      setShowEditModal(false);
      alert("Objection updated successfully!");
    } catch (err: any) {
      console.error("Update failed:", err);
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!objection) return;
    setDeleting(true);
    try {
      await compensationApi.deleteObjection(objection.id);
      alert("Objection deleted successfully.");
      navigate("/admin/compensation/objection");
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert(`Delete failed: ${err.message}`);
      setDeleting(false);
    }
  };

  const formatCurrency = (val: number) => `RM ${val.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div
        className="flex min-h-screen"
        style={{
          background: "var(--md-background)",
          color: "var(--md-on-surface)",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
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
        className="flex min-h-screen"
        style={{
          background: "var(--md-background)",
          color: "var(--md-on-surface)",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Objection Not Found</h3>
          <p style={{ marginBottom: "16px" }}>The requested objection record does not exist or has been removed.</p>
          <button className="btn-primary" onClick={() => navigate("/admin/compensation/objection")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isActionable = objection.rawStatus === "SUBMITTED" || objection.rawStatus === "UNDER_REVIEW";
  const isResolved = objection.rawStatus === "APPROVED" || objection.rawStatus === "REJECTED";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}>
      {/* Edit Modal */}
      {showEditModal &&
        createPortal(
          <div className="reject-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div ref={editModalRef} className="reject-modal" style={{ borderRadius: "28px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Objection Details</h3>
                <button className="close-btn" onClick={() => setShowEditModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>Requested Amount (RM) *</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label>Objection Statement *</label>
                <textarea
                  rows={5}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="btn-submit" onClick={handleSaveEdit} disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal &&
        createPortal(
          <div className="reject-modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div ref={deleteModalRef} className="reject-modal" style={{ borderRadius: "28px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ color: "#d32f2f" }}>Confirm Deletion</h3>
                <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ margin: "16px 0", color: "var(--md-on-surface-variant)" }}>
                Are you sure you want to permanently delete objection <strong>{objection.id.slice(0, 8)}...</strong>? This operation cannot be reverted.
              </p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button
                  className="btn-submit"
                  style={{ background: "#d32f2f" }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}


      <main className="main blur-shape-bg">
        <div className="objection-review">
          <div className="header-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="left">
              <div className="objection-id">{objection.id}</div>
              <div className="title">{objection.caseTitle}</div>
              <div className="meta">
                <span><Lucide.FolderOpen size={16} className="inline mr-1" /> {objection.caseId}</span>
                <span><Lucide.User size={16} className="inline mr-1" /> {objection.submittedBy}</span>
                <span><Lucide.Calendar size={16} className="inline mr-1" /> {objection.submittedDate}</span>
                <span><Lucide.FileText size={16} className="inline mr-1" /> {objection.type}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button className="btn-outline" onClick={() => navigate("/admin/compensation/objection")}>
                <ArrowLeft size={16} className="inline mr-1" /> Back
              </button>
              <span className={`status-badge-lg ${objection.statusClass}`}>
                {objection.status === "Under Review" ? <Lucide.Hourglass size={16} className="inline mr-1" /> : ""}
                {objection.status}
              </span>
            </div>
          </div>

          <div className="content-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div className="section-title" style={{ margin: 0 }}>
                <Lucide.ClipboardList size={16} className="inline mr-1" /> Objection Details
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-view"
                  style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", padding: "6px 14px", borderRadius: "100px" }}
                  onClick={handleOpenEdit}
                >
                  <Edit2 size={14} className="inline mr-1" /> Edit
                </button>
                <button
                  className="btn-view"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", padding: "6px 14px", borderRadius: "100px" }}
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 size={14} className="inline mr-1" /> Delete
                </button>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Submitted By</span>
                <span className="value">{objection.submittedBy}</span>
              </div>
              <div className="detail-item">
                <span className="label">Requested Amount</span>
                <span className="value" style={{ color: "var(--md-primary)", fontWeight: "bold" }}>
                  {formatCurrency(objection.requestedAmount)}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Submission Date</span>
                <span className="value">{objection.submittedDate}</span>
              </div>
              <div className="detail-item">
                <span className="label">Form Type</span>
                <span className="value">{objection.type}</span>
              </div>
            </div>

            <div className="objection-text">
              <div className="label">Objection Statement</div>
              <div className="text">{objection.objectionText}</div>
            </div>

            {/* Link references */}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                className="btn-outline"
                style={{ fontSize: "13px", padding: "6px 16px" }}
                onClick={() => navigate(`/admin/case/details/${objection.caseId}`)}
              >
                <ExternalLink size={14} className="inline mr-1" /> View Case Details
              </button>
              <button
                className="btn-outline"
                style={{ fontSize: "13px", padding: "6px 16px" }}
                onClick={() => navigate("/admin/compensation/offer/review", { state: { offerId: objection.offerId } })}
              >
                <FileText size={14} className="inline mr-1" /> View Associated Offer Letter
              </button>
            </div>

            {objection.attachments.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: "24px", marginBottom: "8px" }}>
                  <Lucide.Paperclip size={16} className="inline mr-1" /> Attachments
                </div>
                <div className="file-list">
                  {objection.attachments.map((a, i) => (
                    <div key={i} className="file-item">
                      <span className="file-icon"><Lucide.FileText size={14} /></span>
                      {a.name || a.fileName || "Document"}{" "}
                      <span style={{ fontSize: "12px", color: "var(--md-on-surface-variant)", opacity: 0.6, marginLeft: "8px" }}>
                        ({a.size || a.fileSize || "1.2 MB"})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isResolved && objection.response && (
              <div className="response-section" style={{ marginTop: "24px" }}>
                <div className="section-title"><Lucide.Pin size={16} className="inline mr-1" /> Review Decision</div>
                <div className="response-text">
                  <div className="label">
                    Reviewed by {objection.respondedBy || "Government Officer"}
                  </div>
                  {objection.revisedCompensation && (
                    <div style={{ marginBottom: "8px", fontWeight: "600", color: "#4caf50" }}>
                      Approved Revised Amount: {formatCurrency(objection.revisedCompensation)}
                    </div>
                  )}
                  <div className="text">{objection.response}</div>
                  {objection.responseDate && (
                    <div style={{ fontSize: "12px", color: "var(--md-on-surface-variant)", opacity: 0.6, marginTop: "8px" }}>
                      Decision Date: {objection.responseDate}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isActionable && (
              <div style={{ marginTop: "24px" }}>
                <div className="section-title"><Lucide.MessageSquare size={16} className="inline mr-1" /> Officer Review & Decision</div>

                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label htmlFor="revisedAmount" style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>
                    Revised Compensation Amount (RM)
                  </label>
                  <input
                    id="revisedAmount"
                    type="number"
                    value={revisedAmount}
                    onChange={(e) => setRevisedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Enter revised compensation if approving with revision"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid rgba(121,116,126,0.25)",
                      background: "var(--md-surface-container-low)",
                      fontSize: "14px",
                      color: "var(--md-on-surface)",
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label htmlFor="responseText" style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>
                    Review Remarks & Justification <span className="required">*</span>
                  </label>
                  <textarea
                    id="responseText"
                    rows={4}
                    placeholder="Provide detailed justification for your decision..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid rgba(121,116,126,0.25)",
                      background: "var(--md-surface-container-low)",
                      fontSize: "14px",
                      color: "var(--md-on-surface)",
                      resize: "vertical",
                      minHeight: "80px",
                    }}
                  />
                  {responseError && <div className="error-text" style={{ fontSize: "12px", color: "var(--md-error-text)", marginTop: "4px" }}>{responseError}</div>}
                </div>

                <div className="action-bar">
                  <button className="btn-reject" onClick={handleReject} disabled={submitting}>
                    <XCircle size={18} /> {submitting ? "Processing..." : "Reject Objection"}
                  </button>
                  <button className="btn-approve" onClick={handleApprove} disabled={submitting}>
                    <CheckCircle size={18} /> {submitting ? "Processing..." : "Approve Objection"}
                  </button>
                </div>

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
            FCR-SCS · Objection Review · For Government Officers
          </div>
        </div>
      </main>
    </div>
  );
};

