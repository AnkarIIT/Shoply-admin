import { ReturnRequest } from '../types';
import { recordClientActivity, fetchApi } from './apiClient';

export const returnsService = {
  async getReturns(): Promise<ReturnRequest[]> {
    recordClientActivity();
    return fetchApi<ReturnRequest[]>('/api/returns');
  },

  async getReturnRequests(): Promise<ReturnRequest[]> {
    return this.getReturns();
  },

  async approveReturn(id: string, adminName: string = 'Admin'): Promise<ReturnRequest> {
    recordClientActivity();
    return fetchApi<ReturnRequest>(`/api/returns/${id}/approve`, { method: 'POST' });
  },

  async rejectReturn(id: string, reason: string, adminName: string = 'Admin'): Promise<ReturnRequest> {
    recordClientActivity();
    return fetchApi<ReturnRequest>(`/api/returns/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async processRefund(id: string, adminName: string = 'Admin'): Promise<ReturnRequest> {
    recordClientActivity();
    return fetchApi<ReturnRequest>(`/api/returns/${id}/refund`, { method: 'POST' });
  },
};