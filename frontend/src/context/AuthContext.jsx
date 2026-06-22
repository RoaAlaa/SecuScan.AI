import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, getToken } from "../api/api";

const AUTH_KEY = "secuscan_user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const loadStoredUser = useCallback(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      const token = getToken();
      if (raw && token) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) setUser(parsed);
      } else {
        setUser(null);
      }
    } catch (_) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem("secuscan_token");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadStoredUser();
  }, [loadStoredUser]);

  const login = useCallback(async (email, password) => {
    const data = await api("POST", "/api/auth/login", { email, password });
    if (data.token && data.user) {
      localStorage.setItem("secuscan_token", data.token);
      localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    }
    throw new Error("Invalid response");
  }, []);

  const register = useCallback(async (name, email, password) => {
    await api("POST", "/api/auth/register", { name, email, password });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("secuscan_token");
  }, []);

  const updateUser = useCallback((updatedUser) => {
    if (!updatedUser?.email) return;
    localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
