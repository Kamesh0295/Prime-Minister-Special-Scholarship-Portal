import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * ProtectedRoute — guards routes based on authentication and role.
 *
 * @param {string|string[]} allowedRoles - If provided, only users with
 *   a matching role can access. Defaults to all authenticated users.
 * @param {string} redirectTo - Where to redirect unauthenticated users.
 */
const ProtectedRoute = ({
  children,
  allowedRoles,
  redirectTo = '/login',
}) => {
  const { user, token } = useSelector((s) => s.auth);
  const location = useLocation();

  // Not authenticated
  if (!token || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role check
  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(user.role)) {
      // Redirect to their appropriate dashboard
      const fallback = user.role === 'admin' ? '/admin' : '/dashboard';
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
