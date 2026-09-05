import React, { useState, useEffect, useMemo } from 'react';
import { productsService } from '../../services/productsService';
import { Product, Category } from '../../types';
import { Plus, Search, Edit2, Trash2, Package, Shield, AlertTriangle, Check, X, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { HighRiskConfirmModal } from '../../components/feedback/HighRiskConfirmModal';
import { exportProductsToCsv } from '../../utils/csvExport';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const { currentUser, hasPermission } = useAuth();

  const [highRiskAction, setHighRiskAction] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productsService.getProducts({
        search,
        category: selectedCategory,
      });
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory]);

  useEffect(() => {
    (async () => {
      try {
        setCategories(await productsService.getCategories());
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  const openCreateModal = () => {
    setFormData({
      title: '',
      sku: `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
      category: categories[0]?.name || 'General',
      sellingPrice: 0,
      mrp: 0,
      stock: 0,
      status: 'PUBLISHED',
      supplierName: '',
      supplierProductId: '',
      supplierCost: 0,
    });
    setIsCreating(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({ ...prod });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await productsService.updateProduct(editingProduct.id, formData, currentUser?.name || 'Admin');
    } else {
      await productsService.createProduct(formData, currentUser?.name || 'Admin');
    }
    setEditingProduct(null);
    setIsCreating(false);
    await fetchProducts();
  };

  const handleDelete = (prod: Product) => {
    setHighRiskAction({
      isOpen: true,
      title: `Delete Product ${prod.title}`,
      description: `Are you sure you want to permanently delete "${prod.title}" (${prod.sku})? This action cannot be undone.`,
      onConfirm: async () => {
        await productsService.deleteProduct(prod.id, currentUser?.name || 'Admin');
        await fetchProducts();
      },
    });
  };

  const handleExportData = () => {
    if (products.length === 0) return;
    exportProductsToCsv(products, selectedCategory !== 'ALL' ? selectedCategory : undefined);
    setExportMessage(`Exported ${products.length} product${products.length > 1 ? 's' : ''} to CSV`);
    setTimeout(() => setExportMessage(null), 3500);
  };

  const categoryOptions = useMemo(() => ['ALL', ...categories.map((c) => c.name)], [categories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Product Management
          </h1>
          <p className="text-xs text-zinc-500">
            Catalog inventory, pricing, and isolated supplier cost management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            disabled={products.length === 0 || loading}
            title={products.length === 0 ? 'No products in current view to export' : `Export ${products.length} products in current view to CSV`}
            className="px-3 py-2 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>Export Data</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-md font-mono font-medium">
              {products.length}
            </span>
          </button>

          {hasPermission('products:create') && (
            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 bg-[#FF5A36] hover:bg-[#E04E2D] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {exportMessage && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportMessage}</span>
          </div>
          <button 
            type="button"
            onClick={() => setExportMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {categoryOptions.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                selectedCategory === c
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, SKU..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Selling Price</th>
                <th className="py-3 px-4">Supplier Cost</th>
                <th className="py-3 px-4">Margin</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                          {prod.images?.[0] ? (
                            <img src={prod.images[0]} alt={prod.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900">{prod.title}</div>
                          <div className="text-[11px] font-mono text-zinc-400">{prod.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-medium">
                      {prod.category}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                      ₹{prod.sellingPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600">
                      ₹{prod.supplierCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                      +₹{prod.margin.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span className={prod.stock <= 5 ? 'text-red-600' : 'text-zinc-800'}>
                        {prod.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        prod.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : prod.status === 'OUT_OF_STOCK'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {prod.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {hasPermission('products:delete') && (
                          <button
                            onClick={() => handleDelete(prod)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal (Rule 37) */}
      {(isCreating || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-zinc-200 max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-base font-bold text-zinc-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingProduct(null);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Customer-Facing Section */}
              <div className="space-y-3">
                <span className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] block border-b border-zinc-100 pb-1">
                  1. Customer-Facing Information
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">Product Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">Store SKU</label>
                    <input
                      type="text"
                      required
                      value={formData.sku || ''}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">Category</label>
                    <select
                      value={formData.category || 'General'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-2.5 py-2 border border-zinc-300 rounded-lg"
                    >
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))
                      ) : (
                        <option value="General">General</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.sellingPrice || ''}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">MRP (₹)</label>
                    <input
                      type="number"
                      value={formData.mrp || ''}
                      onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Inventory Stock</label>
                  <input
                    type="number"
                    value={formData.stock !== undefined ? formData.stock : 10}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-32 px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Internal Supplier Section (Admin-Only) */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center gap-1.5 border-b border-amber-200 pb-1">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px]">
                    2. Internal Supplier & COGS Section (Admin-Only)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">Supplier Partner</label>
                    <input
                      type="text"
                      value={formData.supplierName || ''}
                      onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">Supplier SKU / ID</label>
                    <input
                      type="text"
                      value={formData.supplierProductId || ''}
                      onChange={(e) => setFormData({ ...formData, supplierProductId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">Supplier Cost Price (₹)</label>
                    <input
                      type="number"
                      value={formData.supplierCost || ''}
                      onChange={(e) => setFormData({ ...formData, supplierCost: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">Projected Margin (₹)</label>
                    <div className="px-3 py-2 bg-white border border-zinc-200 rounded-lg font-mono font-bold text-emerald-600">
                      +₹{((formData.sellingPrice || 0) - (formData.supplierCost || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 border border-zinc-300 rounded-lg font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF5A36] hover:bg-[#E04E2D] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Risk Confirm */}
      <HighRiskConfirmModal
        isOpen={highRiskAction.isOpen}
        title={highRiskAction.title}
        description={highRiskAction.description}
        onConfirm={highRiskAction.onConfirm}
        onClose={() => setHighRiskAction((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
};
