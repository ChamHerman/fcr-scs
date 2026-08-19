import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Eye, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import * as Lucide from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { CaseSelectionModal } from "../LandAcquisition/CaseSelectionModal";
import { Pagination } from "../../components/ui/Pagination";
import "../../style.css";
import "./compensation.css";

type ReportItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  owner: string;
  totalAmount: number;
  status: string;
  statusClass: string;
  generatedDate: string;
  offerLetterGenerated: boolean;
};

const statusClassMap: Record<string, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const CompensationReportList: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportItem[]>([]);
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
      const res = await compensationApi.getAllReports({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        page: currentPage,
        limit: itemsPerPage,
      });

      const formatted: ReportItem[] = (res.reports || []).map((r: any) => ({
        id: r.compensationReportId,
        caseId: r.caseId,
        caseTitle: r.acquisitionCase?.caseTitle || "—",
        owner: r.acquisitionCase?.landParcel?.ownerships?.[0]?.landOwner?.name || "—",
        totalAmount: Number(r.totalCompensation || 0),
        status: statusLabelMap[r.status] || r.status,
        statusClass: statusClassMap[r.status] || "pending",
        generatedDate: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        offerLetterGenerated: (r.acquisitionCase?.offerLetters || []).length > 0,
      }));

      setReports(formatted);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      console.error("Failed to load compensation reports:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleView = (reportId: string) => {
    navigate("/admin/compensation/report/review", { state: { reportId } });
  };

  const handleCreateReport = () => {
    setIsCaseModalOpen(true);
  };

  const handleSelectCaseFromModal = (caseId: string) => {
    setIsCaseModalOpen(false);
    navigate("/admin/compensation/report/create", { state: { caseId } });
  };

  const formatCurrency = (val: number) => {
    return "RM " + val.toLocaleString("en-MY", { minimumFractionDigits: 2 });
  };

  const stats = [
    { label: "Total Reports", value: totalCount, icon: <FileText size={16} className="inline mr-1" /> },
    {
      label: "Approved",
      value: reports.filter((r) => r.status === "Approved").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Pending Approval",
      value: reports.filter((r) => r.status === "Pending Approval").length,
      icon: <Lucide.Clock size={16} className="inline mr-1" />,
    },
    {
      label: "Total Value",
      value: `RM ${(reports.reduce((s, r) => s + r.totalAmount, 0) / 1_000_000).toFixed(1)}M`,
      icon: <Lucide.DollarSign size={16} className="inline mr-1" />,
    },
  ];

  return (
    <>
      {/* Case Selection Modal */}
      <CaseSelectionModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSelectCase={handleSelectCaseFromModal}
        allowedStatuses={["VALUATION_APPROVED", "COMPENSATION_REJECTED"]}
        title="Select Case for Compensation Report"
        subtitle="Choose a case in Valuation Approved or Compensation Rejected status to create a report."
        emptyMessage="No cases currently in Valuation Approved or Compensation Rejected status."
      />

      <div className="compensation-dashboard">
        <div className="topbar" style={{ marginBottom: "20px" }}>
          <div className="topbar-left">
            <h1 style={{ marginBottom: 0 }}>Compensation Reports</h1>
            <div className="sub">
              Review and generate compensation calculation reports
            </div>
          </div>
          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button className="btn-primary" onClick={handleCreateReport}>
              <Plus size={16} className="inline mr-1" /> Create Compensation Report
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
              placeholder="Search by case title or report ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="PENDING">Pending Approval</option>
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
                  <th>Case Title</th>
                  <th>Land Owner</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                      <Loader2 size={24} className="inline animate-spin mr-2" /> Loading reports from backend...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                      No compensation reports found in database.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="case-id" style={{ fontSize: "11px" }}>{r.id.slice(0, 8)}...</span>
                      </td>
                      <td className="case-title">{r.caseTitle}</td>
                      <td>{r.owner}</td>
                      <td><strong>{formatCurrency(r.totalAmount)}</strong></td>
                      <td>
                        <span className={`status-badge ${r.statusClass}`}>
                          <span className="dot"></span> {r.status}
                        </span>
                      </td>
                      <td>{r.generatedDate}</td>
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

          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(totalCount / itemsPerPage))}
            totalCount={totalCount}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            itemLabel="reports"
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
          FCR-SCS · Compensation Report Module · Connected to Business Logic Backend
        </div>
      </div>
    </>
  );
};
