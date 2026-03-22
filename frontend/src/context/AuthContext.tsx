import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiPost, apiGet, setTokens, clearTokens } from '../utils/api';

interface User {
  id: string;
  email: string;
  displayName?: string;
  experienceLevel?: string;
  daysPerWeek?: number;
  hasActiveTrainingBlock?: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await apiGet('/user/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        await clearTokens();
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const register = async (email: string, password: string) => {
    const res = await apiPost('/auth/register', { email, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    await setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const login = async (email: string, password: string) => {
    const res = await apiPost('/auth/login', { email, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    await setTokens(data.accessToken, data.refreshToken);
    await refreshUser();
  };

  const loginWithGoogle = async (idToken: string) => {
    const res = await apiPost('/auth/google', { idToken });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google login failed');
    await setTokens(data.accessToken, data.refreshToken);
    await refreshUser();
  };

  const logout = async () => {
    await clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
