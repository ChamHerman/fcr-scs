import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Eye, Loader2, Plus } from "lucide-react";
import * as Lucide from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { CaseSelectionModal } from "../LandAcquisition/CaseSelectionModal";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { SearchInput } from "../../components/ui/SearchInput";
import { CopyButton } from "../../components/ui/CopyButton";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import "../../index.css";
import "./compensation.css";

type ReportItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  caseCreatedById?: string;
  owner: string;
  totalAmount: number;
  status: string;
  statusClass: string;
  generatedDate: string;
  offerLetterGenerated: boolean;
};

import {
  COMPENSATION_STATUS_CLASS_MAP as statusClassMap,
  COMPENSATION_STATUS_LABEL_MAP as statusLabelMap,
  COMPENSATION_STATUS_OPTIONS as STATUS_OPTIONS,
} from "../../constants";

export const CompensationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userId, role, isAdmin, isOfficer, isGovAdmin, isSysAdmin } = useRole();
  const { notify } = useNotification();
  const [allScopedReports, setAllScopedReports] = useState<ReportItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const itemsPerPage = 10;

  // 1. Fetch all compensation reports within user's role scope
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const scopeParams: any = {
        limit: 1000,
      };

      if (isOfficer && !isAdmin && userId) {
        scopeParams.caseCreatedById = userId;
        scopeParams.userRole = "GOVERNMENT_OFFICER";
        scopeParams.userId = userId;
      } else if (isAdmin) {
        scopeParams.userRole = role || "ADMINISTRATOR";
      }

      const res = await compensationApi.getAllReports(scopeParams);
      const fetchedList = res.reports || [];

      // Defensive client-side RBAC filter
      const filteredList = fetchedList.filter((r: any) => {
        // 1. Administrators can view all records
        if (isAdmin) return true;

        // 2. Government Officers can only view reports for cases they created
        if (isOfficer) {
          return r.acquisitionCase?.createdById === userId;
        }

        return false;
      });

      const formatted: ReportItem[] = filteredList.map((r: any) => ({
        id: r.compensationReportId,
        caseId: r.caseId,
        caseTitle: r.acquisitionCase?.caseTitle || "—",
        caseCreatedById: r.acquisitionCase?.createdById,
        owner: r.acquisitionCase?.landParcel?.ownerships?.[0]?.landOwner?.name || "—",
        totalAmount: Number(r.totalCompensation || 0),
        status: statusLabelMap[r.status] || r.status,
        statusClass: statusClassMap[r.status] || "status-pending-comp",
        generatedDate: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        offerLetterGenerated: (r.acquisitionCase?.offerLetters || []).length > 0,
      }));

      setAllScopedReports(formatted);
    } catch (err: any) {
      console.error("Failed to load compensation reports:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isOfficer, userId, role]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // 2. Filter data based on search and status
  const filteredReports = React.useMemo(() => {
    let list = allScopedReports;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.caseId.toLowerCase().includes(term) ||
          r.caseTitle.toLowerCase().includes(term) ||
          r.owner.toLowerCase().includes(term) ||
          r.id.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      const expectedLabel = statusLabelMap[statusFilter] || statusFilter;
      list = list.filter((r) => r.status === expectedLabel || r.status === statusFilter);
    }

    return list;
  }, [allScopedReports, searchTerm, statusFilter]);

  // 3. Paginate the filtered data for table display
  useEffect(() => {
    setTotalCount(filteredReports.length);
    const startIndex = (currentPage - 1) * itemsPerPage;
    setReports(filteredReports.slice(startIndex, startIndex + itemsPerPage));
  }, [filteredReports, currentPage, itemsPerPage]);

  const handleView = (reportId: string) => {
    navigate("/admin/compensation/report/review", { state: { reportId } });
  };

  const handleCreateReport = () => {
    if (isGovAdmin) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Government Administrators cannot create compensation reports. Reports must be generated by Government Officers.',
      });
      return;
    }
    if (!isOfficer && !isSysAdmin) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only Government Officers can create compensation reports.',
      });
      return;
    }
    setIsCaseModalOpen(true);
  };

  const handleSelectCaseFromModal = (caseId: string) => {
    setIsCaseModalOpen(false);
    navigate("/admin/compensation/report/create", { state: { caseId } });
  };

  const formatCurrency = (val: number) => {
    return "RM " + val.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 4. Metrics dynamically derived directly from user-scoped filtered data
  const stats = [
    { label: "Total Reports", value: filteredReports.length, icon: <FileText size={16} className="inline mr-1" /> },
    {
      label: "Approved",
      value: filteredReports.filter((r) => r.status === "Approved").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Pending Approval",
      value: filteredReports.filter((r) => r.status === "Pending Approval").length,
      icon: <Lucide.Clock size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: filteredReports.filter((r) => r.status === "Rejected").length,
      icon: <Lucide.XCircle size={16} className="inline mr-1" />,
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
            <h1 style={{ marginBottom: 0 }}>Compensation Report Dashboard</h1>
            <div className="sub">
              {isAdmin
                ? "Review and manage all compensation calculation reports across the system"
                : isOfficer
                ? "Review and generate compensation calculation reports for cases created by your account"
                : "Review and manage compensation calculation reports"}
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
              placeholder="Search by case title or report ID..."
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

          {(isOfficer || isSysAdmin) && (
            <div className="right">
              <Button variant="filled" onClick={handleCreateReport}>
                <Plus size={16} /> New Report
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
                  <th>Case Title</th>
                  <th>Land Owner</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                      <Loader2 size={24} className="inline animate-spin mr-2" /> Loading reports from backend...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)", opacity: 0.6 }}>
                      No compensation reports found in database.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => handleView(r.id)}
                      className="cursor-pointer hover:bg-md-primary/5 transition-colors"
                    >
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="case-id font-mono text-xs">{r.id}</span>
                          <span onClick={(e) => e.stopPropagation()}>
                            <CopyButton value={r.id} />
                          </span>
                        </div>
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

export const CompensationReportList = CompensationDashboard;
