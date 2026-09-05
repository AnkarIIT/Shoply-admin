import { Order, OrderStatus } from '../types';
import { recordClientActivity, fetchApi } from './apiClient';

export interface OrderFilters {
  search?: string;
  status?: string;
  paymentStatus?: string;
}

export const ordersService = {
  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    recordClientActivity();
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') params.append('paymentStatus', filters.paymentStatus);
    if (filters?.search) params.append('search', filters.search);
    return fetchApi<Order[]>(`/api/orders?${params.toString()}`);
  },

  async getOrderById(id: string): Promise<Order> {
    recordClientActivity();
    const cleanId = id.replace('#', '');
    return fetchApi<Order>(`/api/orders/${cleanId}`);
  },

  // Explicit admin payment verification (Rule 32)
  async verifyPayment(orderId: string, adminName: string = 'Admin'): Promise<Order> {
    recordClientActivity();
    await fetchApi(`/api/orders/${orderId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ action: 'APPROVE', adminName }),
    });
    return this.getOrderById(orderId);
  },

  // Explicit admin payment rejection (Rule 32)
  async rejectPayment(orderId: string, reason: string, adminName: string = 'Admin'): Promise<Order> {
    recordClientActivity();
    await fetchApi(`/api/orders/${orderId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ action: 'REJECT', rejectionReason: reason, adminName }),
    });
    return this.getOrderById(orderId);
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, adminName: string = 'Admin'): Promise<Order> {
    recordClientActivity();
    await fetchApi(`/api/orders/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({ orderStatus: status }),
    });
    return this.getOrderById(orderId);
  },

  async updateTracking(
    orderId: string,
    trackingNumber: string,
    courierName?: string,
    trackingUrl?: string,
    adminName: string = 'Admin'
  ): Promise<Order> {
    recordClientActivity();
    await fetchApi(`/api/orders/${orderId}/tracking`, {
      method: 'PATCH',
      body: JSON.stringify({ trackingNumber, courierName }),
    });
    return this.getOrderById(orderId);
  },

  async markSupplierOrdered(
    orderId: string,
    supplierOrderId: string,
    adminName: string = 'Admin'
  ): Promise<Order> {
    return this.dispatchToSupplier(orderId, 'sup_auto', supplierOrderId, adminName);
  },

  async dispatchToSupplier(
    orderId: string,
    supplierId: string,
    supplierOrderId: string,
    adminName: string = 'Admin'
  ): Promise<Order> {
    recordClientActivity();
    await fetchApi(`/api/orders/${orderId}/supplier`, {
      method: 'POST',
      body: JSON.stringify({ supplierId, supplierOrderId }),
    });
    return this.getOrderById(orderId);
  },
};