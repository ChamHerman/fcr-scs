import React, { useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_PAGES } from '../../constants/pages';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, allowedPages, isLoadingPermissions } = useAuth();
  const location = useLocation();
  const lastLoggedRef = useRef<string | null>(null);

  // Active synchronization check: ensure localStorage token and user are present
  const storedToken = localStorage.getItem('auth_token');
  const storedUserRaw = localStorage.getItem('user_data');

  if (!isAuthenticated || !user || !storedToken || !storedUserRaw) {
    return <Navigate to="/login" replace />;
  }

  // Cross-tab safety: if localStorage user was switched in another tab, use active stored user
  let activeUser = user;
  try {
    const parsedStored = JSON.parse(storedUserRaw);
    if (parsedStored && (parsedStored.userId !== user.userId || parsedStored.role !== user.role)) {
      activeUser = parsedStored;
    }
  } catch {
    // fallback to context user
  }

  const reportUnauthorized = (reason: string) => {
    const logKey = `${location.pathname}:${reason}:${activeUser.userId}`;
    if (lastLoggedRef.current === logKey) return;
    lastLoggedRef.current = logKey;

    const token = localStorage.getItem('auth_token') || storedToken;
    fetch('http://localhost:3030/api/audit-logs/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        activityType: 'UNAUTHORIZED_PAGE_ACCESS',
        moduleName: 'ACCESS_CONTROL',
        severity: 'SECURITY',
        systemResponse: 'FORBIDDEN (403)',
        activityDetails: {
          attemptedPath: location.pathname,
          reason,
          userRole: activeUser.role,
          userId: activeUser.userId,
          email: activeUser.email,
          userName: activeUser.name,
        },
      }),
    }).catch((err) => {
      console.error('Failed to log unauthorized page access:', err);
    });
  };

  if (isLoadingPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-md-primary"></div>
      </div>
    );
  }

  const userRole = (activeUser.role || '').toUpperCase();
  const isMember = userRole === 'DISPLACED_COMMUNITY_MEMBER' || userRole.includes('MEMBER');
  const isAdmin = !isMember && (
    userRole === 'SYSTEM_ADMINISTRATOR' ||
    userRole === 'GOVERNMENT_ADMINISTRATOR' ||
    userRole === 'GOVERNMENT_OFFICER' ||
    userRole === 'LAND_VALUER' ||
    userRole.includes('ADMIN')
  );

  // Members can NEVER access /admin routes under any circumstances
  if (isMember && (location.pathname === '/admin' || location.pathname.startsWith('/admin/'))) {
    reportUnauthorized('Community member attempted access to administrative route');
    return <Navigate to="/unauthorized" replace />;
  }

  // Check role category access
  let hasRoleAccess = false;
  if (allowedRoles.includes('member') && isMember) hasRoleAccess = true;
  if (allowedRoles.includes('admin') && isAdmin) hasRoleAccess = true;

  // Role Management is strictly reserved for SYSTEM_ADMINISTRATOR only
  if (
    userRole !== 'SYSTEM_ADMINISTRATOR' &&
    (location.pathname === '/admin/role-management' || location.pathname.startsWith('/admin/role-management/'))
  ) {
    reportUnauthorized('Non-system administrator attempted access to Role Management');
    return <Navigate to="/unauthorized" replace />;
  }

  // Finance & Ledger pages (/admin/payment*, /admin/blockchain*) are strictly for GOVERNMENT_ADMINISTRATOR and SYSTEM_ADMINISTRATOR
  const isFinanceLedgerRoute =
    location.pathname === '/admin/payment' ||
    location.pathname.startsWith('/admin/payment/') ||
    location.pathname === '/admin/blockchain' ||
    location.pathname.startsWith('/admin/blockchain/');

  if (
    isFinanceLedgerRoute &&
    userRole !== 'GOVERNMENT_ADMINISTRATOR' &&
    userRole !== 'SYSTEM_ADMINISTRATOR'
  ) {
    reportUnauthorized('User attempted access to restricted Finance / Ledger portal without proper administrative role');
    return <Navigate to="/unauthorized" replace />;
  }

  // Dynamic page-level check for admin users
  let hasPageAccess = true;
  if (isAdmin && userRole !== 'SYSTEM_ADMINISTRATOR') {
    if (allowedPages.length === 0) {
      hasPageAccess = false;
    } else if (!allowedPages.includes('*')) {
      hasPageAccess = allowedPages.some((page) => {
        // Root /admin must be matched exactly to avoid matching every /admin/* subroute
        if (page === '/admin') {
          return location.pathname === '/admin' || location.pathname === '/admin/';
        }
        if (location.pathname === page) {
          return true;
        }
        // Subroute check: allow sub-pages (like /admin/case/register, /admin/case/123/edit) unless the current path is itself an explicitly registered page in ADMIN_PAGES
        if (location.pathname.startsWith(page + '/')) {
          const isExplicitlyManagedPage = ADMIN_PAGES.some(
            (p) =>
              p.path !== page &&
              (location.pathname === p.path ||
                (p.path.startsWith(page + '/') && location.pathname.startsWith(p.path + '/')))
          );
          return !isExplicitlyManagedPage;
        }
        return false;
      });
    }
  }

  const hasAccess = hasRoleAccess && hasPageAccess;

  if (!hasAccess) {
    reportUnauthorized(`Insufficient role permissions for route (activeRole: ${userRole})`);
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
