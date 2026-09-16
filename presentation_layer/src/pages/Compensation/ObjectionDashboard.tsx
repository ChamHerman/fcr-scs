import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { authService } from "../../services/auth.service";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { SearchInput } from "../../components/ui/SearchInput";
import { CopyButton } from "../../components/ui/CopyButton";
import { Pagination } from "../../components/ui/Pagination";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import { formatCurrencyRM } from "../../utils/currency";
import "../../index.css";
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
  useTableSort,
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

  const { sortKey, sortDirection, handleSort, renderSortIcon, sortItems } = useTableSort<keyof ObjectionItem>();

  // Retrieve user IC if missing in context
  useEffect(() => {
    if (user?.identificationNumber) {
      setUserIc(user.identificationNumber);
    } else if (isMember && user?.userId) {
      authService
        .getUserById(user.userId)
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

  // 3. Sort the filtered objections using reusable sort helper
  const sortedObjections = React.useMemo(() => {
    return sortItems(filteredObjections, {
      submissionDate: (o) => (o.submissionDate && o.submissionDate !== "—" ? new Date(o.submissionDate).getTime() : 0),
    });
  }, [filteredObjections, sortKey, sortDirection, sortItems]);

  // 4. Paginate the sorted data for table display
  useEffect(() => {
    setTotalCount(sortedObjections.length);
    const startIndex = (currentPage - 1) * itemsPerPage;
    setObjections(sortedObjections.slice(startIndex, startIndex + itemsPerPage));
  }, [sortedObjections, currentPage, itemsPerPage]);

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

  const formatCurrency = (val: number | string | null | undefined) => {
    return formatCurrencyRM(val);
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
      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>Objection Dashboard</h1>
          <div className="sub">
            Review land owner compensation objections
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
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th style={{ width: "18%" }} onClick={() => handleSort("id")} className="cursor-pointer select-none">
                  Objection ID {renderSortIcon("id")}
                </th>
                <th style={{ width: "26%" }} onClick={() => handleSort("caseTitle")} className="cursor-pointer select-none">
                  Case Title {renderSortIcon("caseTitle")}
                </th>
                <th style={{ width: "18%" }} onClick={() => handleSort("ownerName")} className="cursor-pointer select-none">
                  Land Owner {renderSortIcon("ownerName")}
                </th>
                <th style={{ width: "14%" }} onClick={() => handleSort("requestedAmount")} className="cursor-pointer select-none">
                  Requested Amount {renderSortIcon("requestedAmount")}
                </th>
                <th style={{ width: "11%" }} onClick={() => handleSort("submissionDate")} className="cursor-pointer select-none">
                  Date {renderSortIcon("submissionDate")}
                </th>
                <th style={{ width: "13%" }} onClick={() => handleSort("status")} className="cursor-pointer select-none">
                  Status {renderSortIcon("status")}
                </th>
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
                      <div className="flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <span className="case-id font-mono text-xs truncate block">{o.id}</span>
                        <CopyButton value={o.id} />
                      </div>
                    </td>
                    <td title={o.caseTitle}>
                      <span className="meta-text line-clamp-2 leading-snug block">{o.caseTitle}</span>
                    </td>
                    <td title={o.ownerName}>
                      <span className="meta-text line-clamp-2 leading-snug block">{o.ownerName}</span>
                    </td>
                    <td title={formatCurrency(o.requestedAmount)}>
                      <span className="meta-text line-clamp-2 leading-snug block">{formatCurrency(o.requestedAmount)}</span>
                    </td>
                    <td>
                      <span className="meta-text text-xs whitespace-nowrap">{o.submissionDate}</span>
                    </td>
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

      <div style={{ height: '32px' }} />
    </div>
  );
};

export const ObjectionList = ObjectionDashboard;

