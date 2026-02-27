/**
 * Commander 5.0 — 认证状态 Hook
 */
import { useState, useEffect, createContext, useContext } from "react";
import { authApi, isLoggedIn, clearTokens, type UserInfo } from "@/lib/api";

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<UserInfo | null>(() => authApi.getCachedUser());
  const [loading, setLoading] = useState(false);

  const refreshUser = async () => {
    if (!isLoggedIn()) return;
    try {
      const fresh = await authApi.me();
      setUser(fresh);
      localStorage.setItem("commander_user", JSON.stringify(fresh));
    } catch {
      // token expired
      clearTokens();
      setUser(null);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && !user) {
      refreshUser();
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return { user, loading, login, logout, refreshUser };
}

import React from "react";

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: false,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
