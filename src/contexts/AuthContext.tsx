import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AdminUser, AdminSession, Permission } from '../types';
import { authService, LoginResult } from '../services/authService';
import { hasPermission as checkRbacPermission } from '../utils/rbac';
import { recordClientActivity, getLastClientActivity } from '../services/apiClient';

interface AuthContextType {
  currentUser: AdminUser | null;
  currentSession: AdminSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showWarningModal: boolean;
  showTimeoutModal: boolean;
  timeRemainingSec: number;
  login: (email: string, pass: string) => Promise<LoginResult>;
  verify2FA: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  staySignedIn: () => void;
  dismissTimeout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Timeouts (Configurable: 10 min idle, 8 min warning)
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_TIMEOUT_MS = 8 * 60 * 1000;    // 8 minutes

const USER_STORAGE_KEY = 'shoply_admin_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [currentSession, setCurrentSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState<boolean>(false);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(120);

  const lastRecordedActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Restore session on mount: only when a valid server session token exists.
  useEffect(() => {
    const initAuth = async () => {
      try {
        const validation = await authService.validateCurrentSession();
        if (validation.valid && validation.user) {
          setCurrentUser(validation.user);
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(validation.user));
          } catch {
            // Ignore
          }
          recordClientActivity();
        } else if (validation.error === 'SESSION_TIMEOUT') {
          setShowTimeoutModal(true);
          setCurrentUser(null);
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error('Session init error', e);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Heartbeat & User Inactivity Tracking (Rules 15, 16, 17, 18)
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    // Throttle activity recording to at most once every 10 seconds
    if (now - lastRecordedActivityRef.current > 10000) {
      lastRecordedActivityRef.current = now;
      recordClientActivity();
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Attach listeners for meaningful browser interactions
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Heartbeat check every 1000ms
    timerIntervalRef.current = setInterval(() => {
      const lastActivity = getLastClientActivity();
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // 10 minutes exceeded: enforce timeout
        setShowWarningModal(false);
        setShowTimeoutModal(true);
        setCurrentUser(null);
        try {
          localStorage.removeItem(USER_STORAGE_KEY);
        } catch {
          // Ignore
        }
        authService.logout().catch(() => {});
      } else if (elapsed >= WARNING_TIMEOUT_MS) {
        // 8 minutes: show countdown warning
        setShowWarningModal(true);
        const remaining = Math.max(0, Math.round((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setTimeRemainingSec(remaining);
      } else {
        if (showWarningModal) {
          setShowWarningModal(false);
        }
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentUser, handleUserActivity, showWarningModal]);

  const staySignedIn = () => {
    recordClientActivity();
    setShowWarningModal(false);
    setTimeRemainingSec(120);
  };

  const dismissTimeout = () => {
    setShowTimeoutModal(false);
  };

  const login = async (email: string, pass: string): Promise<LoginResult> => {
    const result = await authService.login(email, pass);
    if (!result.requires2FA && result.user) {
      setCurrentUser(result.user);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      } catch {
        // Ignore
      }
      recordClientActivity();
    }
    return result;
  };

  const verify2FA = async (email: string, code: string) => {
    const { user, session } = await authService.verify2FA(email, code);
    setCurrentUser(user);
    setCurrentSession(session);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore
    }
    recordClientActivity();
    setShowTimeoutModal(false);
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setCurrentSession(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setShowWarningModal(false);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    return checkRbacPermission(currentUser.role, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentSession,
        isAuthenticated: !!currentUser,
        isLoading,
        showWarningModal,
        showTimeoutModal,
        timeRemainingSec,
        login,
        verify2FA,
        logout,
        staySignedIn,
        dismissTimeout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};