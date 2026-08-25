import * as Lucide from "lucide-react";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { SearchInput } from "../../components/ui/SearchInput";
import { CopyButton } from "../../components/ui/CopyButton";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { useRole } from "../../hooks/useRole";
import "../../style.css";
import "./case_management.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const statusClassMap: Record<string, string> = {
  CASE_REGISTERED: "status-case-registered",
  VALUER_ASSIGNED: "status-valuer-assigned",
  VALUATION_IN_PROGRESS: "status-valuation-progress",
  PENDING_VALUATION_APPROVAL: "status-pending-valuation",
  VALUATION_APPROVED: "status-valuation-approved",
  VALUATION_REJECTED: "status-valuation-rejected",
  PENDING_COMPENSATION_APPROVAL: "status-pending-comp",
  COMPENSATION_APPROVED: "status-comp-approved",
  COMPENSATION_REJECTED: "status-comp-rejected",
  OFFER_ISSUED: "status-offer-issued",
  OFFER_REJECTED: "status-offer-rejected",
  PAYMENT_IN_PROGRESS: "status-payment-progress",
  PAYMENT_COMPLETED: "status-payment-completed",
  CASE_CLOSED: "status-case-closed",
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

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Status" },
  { value: "CASE_REGISTERED", label: "Case Registered" },
  { value: "VALUER_ASSIGNED", label: "Valuer Assigned" },
  { value: "VALUATION_IN_PROGRESS", label: "Valuation In Progress" },
  { value: "PENDING_VALUATION_APPROVAL", label: "Pending Valuation Approval" },
  { value: "VALUATION_APPROVED", label: "Valuation Approved" },
  { value: "VALUATION_REJECTED", label: "Valuation Rejected" },
  { value: "PENDING_COMPENSATION_APPROVAL", label: "Pending Compensation Approval" },
  { value: "COMPENSATION_APPROVED", label: "Compensation Approved" },
  { value: "COMPENSATION_REJECTED", label: "Compensation Rejected" },
  { value: "OFFER_ISSUED", label: "Offer Issued" },
  { value: "OFFER_REJECTED", label: "Offer Rejected" },
  { value: "PAYMENT_IN_PROGRESS", label: "Payment In Progress" },
  { value: "PAYMENT_COMPLETED", label: "Payment Completed" },
  { value: "CASE_CLOSED", label: "Case Closed" },
];

const PROJECT_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "All Project Types" },
  { value: "Public Amenities", label: "Public Amenities" },
  { value: "Transportation Development", label: "Transportation Development" },
  { value: "Urban Redevelopment", label: "Urban Redevelopment" },
  { value: "Tourism Development", label: "Tourism Development" },
];

