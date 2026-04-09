import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMe } from '../api';

const AuthContext = createContext({ user: null, setUser: () => {}, profile: null, loadingProfile: false, refreshProfile: async () => {} });

export function AuthProvider({ value, children }) {
  // value is expected to be { user, setUser }
  const user = value && value.user ? value.user : null;
  const setUser = value && typeof value.setUser === 'function' ? value.setUser : () => {};

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return null;
    }
    setLoadingProfile(true);
    try {
      const me = await getMe();
      const p = (me && (me.profile || me.user)) || null;
      setProfile(p);
      return p;
    } catch (err) {
      setProfile(null);
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    // fetch profile when user/token changes
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await refreshProfile();
    })();
    return () => { mounted = false; };
  }, [refreshProfile]);

  const ctx = {
    user,
    setUser,
    profile,
    loadingProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
