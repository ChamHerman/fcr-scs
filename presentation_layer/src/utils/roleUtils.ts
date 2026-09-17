/**
 * Role display utilities and short form mappings
 */
export const getRoleShortForm = (role?: string | null): string => {
  if (!role) return 'U';
  switch (role) {
    case 'SYSTEM_ADMINISTRATOR':
      return 'SA';
    case 'GOVERNMENT_ADMINISTRATOR':
      return 'GA';
    case 'GOVERNMENT_OFFICER':
      return 'GO';
    case 'LAND_VALUER':
      return 'LV';
    case 'DISPLACED_COMMUNITY_MEMBER':
      return 'CM';
    default:
      return role.slice(0, 2).toUpperCase();
  }
};

export const getRoleTitle = (role?: string | null): string => {
  if (!role) return 'System User';
  const map: Record<string, string> = {
    SYSTEM_ADMINISTRATOR: 'System Administrator',
    GOVERNMENT_ADMINISTRATOR: 'Government Administrator',
    GOVERNMENT_OFFICER: 'Government Officer',
    LAND_VALUER: 'Land Valuer',
    DISPLACED_COMMUNITY_MEMBER: 'Displaced Community Member',
  };
  return map[role] || role.replace(/_/g, ' ');
};

/**
 * Extract the initials using the first letter of the first and second words of the user's name.
 * e.g., "Herman Ting" -> "HT", "Ahmad bin Razak" -> "AB", "Admin" -> "AD"
 */
export const getNameInitials = (name?: string | null): string => {
  if (!name) return 'AD';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const second = words[1]?.[0] ?? '';
  const initials = (first + second).toUpperCase();
  return initials || (name.slice(0, 2).toUpperCase() || 'AD');
};
