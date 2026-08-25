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

  // 2. Add: Only Government Officer and Government Administrator (and System Admin)
  const canAddCase = isOfficer || isGovAdmin || isSysAdmin;

  // 3. Edit: Both Government Officer and Government Admin (and System Admin) can edit case details
  const canEditCaseDetails = isOfficer || isGovAdmin || isSysAdmin;

  // 4. Assign Valuer: Only Government Admin (and System Admin)
  const canAssignValuer = isGovAdmin || isSysAdmin;

  // 5. Delete: Person who created the case, or System Administrator / Admin
  const canDeleteCase = (caseItem: { createdById?: string; status?: string } | null | undefined) => {
    if (!user?.userId || !caseItem) return false;
    if (isAdmin) return true;
    return caseItem.createdById === user.userId;
  };

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
  };
};
