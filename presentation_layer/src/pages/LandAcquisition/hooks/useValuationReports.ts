import { useState, useEffect, useCallback } from "react";
import { landAcquisitionApi } from "../../../services/landAcquisitionApi";
import type { ValuationReportItem } from "../types/land-acquisition.types";
import { formatCurrencyRM } from "../../../utils/currency";
import {
  VALUATION_STATUS_CLASS_MAP as statusClassMap,
  VALUATION_STATUS_LABEL_MAP as statusLabelMap,
} from "../../../constants";

interface RoleScope {
  isAdmin: boolean;
  isOfficer: boolean;
  isValuer: boolean;
  userId?: string;
  role?: string;
}

export function useValuationReports(roleScope: RoleScope) {
  const [allScopedReports, setAllScopedReports] = useState<ValuationReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { isAdmin, isOfficer, isValuer, userId, role } = roleScope;

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scopeParams: Record<string, unknown> = {
        limit: 1000,
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

      const formatted: ValuationReportItem[] = filteredList.map((r: any) => ({
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
          ? formatCurrencyRM(r.recommendedCompensation)
          : "—",
        status: statusLabelMap[r.reportStatus] || r.reportStatus || "Pending",
        statusClass: statusClassMap[r.reportStatus] || "status-pending-valuation",
      }));

      setAllScopedReports(formatted);
    } catch (err: any) {
      console.error("Failed to load valuation reports:", err);
      setError(err.message || "Failed to load valuation reports");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isOfficer, isValuer, userId, role]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return { allScopedReports, loading, error, reload: loadReports };
}
