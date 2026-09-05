import React, { useState, useEffect } from 'react';
import { productsService } from '../../services/productsService';
import { Category } from '../../types';
import { Layers, Plus, Tag, X, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const CategoriesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await productsService.getCategories();
        setCategories(cats);
      } catch (err: any) {
        setError(err?.message || 'Failed to load categories');
      }
    };
    load();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await productsService.createCategory(name.trim(), slug.trim() || undefined);
      const cats = await productsService.getCategories();
      setCategories(cats);
      setIsCreating(false);
      setName('');
      setSlug('');
      setDescription('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Categories
          </h1>
          <p className="text-xs text-zinc-500">
            Organize products across departments and storefront collections.
          </p>
        </div>

        {hasPermission('products:create') && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FF5A36] hover:bg-[#e04826] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#FF5A36] flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {cat.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-900">{cat.name}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{cat.description || 'Collection of store items'}</p>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
              <span className="font-mono text-zinc-400">/{cat.slug}</span>
              <span className="font-semibold text-zinc-900">{cat.productCount} Products</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Category Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-sm font-bold text-zinc-900">Add New Category</h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">{error}</div>
              )}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Ergonomic Chairs"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. ergonomic-chairs"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-zinc-900 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description for storefront SEO and catalogs..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2 border border-zinc-300 rounded-lg font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-[#FF5A36] hover:bg-[#e04826] text-white rounded-lg font-semibold shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
