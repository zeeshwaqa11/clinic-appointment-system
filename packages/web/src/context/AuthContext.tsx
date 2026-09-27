import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { login as apiLogin, register as apiRegister } from "../api/auth.api.js";
import { setAuthToken } from "../api/client.js";
import type { User } from "../types/index.js";

const STORAGE_KEY = "clinic.auth";

interface StoredAuth {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function writeStored(value: StoredAuth | null): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable (private browsing); auth just won't persist.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setAuthToken(stored.token);
      setUser(stored.user);
      setToken(stored.token);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    setAuthToken(result.token);
    setUser(result.user);
    setToken(result.token);
    writeStored(result);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await apiRegister(name, email, password);
    setAuthToken(result.token);
    setUser(result.user);
    setToken(result.token);
    writeStored(result);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setToken(null);
    writeStored(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
