import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { SearchInput } from "../../components/ui/SearchInput";
import { CopyButton } from "../../components/ui/CopyButton";
import { Pagination } from "../../components/ui/Pagination";
import { useRole } from "../../hooks/useRole";
import "../../style.css";
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
};

const statusClassMap: Record<string, string> = {
  PENDING: "status-offer-pending",
  ACCEPTED: "status-offer-accepted",
  REJECTED: "status-offer-rejected",
  EXPIRED: "status-expired",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Pending Response",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending Response" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

const normalizeIc = (ic?: string) => (ic || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().trim();

export const OfferLetterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isMember } = useRole();
  const [userIc, setUserIc] = useState<string>(() => user?.identificationNumber || "");
  const [offerLetters, setOfferLetters] = useState<OfferItem[]>([]);
  const [allMemberOffersForStats, setAllMemberOffersForStats] = useState<OfferItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const loadOfferLetters = useCallback(async () => {
    setLoading(true);
    try {
      if (isMember) {
        // For members: fetch all offer letters, then strictly filter by matching IC
        const res = await compensationApi.getAllOfferLetters({
          limit: 1000,
        });

        const activeMemberIc = normalizeIc(userIc || user?.identificationNumber);

        // Filter: ONLY retain cases where land owner's IC matches the member's IC
        const matchingOffers: OfferItem[] = (res.offerLetters || [])
          .filter((o: any) => {
            const rawOwnerNric = o.landOwnership?.landOwner?.nric || "";
            const ownerIc = normalizeIc(rawOwnerNric);
            return activeMemberIc ? ownerIc === activeMemberIc : false;
          })
          .map((o: any) => ({
            id: o.offerId,
            offerReferenceNo: o.offerReferenceNo,
            caseId: o.caseId,
            caseTitle: o.acquisitionCase?.caseTitle || "—",
            ownerName: o.landOwnership?.landOwner?.name || "—",
            ownerNric: o.landOwnership?.landOwner?.nric || "—",
            offerAmount: Number(o.offerAmount || 0),
            offerDate: o.offerDate
              ? new Date(o.offerDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : "—",
            expiryDate: o.expiryDate
              ? new Date(o.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : "—",
            status: statusLabelMap[o.status] || o.status,
            statusClass: statusClassMap[o.status] || "status-offer-pending",
          }));

        setAllMemberOffersForStats(matchingOffers);

        // Apply local search and status filtering on the member's matching cases
        let filtered = matchingOffers;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (o) =>
              o.offerReferenceNo.toLowerCase().includes(term) ||
              o.caseTitle.toLowerCase().includes(term) ||
              o.ownerName.toLowerCase().includes(term)
          );
        }

        if (statusFilter) {
          const expectedLabel = statusLabelMap[statusFilter] || statusFilter;
          filtered = filtered.filter((o) => o.status === expectedLabel || o.status === statusFilter);
        }

        setTotalCount(filtered.length);
        const startIndex = (currentPage - 1) * itemsPerPage;
        setOfferLetters(filtered.slice(startIndex, startIndex + itemsPerPage));
      } else {
        // Non-member roles: view all cases
        const res = await compensationApi.getAllOfferLetters({
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          page: currentPage,
          limit: itemsPerPage,
        });

        const formatted: OfferItem[] = (res.offerLetters || []).map((o: any) => ({
          id: o.offerId,
          offerReferenceNo: o.offerReferenceNo,
          caseId: o.caseId,
          caseTitle: o.acquisitionCase?.caseTitle || "—",
          ownerName: o.landOwnership?.landOwner?.name || "—",
          ownerNric: o.landOwnership?.landOwner?.nric || "—",
          offerAmount: Number(o.offerAmount || 0),
          offerDate: o.offerDate
            ? new Date(o.offerDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          expiryDate: o.expiryDate
            ? new Date(o.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          status: statusLabelMap[o.status] || o.status,
          statusClass: statusClassMap[o.status] || "status-offer-pending",
        }));

        setOfferLetters(formatted);
        setTotalCount(res.total || 0);
      }
    } catch (err: any) {
      console.error("Failed to load offer letters:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, isMember, userIc, user?.identificationNumber]);

  useEffect(() => {
    loadOfferLetters();
  }, [loadOfferLetters]);

  const handleView = (offerId: string) => {
    navigate("/admin/compensation/offer/review", { state: { offerId } });
  };

  const formatCurrency = (val: number) => {
    return "RM " + val.toLocaleString("en-MY", { minimumFractionDigits: 2 });
  };

  const statsDataSource = isMember ? allMemberOffersForStats : offerLetters;
  const statsTotalCount = isMember ? allMemberOffersForStats.length : totalCount;

  const stats = [
    { label: "Total Offer Letters", value: statsTotalCount, icon: <Lucide.Mail size={16} className="inline mr-1" /> },
    {
      label: "Accepted",
      value: statsDataSource.filter((o) => o.status === "Accepted").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Pending Response",
      value: statsDataSource.filter((o) => o.status === "Pending Response" || o.status === "Pending").length,
      icon: <Lucide.Clock size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: statsDataSource.filter((o) => o.status === "Rejected").length,
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
          <table>
            <thead>
              <tr>
                <th>Offer Ref No.</th>
                <th>Case Title</th>
                <th>Land Owner</th>
                <th>Offer Amount</th>
                <th>Expiry Date</th>
                <th>Status</th>
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
                      <div className="flex items-center gap-1.5">
                        <span className="case-id font-mono text-xs">{o.offerReferenceNo}</span>
                        <span onClick={(e) => e.stopPropagation()}>
                          <CopyButton value={o.offerReferenceNo} />
                        </span>
                      </div>
                    </td>
                    <td className="case-title">{o.caseTitle}</td>
                    <td>{o.ownerName}</td>
                    <td><strong>{formatCurrency(o.offerAmount)}</strong></td>
                    <td>{o.expiryDate}</td>
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
