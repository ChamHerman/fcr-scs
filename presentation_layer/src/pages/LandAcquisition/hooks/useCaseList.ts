import { useState, useEffect, useCallback } from "react";
import { landAcquisitionApi } from "../../../services/landAcquisitionApi";

interface CaseListScope {
  role?: string;
  userId?: string;
  identificationNumber?: string;
  isAdmin: boolean;
  isOfficer: boolean;
  isValuer: boolean;
  isMember: boolean;
}

interface CaseListFilters {
  searchTerm?: string;
  statusFilter?: string;
  projectTypeFilter?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

export function useCaseList(scope: CaseListScope, filters: CaseListFilters) {
  const [cases, setCases] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { role, userId, identificationNumber, isAdmin, isOfficer, isValuer, isMember } = scope;
  const { searchTerm, statusFilter, projectTypeFilter, currentPage = 1, itemsPerPage = 10 } = filters;

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scopeParams: {
        createdById?: string;
        assignedToId?: string;
        userRole?: string;
        userId?: string;
        ownerNric?: string;
      } = {};

      if (isOfficer && !isAdmin && userId) {
        scopeParams.createdById = userId;
        scopeParams.userRole = "GOVERNMENT_OFFICER";
        scopeParams.userId = userId;
      } else if (isValuer && !isAdmin && userId) {
        scopeParams.assignedToId = userId;
        scopeParams.userRole = "LAND_VALUER";
        scopeParams.userId = userId;
      } else if (isMember && !isAdmin) {
        scopeParams.userRole = "DISPLACED_COMMUNITY_MEMBER";
        scopeParams.userId = userId;
        if (identificationNumber) {
          scopeParams.ownerNric = identificationNumber;
        }
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

      // Client-side RBAC filter as defensive guarantee
      const filteredCases = fetchedCases.filter((c: any) => {
        if (isAdmin) return true;
        if (isOfficer) return c.createdById === userId;
        if (isValuer) {
          return c.caseAssignments?.some(
            (a: any) => a.assignedToId === userId || a.assignedTo?.userId === userId
          );
        }
        if (isMember) {
          if (c.createdById === userId) return true;
          if (identificationNumber) {
            const cleanUserIc = identificationNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const owners = c.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [];
            return owners.some((ow: any) => (ow.nric || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanUserIc);
          }
        }
        return false;
      });

      setCases(filteredCases);
      setTotalCount(casesRes.total || filteredCases.length);
      setStatsData(statsRes);
    } catch (err: any) {
      console.error("Failed to fetch case list data:", err);
      setError(err.message || "Failed to load dashboard data from backend.");
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    statusFilter,
    projectTypeFilter,
    currentPage,
    itemsPerPage,
    isAdmin,
    isOfficer,
    isValuer,
    isMember,
    userId,
    role,
    identificationNumber,
  ]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  return { cases, setCases, statsData, totalCount, loading, error, reload: loadCases };
}
