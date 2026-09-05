import { AuditLog } from '../types';
import { recordClientActivity, fetchApi } from './apiClient';

export const auditService = {
  async getAuditLogs(actionFilter?: string): Promise<AuditLog[]> {
    recordClientActivity();
    const logs = await fetchApi<AuditLog[]>('/api/audit-logs');
    if (!actionFilter || actionFilter === 'ALL') return logs;
    return logs.filter((l) => l.action.toLowerCase() === actionFilter.toLowerCase());
  },

  async getLogs(params?: { search?: string; action?: string }): Promise<AuditLog[]> {
    recordClientActivity();
    const queryParam = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    const logs = await fetchApi<AuditLog[]>(`/api/audit-logs${queryParam}`);
    if (params?.action && params.action !== 'ALL') {
      return logs.filter((l) => l.action === params.action);
    }
    return logs;
  },
};