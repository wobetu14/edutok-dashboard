import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, client } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Re-hydrate user from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setIsLoading(false); return; }
    client.get('/users/me')
      .then((res) => setUser(res.data.data))
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.login({ username, password });
    const { user: u, accessToken, refreshToken, must_change_password } = res.data.data;

    // Only allow staff roles into the dashboard
    if (!['super_admin', 'org_admin', 'instructor'].includes(u.role)) {
      throw new Error('Access denied. Learner accounts cannot access the dashboard.');
    }

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    const enriched = { ...u, must_change_password: !!must_change_password };
    setUser(enriched);
    return enriched;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch (_) {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
