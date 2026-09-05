import { Product, CatalogSyncLog } from '../types';
import { recordClientActivity, fetchApi } from './apiClient';

export interface SyncLogItem {
  id: string;
  timestamp: string;
  supplierName: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  message: string;
  productsAdded?: number;
  productsUpdated?: number;
  productsDeactivated?: number;
  durationMs?: number;
}

type CatalogTab = 'PUBLISHED' | 'DRAFT' | 'PENDING_REVIEW' | 'REJECTED' | 'OUT_OF_STOCK';

export const catalogService = {
  async getCatalogByTab(tab: CatalogTab): Promise<Product[]> {
    recordClientActivity();
    return fetchApi<Product[]>(`/api/products?status=${tab}`);
  },

  async getCatalogProducts(tab: CatalogTab): Promise<Product[]> {
    return this.getCatalogByTab(tab);
  },

  async getSyncLogs(): Promise<CatalogSyncLog[]> {
    recordClientActivity();
    return fetchApi<CatalogSyncLog[]>('/api/catalog/sync-logs');
  },

  async triggerSync(supplierName: string, adminName: string = 'Admin'): Promise<CatalogSyncLog> {
    return this.runSync(supplierName, adminName);
  },

  async runSync(supplierName: string, adminName: string = 'Admin'): Promise<CatalogSyncLog> {
    recordClientActivity();
    return fetchApi<CatalogSyncLog>('/api/catalog/sync', {
      method: 'POST',
      body: JSON.stringify({ supplierName }),
    });
  },

  async batchImportProducts(items: any[], adminName: string = 'Admin'): Promise<number> {
    recordClientActivity();
    const res = await fetchApi<{ success: boolean; count: number }>('/api/products/batch-import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return res.count;
  },
};