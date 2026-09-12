import * as Lucide from "lucide-react";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { SearchInput } from "../../components/ui/SearchInput";
import { CopyButton } from "../../components/ui/CopyButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import { ValuerAssignmentModal } from "./components/ValuerAssignmentModal";
import { useCaseList } from "./hooks/useCaseList";
import "../../index.css";
import "./case_management.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

import {
  CASE_STATUS_CLASS_MAP as statusClassMap,
  CASE_STATUS_LABEL_MAP as statusLabelMap,
  CASE_STATUS_OPTIONS as STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS as BASE_PROJECT_TYPE_OPTIONS,
  useTableSort,
} from "../../constants";

const PROJECT_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "All Project Types" },
  ...BASE_PROJECT_TYPE_OPTIONS.filter((opt) => opt.value !== ""),
];

export const CaseManagementDashboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notify } = useNotification();

  // Role Based Access Control Hook
  const {
    user,
    role,
    userId,
    isAdmin,
    isOfficer,
    isValuer,
    isMember,
    canAddCase,
    canAssignValuer,
  } = useRole();

  const { sortKey, sortDirection, handleSort, renderSortIcon, sortItems } = useTableSort<string>();

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Valuer Assignment Modal visibility & target case
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [selectedCaseToAssign, setSelectedCaseToAssign] = useState<any | null>(null);

  // Hook for cases and stats fetching
  const { cases, statsData, totalCount, loading, error, reload } = useCaseList(
    {
      role,
      userId,
      identificationNumber: user?.identificationNumber,
      isAdmin,
      isOfficer,
      isValuer,
      isMember,
    },
    {
      searchTerm,
      statusFilter,
      projectTypeFilter,
      currentPage,
      itemsPerPage,
    }
  );

  // Open Valuer Assignment Modal
  const handleOpenAssignModal = (caseItem: any) => {
    if (!canAssignValuer) {
      notify({
        type: "error",
        title: "Access Denied",
        message: "Only Government Administrators can assign land valuers.",
      });
      return;
    }
    setSelectedCaseToAssign(caseItem);
    setIsAssignModalOpen(true);
  };

  const sortedCases = React.useMemo(() => {
    return sortItems(cases, {
      status: (c) => statusLabelMap[c.status] || c.status || "",
      registrationDate: (c) => new Date(c.registrationDate || c.createdAt || 0).getTime(),
      projectName: (c) => c.project?.projectName || "",
      landTitleNo: (c) => c.landParcel?.landTitleNo || "",
      assignedValuer: (c) => c.caseAssignments?.[0]?.assignedTo?.name || "",
    });
  }, [cases, sortKey, sortDirection, sortItems]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setProjectTypeFilter("");
    setCurrentPage(1);
  };

  // Compute stats display strictly reflecting the user's role scope
  const stats = [
    {
      label: "Total Cases",
      value: statsData?.totalCases ?? "0",
      change: isAdmin
        ? "All database cases"
        : isOfficer
        ? "Your created cases"
        : isValuer
        ? "Your assigned cases"
        : isMember
        ? "Your land cases"
        : "User cases",
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
      change: isAdmin ? "All approved compensation" : "Your scope compensation",
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

  return (
    <div ref={containerRef}>
      <div className="main blur-shape-bg">
        {/* Top Bar */}
        <PageHeader
          title="Land Acquisition Case Dashboard"
          subtitle={
            isAdmin
              ? "Monitor and manage all land acquisition cases across the system"
              : isOfficer
              ? "Manage and monitor land acquisition cases created by your department account"
              : isValuer
              ? "Review land acquisition cases assigned to you for property valuation"
              : "Monitor land acquisition cases within your permitted scope"
          }
        />

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
            Backend Connection Warning: {error}
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
          <div className="search-wrap min-w-[280px]">
            <SearchInput
              placeholder="Search by case title or project..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="filter-group flex items-center gap-3">
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
            <Select
              label="Project Type"
              value={projectTypeFilter}
              options={PROJECT_TYPE_OPTIONS}
              onChange={(val) => {
                setProjectTypeFilter(val);
                setCurrentPage(1);
              }}
              placeholder="All Project Types"
            />
            {(searchTerm || statusFilter || projectTypeFilter) && (
              <Button variant="outlined" size="sm" onClick={handleClearFilters}>
                Clear
              </Button>
            )}
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

          {canAddCase && (
            <div className="right">
              <Button variant="filled" onClick={() => navigate("/admin/case/register")}>
                <Lucide.Plus size={16} /> New Case
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-scroll md-scroll-thin">
            <table className="w-full table-fixed">
              <thead>
                <tr>
                  <th style={{ width: "14%" }} onClick={() => handleSort("caseId")} className="cursor-pointer select-none">
                    Case ID {renderSortIcon("caseId")}
                  </th>
                  <th style={{ width: "26%" }} onClick={() => handleSort("caseTitle")} className="cursor-pointer select-none">
                    Case Title {renderSortIcon("caseTitle")}
                  </th>
                  <th style={{ width: "20%" }} onClick={() => handleSort("status")} className="cursor-pointer select-none">
                    Status {renderSortIcon("status")}
                  </th>
                  <th style={{ width: "18%" }} onClick={() => handleSort("projectName")} className="cursor-pointer select-none">
                    Project Name {renderSortIcon("projectName")}
                  </th>
                  <th style={{ width: "10%" }} onClick={() => handleSort("landTitleNo")} className="cursor-pointer select-none">
                    Land Title No. {renderSortIcon("landTitleNo")}
                  </th>
                  <th style={{ width: "12%" }} onClick={() => handleSort("assignedValuer")} className="cursor-pointer select-none">
                    Assigned Valuer {renderSortIcon("assignedValuer")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                      <Lucide.Loader2 size={24} className="inline animate-spin mr-2" /> Loading cases from database...
                    </td>
                  </tr>
                ) : sortedCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "var(--md-on-surface-variant)", opacity: 0.7 }}>
                      {isOfficer ? (
                        <p className="mb-2 font-medium">No cases found created by you.</p>
                      ) : isValuer ? (
                        <p className="font-medium">No land acquisition cases have been assigned to you yet.</p>
                      ) : (
                        <p className="font-medium">No cases found matching the search criteria.</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedCases.map((c) => {
                    const statusClass = statusClassMap[c.status] || "status-case-registered";
                    const statusLabel = statusLabelMap[c.status] || c.status;
                    const assignedValuer = c.caseAssignments?.[0]?.assignedTo?.name;

                    return (
                      <tr
                        key={c.caseId}
                        className="case-row row-clickable"
                        onClick={() => navigate("/admin/case/details", { state: { caseId: c.caseId } })}
                      >
                        <td>
                          <div className="flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <span
                              className="case-id hover:underline cursor-pointer font-mono font-semibold truncate block"
                              onClick={() => navigate("/admin/case/details", { state: { caseId: c.caseId } })}
                              title={c.caseId}
                            >
                              {c.caseId}
                            </span>
                            <CopyButton value={c.caseId} />
                          </div>
                        </td>
                        <td title={c.caseTitle}>
                          <span className="meta-text line-clamp-2 leading-snug block">{c.caseTitle}</span>
                        </td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            <span className="dot"></span> {statusLabel}
                          </span>
                        </td>
                        <td title={c.project?.projectName || "—"}>
                          <span className="meta-text line-clamp-2 leading-snug block">{c.project?.projectName || "—"}</span>
                        </td>
                        <td title={c.landParcel?.landTitleNo || "—"}>
                          <div className="flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <span className="meta-text font-mono text-xs truncate block">{c.landParcel?.landTitleNo || "—"}</span>
                            {c.landParcel?.landTitleNo && <CopyButton value={c.landParcel.landTitleNo} title="Copy Land Title No." />}
                          </div>
                        </td>
                        <td title={assignedValuer || ""}>
                          {assignedValuer ? (
                            <span className="meta-text line-clamp-2 leading-snug block">
                              {assignedValuer}
                            </span>
                          ) : canAssignValuer ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="tonal"
                                size="sm"
                                onClick={() => handleOpenAssignModal(c)}
                                className="!py-1 !px-2.5 !text-xs !h-auto flex items-center gap-1.5 font-medium whitespace-nowrap"
                              >
                                <Lucide.UserPlus size={13} /> Assign
                              </Button>
                            </div>
                          ) : (
                            <span className="meta-text text-gray-400">Unassigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(totalCount / itemsPerPage))}
            totalCount={totalCount}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            itemLabel="cases"
          />
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
          FCR-SCS · Land Acquisition Module · Connected to Live Backend Data with Role-Based Access Control
        </div>

        {/* Valuer Assignment Modal */}
        <ValuerAssignmentModal
          isOpen={isAssignModalOpen}
          targetCase={selectedCaseToAssign}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedCaseToAssign(null);
          }}
          onAssigned={reload}
        />
      </div>
    </div>
  );
};

export default CaseManagementDashboard;
