import * as Lucide from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { SearchInput } from "../../components/ui/SearchInput";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import "../../style.css";
import "./valuation_report.css";

import { CaseSelectionModal } from "./CaseSelectionModal";

type Report = {
  id: string;
  caseId: string;
  caseTitle: string;
  caseCreatedById?: string;
  valuer: string;
  valuerId?: string;
  valuationDate: string;
  method: string;
  recommendedCompensation: string;
  status: string;
  statusClass: string;
};

const statusClassMap: Record<string, string> = {
  PENDING: "status-pending-valuation",
  APPROVED: "status-valuation-approved",
  REJECTED: "status-valuation-rejected",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export const ValuationReportList: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, userId, isAdmin, isOfficer, isValuer } = useRole();

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
      const scopeParams: any = {
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        page: currentPage,
        limit: itemsPerPage,
      };

      // Role-Based scoping parameters for backend API
      if (isOfficer && !isAdmin && userId) {
        scopeParams.caseCreatedById = userId;
        scopeParams.userRole = "GOVERNMENT_OFFICER";
        scopeParams.userId = userId;
      } else if (isValuer && !isAdmin && userId) {
        scopeParams.valuerId = userId;
        scopeParams.userRole = "LAND_VALUER";
        scopeParams.userId = userId;
      } else if (isAdmin) {
        scopeParams.userRole = role || "ADMINISTRATOR";
      }

      const res = await landAcquisitionApi.getAllValuationReports(scopeParams);
      const fetchedList = res.reports || [];

      // Defensive client-side RBAC filter
      const filteredList = fetchedList.filter((r: any) => {
        // 1. System Admin and Government Administrator can view all records
        if (isAdmin) return true;

        // 2. Government Officer can only view reports under cases they created
        if (isOfficer) {
          return r.acquisitionCase?.createdById === userId;
        }

        // 3. Land Valuer can view reports evaluated by them or for cases assigned to them
        if (isValuer) {
          return (
            r.valuerId === userId ||
            r.valuer?.userId === userId ||
            r.createdById === userId ||
            r.acquisitionCase?.caseAssignments?.some(
              (a: any) => a.assignedToId === userId || a.assignedTo?.userId === userId
            )
          );
        }

        return false;
      });

      const formatted: Report[] = filteredList.map((r: any) => ({
        id: r.reportId,
        caseId: r.caseId,
        caseTitle: r.acquisitionCase?.caseTitle || "—",
        caseCreatedById: r.acquisitionCase?.createdById,
        valuer: r.valuer?.name || "Unassigned",
        valuerId: r.valuerId,
        valuationDate: r.valuationDate
          ? new Date(r.valuationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        method: r.valuationMethod || "—",
        recommendedCompensation: r.recommendedCompensation
          ? `RM ${Number(r.recommendedCompensation).toLocaleString()}`
          : "—",
        status: statusLabelMap[r.reportStatus] || r.reportStatus || "Pending",
        statusClass: statusClassMap[r.reportStatus] || "status-pending-valuation",
      }));

      setReports(formatted);
      setTotalCount(res.total || formatted.length);
    } catch (err: any) {
      console.error("Failed to load valuation reports:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, isAdmin, isOfficer, isValuer, userId, role]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleView = (reportId: string) => {
    navigate(`/admin/case/valuation/review`, { state: { reportId } });
  };

  const handleCreate = () => {
    if (!isValuer && !isAdmin) {
      alert("Only Land Valuers can create valuation reports for assigned cases.");
      return;
    }
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
            {isAdmin
              ? "Review and manage all submitted valuation reports across the system"
              : isOfficer
              ? "Review valuation reports for land acquisition cases created by your department account"
              : isValuer
              ? "Manage and submit valuation reports for your assigned acquisition cases"
              : "Review and manage submitted valuation reports"}
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
            placeholder="Search by case ID, title, or valuer..."
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
          <span className="count">{totalCount}</span> reports found
          <span style={{ opacity: 0.4, margin: "0 4px" }}>·</span>
          <span style={{ fontSize: "13px" }}>
            Showing {reports.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
          </span>
        </div>

        {(isValuer || isAdmin) && (
          <div className="right">
            <Button variant="filled" onClick={handleCreate}>
              <Lucide.Plus size={16} /> New Report
            </Button>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-scroll md-scroll-thin">
          <table>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Case ID</th>
                <th>Case Title</th>
                <th>Valuer</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                    <Loader2 size={24} className="inline animate-spin mr-2" /> Loading reports from database...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                    No valuation reports found in database.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => handleView(r.id)}
                    className="cursor-pointer hover:bg-md-primary/5 transition-colors"
                    title="Click to view report details"
                  >
                    <td>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="case-id font-mono text-xs font-semibold text-md-primary">{r.id}</span>
                        <CopyButton value={r.id} />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono text-xs text-md-on-surface-variant">{r.caseId}</span>
                        <CopyButton value={r.caseId} />
                      </div>
                    </td>
                    <td className="case-title font-medium text-md-on-surface">{r.caseTitle}</td>
                    <td>{r.valuer}</td>
                    <td>{r.valuationDate}</td>
                    <td>
                      <span className={`status-badge ${r.statusClass}`}>
                        <span className="dot"></span> {r.status}
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
