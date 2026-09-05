import React, { useState, useEffect } from 'react';
import { fulfilmentService, FulfilmentItemRow } from '../../services/fulfilmentService';
import { ordersService } from '../../services/ordersService';
import { Copy, Check, ExternalLink, PackageCheck, Download, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const FulfilmentPage: React.FC = () => {
  const [rows, setRows] = useState<FulfilmentItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orderIdModal, setOrderIdModal] = useState<{ open: boolean; row: FulfilmentItemRow | null; val: string }>({
    open: false,
    row: null,
    val: '',
  });

  const { currentUser } = useAuth();

  const fetchQueue = async () => {
    setLoading(true);
    const data = await fulfilmentService.getPendingFulfilments();
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleCopy = (row: FulfilmentItemRow) => {
    const packet = fulfilmentService.generateOrderPacketText(row);
    navigator.clipboard.writeText(packet);
    setCopiedId(row.orderId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMarkOrdered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdModal.row || !orderIdModal.val.trim()) return;

    await ordersService.markSupplierOrdered(
      orderIdModal.row.orderId,
      orderIdModal.val.trim(),
      currentUser?.name || 'Admin'
    );
    setOrderIdModal({ open: false, row: null, val: '' });
    await fetchQueue();
  };

  const handleExportCSV = () => {
    const headers = ['Order', 'Customer', 'Phone', 'Address', 'Item', 'Supplier', 'Supplier SKU', 'Quantity', 'Cost'];
    const csvLines = [headers.join(',')];
    rows.forEach(r => {
      csvLines.push([
        r.orderNumber,
        `"${r.customerName}"`,
        r.customerPhone,
        `"${r.shippingAddress}"`,
        `"${r.itemTitle}"`,
        `"${r.supplierName}"`,
        r.supplierProductId,
        r.quantity,
        r.supplierCost,
      ].join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shoply-Fulfilment-Queue-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Supplier Fulfilment Queue</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
              {rows.length} Pending
            </span>
          </h1>
          <p className="text-xs text-zinc-500">
            Dispatch paid customer orders directly to designated manufacturing & dropship suppliers.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-zinc-500" />
          <span>EXPORT CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Supplier Partner</th>
                <th className="py-3 px-4">Customer & Destination</th>
                <th className="py-3 px-4">Supplier Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">Loading fulfilment queue...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">No orders pending supplier fulfilment.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                      {row.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900">{row.itemTitle}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        Supplier SKU: <span className="font-semibold text-zinc-700">{row.supplierProductId}</span> • Qty: {row.quantity}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-800">
                      {row.supplierName}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-zinc-900">{row.customerName}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{row.shippingAddress}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                      ₹{row.totalSupplierCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === 'SUPPLIER_ORDERED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCopy(row)}
                          title="Copy details packet"
                          className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded cursor-pointer"
                        >
                          {copiedId === row.orderId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setOrderIdModal({ open: true, row, val: row.supplierOrderId || '' })}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-black text-white rounded text-[11px] font-semibold cursor-pointer"
                        >
                          {row.supplierOrderId ? 'ID: ' + row.supplierOrderId : 'Mark Ordered'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {orderIdModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5 border border-zinc-200">
            <h3 className="text-sm font-bold text-zinc-900 mb-1">Enter Supplier Order ID</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Confirm purchase order placed on {orderIdModal.row?.supplierName} portal.
            </p>
            <form onSubmit={handleMarkOrdered} className="space-y-3">
              <input
                type="text"
                required
                value={orderIdModal.val}
                onChange={(e) => setOrderIdModal({ ...orderIdModal, val: e.target.value })}
                placeholder="e.g. SUP-PO-9821"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOrderIdModal({ open: false, row: null, val: '' })}
                  className="flex-1 py-1.5 border border-zinc-300 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-[#FF5A36] text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Save & Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
