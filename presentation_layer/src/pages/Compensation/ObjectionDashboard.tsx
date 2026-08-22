import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronLeft, ChevronRight, Loader2, Plus, Edit2, Trash2, X } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { useModalPopIn } from "../../hooks/useModalPopIn";
import { Pagination } from "../../components/ui/Pagination";
import "../../style.css";
import "./compensation.css";


type ObjectionItem = {
  id: string;
  offerId: string;
  caseTitle: string;
  ownerName: string;
  requestedAmount: number;
  submissionDate: string;
  status: string;
  rawStatus: string;
  statusClass: string;
  reason: string;
};

const statusClassMap: Record<string, string> = {
  SUBMITTED: "pending",
  UNDER_REVIEW: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const statusLabelMap: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved / Revised",
  REJECTED: "Rejected",
};

export const ObjectionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [objections, setObjections] = useState<ObjectionItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit Modal state
  const [editItem, setEditItem] = useState<ObjectionItem | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadObjections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await compensationApi.getAllObjections({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        page: currentPage,
        limit: itemsPerPage,
      });

      const formatted: ObjectionItem[] = (res.objections || []).map((o: any) => ({
        id: o.objectionId,
        offerId: o.offerId,
        caseTitle: o.acquisitionCase?.caseTitle || "—",
        ownerName: o.offerLetter?.landOwnership?.landOwner?.name || "—",
        requestedAmount: Number(o.requestedAmount || 0),
        submissionDate: o.createdAt
          ? new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        status: statusLabelMap[o.status] || o.status,
        rawStatus: o.status,
        statusClass: statusClassMap[o.status] || "pending",
        reason: o.objectionReason || "—",
      }));

      setObjections(formatted);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      console.error("Failed to load objections:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    loadObjections();
  }, [loadObjections]);

  const handleView = (objectionId: string) => {
    navigate(`/admin/compensation/objection/review/${objectionId}`, { state: { objectionId } });
  };

  const handleCreate = () => {
    navigate("/admin/compensation/objection/create");
  };

  const handleOpenEdit = (obj: ObjectionItem) => {
    setEditItem(obj);
    setEditReason(obj.reason);
    setEditAmount(obj.requestedAmount);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    if (typeof editAmount === "number" && editAmount <= 0) {
      alert("Requested amount must be greater than 0.");
      return;
    }
    setIsUpdating(true);
    try {
      await compensationApi.updateObjection(editItem.id, {
        objectionReason: editReason,
        requestedAmount: Number(editAmount),
      });
      setEditItem(null);
      await loadObjections();
    } catch (err: any) {
      console.error("Failed to update objection:", err);
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await compensationApi.deleteObjection(deleteId);
      setDeleteId(null);
      await loadObjections();
    } catch (err: any) {
      console.error("Failed to delete objection:", err);
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return "RM " + val.toLocaleString("en-MY", { minimumFractionDigits: 2 });
  };

  const stats = [
    { label: "Total Objections", value: totalCount, icon: <Lucide.AlertCircle size={16} className="inline mr-1" /> },
    {
      label: "Under Review",
      value: objections.filter((o) => o.status === "Submitted" || o.status === "Under Review").length,
      icon: <Lucide.Clock size={16} className="inline mr-1" />,
    },
    {
      label: "Approved / Revised",
      value: objections.filter((o) => o.status === "Approved / Revised").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: objections.filter((o) => o.status === "Rejected").length,
      icon: <Lucide.XCircle size={16} className="inline mr-1" />,
    },
  ];

  const editModalRef = useModalPopIn(Boolean(editItem));
  const deleteModalRef = useModalPopIn(Boolean(deleteId));

  return (
    <div className="compensation-dashboard">
      {/* Edit Modal */}
      {editItem &&
        createPortal(
          <div className="reject-modal-overlay" onClick={() => setEditItem(null)}>
            <div ref={editModalRef} className="reject-modal" style={{ borderRadius: "28px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Objection</h3>
                <button className="close-btn" onClick={() => setEditItem(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>Case Title</label>
                <input type="text" value={editItem.caseTitle} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>Requested Amount (RM) *</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Enter requested amount"
                />
              </div>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label>Objection Details / Reason *</label>
                <textarea
                  rows={4}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Details of objection..."
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setEditItem(null)}>Cancel</button>
                <button className="btn-submit" onClick={handleSaveEdit} disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Modal */}
      {deleteId &&
        createPortal(
          <div className="reject-modal-overlay" onClick={() => setDeleteId(null)}>
            <div ref={deleteModalRef} className="reject-modal" style={{ borderRadius: "28px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ color: "var(--md-error, #cf6679)" }}>Confirm Delete Objection</h3>
                <button className="close-btn" onClick={() => setDeleteId(null)}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ margin: "16px 0", color: "var(--md-on-surface-variant)" }}>
                Are you sure you want to delete this objection record? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
                <button
                  className="btn-submit"
                  style={{ background: "#d32f2f" }}
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}


      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>Objection Management</h1>
          <div className="sub">
            Review land owner compensation objections (Form N)
          </div>
        </div>
        <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={16} className="inline mr-1" /> Submit Objection
          </button>
          <div className="avatar">AO</div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-label">{s.label}</div>
            <div className="stat-number">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-icon">
            <Lucide.Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by case title or objection ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved / Revised</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Objection ID</th>
                <th>Case Title</th>
                <th>Land Owner</th>
                <th>Requested Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                    <Loader2 size={24} className="inline animate-spin mr-2" /> Loading objections from database...
                  </td>
                </tr>
              ) : objections.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                    No objections found in database.
                  </td>
                </tr>
              ) : (
                objections.map((o) => (
                  <tr key={o.id}>
                    <td><span className="case-id" style={{ fontSize: "11px" }}>{o.id.slice(0, 8)}...</span></td>
                    <td className="case-title">{o.caseTitle}</td>
                    <td>{o.ownerName}</td>
                    <td><strong>{formatCurrency(o.requestedAmount)}</strong></td>
                    <td>{o.submissionDate}</td>
                    <td>
                      <span className={`status-badge ${o.statusClass}`}>
                        <span className="dot"></span> {o.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        <button className="btn-view" onClick={() => handleView(o.id)} title="Review Objection">
                          <Eye size={14} style={{ display: "inline", marginRight: "4px" }} /> Review
                        </button>
                        <button
                          className="btn-view"
                          style={{ background: "rgba(99, 102, 241, 0.12)", color: "#818cf8" }}
                          onClick={() => handleOpenEdit(o)}
                          title="Edit Objection"
                        >
                          <Edit2 size={13} style={{ display: "inline" }} />
                        </button>
                        <button
                          className="btn-view"
                          style={{ background: "rgba(239, 68, 68, 0.12)", color: "#f87171" }}
                          onClick={() => setDeleteId(o.id)}
                          title="Delete Objection"
                        >
                          <Trash2 size={13} style={{ display: "inline" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(totalCount / itemsPerPage))}
          totalCount={totalCount}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
          itemLabel="objections"
        />
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
        FCR-SCS · Objection Management Module · Connected to Business Logic Backend
      </div>
    </div>
  );
};

export const ObjectionList = ObjectionDashboard;

