import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { SearchInput } from "../../components/ui/SearchInput";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { Pagination } from "../../components/ui/Pagination";
import { useRole } from "../../hooks/useRole";
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
  SUBMITTED: "status-objection-review",
  UNDER_REVIEW: "status-objection-review",
  APPROVED: "status-obj-approved",
  REJECTED: "status-obj-rejected",
};

const statusLabelMap: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved / Revised",
  REJECTED: "Rejected",
};

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Status" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved / Revised" },
  { value: "REJECTED", label: "Rejected" },
];

export const ObjectionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isMember, isAdmin } = useRole();
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
        statusClass: statusClassMap[o.status] || "status-objection-review",
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
    if (!isMember && !isAdmin) {
      alert("Only Displaced Community Members (Land Owners) and Administrators can submit compensation objections.");
      return;
    }
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

  return (
    <div className="compensation-dashboard">
      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editItem)}
        onClose={() => setEditItem(null)}
        title="Edit Objection"
        subtitle={`Update details for ${editItem?.caseTitle || ""}`}
        footer={
          <>
            <Button variant="text" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={handleSaveEdit}
              isLoading={isUpdating}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Case Title"
            value={editItem?.caseTitle || ""}
            disabled
          />
          <Input
            label="Requested Amount (RM) *"
            type="number"
            value={editAmount === "" ? "" : String(editAmount)}
            onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Enter requested amount"
          />
          <Textarea
            label="Objection Details / Reason *"
            rows={4}
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Details of objection..."
          />
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Confirm Delete Objection"
        subtitle="This action cannot be undone."
        footer={
          <>
            <Button variant="text" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
            >
              Delete Permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-md-on-surface-variant">
          Are you sure you want to permanently delete this objection record from the database?
        </p>
      </Modal>

      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>Objection Management</h1>
          <div className="sub">
            Review land owner compensation objections (Form N)
          </div>
        </div>
        <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-label">{s.label}</div>
            <div className="stat-number">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar flex items-center justify-between gap-4">
        <div className="search-wrap min-w-[280px]">
          <SearchInput
            placeholder="Search by case title or objection ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="filter-group">
          <Select
            label="Status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
            placeholder="All Status"
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="left">
          <span className="count">{totalCount}</span> objections found
          <span style={{ opacity: 0.4, margin: "0 4px" }}>·</span>
          <span style={{ fontSize: "13px" }}>
            Showing {objections.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
          </span>
        </div>

        {(isMember || isAdmin) && (
          <div className="right">
            <Button variant="filled" onClick={handleCreate}>
              <Plus size={16} /> New Objection
            </Button>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-scroll md-scroll-thin">
          <table>
            <thead>
              <tr>
                <th>Objection ID</th>
                <th>Case Title</th>
                <th>Land Owner</th>
                <th>Requested Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                    <Loader2 size={24} className="inline animate-spin mr-2" /> Loading objections from database...
                  </td>
                </tr>
              ) : objections.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                    No objections found in database.
                  </td>
                </tr>
              ) : (
                objections.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => handleView(o.id)}
                    className="cursor-pointer hover:bg-md-primary/5 transition-colors"
                  >
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="case-id font-mono text-xs">{o.id}</span>
                        <span onClick={(e) => e.stopPropagation()}>
                          <CopyButton value={o.id} />
                        </span>
                      </div>
                    </td>
                    <td className="case-title">{o.caseTitle}</td>
                    <td>{o.ownerName}</td>
                    <td><strong>{formatCurrency(o.requestedAmount)}</strong></td>
                    <td>{o.submissionDate}</td>
                    <td>
                      <span className={`status-badge ${o.statusClass}`}>
                        <span className="dot"></span> {o.status}
                      </span>
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

