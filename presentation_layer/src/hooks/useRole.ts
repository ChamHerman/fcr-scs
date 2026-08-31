import { useAuth } from "../context/AuthContext";

export type SystemRole =
  | "SYSTEM_ADMINISTRATOR"
  | "GOVERNMENT_ADMINISTRATOR"
  | "GOVERNMENT_OFFICER"
  | "LAND_VALUER"
  | "DISPLACED_COMMUNITY_MEMBER";

export const useRole = () => {
  const { user, isAuthenticated } = useAuth();
  const role = (user?.role || "") as SystemRole;

  const isSysAdmin = role === "SYSTEM_ADMINISTRATOR";
  const isGovAdmin = role === "GOVERNMENT_ADMINISTRATOR";
  const isAdmin = isSysAdmin || isGovAdmin;
  const isOfficer = role === "GOVERNMENT_OFFICER";
  const isValuer = role === "LAND_VALUER";
  const isMember = role === "DISPLACED_COMMUNITY_MEMBER";

  const hasAnyRole = (allowedRoles: SystemRole[]) => {
    return isSysAdmin || allowedRoles.includes(role);
  };

  /**
   * RBAC Rules for Case Management:
   */

  // 1. View: Admin view all, Officer view created by self, Valuer view assigned to self
  const canViewAllCases = isAdmin;
  const canViewCreatedCasesOnly = isOfficer;
  const canViewAssignedCasesOnly = isValuer;

  // 2. Add: Only Government Officer (and System Admin)
  const canAddCase = isOfficer || isSysAdmin;

  // 3. Edit: Only Government Officer (own case) or System Administrator
  const canEditCaseDetails = isOfficer || isSysAdmin;

  // 4. Assign Valuer: Only Government Admin (and System Admin)
  const canAssignValuer = isGovAdmin || isSysAdmin;

  // 5. Delete: Only Government Officer who created the case (or System Administrator)
  const canDeleteCase = (caseItem: { createdById?: string; status?: string } | null | undefined) => {
    if (!user?.userId || !caseItem) return false;
    if (isSysAdmin) return true;
    if (isGovAdmin) return false;
    return isOfficer && caseItem.createdById === user.userId;
  };

  // 6. Compensation & Valuation RBAC rules
  const canApproveCompensation = isGovAdmin || isSysAdmin;
  const canCreateCompensationReport = (isOfficer || isSysAdmin) && !isGovAdmin;
  const canRespondToOffer = (isMember || isSysAdmin) && !isGovAdmin && !isOfficer;
  const canReviewObjection = isGovAdmin || isSysAdmin;
  const canApproveValuation = isAdmin || isGovAdmin;

  return {
    role,
    user,
    userId: user?.userId,
    userName: user?.name,
    identificationNumber: user?.identificationNumber,
    isAuthenticated,
    isSysAdmin,
    isGovAdmin,
    isAdmin,
    isOfficer,
    isValuer,
    isMember,
    hasAnyRole,
    canViewAllCases,
    canViewCreatedCasesOnly,
    canViewAssignedCasesOnly,
    canAddCase,
    canEditCaseDetails,
    canAssignValuer,
    canDeleteCase,
    canApproveCompensation,
    canCreateCompensationReport,
    canRespondToOffer,
    canReviewObjection,
    canApproveValuation,
  };
};

