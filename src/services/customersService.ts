import { Customer } from '../types';
import { ApiError, recordClientActivity, fetchApi } from './apiClient';

export const customersService = {
  async getCustomers(query?: string): Promise<Customer[]> {
    recordClientActivity();
    const custs = await fetchApi<Customer[]>('/api/customers');
    if (query) {
      const q = query.toLowerCase().trim();
      return custs.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
      );
    }
    return custs;
  },

  async getCustomerById(id: string): Promise<Customer> {
    const list = await this.getCustomers();
    const cust = list.find((c) => c.id === id);
    if (!cust) throw new ApiError('Customer not found', 404);
    return cust;
  },
};