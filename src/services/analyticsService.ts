import { DashboardMetrics, Product } from '../types';
import { recordClientActivity, fetchApi } from './apiClient';

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface StatusDistributionItem {
  name: string;
  count: number;
  pct: number;
  color: string;
}

export const analyticsService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    recordClientActivity();
    return fetchApi<DashboardMetrics>('/api/metrics');
  },

  async getRevenueChartData(): Promise<RevenueDataPoint[]> {
    recordClientActivity();
    const points = await fetchApi<Array<{ date: string; revenue: number; orders?: number }>>('/api/metrics/revenue');
    return points.map((p) => ({ date: p.date, revenue: p.revenue }));
  },

  async getStatusDistribution(): Promise<StatusDistributionItem[]> {
    recordClientActivity();
    return fetchApi<StatusDistributionItem[]>('/api/metrics/status-distribution');
  },

  async getLowStockProducts(): Promise<Product[]> {
    recordClientActivity();
    return fetchApi<Product[]>('/api/metrics/low-stock');
  },

  async getTopSellingProducts(): Promise<Product[]> {
    recordClientActivity();
    return fetchApi<Product[]>('/api/metrics/top-products');
  },
};