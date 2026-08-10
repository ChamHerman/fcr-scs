import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import "../../style.css";
import "./valuation_report.css";

import { CaseSelectionModal } from "./CaseSelectionModal";

type Report = {
  id: string;
  caseId: string;
  caseTitle: string;
  valuer: string;
  valuationDate: string;
  method: string;
  recommendedCompensation: string;
  status: string;
  statusClass: string;
};

const statusClassMap: Record<string, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const ValuationReportList: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const itemsPerPage = 10;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await landAcquisitionApi.getAllValuationReports({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        page: currentPage,
        limit: itemsPerPage,
      });

      const formatted: Report[] = (res.reports || []).map((r: any) => ({
        id: r.reportId,
        caseId: r.caseId,
        caseTitle: r.acquisitionCase?.caseTitle || "—",
        valuer: r.valuer?.name || "Unassigned",
        valuationDate: r.valuationDate
          ? new Date(r.valuationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        method: r.valuationMethod || "—",
        recommendedCompensation: r.recommendedCompensation
          ? `RM ${Number(r.recommendedCompensation).toLocaleString()}`
          : "—",
        status: statusLabelMap[r.reportStatus] || r.reportStatus || "Pending",
        statusClass: statusClassMap[r.reportStatus] || "pending",
      }));

      setReports(formatted);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      console.error("Failed to load valuation reports:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleView = (reportId: string) => {
    navigate(`/admin/case/valuation/review`, { state: { reportId } });
  };

  const handleCreate = () => {
    setIsCaseModalOpen(true);
  };

  const handleSelectCaseFromModal = (caseId: string) => {
    setIsCaseModalOpen(false);
    navigate("/admin/case/valuation/create", { state: { caseId } });
  };

  const stats = [
    { label: "Total Reports", value: totalCount, icon: <Lucide.FileText size={16} className="inline mr-1" /> },
    {
      label: "Pending Review",
      value: reports.filter((r) => r.status === "Pending Review").length,
      icon: <Lucide.Hourglass size={16} className="inline mr-1" />,
    },
    {
      label: "Approved",
      value: reports.filter((r) => r.status === "Approved").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: reports.filter((r) => r.status === "Rejected").length,
      icon: <Lucide.XCircle size={16} className="inline mr-1" />,
    },
  ];

  return (
    <div className="valuation-report-dashboard">
      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>Valuation Reports</h1>
          <div className="sub">
            Review and manage all submitted valuation reports
          </div>
        </div>
        <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="date-badge">
            <Lucide.Calendar size={16} className="inline mr-1" />
            {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <button className="btn-primary" onClick={handleCreate}>
            <Lucide.Plus size={16} className="inline mr-1" /> Create Report
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
            placeholder="Search by case ID, title, or valuer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Case ID</th>
                <th>Case Title</th>
                <th>Valuer</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                    <Loader2 size={24} className="inline animate-spin mr-2" /> Loading reports from database...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                    No valuation reports found in database.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="case-id" style={{ fontSize: "11px" }}>{r.id.slice(0, 8)}...</span>
                    </td>
                    <td><span style={{ fontSize: "11px" }}>{r.caseId.slice(0, 8)}...</span></td>
                    <td className="case-title">{r.caseTitle}</td>
                    <td>{r.valuer}</td>
                    <td>{r.valuationDate}</td>
                    <td>
                      <span className={`status-badge ${r.statusClass}`}>
                        <span className="dot"></span> {r.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button className="btn-view" onClick={() => handleView(r.id)}>
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
        FCR-SCS · Valuation Report Dashboard · Connected to Business Logic Backend
      </div>

      <CaseSelectionModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSelectCase={handleSelectCaseFromModal}
      />
    </div>
  );
};
