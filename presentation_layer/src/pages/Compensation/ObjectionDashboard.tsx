import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
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
    navigate("/compensation/objection/review", { state: { objectionId } });
  };

  const handleCreate = () => {
    navigate("/compensation/objection/create");
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
      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>Objection Management</h1>
          <div className="sub">
            Review land owner compensation objections (Form N) (Connected to Backend)
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
                <th style={{ textAlign: "center" }}>Action</th>
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
                      <button className="btn-view" onClick={() => handleView(o.id)}>
                        <Eye size={14} style={{ display: "inline", marginRight: "4px" }} /> Review
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
        FCR-SCS · Objection Management Module · Connected to Business Logic Backend
      </div>
    </div>
  );
};

export const ObjectionList = ObjectionDashboard;
