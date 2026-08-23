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

  // Simplified role check. In reality, handle mapping between DB roles (e.g. SYSTEM_ADMINISTRATOR) and UI roles ('admin', 'member').
  // The seeder creates 'SYSTEM_ADMINISTRATOR', so we check if the user role includes 'admin' (case insensitive for flexibility).
  const normalizedRole = user.role.toLowerCase();
  const hasRoleAccess = allowedRoles.some(allowedRole => normalizedRole.includes(allowedRole.toLowerCase()));
  
  // Also check dynamic page permissions
  const hasPageAccess = allowedPages.includes('*') || allowedPages.some(page => 
    location.pathname === page || location.pathname.startsWith(page + '/')
  );

  const hasAccess = hasRoleAccess || hasPageAccess;

  if (!hasAccess) {
    // If a user tries to access a route they don't have permission for, redirect to unauthorized
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