export const CaseManagementDashboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Role Based Access Control Hook
  const {
    user,
    role,
    userId,
    isAdmin,
    isOfficer,
    isValuer,
    canAddCase,
    canEditCaseDetails,
    canAssignValuer,
    canDeleteCase,
  } = useRole();

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

  // Valuer Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [selectedCaseToAssign, setSelectedCaseToAssign] = useState<any | null>(null);
  const [valuers, setValuers] = useState<any[]>([]);
  const [loadingValuers, setLoadingValuers] = useState<boolean>(false);
  const [selectedValuerId, setSelectedValuerId] = useState<string>("");
  const [acceptancePeriod, setAcceptancePeriod] = useState<string>("7");
  const [assignmentRemarks, setAssignmentRemarks] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Open Valuer Assignment Modal
  const handleOpenAssignModal = async (caseItem: any) => {
    if (!canAssignValuer) {
      alert("Only Government Administrators can assign land valuers.");
      return;
    }

    setSelectedCaseToAssign(caseItem);
    setSelectedValuerId("");
    setAcceptancePeriod("7");
    setAssignmentRemarks("");
    setAssignError(null);
    setIsAssignModalOpen(true);

    // Fetch available certified land valuers
    setLoadingValuers(true);
    try {
      const res = await landAcquisitionApi.getAvailableValuers();
      const valuerList = res.valuers || [];
      setValuers(valuerList);
      if (valuerList.length > 0) {
        setSelectedValuerId(valuerList[0].userId);
      }
    } catch (err: any) {
      console.error("Failed to load valuers list:", err);
      setAssignError(err.message || "Failed to load land valuers list.");
    } finally {
      setLoadingValuers(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedCaseToAssign) return;
    if (!selectedValuerId) {
      setAssignError("Please select a land valuer.");
      return;
    }
    const days = parseInt(acceptancePeriod, 10);
    if (!days || days <= 0) {
      setAssignError("Please provide a valid acceptance period (greater than 0 days).");
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    try {
      await landAcquisitionApi.assignValuer({
        caseId: selectedCaseToAssign.caseId,
        valuerId: selectedValuerId,
        acceptancePeriodDays: days,
        remarks: assignmentRemarks.trim() || undefined,
        assignedById: user?.userId,
      });

      alert(`Land Valuer assigned successfully to case: ${selectedCaseToAssign.caseId}`);
      setIsAssignModalOpen(false);
      setSelectedCaseToAssign(null);
      await loadDashboardData();
    } catch (err: any) {
      console.error("Failed to assign valuer:", err);
      setAssignError(err.message || "Failed to assign land valuer to case.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Load data from API with Role-Based Scoping Parameters
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Configure scope parameters based on user's role
      const scopeParams: {
        createdById?: string;
        assignedToId?: string;
        userRole?: string;
        userId?: string;
      } = {};

      if (isOfficer && !isAdmin && userId) {
        scopeParams.createdById = userId;
        scopeParams.userRole = "GOVERNMENT_OFFICER";
        scopeParams.userId = userId;
      } else if (isValuer && !isAdmin && userId) {
        scopeParams.assignedToId = userId;
        scopeParams.userRole = "LAND_VALUER";
        scopeParams.userId = userId;
      } else if (isAdmin) {
        scopeParams.userRole = role || "ADMINISTRATOR";
      } else if (userId) {
        scopeParams.userId = userId;
        scopeParams.userRole = role;
      }

      const [casesRes, statsRes] = await Promise.all([
        landAcquisitionApi.getAllCases({
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          projectType: projectTypeFilter || undefined,
          page: currentPage,
          limit: itemsPerPage,
          ...scopeParams,
        }),
        landAcquisitionApi.getCaseStats(scopeParams),
      ]);

      const fetchedCases = casesRes.cases || [];

      // Secondary client-side RBAC filter as defensive guarantee
      const filteredCases = fetchedCases.filter((c: any) => {
        // 1. Admins see all cases
        if (isAdmin) return true;
        // 2. Government Officers only see cases they created
        if (isOfficer) return c.createdById === userId;
        // 3. Land Valuers only see cases assigned to them
        if (isValuer) {
          return c.caseAssignments?.some(
            (a: any) => a.assignedToId === userId || a.assignedTo?.userId === userId
          );
        }
        return false;
      });

      setCases(filteredCases);
      setTotalCount(casesRes.total || filteredCases.length);
      setStatsData(statsRes);
    } catch (err: any) {
      console.error("Failed to fetch case dashboard data:", err);
      setError(err.message || "Failed to load dashboard data from backend.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, projectTypeFilter, currentPage, isAdmin, isOfficer, isValuer, userId, role]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
      change: isAdmin ? "All database cases" : isOfficer ? "Your created cases" : "Your assigned cases",
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
            <div className="flex items-center gap-3">
              <h1>Case Management</h1>
            </div>
            <div className="sub">
              {isAdmin
                ? "Monitor and manage all land acquisition cases across the system"
                : isOfficer
                ? "Manage and monitor land acquisition cases created by your department account"
                : isValuer
                ? "Review land acquisition cases assigned to you for property valuation"
                : "Monitor land acquisition cases within your permitted scope"}
            </div>
          </div>
          <div className="topbar-right">
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
                  {user.name.split(/\s+/).map((n) => n[0]).slice(0, 2).join("")}
                </span>
              ) : (
                <Lucide.User size={16} />
              )}
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

          {/* Add Permission: Only Government Officer and Government Administrator (and Sys Admin) can add new case */}
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
                    <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "var(--md-on-surface-variant)", opacity: 0.7 }}>
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
                  cases.map((c) => {
                    const statusClass = statusClassMap[c.status] || "status-case-registered";
                    const statusLabel = statusLabelMap[c.status] || c.status;
                    const assignedValuer =
                      c.caseAssignments?.[0]?.assignedTo?.name;

                    return (
                      <tr
                        key={c.caseId}
                        className="case-row row-clickable"
                        onClick={() => navigate("/admin/case/details", { state: { caseId: c.caseId } })}
                      >
                        <td>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span
                              className="case-id hover:underline cursor-pointer font-mono font-semibold"
                              onClick={() => navigate("/admin/case/details", { state: { caseId: c.caseId } })}
                              title={c.caseId}
                            >
                              {c.caseId}
                            </span>
                            <CopyButton value={c.caseId} />
                          </div>
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
                          {assignedValuer ? (
                            <span className="meta-text">
                              <strong>{assignedValuer}</strong>
                            </span>
                          ) : canAssignValuer ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="tonal"
                                size="sm"
                                onClick={() => handleOpenAssignModal(c)}
                                className="!py-1 !px-2.5 !text-xs !h-auto flex items-center gap-1.5 font-medium whitespace-nowrap"
                              >
                                <Lucide.UserPlus size={13} /> Assign Valuer
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

        {/* Valuer Assignment Modal (Admin only) */}
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => {
            if (!isAssigning) setIsAssignModalOpen(false);
          }}
          title="Assign Land Valuer"
          subtitle={
            selectedCaseToAssign
              ? `Case: ${selectedCaseToAssign.caseTitle} (${selectedCaseToAssign.caseId})`
              : undefined
          }
          maxWidth="max-w-xl"
          cancelText="Cancel"
          confirmText="Assign Valuer"
          confirmLoading={isAssigning}
          onConfirm={handleConfirmAssignment}
        >
          <div className="space-y-4 py-1">
            {assignError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-xs flex items-center gap-2">
                <Lucide.AlertCircle size={16} className="shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {/* Case Summary Card */}
            {selectedCaseToAssign && (
              <div className="p-4 bg-md-surface rounded-xl border border-md-outline/10 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-md-on-surface-variant font-medium">Project:</span>
                  <span className="font-semibold text-md-on-surface">
                    {selectedCaseToAssign.project?.projectName || "—"} ({selectedCaseToAssign.project?.projectType || "—"})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-md-on-surface-variant font-medium">Land Title No:</span>
                  <span className="font-mono font-medium text-md-on-surface">
                    {selectedCaseToAssign.landParcel?.landTitleNo || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-md-on-surface-variant font-medium">Location:</span>
                  <span className="text-md-on-surface">
                    {selectedCaseToAssign.landParcel?.mukim ? `${selectedCaseToAssign.landParcel.mukim}, ` : ""}
                    {selectedCaseToAssign.landParcel?.state || "—"}
                  </span>
                </div>
              </div>
            )}

            {/* Valuer Selection List */}
            <div>
              <label className="block text-xs font-semibold text-md-on-surface mb-2 uppercase tracking-wider">
                Select Certified Land Valuer *
              </label>
              {loadingValuers ? (
                <div className="p-6 text-center text-sm text-md-on-surface-variant">
                  <Lucide.Loader2 size={20} className="inline animate-spin mr-2" /> Loading certified valuers...
                </div>
              ) : valuers.length === 0 ? (
                <div className="p-4 bg-md-surface rounded-xl border border-md-outline/10 text-center text-xs text-md-on-surface-variant">
                  No active land valuers found in the database.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto md-scroll-thin pr-1">
                  {valuers.map((v) => {
                    const isSelected = selectedValuerId === v.userId;
                    return (
                      <div
                        key={v.userId}
                        onClick={() => setSelectedValuerId(v.userId)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-md-primary/10 border-md-primary shadow-sm"
                            : "bg-md-surface border-md-outline/10 hover:border-md-outline/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              isSelected
                                ? "bg-md-primary text-white"
                                : "bg-md-surface-container-high text-md-on-surface-variant"
                            }`}
                          >
                            {v.name
                              ? v.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              : "LV"}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-md-on-surface flex items-center gap-2">
                              {v.name}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">
                                Active Valuer
                              </span>
                            </div>
                            <div className="text-xs text-md-on-surface-variant font-mono">
                              {v.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center pr-1">
                          <input
                            type="radio"
                            name="valuerSelectRadio"
                            checked={isSelected}
                            onChange={() => setSelectedValuerId(v.userId)}
                            className="w-4 h-4 text-md-primary cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assignment Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <Input
                  label="Acceptance Period (Days) *"
                  type="number"
                  value={acceptancePeriod}
                  onChange={(e) => setAcceptancePeriod(e.target.value)}
                  placeholder="7"
                />
              </div>
              <div>
                <Input
                  label="Remarks (Optional)"
                  value={assignmentRemarks}
                  onChange={(e) => setAssignmentRemarks(e.target.value)}
                  placeholder="e.g., Assigned for site survey"
                />
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
