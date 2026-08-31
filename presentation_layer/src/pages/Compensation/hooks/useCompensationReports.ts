import { useState, useEffect, useCallback } from "react";
import { compensationApi } from "../../../services/compensationApi";
import type { CompensationReportItem } from "../types/compensation.types";
import {
  COMPENSATION_STATUS_CLASS_MAP as statusClassMap,
  COMPENSATION_STATUS_LABEL_MAP as statusLabelMap,
} from "../../../constants";

interface RoleScope {
  isAdmin: boolean;
  isOfficer: boolean;
  userId?: string;
  role?: string;
}

export function useCompensationReports(roleScope: RoleScope) {
  const [allReports, setAllReports] = useState<CompensationReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { isAdmin, isOfficer, userId, role } = roleScope;

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scopeParams: Record<string, unknown> = {
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
        if (isAdmin) return true;
        if (isOfficer) {
          return r.acquisitionCase?.createdById === userId;
        }
        return false;
      });

      const formatted: CompensationReportItem[] = filteredList.map((r: any) => ({
        id: r.compensationReportId,
        caseId: r.caseId,
        caseTitle: r.acquisitionCase?.caseTitle || "—",
        caseCreatedById: r.acquisitionCase?.createdById,
        owner: r.acquisitionCase?.landParcel?.ownerships?.[0]?.landOwner?.name || "—",
        totalAmount: Number(r.totalCompensation || 0),
        status: statusLabelMap[r.status] || r.status,
        statusClass: statusClassMap[r.status] || "status-pending-comp",
        generatedDate: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
        offerLetterGenerated: (r.acquisitionCase?.offerLetters || []).length > 0,
      }));

      setAllReports(formatted);
    } catch (err: any) {
      console.error("Failed to load compensation reports:", err);
      setError(err.message || "Failed to load compensation reports");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isOfficer, userId, role]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return { allReports, loading, error, reload: loadReports };
}
