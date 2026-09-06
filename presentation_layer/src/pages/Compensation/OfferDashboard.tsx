import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { authService } from "../../services/auth.service";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { SearchInput } from "../../components/ui/SearchInput";
import { CopyButton } from "../../components/ui/CopyButton";
import { Pagination } from "../../components/ui/Pagination";
import { useRole } from "../../hooks/useRole";
import "../../index.css";
import "./compensation.css";

type OfferItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  ownerName: string;
  ownerNric: string;
  offerAmount: number;
  offerDate: string;
  expiryDate: string;
  status: string;
  statusClass: string;
  offerReferenceNo: string;
  isMultiOwner?: boolean;
  acceptedCount?: number;
  totalOwners?: number;
};

import {
  OFFER_STATUS_CLASS_MAP as statusClassMap,
  OFFER_STATUS_LABEL_MAP as statusLabelMap,
  OFFER_STATUS_OPTIONS as STATUS_OPTIONS,
  useTableSort,
} from "../../constants";

const normalizeIc = (ic?: string) => (ic || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().trim();

export const OfferDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isMember, isOfficer, isValuer, isAdmin, userId, role } = useRole();
  const [userIc, setUserIc] = useState<string>(() => user?.identificationNumber || "");
  const [allScopedOffers, setAllScopedOffers] = useState<OfferItem[]>([]);
  const [offerLetters, setOfferLetters] = useState<OfferItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { sortKey, sortDirection, handleSort, renderSortIcon, sortItems } = useTableSort<keyof OfferItem>();

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

  // 1. Fetch all offer letters in user's scope
  const loadScopedOfferLetters = useCallback(async () => {
    if (isValuer) {
      setAllScopedOffers([]);
      setOfferLetters([]);
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
      } else if (isOfficer && !isAdmin && userId) {
        scopeParams.userId = userId;
        scopeParams.userRole = "GOVERNMENT_OFFICER";
        scopeParams.caseCreatedById = userId;
      }

      const res = await compensationApi.getAllOfferLetters(scopeParams);
      const rawOffers = res.offerLetters || [];

      // Defensive client-side check for officer and valuer
      const scopedOffers = rawOffers.filter((o: any) => {
        if (isValuer) return false;
        if (isAdmin) return true;
        if (isOfficer && userId) {
          return o.createdById === userId || o.acquisitionCase?.createdById === userId;
        }
        return true;
      });

      const formatted: OfferItem[] = scopedOffers.map((o: any) => {
        const parcelOwners = o.acquisitionCase?.landParcel?.ownerships?.map((ow: any) => ow.landOwner).filter(Boolean) || [];
        const ownerName = parcelOwners.length > 0 ? parcelOwners.map((ow: any) => ow.name).join(", ") : (o.landOwnership?.landOwner?.name || "—");
        const ownerNric = parcelOwners.length > 0 ? parcelOwners.map((ow: any) => ow.nric).join(", ") : (o.landOwnership?.landOwner?.nric || "—");

        const isMultiOwner = parcelOwners.length > 1;
        const memberResponses: any[] = o.memberResponses || [];
        const acceptedCount = parcelOwners.filter((owner: any) =>
          memberResponses.some((r) => r.ownerId === owner.ownerId && r.status === "ACCEPTED")
        ).length;

        return {
          id: o.offerId,
          offerReferenceNo: o.offerReferenceNo,
          caseId: o.caseId,
          caseTitle: o.acquisitionCase?.caseTitle || "—",
          ownerName,
          ownerNric,
          offerAmount: Number(o.offerAmount || 0),
          offerDate: o.offerDate
            ? new Date(o.offerDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          expiryDate: o.expiryDate
            ? new Date(o.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          status: statusLabelMap[o.status] || o.status,
          statusClass: statusClassMap[o.status] || "status-offer-pending",
          isMultiOwner,
          acceptedCount,
          totalOwners: parcelOwners.length,
        };
      });

      setAllScopedOffers(formatted);
    } catch (err: any) {
      console.error("Failed to load offer letters:", err);
    } finally {
      setLoading(false);
    }
  }, [isMember, isOfficer, isAdmin, userId, userIc, user?.identificationNumber]);

  useEffect(() => {
    loadScopedOfferLetters();
  }, [loadScopedOfferLetters]);

  // 2. Filter data based on search and status
  const filteredOffers = React.useMemo(() => {
    let list = allScopedOffers;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(term) ||
          (o.offerReferenceNo && o.offerReferenceNo.toLowerCase().includes(term)) ||
          o.caseTitle.toLowerCase().includes(term) ||
          o.ownerName.toLowerCase().includes(term) ||
          o.ownerNric.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      const expectedLabel = statusLabelMap[statusFilter] || statusFilter;
      list = list.filter((o) => o.status === expectedLabel || o.status === statusFilter);
    }

    return list;
  }, [allScopedOffers, searchTerm, statusFilter]);

  // 3. Sort the filtered offers using reusable sort helper
  const sortedOffers = React.useMemo(() => {
    return sortItems(filteredOffers, {
      expiryDate: (o) => (o.expiryDate && o.expiryDate !== "—" ? new Date(o.expiryDate).getTime() : 0),
    });
  }, [filteredOffers, sortKey, sortDirection, sortItems]);

  // 4. Paginate the sorted data for table display
  useEffect(() => {
    setTotalCount(sortedOffers.length);
    const startIndex = (currentPage - 1) * itemsPerPage;
    setOfferLetters(sortedOffers.slice(startIndex, startIndex + itemsPerPage));
  }, [sortedOffers, currentPage, itemsPerPage]);

  const handleView = (offerId: string) => {
    navigate("/admin/compensation/offer/review", { state: { offerId } });
  };

  const formatCurrency = (val: number) => {
    return "RM " + val.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 4. Metrics dynamically derived directly from filtered data
  const stats = [
    { label: "Total Offer Letters", value: filteredOffers.length, icon: <Lucide.Mail size={16} className="inline mr-1" /> },
    {
      label: "Accepted",
      value: filteredOffers.filter((o) => o.status === "Accepted").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Pending Response",
      value: filteredOffers.filter((o) => o.status === "Pending Response" || o.status === "Pending").length,
      icon: <Lucide.Clock size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: filteredOffers.filter((o) => o.status === "Rejected").length,
      icon: <Lucide.XCircle size={16} className="inline mr-1" />,
    },
  ];

  return (
    <div className="compensation-dashboard">
      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>Offer Letter Dashboard</h1>
          <div className="sub">
            {isMember ? "View and respond to your compensation offer letters" : "Track and manage formal compensation offer letters"}
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
            placeholder="Search by offer ref, case title, or owner..."
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
          <span className="count">{totalCount}</span> offer letters found
          <span style={{ opacity: 0.4, margin: "0 4px" }}>·</span>
          <span style={{ fontSize: "13px" }}>
            Showing {offerLetters.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
          </span>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll md-scroll-thin">
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th style={{ width: "18%" }} onClick={() => handleSort("id")} className="cursor-pointer select-none">
                  Offer ID {renderSortIcon("id")}
                </th>
                <th style={{ width: "26%" }} onClick={() => handleSort("caseTitle")} className="cursor-pointer select-none">
                  Case Title {renderSortIcon("caseTitle")}
                </th>
                <th style={{ width: "18%" }} onClick={() => handleSort("ownerName")} className="cursor-pointer select-none">
                  Land Owner {renderSortIcon("ownerName")}
                </th>
                <th style={{ width: "14%" }} onClick={() => handleSort("offerAmount")} className="cursor-pointer select-none">
                  Offer Amount {renderSortIcon("offerAmount")}
                </th>
                <th style={{ width: "11%" }} onClick={() => handleSort("expiryDate")} className="cursor-pointer select-none">
                  Expiry Date {renderSortIcon("expiryDate")}
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
                    <Loader2 size={24} className="inline animate-spin mr-2" /> Loading offer letters...
                  </td>
                </tr>
              ) : offerLetters.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                    {isMember
                      ? "No offer letters found matching your registered identification number (IC)."
                      : "No offer letters found in database."}
                  </td>
                </tr>
              ) : (
                offerLetters.map((o) => (
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
                    <td title={formatCurrency(o.offerAmount)}>
                      <span className="meta-text line-clamp-2 leading-snug block">{formatCurrency(o.offerAmount)}</span>
                    </td>
                    <td>
                      <span className="meta-text text-xs whitespace-nowrap">{o.expiryDate}</span>
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <span className={`status-badge ${o.statusClass}`}>
                          <span className="dot"></span> {o.status}
                        </span>
                        {o.isMultiOwner && (o.status === "Pending Response" || o.status === "Pending") && (
                          <span className="text-[10px] font-semibold text-md-primary/80 font-mono">
                            {o.acceptedCount}/{o.totalOwners} Accepted
                          </span>
                        )}
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
          itemLabel="letters"
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
        FCR-SCS · Offer Letter Dashboard · Connected to Business Logic Backend
      </div>
    </div>
  );
};

export const OfferLetterDashboard = OfferDashboard;
