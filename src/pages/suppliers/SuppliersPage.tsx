import React, { useState, useEffect } from 'react';
import { suppliersService } from '../../services/suppliersService';
import { Supplier } from '../../types';
import { Plus, Globe, Mail, Phone, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    integrationType: 'MANUAL',
    status: 'ACTIVE',
  });

  const { currentUser, hasPermission } = useAuth();

  const fetchSuppliers = async () => {
    setLoading(true);
    const data = await suppliersService.getSuppliers();
    setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await suppliersService.createSupplier(formData, currentUser?.name || 'Admin');
    setIsModalOpen(false);
    await fetchSuppliers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Suppliers & Vendor Partners
          </h1>
          <p className="text-xs text-zinc-500">
            Source vendors, catalog dispatch feeds, and honest integration connectivity.
          </p>
        </div>

        {hasPermission('suppliers:create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-[#FF5A36] hover:bg-[#E04E2D] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((sup) => (
          <div key={sup.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">{sup.name}</h3>
                <div className="text-xs text-zinc-500">{sup.contactPerson}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                sup.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-zinc-100 text-zinc-500'
              }`}>
                {sup.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                <span>{sup.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-mono">{sup.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <a href={sup.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                  <span>{sup.website.replace('https://', '')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Honest Connectivity Notice (Rule 2) */}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 text-[11px]">Type:</span>
                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 font-mono text-[10px] font-bold rounded">
                  {sup.integrationType}
                </span>
              </div>

              {sup.integrationType === 'API' ? (
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Pending API Config
                </span>
              ) : (
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Manual Order Ready
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 border border-zinc-200">
            <h3 className="text-base font-bold text-zinc-900 mb-4">Add Vendor Partner</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Company / Supplier Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Integration Mode</label>
                  <select
                    value={formData.integrationType || 'MANUAL'}
                    onChange={(e) => setFormData({ ...formData, integrationType: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-zinc-300 rounded-lg font-medium"
                  >
                    <option value="MANUAL">MANUAL (Copy Packet)</option>
                    <option value="CSV">CSV Bulk Export</option>
                    <option value="FEED">Catalog Feed</option>
                    <option value="API">Direct API (Requires Webhook)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Supplier Portal Website</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
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
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
