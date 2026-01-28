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
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Context Provider
 * Manages session-based auth via backend /auth/me endpoint
 * Tokens are stored server-side (httpOnly cookies), never exposed to frontend
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Call backend /auth/me to check authentication status
   * Uses credentials: 'include' to send httpOnly session cookie
   * Safely handles non-JSON (e.g. HTML) responses to avoid runtime crashes.
   */
  const checkAuth = async () => {
    try {
      const response = await fetch('/auth/me', {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookie in request
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type') || '';

      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        setUser(data.user || null);
      } else if (response.status === 401) {
        // Explicit unauthenticated state
        setUser(null);
      } else {
        // Non-JSON or unexpected response: treat as unauthenticated without throwing
        setUser(null);
      }
    } catch (error) {
      // Network error - backend not running or connection refused
      // Handle gracefully without crashing the app
      console.error('Auth check error (backend may be down):', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout: Call backend /auth/logout to destroy session
   * Browser automatically clears httpOnly cookie
   */
  const logout = async () => {
    try {
      const response = await fetch('/auth/logout', {
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
   * Check auth status on app load
   * This runs once when the component mounts
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
