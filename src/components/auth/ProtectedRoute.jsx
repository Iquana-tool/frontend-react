import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import RequiredPasswordChange from '../account/RequiredPasswordChange';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-t2">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember where they were headed so sign-in can put them back there.
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // An admin chose this account's password, so it has been seen by someone
  // other than its holder. Nothing else opens until it is replaced.
  if (user?.must_change_password) {
    return <RequiredPasswordChange />;
  }

  return children;
};

export default ProtectedRoute;

