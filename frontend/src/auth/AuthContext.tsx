import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  sub: string;
  email?: string;
  name?: string;
  role?: 'admin' | 'employee';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Context Provider
 * Manages session-based auth via backend /api/auth/me
 * Tokens are stored server-side (httpOnly cookies), never exposed to frontend
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Call backend /api/auth/me to check authentication status.
   * Uses credentials: 'include' so the session cookie (connect.sid) is sent.
   * Returns true if authenticated, false otherwise. Always sets loading = false.
   */
  const checkAuth = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Not authenticated');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Not JSON');
      const data = await res.json();
      setUser(data.user ?? null);
      return true;
    } catch {
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout: Call backend /api/auth/logout to destroy session
   * Browser automatically clears httpOnly cookie
   */
  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setUser(null);
        // Redirect to login
        window.location.href = '/login';
      } else {
        console.error('Logout failed:', response.status);
        // Still clear user and redirect even if request fails
        setUser(null);
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user and redirect even if request fails
      setUser(null);
      window.location.href = '/login';
    }
  };

  /**
   * Check auth on app load (including after OIDC redirect to /app).
   * Run once on mount so /api/auth/me is called with credentials and session cookie.
   */
  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    checkAuth,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use Auth Context
 * Must be used within an AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
