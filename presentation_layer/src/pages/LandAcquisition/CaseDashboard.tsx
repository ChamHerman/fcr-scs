import * as Lucide from "lucide-react";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import "../../style.css";
import "./case_management.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const statusClassMap: Record<string, string> = {
  CASE_REGISTERED: "registered",
  VALUER_ASSIGNED: "valuation",
  VALUATION_IN_PROGRESS: "valuation",
  PENDING_VALUATION_APPROVAL: "pending",
  VALUATION_APPROVED: "approved",
  VALUATION_REJECTED: "rejected",
  PENDING_COMPENSATION_APPROVAL: "pending",
  COMPENSATION_APPROVED: "approved",
  COMPENSATION_REJECTED: "rejected",
  OFFER_ISSUED: "offer",
  OFFER_REJECTED: "rejected",
  PAYMENT_IN_PROGRESS: "payment",
  PAYMENT_COMPLETED: "approved",
  CASE_CLOSED: "closed",
};

const statusLabelMap: Record<string, string> = {
  CASE_REGISTERED: "Case Registered",
  VALUER_ASSIGNED: "Valuer Assigned",
  VALUATION_IN_PROGRESS: "Valuation In Progress",
  PENDING_VALUATION_APPROVAL: "Pending Valuation Approval",
  VALUATION_APPROVED: "Valuation Approved",
  VALUATION_REJECTED: "Valuation Rejected",
  PENDING_COMPENSATION_APPROVAL: "Pending Compensation Approval",
  COMPENSATION_APPROVED: "Compensation Approved",
  COMPENSATION_REJECTED: "Compensation Rejected",
  OFFER_ISSUED: "Offer Issued",
  OFFER_REJECTED: "Offer Rejected",
  PAYMENT_IN_PROGRESS: "Payment In Progress",
  PAYMENT_COMPLETED: "Payment Completed",
  CASE_CLOSED: "Case Closed",
};

