import React, { useState, useEffect } from 'react';
import { couponsService } from '../../services/couponsService';
import { Coupon } from '../../types';
import { Plus, Tag, Check, X, Calendar, Percent } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const CouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    minOrderValue: 999,
    usageLimit: 500,
  });

  const { currentUser, hasPermission } = useAuth();

  const fetchCoupons = async () => {
    const data = await couponsService.getCoupons();
    setCoupons(data);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleToggle = async (id: string) => {
    await couponsService.toggleCoupon(id, currentUser?.name || 'Admin');
    await fetchCoupons();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await couponsService.createCoupon(formData, currentUser?.name || 'Admin');
    setIsModalOpen(false);
    await fetchCoupons();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Coupons & Promotions
          </h1>
          <p className="text-xs text-zinc-500">
            Create discount codes, order minimums, and usage thresholds.
          </p>
        </div>

        {hasPermission('coupons:create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-[#FF5A36] hover:bg-[#E04E2D] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {coupons.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-lg text-sm font-black font-mono tracking-wider text-zinc-900">
                {c.code}
              </div>
              <button
                onClick={() => handleToggle(c.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                  c.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                }`}
              >
                {c.isActive ? 'ACTIVE' : 'INACTIVE'}
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-bold text-zinc-900 text-base">
                {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
              </div>
              <div className="text-zinc-500">
                Min. Order: <span className="font-mono font-semibold text-zinc-800">₹{c.minOrderValue}</span>
              </div>
              <div className="text-zinc-500">
                Redeemed: <span className="font-mono font-semibold text-zinc-800">{c.usedCount} / {c.usageLimit}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Valid till {c.endDate}</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 border border-zinc-200">
            <h3 className="text-base font-bold text-zinc-900 mb-4">Create New Promo Coupon</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLASH20"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discountType || 'PERCENTAGE'}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-zinc-300 rounded-lg"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={formData.discountValue || ''}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Min. Order Value (₹)</label>
                  <input
                    type="number"
                    value={formData.minOrderValue || ''}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={formData.usageLimit || ''}
                    onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border border-zinc-300 rounded-lg font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#FF5A36] text-white rounded-lg font-semibold cursor-pointer"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
