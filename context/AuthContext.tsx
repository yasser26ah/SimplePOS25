import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi, tokens, type ApiUser } from '../src/api';

interface AuthContextType {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(tokens.refresh || tokens.access));

  const doLogout = React.useCallback(() => {
    tokens.clear();
    setUser(null);
  }, []);

  // Logout global (evento disparado por el cliente API ante 401).
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('simplepos:logout', handler);
    return () => window.removeEventListener('simplepos:logout', handler);
  }, []);

  // Si hay refresh token al montar, valida la sesión.
  useEffect(() => {
    const restore = async () => {
      if (!tokens.refresh && !tokens.access) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        tokens.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    void restore();
  }, []);

  const login = async (email: string, password: string): Promise<ApiUser> => {
    const session = await authApi.login(email, password);
    tokens.save(session.accessToken, session.refreshToken);
    setUser(session.user);
    return session.user;
  };

  const logout = () => {
    void authApi.logout();
    doLogout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
