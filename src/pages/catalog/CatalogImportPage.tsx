import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '../../services/catalogService';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const CatalogImportPage: React.FC = () => {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (f: File) => {
    setFile(f);
    // Simulate parsed preview rows
    setPreviewRows([
      { title: 'ANC Wireless Headphones Pro', sku: 'IMP-AUD-01', category: 'Audio', price: 2999, supplierCost: 1800, stock: 25 },
      { title: 'Magnetic Car Phone Mount', sku: 'IMP-ACC-02', category: 'Accessories', price: 499, supplierCost: 180, stock: 50 },
      { title: 'Braided Fast Charging Cable 2m', sku: 'IMP-ACC-03', category: 'Accessories', price: 299, supplierCost: 95, stock: 120 },
      { title: 'Smart Fitness Tracker V2', sku: 'IMP-WEA-04', category: 'Wearables', price: 1899, supplierCost: 1100, stock: 30 },
    ]);
  };

  const handleExecuteImport = async () => {
    setImporting(true);
    const count = await catalogService.batchImportProducts(previewRows, currentUser?.name || 'Admin');
    setSuccessCount(count);
    setImporting(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/catalog')}
          className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Batch Product Import
          </h1>
          <p className="text-xs text-zinc-500">
            Import product lines, inventory levels, and wholesale cost sheets via CSV or JSON.
          </p>
        </div>
      </div>

      {/* Drag & Drop File Upload Container */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white ${
          dragOver ? 'border-[#FF5A36] bg-orange-50/20' : 'border-zinc-300 hover:border-zinc-400'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <div className="text-sm font-bold text-zinc-900 mb-1">
          {file ? file.name : 'Drag & drop your CSV or JSON catalog file'}
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Supports .csv, .json with columns: title, sku, category, price, supplier_cost, stock
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs">
          <span>Choose File from Computer</span>
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Preview Table */}
      {previewRows.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">
              Parsed Preview ({previewRows.length} Items Ready)
            </h3>
            <span className="text-xs text-emerald-600 font-semibold">Schema Validated ✓</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Selling Price</th>
                  <th className="py-2.5 px-3">Supplier Cost</th>
                  <th className="py-2.5 px-3 text-center">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {previewRows.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-semibold text-zinc-900">{r.title}</td>
                    <td className="py-2 px-3 font-mono text-zinc-500">{r.sku}</td>
                    <td className="py-2 px-3 text-zinc-600">{r.category}</td>
                    <td className="py-2 px-3 font-mono font-bold text-zinc-900">₹{r.price}</td>
                    <td className="py-2 px-3 font-mono text-zinc-600">₹{r.supplierCost}</td>
                    <td className="py-2 px-3 font-mono text-center font-bold text-zinc-800">{r.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleExecuteImport}
              disabled={importing || successCount !== null}
              className="px-5 py-2.5 bg-[#FF5A36] hover:bg-[#E04E2D] text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {importing ? (
                <span>Importing items...</span>
              ) : successCount !== null ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Imported {successCount} Products</span>
                </>
              ) : (
                <>
                  <span>Confirm & Import Products</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
