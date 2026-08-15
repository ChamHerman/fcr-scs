import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import "../../style.css";
import "./compensation.css";

type OfferItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  ownerName: string;
  offerAmount: number;
  offerDate: string;
  expiryDate: string;
  status: string;
  statusClass: string;
  offerReferenceNo: string;
};

const statusClassMap: Record<string, string> = {
  PENDING: "pending",
  ACCEPTED: "approved",
  REJECTED: "rejected",
  EXPIRED: "closed",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Pending Response",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export const OfferLetterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [offerLetters, setOfferLetters] = useState<OfferItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadOfferLetters = useCallback(async () => {
    setLoading(true);
    try {
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
        offerAmount: Number(o.offerAmount || 0),
        offerDate: o.offerDate
          ? new Date(o.offerDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        expiryDate: o.expiryDate
          ? new Date(o.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        status: statusLabelMap[o.status] || o.status,
        statusClass: statusClassMap[o.status] || "pending",
      }));

      setOfferLetters(formatted);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      console.error("Failed to load offer letters:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    loadOfferLetters();
  }, [loadOfferLetters]);

  const handleView = (offerId: string) => {
    navigate("/admin/compensation/offer/review", { state: { offerId } });
  };

  const formatCurrency = (val: number) => {
    return "RM " + val.toLocaleString("en-MY", { minimumFractionDigits: 2 });
  };

  const stats = [
    { label: "Total Offer Letters", value: totalCount, icon: <Lucide.Mail size={16} className="inline mr-1" /> },
    {
      label: "Accepted",
      value: offerLetters.filter((o) => o.status === "Accepted").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Pending Response",
      value: offerLetters.filter((o) => o.status === "Pending Response").length,
      icon: <Lucide.Clock size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: offerLetters.filter((o) => o.status === "Rejected").length,
      icon: <Lucide.XCircle size={16} className="inline mr-1" />,
    },
  ];

  return (
    <div className="compensation-dashboard">
      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>Offer Letter Dashboard</h1>
          <div className="sub">
            Track and manage formal compensation offer letters
          </div>
        </div>
        <div className="topbar-right">
          <span className="date-badge">
            <Lucide.Calendar size={16} className="inline mr-1" />
            {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
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
            placeholder="Search by offer ref, case title, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="PENDING">Pending Response</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Offer Ref No.</th>
                <th>Case Title</th>
                <th>Land Owner</th>
                <th>Offer Amount</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                    <Loader2 size={24} className="inline animate-spin mr-2" /> Loading offer letters...
                  </td>
                </tr>
              ) : offerLetters.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                    No offer letters found in database.
                  </td>
                </tr>
              ) : (
                offerLetters.map((o) => (
                  <tr key={o.id}>
                    <td><span className="case-id" style={{ fontSize: "11px" }}>{o.offerReferenceNo}</span></td>
                    <td className="case-title">{o.caseTitle}</td>
                    <td>{o.ownerName}</td>
                    <td><strong>{formatCurrency(o.offerAmount)}</strong></td>
                    <td>{o.expiryDate}</td>
                    <td>
                      <span className={`status-badge ${o.statusClass}`}>
                        <span className="dot"></span> {o.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button className="btn-view" onClick={() => handleView(o.id)}>  
                        <Eye size={14} style={{ display: "inline", marginRight: "4px" }} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > itemsPerPage && (
          <div className="pagination">
            <div className="info">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
            </div>
            <div className="pages">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft size={16} />
              </button>
              <button className="active">{currentPage}</button>
              <button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage * itemsPerPage >= totalCount}>
                <ChevronRight size={16} />
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
        FCR-SCS · Offer Letter Dashboard · Connected to Business Logic Backend
      </div>
    </div>
  );
};
