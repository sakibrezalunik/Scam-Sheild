/**
 * ScamShield Desktop — Auth Context
 *
 * Manages authentication state using React context.
 * Tokens are never stored in localStorage — session cookies handle persistence.
 */
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import { getMe, login as apiLogin, signup as apiSignup, logout as apiLogout } from "../api/client";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMe();
      if (result.success && result.data) {
        setUser(result.data);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiLogin(email, password);
      if (result.success && result.data) {
        const profile = await getMe();
        if (profile.success && profile.data) {
          setUser(profile.data);
          setIsAuthenticated(true);
          setIsLoading(false);
          return { success: true };
        }
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true };
      }
      const errMsg = (result as { success: false; error?: { message?: string } }).error?.message ?? "Login failed";
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    } catch {
      const errMsg = "Network error. Please check your connection.";
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiSignup(email, password, name);
      if (result.success && result.data) {
        const profile = await getMe();
        if (profile.success && profile.data) {
          setUser(profile.data);
          setIsAuthenticated(true);
          setIsLoading(false);
          return { success: true };
        }
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true };
      }
      const errMsg = (result as { success: false; error?: { message?: string } }).error?.message ?? "Signup failed";
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    } catch {
      const errMsg = "Network error. Please check your connection.";
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // Check session on mount — data fetching, not cascading renders
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkSession();
  }, [checkSession]);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoading, error,
      login, signup, logout, checkSession, clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
