import React, { useState, useEffect } from 'react';
import { ordersService } from '../../services/ordersService';
import { Order } from '../../types';
import { CheckCircle, XCircle, Clock, ExternalLink, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HighRiskConfirmModal } from '../../components/feedback/HighRiskConfirmModal';

export const PaymentReviewPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

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

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await ordersService.getOrders({ status: 'PAYMENT_REVIEW' });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleVerify = async (order: Order) => {
    await ordersService.verifyPayment(order.id, currentUser?.name || 'Admin');
    await fetchPayments();
  };

  const handleReject = (order: Order) => {
    setHighRiskAction({
      isOpen: true,
      title: `Reject Payment for Order ${order.orderNumber}`,
      description: `Confirm payment rejection for ${order.customer.name} (UTR: ${order.utrNumber || 'None'}). The order will be cancelled immediately.`,
      onConfirm: async () => {
        await ordersService.rejectPayment(order.id, 'UTR verification failed / Bank credit not found', currentUser?.name || 'Admin');
        await fetchPayments();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Payment Review Queue</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              {orders.length} Pending
            </span>
          </h1>
          <p className="text-xs text-zinc-500">
            Mandatory manual verification of customer-submitted UPI transactions and UTR reference numbers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-xs text-zinc-400">
            Loading pending payment submissions...
          </div>
        ) : orders.length === 0 ? (
          <div className="col-span-2 py-12 text-center bg-white rounded-xl border border-zinc-200 p-8">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-zinc-900">All caught up!</div>
            <div className="text-xs text-zinc-500 mt-0.5">There are no orders waiting for payment review.</div>
          </div>
        ) : (
          orders.map((ord) => (
            <div key={ord.id} className="bg-white rounded-xl border border-amber-200 shadow-2xs p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    {ord.orderNumber}
                  </span>
                  <div className="text-xs font-semibold text-zinc-800 mt-0.5">
                    {ord.customer.name}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {ord.customer.phone}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black font-mono text-zinc-900">
                    ₹{ord.totalAmount.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {ord.paymentMethod}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Submitted UTR:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {ord.utrNumber || 'Not provided'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Submitted At:</span>
                  <span className="font-mono text-zinc-700">
                    {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => handleVerify(ord)}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  VERIFY PAYMENT
                </button>
                <button
                  onClick={() => handleReject(ord)}
                  className="py-2 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  REJECT
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
