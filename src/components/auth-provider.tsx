"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("smma_token");
    const savedUser = localStorage.getItem("smma_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // Invalid stored user — clear
        localStorage.removeItem("smma_token");
        localStorage.removeItem("smma_user");
      }
    }
    setLoading(false);
  }, []);

  // Verify the token is still valid when we restore it
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.data) {
          const u = data.data;
          setUser({ id: u.id, name: u.name, email: u.email, role: u.role });
        } else {
          throw new Error("Bad response");
        }
      })
      .catch(() => {
        // Token expired or invalid — force logout
        setToken(null);
        setUser(null);
        localStorage.removeItem("smma_token");
        localStorage.removeItem("smma_user");
      });
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Login failed");
    }
    const { token: t, user: u } = data.data;
    setToken(t);
    setUser(u);
    localStorage.setItem("smma_token", t);
    localStorage.setItem("smma_user", JSON.stringify(u));
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed");
      }
      const { token: t, user: u } = data.data;
      setToken(t);
      setUser(u);
      localStorage.setItem("smma_token", t);
      localStorage.setItem("smma_user", JSON.stringify(u));
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("smma_token");
    localStorage.removeItem("smma_user");
  }, []);

  const updateProfile = useCallback(
    async (data: {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
    }) => {
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Update failed");
      }
      const u = json.data;
      setUser({ id: u.id, name: u.name, email: u.email, role: u.role });
      localStorage.setItem(
        "smma_user",
        JSON.stringify({ id: u.id, name: u.name, email: u.email, role: u.role })
      );
    },
    [token]
  );

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