export const CaseManagementDashboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // State
  const [cases, setCases] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Load data from API
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [casesRes, statsRes] = await Promise.all([
        landAcquisitionApi.getAllCases({
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          projectType: projectTypeFilter || undefined,
          page: currentPage,
          limit: itemsPerPage,
        }),
        landAcquisitionApi.getCaseStats(),
      ]);

      setCases(casesRes.cases || []);
      setTotalCount(casesRes.total || 0);
      setStatsData(statsRes);
    } catch (err: any) {
      console.error("Failed to fetch case dashboard data:", err);
      setError(err.message || "Failed to load dashboard data from backend.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, projectTypeFilter, currentPage]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadDashboardData();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setProjectTypeFilter("");
    setCurrentPage(1);
  };

  // Compute stats display
  const stats = [
    {
      label: "Total Cases",
      value: statsData?.totalCases ?? "0",
      change: "Live backend metric",
      icon: <Lucide.Folder size={16} className="inline" />,
      trend: "up",
    },
    {
      label: "Active",
      value: statsData?.active ?? "0",
      change: "Cases in progress",
      icon: <Lucide.Hourglass size={16} className="inline" />,
      trend: "up",
    },
    {
      label: "Completed",
      value: statsData?.completed ?? "0",
      change: "Paid & closed cases",
      icon: <Lucide.CheckCircle size={16} className="inline" />,
      trend: "up",
    },
    {
      label: "Pending Action",
      value: statsData?.pendingAction ?? "0",
      change: "Requires review",
      icon: <Lucide.Clock size={16} className="inline" />,
      trend: "down",
    },
    {
      label: "Total Compensation",
      value: statsData?.totalCompensation
        ? `RM ${(Number(statsData.totalCompensation) / 1_000_000).toFixed(1)}M`
        : "RM 0.0M",
      change: "Approved compensation",
      icon: <Lucide.CircleDollarSign size={16} className="inline" />,
      trend: "up",
    },
  ];

  useGSAP(
    () => {
      if (loading) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          all: "(min-width: 0px)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };
          if (reduceMotion) return;

          gsap.fromTo(
            ".stat-card",
            { y: 20, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.4,
              stagger: 0.08,
              ease: "power3.out",
            }
          );

          gsap.fromTo(
            ".case-row",
            { x: -15, autoAlpha: 0 },
            {
              x: 0,
              autoAlpha: 1,
              duration: 0.35,
              stagger: 0.05,
              ease: "power3.out",
            }
          );
        }
      );
    },
    { scope: containerRef, dependencies: [loading, cases] }
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div ref={containerRef}>
      <div className="main blur-shape-bg">
        {/* Top Bar */}
        <div className="topbar">
          <div className="topbar-left">
            <h1>Case Management</h1>
            <div className="sub">
              Monitor and manage all land acquisition cases
            </div>
          </div>
          <div className="topbar-right">
            <span className="date-badge">
              <Lucide.Calendar size={16} className="inline mr-1" />
              {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <div className="avatar">
              <Lucide.User size={16} />
            </div>
          </div>
        </div>

        {/* Connection status warning if error */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "14px",
            }}
          >
            <Lucide.AlertCircle size={16} className="inline mr-2" />
            Backend Connection Warning: {error} (Ensure backend server on port 3030 is running)
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <div className="stat-card" key={idx}>
              <span className="stat-icon">{stat.icon}</span>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-number">{stat.value}</div>
              <span className={`stat-change ${stat.trend === "down" ? "negative" : ""}`}>
                {stat.change}
              </span>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-wrap">
            <span className="search-icon">
              <Lucide.Search size={16} className="inline" />
            </span>
            <input
              type="text"
              placeholder="Search by case title or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
            />
          </div>
          <div className="filter-group">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="CASE_REGISTERED">Case Registered</option>
              <option value="VALUER_ASSIGNED">Valuer Assigned</option>
              <option value="VALUATION_IN_PROGRESS">Valuation In Progress</option>
              <option value="PENDING_VALUATION_APPROVAL">Pending Valuation Approval</option>
              <option value="VALUATION_APPROVED">Valuation Approved</option>
              <option value="VALUATION_REJECTED">Valuation Rejected</option>
              <option value="PENDING_COMPENSATION_APPROVAL">Pending Compensation Approval</option>
              <option value="COMPENSATION_APPROVED">Compensation Approved</option>
              <option value="COMPENSATION_REJECTED">Compensation Rejected</option>
              <option value="OFFER_ISSUED">Offer Issued</option>
              <option value="OFFER_REJECTED">Offer Rejected</option>
              <option value="PAYMENT_IN_PROGRESS">Payment In Progress</option>
              <option value="PAYMENT_COMPLETED">Payment Completed</option>
              <option value="CASE_CLOSED">Case Closed</option>
            </select>
            <select value={projectTypeFilter} onChange={(e) => setProjectTypeFilter(e.target.value)}>
              <option value="">All Project Types</option>
              <option value="Public Amenities">Public Amenities</option>
              <option value="Transportation Development">Transportation Development</option>
              <option value="Urban Redevelopment">Urban Redevelopment</option>
              <option value="Tourism Development">Tourism Development</option>
            </select>
            <button className="btn-filter" onClick={handleApplyFilters}>
              Apply Filters
            </button>
            <button className="btn-clear" onClick={handleClearFilters}>
              Clear
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          <div className="left">
            <span className="count">{totalCount}</span> cases found
            <span style={{ opacity: 0.4, margin: "0 4px" }}>·</span>
            <span style={{ fontSize: "13px" }}>
              Showing {cases.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
              {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
            </span>
          </div>
          <div className="right">
            <button className="btn-primary" onClick={() => navigate("/admin/case/register")}>
              <Lucide.Plus size={16} className="inline mr-1" /> New Case
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Case Title</th>
                  <th>Status</th>
                  <th>Registration Date</th>
                  <th>Project Name</th>
                  <th>Land Title No.</th>
                  <th>Assigned Valuer</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                      <Lucide.Loader2 size={24} className="inline animate-spin mr-2" /> Loading cases from database...
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                      No cases found in database. Click "New Case" to register one!
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => {
                    const statusClass = statusClassMap[c.status] || "registered";
                    const statusLabel = statusLabelMap[c.status] || c.status;
                    const assignedValuer =
                      c.caseAssignments?.[0]?.assignedTo?.name || "—";

                    return (
                      <tr
                        key={c.caseId}
                        className="case-row"
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate("/admin/case/details", { state: { caseId: c.caseId } })}
                      >
                        <td>
                          <span className="case-id" style={{ fontSize: "12px" }}>
                            {c.caseId.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="case-title">{c.caseTitle}</td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            <span className="dot"></span> {statusLabel}
                          </span>
                        </td>
                        <td>
                          <span className="meta-text">{formatDate(c.registrationDate)}</span>
                        </td>
                        <td>
                          <span className="meta-text">{c.project?.projectName || "—"}</span>
                        </td>
                        <td>
                          <span className="meta-text">{c.landParcel?.landTitleNo || "—"}</span>
                        </td>
                        <td>
                          <span className="meta-text">
                            <strong>{assignedValuer}</strong>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > itemsPerPage && (
            <div className="pagination">
              <div className="info">
                Showing <strong>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalCount)}</strong> of <strong>{totalCount}</strong> cases
              </div>
              <div className="pages">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                  ‹
                </button>
                <button className="active">{currentPage}</button>
                <button disabled={currentPage * itemsPerPage >= totalCount} onClick={() => setCurrentPage((p) => p + 1)}>
                  ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
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
          FCR-SCS · Land Acquisition Module · Connected to Live Backend Data
        </div>
      </div>
    </div>
  );
};
