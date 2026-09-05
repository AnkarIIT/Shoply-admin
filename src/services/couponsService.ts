import { Coupon } from '../types';
import { recordClientActivity, fetchApi } from './apiClient';

export const couponsService = {
  async getCoupons(): Promise<Coupon[]> {
    recordClientActivity();
    return fetchApi<Coupon[]>('/api/coupons');
  },

  async createCoupon(data: Partial<Coupon>, adminName: string = 'Admin'): Promise<Coupon> {
    recordClientActivity();
    return fetchApi<Coupon>('/api/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleCoupon(id: string, adminName: string = 'Admin'): Promise<Coupon> {
    recordClientActivity();
    const coupons = await this.getCoupons();
    const current = coupons.find((c) => c.id === id);
    if (!current) {
      throw new Error('Coupon not found');
    }
    return fetchApi<Coupon>(`/api/coupons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !current.isActive }),
    });
  },
};