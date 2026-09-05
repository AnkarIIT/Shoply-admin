import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ordersService } from '../../services/ordersService';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Package,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { HighRiskConfirmModal } from '../../components/feedback/HighRiskConfirmModal';
import { exportOrdersToCsv } from '../../utils/csvExport';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  
  // Tracking Modal State
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('Delhivery Express');

  // Supplier Order Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierOrderId, setSupplierOrderId] = useState('');

  // High Risk Action Modal State
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

  const { currentUser, hasPermission } = useAuth();
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await ordersService.getOrders({
        search,
        status: statusFilter,
      });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter]);

  const handleVerifyPayment = async (order: Order) => {
    await ordersService.verifyPayment(order.id, currentUser?.name || 'Admin');
    await fetchOrders();
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(await ordersService.getOrderById(order.id));
    }
  };

  const handleRejectPayment = (order: Order) => {
    setHighRiskAction({
      isOpen: true,
      title: `Reject Payment for ${order.orderNumber}`,
      description: `Are you sure you want to reject the UTR submission for ${order.customer.name} (Amount: ₹${order.totalAmount})? The order will be cancelled.`,
      onConfirm: async () => {
        await ordersService.rejectPayment(order.id, 'Invalid UTR verification proof', currentUser?.name || 'Admin');
        await fetchOrders();
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(await ordersService.getOrderById(order.id));
        }
      },
    });
  };

  const handleUpdateTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !trackingNumber.trim()) return;

    await ordersService.updateTracking(
      selectedOrder.id,
      trackingNumber.trim(),
      courierName,
      undefined,
      currentUser?.name || 'Admin'
    );
    setShowTrackingModal(false);
    await fetchOrders();
    setSelectedOrder(await ordersService.getOrderById(selectedOrder.id));
  };

  const handleMarkSupplierOrdered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !supplierOrderId.trim()) return;

    await ordersService.markSupplierOrdered(
      selectedOrder.id,
      supplierOrderId.trim(),
      currentUser?.name || 'Admin'
    );
    setShowSupplierModal(false);
    await fetchOrders();
    setSelectedOrder(await ordersService.getOrderById(selectedOrder.id));
  };

  const handleCopyPacket = () => {
    if (!selectedOrder) return;
    const packet = `SHOPLY ORDER FULFILMENT PACKET
Order: ${selectedOrder.orderNumber}
Customer: ${selectedOrder.customer.name} (${selectedOrder.customer.phone})
Address: ${selectedOrder.shippingAddress.street}, ${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.state} - ${selectedOrder.shippingAddress.postalCode}
Items:
${selectedOrder.items.map(i => `- ${i.productTitle} x${i.quantity} (Supplier SKU: ${i.supplierSku || 'N/A'}, Target Cost: ₹${i.supplierCost})`).join('\n')}
Total Supplier Cost: ₹${selectedOrder.totalSupplierCost}`;

    navigator.clipboard.writeText(packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusTabs = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'PAYMENT_REVIEW', label: 'Payment Review' },
    { id: 'PAID', label: 'Paid' },
    { id: 'PROCESSING', label: 'Processing' },
    { id: 'SHIPPED', label: 'Shipped' },
    { id: 'DELIVERED', label: 'Delivered' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  const handleExportData = () => {
    if (orders.length === 0) return;
    exportOrdersToCsv(orders, statusFilter !== 'ALL' ? statusFilter : undefined);
    setExportMessage(`Exported ${orders.length} order${orders.length > 1 ? 's' : ''} to CSV`);
    setTimeout(() => setExportMessage(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Orders Management
          </h1>
          <p className="text-xs text-zinc-500">
            Review payments, process fulfilment, track shipments, and manage orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/payments')}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Payment Review Queue</span>
          </button>
          <button
            onClick={handleExportData}
            disabled={orders.length === 0 || loading}
            title={orders.length === 0 ? 'No orders in current view to export' : `Export ${orders.length} orders in current view to CSV`}
            className="px-3 py-1.5 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>Export Data</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-md font-mono font-medium">
              {orders.length}
            </span>
          </button>
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

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 pb-px">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              statusFilter === tab.id
                ? 'border-[#FF5A36] text-[#FF5A36] font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer name, email, or UTR..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4">Supplier Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                    No orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr
                    key={ord.id}
                    className="hover:bg-zinc-50/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(ord)}
                  >
                    <td className="py-3 px-4 font-bold text-zinc-900 font-mono">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900">{ord.customer.name}</div>
                      <div className="text-[11px] text-zinc-400">{ord.customer.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-bold font-mono text-zinc-900">
                      ₹{ord.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {ord.paymentStatus === 'PAID' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          PAID
                        </span>
                      ) : ord.paymentStatus === 'UTR_SUBMITTED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          UTR Review
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700">
                          {ord.paymentStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-800">
                        {ord.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {ord.supplierOrderId ? (
                        <span className="text-[11px] font-mono text-emerald-600 font-medium">
                          #{ord.supplierOrderId}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400 italic">
                          Not placed yet
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                      {new Date(ord.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-zinc-900 font-mono">
                    {selectedOrder.orderNumber}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800">
                    {selectedOrder.orderStatus}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Review Banner if UTR Pending */}
            {selectedOrder.orderStatus === 'PAYMENT_REVIEW' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <Clock className="w-4 h-4" />
                  <span>UTR Payment Awaiting Verification</span>
                </div>
                <div className="text-xs text-amber-900 space-y-1">
                  <div>Customer submitted UTR: <span className="font-mono font-bold">{selectedOrder.utrNumber || 'N/A'}</span></div>
                  <div>Amount to verify: <span className="font-mono font-bold">₹{selectedOrder.totalAmount}</span></div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleVerifyPayment(selectedOrder)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verify Payment
                  </button>
                  <button
                    onClick={() => handleRejectPayment(selectedOrder)}
                    className="py-1.5 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Customer Details */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Customer & Shipping
              </h3>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-1">
                <div className="font-bold text-zinc-900">{selectedOrder.customer.name}</div>
                <div className="text-zinc-600">{selectedOrder.customer.email} • {selectedOrder.customer.phone}</div>
                <div className="text-zinc-600 pt-1 border-t border-zinc-200/60 mt-1">
                  {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.postalCode}
                </div>
              </div>
            </div>

            {/* Items with Admin-Only Margin & Supplier Breakdown (Rule 31) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Order Items & Internal Margin (Admin Only)
              </h3>
              <div className="space-y-2">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-zinc-900">{item.productTitle}</div>
                        <div className="text-[11px] text-zinc-500">SKU: {item.sku} • Qty: {item.quantity}</div>
                      </div>
                      <div className="text-right font-mono font-bold text-zinc-900">
                        ₹{item.totalPrice}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-zinc-200/70 grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-zinc-200/50">
                      <div>
                        <span className="text-zinc-400">Supplier:</span>{' '}
                        <span className="font-medium text-zinc-800">{item.supplierName}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Supplier Cost:</span>{' '}
                        <span className="font-mono font-medium text-zinc-800">₹{item.supplierCost}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Supplier SKU:</span>{' '}
                        <span className="font-mono text-zinc-700">{item.supplierSku || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Unit Margin:</span>{' '}
                        <span className="font-mono font-bold text-emerald-600">
                          +₹{item.unitPrice - item.supplierCost}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Summary */}
              <div className="p-3 bg-zinc-100 rounded-xl text-xs space-y-1 font-mono">
                <div className="flex justify-between text-zinc-600">
                  <span>Gross Order Value:</span>
                  <span>₹{selectedOrder.totalAmount}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Total Supplier COGS:</span>
                  <span>-₹{selectedOrder.totalSupplierCost}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-zinc-200">
                  <span>Estimated Net Margin:</span>
                  <span>+₹{selectedOrder.estimatedMargin}</span>
                </div>
              </div>
            </div>

            {/* Fulfilment & Shipping Management */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Fulfilment & Shipping
              </h3>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500">Supplier Order ID:</span>{' '}
                    <span className="font-bold text-zinc-900 font-mono">
                      {selectedOrder.supplierOrderId || 'None'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSupplierModal(true)}
                    className="px-2 py-1 bg-white border border-zinc-300 hover:bg-zinc-100 rounded text-zinc-700 font-semibold cursor-pointer"
                  >
                    {selectedOrder.supplierOrderId ? 'Update ID' : 'Record Supplier Order'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
                  <div>
                    <span className="text-zinc-500">Tracking:</span>{' '}
                    <span className="font-bold text-zinc-900 font-mono">
                      {selectedOrder.trackingNumber ? `${selectedOrder.courierName} #${selectedOrder.trackingNumber}` : 'Not shipped'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowTrackingModal(true)}
                    className="px-2 py-1 bg-white border border-zinc-300 hover:bg-zinc-100 rounded text-zinc-700 font-semibold cursor-pointer"
                  >
                    {selectedOrder.trackingNumber ? 'Edit Tracking' : 'Add Tracking'}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCopyPacket}
                    className="w-full py-2 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg text-xs font-semibold text-zinc-800 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Order Packet Copied!' : 'Copy Fulfilment Packet for Supplier'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Supplier Order Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5 border border-zinc-200">
            <h3 className="text-sm font-bold text-zinc-900 mb-2">
              Record Supplier Order ID
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Enter the confirmed Order ID issued by the external supplier portal.
            </p>
            <form onSubmit={handleMarkSupplierOrdered} className="space-y-3">
              <input
                type="text"
                required
                value={supplierOrderId}
                onChange={(e) => setSupplierOrderId(e.target.value)}
                placeholder="e.g. STE-ORD-9912"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 py-1.5 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-[#FF5A36] text-white rounded-lg text-xs font-semibold"
                >
                  Save ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5 border border-zinc-200">
            <h3 className="text-sm font-bold text-zinc-900 mb-2">
              Update Courier Tracking
            </h3>
            <form onSubmit={handleUpdateTracking} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Courier Partner
                </label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs text-zinc-900"
                >
                  <option value="Delhivery Express">Delhivery Express</option>
                  <option value="BlueDart">BlueDart</option>
                  <option value="Blr Courier">Blr Courier</option>
                  <option value="DTDC">DTDC</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  AWB / Tracking Number
                </label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BLR9938210"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTrackingModal(false)}
                  className="flex-1 py-1.5 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Save & Mark Shipped
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High Risk Confirmation */}
      <HighRiskConfirmModal
        isOpen={highRiskAction.isOpen}
        title={highRiskAction.title}
        description={highRiskAction.description}
        onConfirm={highRiskAction.onConfirm}
        onClose={() => setHighRiskAction((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
