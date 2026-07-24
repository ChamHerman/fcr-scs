import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// In a real app, this would come from a context or global state (e.g. Redux/Zustand)
export const useAuth = () => {
  // Mocking auth state for demonstration
  return {
    isAuthenticated: true,
    role: 'admin', // change to 'member' to test member portal
  };
};

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    // If a member tries to access an admin route, redirect them to a secure fallback
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
