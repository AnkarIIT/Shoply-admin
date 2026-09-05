import { Supplier } from '../types';
import { recordClientActivity, fetchApi } from './apiClient';

export const suppliersService = {
  async getSuppliers(): Promise<Supplier[]> {
    recordClientActivity();
    return fetchApi<Supplier[]>('/api/suppliers');
  },

  async getSupplierById(id: string): Promise<Supplier> {
    recordClientActivity();
    return fetchApi<Supplier>(`/api/suppliers/${id}`);
  },

  async updateSupplier(id: string, updates: Partial<Supplier>, adminName: string = 'Admin'): Promise<Supplier> {
    recordClientActivity();
    return fetchApi<Supplier>(`/api/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async createSupplier(data: Partial<Supplier>, adminName: string = 'Admin'): Promise<Supplier> {
    recordClientActivity();
    const res = await fetchApi<{ success: boolean; id: string }>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return this.getSupplierById(res.id);
  },
};