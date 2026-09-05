import React, { useState } from 'react';
import { catalogService } from '../../services/catalogService';
import { CatalogSyncLog } from '../../types';
import { RefreshCw, CheckCircle, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const CatalogSyncPage: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('SoundTech Electronics');
  const [result, setResult] = useState<CatalogSyncLog | null>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleRunSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await catalogService.runSync(selectedSupplier, currentUser?.name || 'Admin');
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/catalog')}
          className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Catalog Synchronization Feed
          </h1>
          <p className="text-xs text-zinc-500">
            Fetch latest inventory levels and wholesale pricing updates from supplier feeds.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-2xs space-y-5">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            Select Supplier Partner Feed
          </label>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            disabled={syncing}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs text-zinc-900 font-medium"
          >
            <option value="SoundTech Electronics">SoundTech Electronics (Audio Feed)</option>
            <option value="NexTech Accessories">NexTech Accessories (Wearables Feed)</option>
            <option value="PrimeCase India">PrimeCase India (Accessories Feed)</option>
          </select>
        </div>

        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-1.5 text-zinc-600">
          <div className="font-semibold text-zinc-900">What happens during sync:</div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-500">
            <li>Checks latest supplier stock levels and flags depleted items as Out of Stock</li>
            <li>Detects changes in wholesale supplier cost prices</li>
            <li>Calculates updated profit margins based on current store selling prices</li>
            <li>Creates audit entries for any modified product records</li>
          </ul>
        </div>

        <button
          id="btn-run-catalog-sync"
          onClick={handleRunSync}
          disabled={syncing}
          className="w-full py-2.5 px-4 bg-[#FF5A36] hover:bg-[#E04E2D] text-white rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'SYNCING CATALOG FEED...' : 'RUN SYNC NOW'}</span>
        </button>

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>Catalog Sync Completed Successfully in {result.durationMs}ms</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-emerald-100">
                <div className="text-base font-black text-emerald-600 font-mono">+{result.productsAdded}</div>
                <div className="text-[10px] text-zinc-500 font-medium">New Products</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-emerald-100">
                <div className="text-base font-black text-blue-600 font-mono">{result.productsUpdated}</div>
                <div className="text-[10px] text-zinc-500 font-medium">Price/Stock Updated</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-emerald-100">
                <div className="text-base font-black text-zinc-600 font-mono">{result.productsDeactivated}</div>
                <div className="text-[10px] text-zinc-500 font-medium">Deactivated</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
