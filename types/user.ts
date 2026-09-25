// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  subscriptionTier: "free" | "pro" | "business";
  monthlyScansUsed: number;
  scanLimit: number;
  createdAt: Date;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

// Usage stats
export interface UsageStats {
  scansUsed: number;
  scanLimit: number;
  scansRemaining: number;
  resetDate: Date;
}

// Auth state
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
