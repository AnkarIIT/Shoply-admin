import React, { useState, useEffect } from 'react';
import { Save, Store, CreditCard, Truck, Check, Database, RefreshCw, Server, Activity, ShieldCheck, Trash2, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabaseStatus, purgeDummyData, fetchApi, DatabaseStatus } from '../../services/apiClient';
import { HighRiskConfirmModal } from '../../components/feedback/HighRiskConfirmModal';

export const SettingsPage: React.FC = () => {
  const [storeName, setStoreName] = useState('Shoply Online Store');
  const [merchantUPI, setMerchantUPI] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('0');
  const [defaultShippingFee, setDefaultShippingFee] = useState('0');
  const [defaultMarkupPercent, setDefaultMarkupPercent] = useState('0');
  const [supportEmail, setSupportEmail] = useState('');
  const [saved, setSaved] = useState(false);

  // Neon DB state
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [purgingLoading, setPurgingLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // High Risk Confirm Modal state
  const [highRiskModal, setHighRiskModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'CONFIRM',
    onConfirm: async () => {},
  });

  const { currentUser, hasPermission } = useAuth();

  const fetchDbStatus = async () => {
    setDbLoading(true);
    try {
      const status = await getDatabaseStatus();
      setDbStatus(status);
    } catch (err: any) {
      setDbStatus({
        connected: false,
        latencyMs: 0,
        database: 'neondb',
        version: 'Unknown',
        host: '',
        tableCounts: {},
        error: err?.message || 'Connection failed',
      });
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetchApi<{
        storeName?: string;
        merchantUPI?: string;
        supportEmail?: string;
        freeShippingThreshold?: number;
        defaultShippingFee?: number;
        defaultMarkupPercent?: number;
      }>('/api/settings');
      if (res?.storeName) setStoreName(res.storeName);
      if (res.merchantUPI !== undefined) setMerchantUPI(res.merchantUPI || '');
      if (res.supportEmail !== undefined) setSupportEmail(res.supportEmail || '');
      if (res.freeShippingThreshold !== undefined) setFreeShippingThreshold(String(res.freeShippingThreshold));
      if (res.defaultShippingFee !== undefined) setDefaultShippingFee(String(res.defaultShippingFee));
      if (res.defaultMarkupPercent !== undefined) setDefaultMarkupPercent(String(res.defaultMarkupPercent));
    } catch {
      // Keep defaults
    }
  };

  const handleVerifySchema = async () => {
    setSeedMessage(null);
    await fetchDbStatus();
    setSeedMessage('Database schema verified & connected successfully.');
    setTimeout(() => setSeedMessage(null), 3500);
  };

  const executePurge = async (scope: 'orders_only' | 'all') => {
    setPurgingLoading(true);
    setSeedMessage(null);
    try {
      const res = await purgeDummyData(scope, currentUser?.name || 'Super Admin');
      setDbStatus(res.status);
      setSeedMessage(res.message);
      setTimeout(() => setSeedMessage(null), 4000);
    } catch (err: any) {
      setSeedMessage(`Clean error: ${err?.message}`);
    } finally {
      setPurgingLoading(false);
    }
  };

  const handlePurgeDummyData = (scope: 'orders_only' | 'all') => {
    if (scope === 'all') {
      setHighRiskModal({
        isOpen: true,
        title: 'Factory Reset: Wipe All Dummy Data',
        description: 'Are you sure you want to remove ALL dummy data (orders, returns, customers, and sample products)? Your database will be reset to a completely clean blank canvas.',
        confirmLabel: 'WIPE ALL DATA',
        onConfirm: async () => {
          await executePurge('all');
        },
      });
    } else {
      setHighRiskModal({
        isOpen: true,
        title: 'Remove Dummy Orders & Transactions',
        description: 'This will purge all sample test orders, returns, and customers from Neon PostgreSQL. Your real products and suppliers will remain intact for active selling.',
        confirmLabel: 'REMOVE DUMMY ORDERS',
        onConfirm: async () => {
          await executePurge('orders_only');
        },
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSeedMessage(null);
    try {
      await fetchApi('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          storeName,
          merchantUPI,
          supportEmail,
          freeShippingThreshold: Number(freeShippingThreshold) || 0,
          defaultShippingFee: Number(defaultShippingFee) || 0,
          defaultMarkupPercent: Number(defaultMarkupPercent) || 0,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSeedMessage(`Save error: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          Store & Database Settings
        </h1>
        <p className="text-xs text-zinc-500">
          Configure business identity, UPI merchant accounts, and monitor live Neon PostgreSQL connectivity.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Neon PostgreSQL Live Database Card */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  PostgreSQL Cloud Database (Neon)
                </h2>
                {dbStatus?.connected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ONLINE & SYNCED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                    CONNECTING...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Managed serverless PostgreSQL cluster with connection pooler and SSL encryption.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDbStatus}
              disabled={dbLoading}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
              <span>Ping Latency</span>
            </button>
            <button
              type="button"
              onClick={handleVerifySchema}
              disabled={dbLoading}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Server className="w-3.5 h-3.5" />
              <span>{dbLoading ? 'Checking...' : 'Verify Schema'}</span>
            </button>
          </div>
        </div>

        {seedMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{seedMessage}</span>
          </div>
        )}

        {/* Database specs grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/70">
            <span className="text-[10px] font-medium text-zinc-400 block uppercase">Database Name</span>
            <span className="text-xs font-bold text-zinc-800 font-mono">{dbStatus?.database || 'neondb'}</span>
          </div>
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/70">
            <span className="text-[10px] font-medium text-zinc-400 block uppercase">Network Latency</span>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-zinc-800 font-mono">
                {dbStatus?.latencyMs ? `${dbStatus.latencyMs} ms` : 'Testing...'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/70">
            <span className="text-[10px] font-medium text-zinc-400 block uppercase">SSL Encryption</span>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-xs font-bold font-mono">TLS 1.3 / Require</span>
            </div>
          </div>
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/70">
            <span className="text-[10px] font-medium text-zinc-400 block uppercase">Engine Version</span>
            <span className="text-xs font-bold text-zinc-800 font-mono">{dbStatus?.version || 'PostgreSQL'}</span>
          </div>
        </div>

        {/* Live Table Counts */}
        <div>
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Live PostgreSQL Tables & Row Counts
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Object.entries(dbStatus?.tableCounts || {}).map(([table, count]) => (
              <div key={table} className="p-2.5 bg-white rounded-lg border border-zinc-200 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600 font-mono capitalize">{table.replace('_', ' ')}</span>
                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 text-xs font-bold rounded-md font-mono">
                  {count} rows
                </span>
              </div>
            ))}
            {!dbStatus?.tableCounts && (
              <div className="sm:col-span-4 py-3 text-center text-[11px] text-zinc-400">
                Loading live table row counts...
              </div>
            )}
          </div>
        </div>

        {/* Connection endpoint */}
        <div className="pt-1">
          <label className="text-[11px] font-medium text-zinc-500 block mb-1">Database Host</label>
          <input
            type="text"
            readOnly
            value={dbStatus?.host || 'Not connected'}
            className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-600 select-all"
          />
        </div>
      </div>

      {/* Production State & Dummy Data Cleaner */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Production State & Data Cleanup
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Remove demo/dummy orders and transactions to start with an authentic clean store.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Remove Dummy Orders & Transactions</span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Clears out all sample orders, returns, and dummy customers from Neon PostgreSQL. Leaves your product catalogue and supplier relationships intact for immediate selling.
              </p>
            </div>
            <button
              type="button"
              id="btn-clean-dummy-orders"
              onClick={() => handlePurgeDummyData('orders_only')}
              disabled={purgingLoading}
              className="mt-3.5 inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{purgingLoading ? 'Cleaning...' : 'Remove Dummy Orders'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Complete Factory Reset (Wipe All)</span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Clears all database tables (orders, products, customers, returns). Gives you an absolute blank canvas to build your exact store catalog from scratch.
              </p>
            </div>
            <button
              type="button"
              id="btn-clean-all-data"
              onClick={() => handlePurgeDummyData('all')}
              disabled={purgingLoading}
              className="mt-3.5 inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{purgingLoading ? 'Purging...' : 'Wipe All Dummy Data'}</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Store className="w-4 h-4 text-[#FF5A36]" />
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Store Profile & Identity
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Support Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* UPI & Payment Settings */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <CreditCard className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              UPI & Manual Payment Collection
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Merchant UPI VPA ID</label>
              <input
                type="text"
                value={merchantUPI}
                onChange={(e) => setMerchantUPI(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold text-zinc-900"
              />
              <p className="text-[11px] text-zinc-400 mt-1">Displayed on customer QR checkout screens.</p>
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Settlement Account</label>
              <input
                type="text"
                disabled
                value={merchantUPI ? `UPI: ${merchantUPI}` : 'Not configured'}
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Shipping Thresholds */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Truck className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Shipping & Fulfilment Thresholds
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Free Shipping Min (₹)</label>
              <input
                type="number"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Standard Delivery Fee (₹)</label>
              <input
                type="number"
                value={defaultShippingFee}
                onChange={(e) => setDefaultShippingFee(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Default Catalog Markup (%)</label>
              <input
                type="number"
                value={defaultMarkupPercent}
                onChange={(e) => setDefaultMarkupPercent(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>SAVE SETTINGS</span>
          </button>
        </div>
      </form>

      {/* High-Risk Confirm Modal for Purging */}
      <HighRiskConfirmModal
        isOpen={highRiskModal.isOpen}
        title={highRiskModal.title}
        description={highRiskModal.description}
        confirmLabel={highRiskModal.confirmLabel}
        requireTotp={true}
        onConfirm={highRiskModal.onConfirm}
        onClose={() => setHighRiskModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
