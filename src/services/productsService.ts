import { Product, Category } from '../types';
import { recordClientActivity, fetchApi } from './apiClient';

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: string;
}

export const productsService = {
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    recordClientActivity();
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'ALL') params.append('category', filters.category);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    return fetchApi<Product[]>(`/api/products?${params.toString()}`);
  },

  async getProductById(id: string): Promise<Product> {
    recordClientActivity();
    return fetchApi<Product>(`/api/products/${id}`);
  },

  async createProduct(data: Partial<Product>, adminName: string = 'Admin'): Promise<Product> {
    recordClientActivity();
    await fetchApi('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const sku = data.sku || '';
    return this.getProductById(sku);
  },

  async updateProduct(id: string, updates: Partial<Product>, adminName: string = 'Admin'): Promise<Product> {
    recordClientActivity();
    return fetchApi<Product>(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async updateStock(id: string, newStock: number, adminName: string = 'Admin'): Promise<Product> {
    recordClientActivity();
    return fetchApi<Product>(`/api/products/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify({ stock: newStock }),
    });
  },

  async deleteProduct(id: string, adminName: string = 'Admin'): Promise<void> {
    recordClientActivity();
    await fetchApi(`/api/products/${id}`, { method: 'DELETE' });
  },

  async getCategories(): Promise<Category[]> {
    return fetchApi<Category[]>('/api/categories');
  },

  async createCategory(name: string, slug?: string, adminName: string = 'Admin'): Promise<Category> {
    const res = await fetchApi<{ success: boolean; id: string; name: string; slug: string }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
    return {
      id: res.id,
      name: res.name,
      slug: res.slug,
      productCount: 0,
      status: 'ACTIVE',
    };
  },
};