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
import { PageHeader } from "../../components/ui/PageHeader";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { formatCurrencyRM } from "../../utils/currency";
import type { ValuationReportItem } from "./types/land-acquisition.types";
import "../../index.css";
import "../../styles/shared-report.css";
import "./valuation_report.css";

import { CaseSelectionModal } from "./CaseSelectionModal";
import { useValuationReports } from "./hooks/useValuationReports";

import {
  VALUATION_STATUS_CLASS_MAP as statusClassMap,
  VALUATION_STATUS_LABEL_MAP as statusLabelMap,
  VALUATION_STATUS_OPTIONS as STATUS_OPTIONS,
  useTableSort,
} from "../../constants";

export const ValuationDashboard: React.FC = () => {
  useDocumentTitle('Valuation Dashboard');
  const navigate = useNavigate();
  const { role, userId, isAdmin, isOfficer, isValuer, isSysAdmin } = useRole();
  const { notify } = useNotification();

  const { allScopedReports, loading } = useValuationReports({
    isAdmin,
    isOfficer,
    isValuer,
    userId,
    role,
  });

  const [reports, setReports] = useState<ValuationReportItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const itemsPerPage = 10;

  const { sortKey, sortDirection, handleSort, renderSortIcon, sortItems } = useTableSort<keyof ValuationReportItem>();

  // 2. Filter data based on search and status
  const filteredReports = React.useMemo(() => {
    let list = allScopedReports;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.caseId.toLowerCase().includes(term) ||
          r.caseTitle.toLowerCase().includes(term) ||
          r.valuer.toLowerCase().includes(term) ||
          r.id.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      const expectedLabel = statusLabelMap[statusFilter] || statusFilter;
      list = list.filter((r) => r.status === expectedLabel || r.status === statusFilter);
    }

    return list;
  }, [allScopedReports, searchTerm, statusFilter]);

  // 3. Sort the filtered reports using reusable sort helper
  const sortedReports = React.useMemo(() => {
    return sortItems(filteredReports, {
      valuationDate: (r) => (r.valuationDate && r.valuationDate !== "—" ? new Date(r.valuationDate).getTime() : 0),
    });
  }, [filteredReports, sortKey, sortDirection, sortItems]);

  // 4. Paginate the sorted data for table display
  useEffect(() => {
    setTotalCount(sortedReports.length);
    const startIndex = (currentPage - 1) * itemsPerPage;
    setReports(sortedReports.slice(startIndex, startIndex + itemsPerPage));
  }, [sortedReports, currentPage, itemsPerPage]);

  const handleView = (reportId: string) => {
    navigate(`/admin/case/valuation/review`, { state: { reportId } });
  };

  const handleCreate = () => {
    if (!isValuer && !isAdmin) {
      notify({
        type: 'error',
        title: 'Access Denied',
        message: 'Only Land Valuers can create valuation reports for assigned cases.',
      });
      return;
    }
    setIsCaseModalOpen(true);
  };

  const handleSelectCaseFromModal = (caseId: string) => {
    setIsCaseModalOpen(false);
    navigate("/admin/case/valuation/create", { state: { caseId } });
  };

  // 4. Metrics dynamically derived directly from user-scoped filtered data
  const stats = [
    { label: "Total Reports", value: filteredReports.length, icon: <Lucide.FileText size={16} className="inline mr-1" /> },
    {
      label: "Pending Review",
      value: filteredReports.filter((r) => r.status === "Pending Review").length,
      icon: <Lucide.Hourglass size={16} className="inline mr-1" />,
    },
    {
      label: "Approved",
      value: filteredReports.filter((r) => r.status === "Approved").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: filteredReports.filter((r) => r.status === "Rejected").length,
      icon: <Lucide.XCircle size={16} className="inline mr-1" />,
    },
  ];

  return (
    <div className="valuation-report-dashboard">
      <PageHeader
        title="Valuation Report Dashboard"
        subtitle={
          isAdmin
            ? "Review and manage all submitted valuation reports across the system"
            : isOfficer
            ? "Review valuation reports for land acquisition cases created by your department account"
            : isValuer
            ? "Manage and submit valuation reports for your assigned acquisition cases"
            : "Review and manage submitted valuation reports"
        }
      />

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

        {(isValuer || isSysAdmin) && (
          <div className="right">
            <Button variant="filled" onClick={handleCreate}>
              <Lucide.Plus size={16} /> New Report
            </Button>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-scroll md-scroll-thin">
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th style={{ width: "17%" }} onClick={() => handleSort("id")} className="cursor-pointer select-none">
                  Report ID {renderSortIcon("id")}
                </th>
                <th style={{ width: "17%" }} onClick={() => handleSort("caseId")} className="cursor-pointer select-none">
                  Case ID {renderSortIcon("caseId")}
                </th>
                <th style={{ width: "27%" }} onClick={() => handleSort("caseTitle")} className="cursor-pointer select-none">
                  Case Title {renderSortIcon("caseTitle")}
                </th>
                <th style={{ width: "15%" }} onClick={() => handleSort("valuer")} className="cursor-pointer select-none">
                  Valuer {renderSortIcon("valuer")}
                </th>
                <th style={{ width: "11%" }} onClick={() => handleSort("valuationDate")} className="cursor-pointer select-none">
                  Date {renderSortIcon("valuationDate")}
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
                      <div className="flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <span className="case-id font-mono text-xs font-semibold text-md-primary truncate block">{r.id}</span>
                        <CopyButton value={r.id} />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono text-xs text-md-on-surface-variant truncate block">{r.caseId}</span>
                        <CopyButton value={r.caseId} />
                      </div>
                    </td>
                    <td title={r.caseTitle}>
                      <span className="meta-text line-clamp-2 leading-snug block">{r.caseTitle}</span>
                    </td>
                    <td title={r.valuer}>
                      <span className="meta-text line-clamp-2 leading-snug block">{r.valuer}</span>
                    </td>
                    <td>
                      <span className="meta-text text-xs whitespace-nowrap">{r.valuationDate}</span>
                    </td>
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

      <div style={{ height: '32px' }} />

      <CaseSelectionModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSelectCase={handleSelectCaseFromModal}
      />
    </div>
  );
};

export const ValuationReportList = ValuationDashboard;
