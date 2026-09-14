import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, allowedPages, isLoadingPermissions } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (isLoadingPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-md-primary"></div>
      </div>
    );
  }
  const userRole = (user.role || '').toUpperCase();
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
    return <Navigate to="/unauthorized" replace />;
  }

  // Finance & Ledger pages (/admin/payment*, /admin/blockchain*) are strictly for GOVERNMENT_ADMINISTRATOR only
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
        return location.pathname === page || location.pathname.startsWith(page + '/');
      });
    }
  }

  const hasAccess = hasRoleAccess && hasPageAccess;

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
};
