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
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { Pagination } from "../../components/ui/Pagination";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
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

import {
  OBJECTION_STATUS_CLASS_MAP as statusClassMap,
  OBJECTION_STATUS_LABEL_MAP as statusLabelMap,
  OBJECTION_STATUS_OPTIONS as STATUS_OPTIONS,
} from "../../constants";

export const ObjectionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isMember, isOfficer, isValuer, isAdmin, isSysAdmin, userId, role } = useRole();
  const { notify } = useNotification();
  const [userIc, setUserIc] = useState<string>(() => user?.identificationNumber || "");
  const [allScopedObjections, setAllScopedObjections] = useState<ObjectionItem[]>([]);
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

  // Retrieve user IC if missing in context
  useEffect(() => {
    if (user?.identificationNumber) {
      setUserIc(user.identificationNumber);
    } else if (isMember && user?.userId) {
      fetch(`http://localhost:3030/api/users/${user.userId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.identificationNumber) {
            setUserIc(json.data.identificationNumber);
            const stored = localStorage.getItem("user_data");
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                parsed.identificationNumber = json.data.identificationNumber;
                localStorage.setItem("user_data", JSON.stringify(parsed));
              } catch (e) {}
            }
          }
        })
        .catch((err) => console.error("Failed to load user identification number:", err));
    }
  }, [user, isMember]);

  // 1. Fetch all objections within user's role scope
  const loadScopedObjections = useCallback(async () => {
    if (isValuer) {
      setAllScopedObjections([]);
      setObjections([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeMemberIc = isMember ? (userIc || user?.identificationNumber || "").trim() : undefined;
      const scopeParams: any = {
        limit: 1000,
        userRole: role,
      };

      if (isMember) {
        scopeParams.ownerNric = activeMemberIc || undefined;
        scopeParams.userId = userId;
        scopeParams.userRole = "DISPLACED_COMMUNITY_MEMBER";
      } else if (isOfficer && !isAdmin && userId) {
        scopeParams.userId = userId;
        scopeParams.userRole = "GOVERNMENT_OFFICER";
        scopeParams.caseCreatedById = userId;
      }

      const res = await compensationApi.getAllObjections(scopeParams);
      const rawObjections = res.objections || [];

      // Defensive client-side check for officer, valuer, and member
      const scopedList = rawObjections.filter((o: any) => {
        if (isValuer) return false;
        if (isAdmin) return true;
        if (isOfficer && userId) {
          return o.acquisitionCase?.createdById === userId || o.offerLetter?.createdById === userId;
        }
        if (isMember) {
          if (userId && o.createdById === userId) return true;
          if (activeMemberIc) {
            const cleanActiveIc = activeMemberIc.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const directOwnerIc = (o.offerLetter?.landOwnership?.landOwner?.nric || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            if (directOwnerIc && directOwnerIc === cleanActiveIc) return true;

            const parcelOwners = o.acquisitionCase?.landParcel?.ownerships?.map((ow: any) => ow.landOwner).filter(Boolean) || [];
            const isParcelOwner = parcelOwners.some((ow: any) => (ow.nric || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanActiveIc);
            if (isParcelOwner) return true;
          }
          return false;
        }
        return true;
      });

      const formatted: ObjectionItem[] = scopedList.map((o: any) => {
        const parcelOwners = o.acquisitionCase?.landParcel?.ownerships?.map((ow: any) => ow.landOwner).filter(Boolean) || [];
        const ownerName = parcelOwners.length > 0 ? parcelOwners.map((ow: any) => ow.name).join(", ") : (o.offerLetter?.landOwnership?.landOwner?.name || "—");

        return {
          id: o.objectionId,
          offerId: o.offerId,
          caseTitle: o.acquisitionCase?.caseTitle || "—",
          ownerName,
          requestedAmount: Number(o.requestedAmount || 0),
          submissionDate: o.createdAt
            ? new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          status: statusLabelMap[o.status] || o.status,
          rawStatus: o.status,
          statusClass: statusClassMap[o.status] || "status-objection-review",
          reason: o.objectionReason || "—",
        };
      });

      setAllScopedObjections(formatted);
    } catch (err: any) {
      console.error("Failed to load objections:", err);
    } finally {
      setLoading(false);
    }
  }, [isMember, isOfficer, isAdmin, userId, userIc, user?.identificationNumber]);

  useEffect(() => {
    loadScopedObjections();
  }, [loadScopedObjections]);

  // 2. Filter data based on search and status
  const filteredObjections = React.useMemo(() => {
    let list = allScopedObjections;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (o) =>
          o.caseTitle.toLowerCase().includes(term) ||
          o.ownerName.toLowerCase().includes(term) ||
          o.reason.toLowerCase().includes(term) ||
          o.id.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      const expectedLabel = statusLabelMap[statusFilter] || statusFilter;
      list = list.filter((o) => o.status === expectedLabel || o.rawStatus === statusFilter);
    }

    return list;
  }, [allScopedObjections, searchTerm, statusFilter]);

  // 3. Paginate the filtered data for table display
  useEffect(() => {
    setTotalCount(filteredObjections.length);
    const startIndex = (currentPage - 1) * itemsPerPage;
    setObjections(filteredObjections.slice(startIndex, startIndex + itemsPerPage));
  }, [filteredObjections, currentPage, itemsPerPage]);

  const handleView = (objectionId: string) => {
    navigate(`/admin/compensation/objection/review/${objectionId}`, { state: { objectionId } });
  };

  const handleCreate = () => {
    if (!isMember && !isSysAdmin) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only Displaced Community Members (Land Owners) can submit compensation objections.',
      });
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
      notify({
        type: 'general',
        title: 'Invalid Amount',
        message: 'Requested amount must be greater than 0.',
      });
      return;
    }
    setIsUpdating(true);
    try {
      await compensationApi.updateObjection(editItem.id, {
        objectionReason: editReason,
        requestedAmount: Number(editAmount),
      });
      setEditItem(null);
      await loadScopedObjections();
    } catch (err: any) {
      console.error("Failed to update objection:", err);
      notify({
        type: 'error',
        title: 'Update Failed',
        message: err.message,
      });
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
      notify({
        type: 'success',
        title: 'Objection Deleted',
        message: 'The Form N objection has been deleted and the compensation offer letter status has been reset to Pending.',
      });
      await loadScopedObjections();
    } catch (err: any) {
      console.error("Failed to delete objection:", err);
      notify({
        type: 'error',
        title: 'Delete Failed',
        message: err.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return "RM " + val.toLocaleString("en-MY", { minimumFractionDigits: 2 });
  };

  // 4. Metrics dynamically derived directly from filtered data
  const stats = [
    { label: "Total Objections", value: filteredObjections.length, icon: <Lucide.AlertCircle size={16} className="inline mr-1" /> },
    {
      label: "Pending Review",
      value: filteredObjections.filter((o) => o.rawStatus === "PENDING" || o.status === "Pending Review").length,
      icon: <Lucide.Clock size={16} className="inline mr-1" />,
    },
    {
      label: "Approved",
      value: filteredObjections.filter((o) => o.rawStatus === "APPROVED" || o.status === "Approved").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: filteredObjections.filter((o) => o.rawStatus === "REJECTED" || o.status === "Rejected").length,
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
          <CurrencyInput
            label="Requested Amount (RM) *"
            id="editAmount"
            placeholder="0.00"
            value={editAmount}
            onValueChange={(_formatted, num) => setEditAmount(num > 0 ? num : "")}
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
          <h1 style={{ marginBottom: 0 }}>Objection Dashboard</h1>
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

        {(isMember || isSysAdmin) && (
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

