// Centralized API Client & Service Abstraction for Shoply Admin
// API-only: all data is fetched from the Shoply server (Express + Neon PostgreSQL).

export interface ApiClientConfig {
  mode: 'production';
  baseUrl: string;
}

export const API_CONFIG: ApiClientConfig = {
  mode: 'production',
  baseUrl: (import.meta as any).env?.VITE_API_BASE_URL || '',
};

// Error class for standardized handling
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Session activity tracker for 10-minute idle timeout enforcement
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
let lastClientActivityTime = Date.now();

export function recordClientActivity(): void {
  lastClientActivityTime = Date.now();
  try {
    sessionStorage.setItem('shoply_admin_last_activity', String(lastClientActivityTime));
  } catch {
    // Ignore storage issues
  }
}

export function getLastClientActivity(): number {
  try {
    const stored = sessionStorage.getItem('shoply_admin_last_activity');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > lastClientActivityTime) {
        lastClientActivityTime = parsed;
      }
    }
  } catch {
    // Ignore
  }
  return lastClientActivityTime;
}

export function isSessionIdleTimedOut(): boolean {
  const idleTime = Date.now() - getLastClientActivity();
  return idleTime > IDLE_TIMEOUT_MS;
}

const TOKEN_KEY = 'shoply_admin_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

export interface DatabaseStatus {
  connected: boolean;
  latencyMs: number;
  database: string;
  version: string;
  host: string;
  tableCounts: Record<string, number>;
  error?: string;
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  recordClientActivity();
  const token = getAuthToken();
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(errorBody.error || `Request failed with status ${res.status}`, res.status, errorBody.code);
  }
  return res.json();
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  return fetchApi<DatabaseStatus>('/api/database/status');
}

export async function seedDatabase(): Promise<{ success: boolean; message: string; status: DatabaseStatus }> {
  return fetchApi('/api/database/seed', { method: 'POST' });
}

export async function purgeDummyData(scope: 'orders_only' | 'all', adminName: string = 'Super Admin'): Promise<{ success: boolean; message: string; status: DatabaseStatus }> {
  return fetchApi('/api/database/clean-dummy-data', {
    method: 'POST',
    body: JSON.stringify({ scope, adminName }),
  });
}