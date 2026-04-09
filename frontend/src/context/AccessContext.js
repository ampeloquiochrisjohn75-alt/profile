import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const AccessContext = createContext({
  role: null,
  isAdmin: false,
  isStudent: false,
  hasRole: () => false,
});

export function AccessProvider({ children }) {
  const { user } = useAuth();
  const role = (user && user.role) || null;

  const value = useMemo(() => ({
    role,
    isAdmin: role === 'admin',
    isStudent: role === 'student',
    hasRole: (r) => role === r,
  }), [role]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}

export default AccessContext;
