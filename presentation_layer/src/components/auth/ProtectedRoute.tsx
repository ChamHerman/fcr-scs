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

  // Dynamic page-level check for admin users
  let hasPageAccess = true;
  if (isAdmin && userRole !== 'SYSTEM_ADMINISTRATOR' && allowedPages.length > 0 && !allowedPages.includes('*')) {
    hasPageAccess = allowedPages.some(page => 
      location.pathname === page || location.pathname.startsWith(page + '/')
    );
  }

  const hasAccess = hasRoleAccess && hasPageAccess;

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
};
