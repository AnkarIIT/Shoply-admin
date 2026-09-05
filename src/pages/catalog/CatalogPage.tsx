import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '../../services/catalogService';
import { Product, CatalogSyncLog } from '../../types';
import { RefreshCw, Upload, CheckCircle, Clock, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const CatalogPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [syncLogs, setSyncLogs] = useState<CatalogSyncLog[]>([]);
  const [activeTab, setActiveTab] = useState<'PUBLISHED' | 'DRAFT' | 'PENDING_REVIEW' | 'REJECTED' | 'OUT_OF_STOCK'>('PUBLISHED');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const loadData = async () => {
    setLoading(true);
    const prods = await catalogService.getCatalogProducts(activeTab);
    const logs = await catalogService.getSyncLogs();
    setProducts(prods);
    setSyncLogs(logs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const tabs = [
    { id: 'PUBLISHED', label: 'Published' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'PENDING_REVIEW', label: 'Pending Review' },
    { id: 'REJECTED', label: 'Rejected' },
    { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Supplier Catalog Management
          </h1>
          <p className="text-xs text-zinc-500">
            Catalog synchronization feeds, approval status, and batch import tools.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('catalog:sync') && (
            <button
              onClick={() => navigate('/catalog/sync')}
              className="px-3.5 py-1.5 bg-[#FF5A36] hover:bg-[#E04E2D] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Feeds</span>
            </button>
          )}

          {hasPermission('catalog:import') && (
            <button
              onClick={() => navigate('/catalog/import')}
              className="px-3.5 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              <span>Import CSV/JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 pb-px overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3 py-2 text-xs font-medium cursor-pointer transition-colors border-b-2 whitespace-nowrap ${
              activeTab === t.id
                ? 'border-[#FF5A36] text-[#FF5A36] font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Products Grid / Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Supplier Partner</th>
                <th className="py-3 px-4">Supplier SKU</th>
                <th className="py-3 px-4">Supplier Cost</th>
                <th className="py-3 px-4">Selling Price</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">Loading catalog items...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">No items under {activeTab.replace('_', ' ')}.</td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      {p.title}
                    </td>
                    <td className="py-3 px-4 text-zinc-700">
                      {p.supplierName}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500">
                      {p.supplierProductId || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-700">
                      ₹{p.supplierCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                      ₹{p.sellingPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-zinc-800">
                      {p.stock}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700">
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync Logs Section */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900">Recent Feed Sync History</h2>
          <span className="text-xs text-zinc-400 font-mono">Automated Cron</span>
        </div>

        <div className="space-y-2">
          {syncLogs.map((log) => (
            <div key={log.id} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-semibold text-zinc-900">{log.supplierName}</div>
                  <div className="text-[11px] text-zinc-500">
                    +{log.productsAdded} added, {log.productsUpdated} updated, {log.productsDeactivated} deactivated
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-[11px] text-zinc-400">
                <div>{log.durationMs}ms</div>
                <div>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
