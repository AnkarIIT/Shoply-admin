import { AdminUser, AdminSession, AdminRole } from '../types';
import {
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  ApiError,
  fetchApi,
  recordClientActivity,
  isSessionIdleTimedOut,
} from './apiClient';

export interface LoginResult {
  requires2FA: boolean;
  user?: AdminUser;
  pendingEmail?: string;
}

export interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  otpauthUrl: string;
}

const PENDING_EMAIL_KEY = 'shoply_pending_email';

export function setPendingEmail(email: string): void {
  try {
    sessionStorage.setItem(PENDING_EMAIL_KEY, email);
  } catch {
    // Ignore
  }
}

export function getPendingEmail(): string {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export const authService = {
  // Step 1: Email + Password validation
  async login(email: string, pass: string): Promise<LoginResult> {
    recordClientActivity();
    const res = await fetchApi<{ requiresTwoFactor?: boolean; email?: string; token?: string; user?: AdminUser }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password: pass }) }
    );
    if (res.requiresTwoFactor) {
      setPendingEmail(res.email || email);
      return { requires2FA: true, pendingEmail: res.email || email };
    }
    if (!res.token || !res.user) {
      throw new ApiError('Unexpected login response from server.', 500);
    }
    setAuthToken(res.token);
    setPendingEmail(email);
    return { requires2FA: false, user: res.user };
  },

  // Step 2: TOTP 6-digit verification
  async verify2FA(email: string, code: string): Promise<{ user: AdminUser; session: AdminSession }> {
    recordClientActivity();
    const res = await fetchApi<{ token: string; user: AdminUser }>('/api/auth/verify-totp', {
      method: 'POST',
      body: JSON.stringify({ email, code: code.replace(/\s+/g, '') }),
    });
    setAuthToken(res.token);
    const session: AdminSession = {
      id: 'current',
      userId: res.user.id,
      device: 'Current Browser',
      browser: 'Browser',
      os: 'Desktop',
      ipAddress: 'Current session',
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      isCurrent: true,
      status: 'ACTIVE',
    };
    return { user: res.user, session };
  },

  // First-time 2FA Setup with real QR code generation (server side)
  async setup2FA(userEmail: string): Promise<TOTPSetupResult> {
    return fetchApi<TOTPSetupResult>('/api/auth/setup-2fa', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail }),
    });
  },

  // Confirm 2FA setup with initial 6-digit code
  async confirm2FASetup(email: string, code: string): Promise<boolean> {
    const res = await fetchApi<{ success: boolean }>('/api/auth/confirm-2fa', {
      method: 'POST',
      body: JSON.stringify({ email, code: code.replace(/\s+/g, '') }),
    });
    return res.success;
  },

  // Check existing session & enforce 10-minute inactivity
  async validateCurrentSession(): Promise<{ valid: boolean; user?: AdminUser; error?: string }> {
    if (isSessionIdleTimedOut()) {
      return { valid: false, error: 'SESSION_TIMEOUT' };
    }
    if (!getAuthToken()) {
      return { valid: false, error: 'NO_SESSION' };
    }
    try {
      const user = await fetchApi<AdminUser>('/api/auth/session');
      return { valid: true, user };
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        return { valid: false, error: 'SESSION_EXPIRED' };
      }
      return { valid: false, error: 'AUTH_ERROR' };
    }
  },

  // Server-side logout
  async logout(): Promise<void> {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
    } catch {
      // Token may already be revoked
    }
    clearAuthToken();
    try {
      sessionStorage.removeItem('shoply_admin_last_activity');
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
    } catch {
      // Ignore
    }
  },

  // Active sessions management
  async getSessions(): Promise<AdminSession[]> {
    return fetchApi<AdminSession[]>('/api/auth/sessions');
  },

  async getActiveSessions(userId?: string): Promise<AdminSession[]> {
    return this.getSessions();
  },

  async revokeSession(sessionId: string, adminName: string = 'Admin'): Promise<void> {
    await fetchApi(`/api/auth/sessions/${sessionId}/revoke`, { method: 'POST' });
  },

  async revokeAllOtherSessions(userId?: string, adminName: string = 'Admin'): Promise<void> {
    await fetchApi('/api/auth/sessions/revoke-others', { method: 'POST' });
  },

  // Admin user management (SUPER_ADMIN only)
  async getAdmins(): Promise<AdminUser[]> {
    return fetchApi<AdminUser[]>('/api/auth/admins');
  },

  async updateAdminRole(adminId: string, role: AdminRole): Promise<AdminUser> {
    return fetchApi<AdminUser>(`/api/auth/admins/${adminId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async createAdmin(data: Partial<AdminUser> & { password?: string }): Promise<AdminUser> {
    return fetchApi<AdminUser>('/api/auth/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};