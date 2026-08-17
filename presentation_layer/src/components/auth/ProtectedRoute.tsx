import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Simplified role check. In reality, handle mapping between DB roles (e.g. SYSTEM_ADMINISTRATOR) and UI roles ('admin', 'member').
  // The seeder creates 'SYSTEM_ADMINISTRATOR', so we check if the user role includes 'admin' (case insensitive for flexibility).
  const normalizedRole = user.role.toLowerCase();
  const hasAccess = allowedRoles.some(allowedRole => normalizedRole.includes(allowedRole.toLowerCase()));

  if (!hasAccess) {
    // If a user tries to access a route they don't have permission for, redirect to unauthorized
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
