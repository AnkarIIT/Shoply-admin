import React, { useState, useEffect } from 'react';
import { returnsService } from '../../services/returnsService';
import { ReturnRequest } from '../../types';
import { RotateCcw, CheckCircle, XCircle, DollarSign, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { HighRiskConfirmModal } from '../../components/feedback/HighRiskConfirmModal';

export const ReturnsPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, hasPermission } = useAuth();

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

  const fetchReturns = async () => {
    setLoading(true);
    const data = await returnsService.getReturnRequests();
    setReturns(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleApprove = async (ret: ReturnRequest) => {
    await returnsService.approveReturn(ret.id, currentUser?.name || 'Admin');
    await fetchReturns();
  };

  const handleReject = async (ret: ReturnRequest) => {
    await returnsService.rejectReturn(ret.id, 'Non-returnable item condition / Policy violation', currentUser?.name || 'Admin');
    await fetchReturns();
  };

  const handleRefund = (ret: ReturnRequest) => {
    setHighRiskAction({
      isOpen: true,
      title: `Process ₹${ret.refundAmount.toLocaleString()} Refund`,
      description: `Confirm high-risk financial refund to ${ret.customerName} for Return #${ret.id}. Funds will be credited back to customer account.`,
      onConfirm: async () => {
        await returnsService.processRefund(ret.id, currentUser?.name || 'Admin');
        await fetchReturns();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Returns & Refunds</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
              {returns.filter(r => r.status === 'PENDING').length} Pending
            </span>
          </h1>
          <p className="text-xs text-zinc-500">
            Handle customer return disputes, reverse pickup authorization, and financial refund approvals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-zinc-400 text-xs">Loading returns...</div>
        ) : returns.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-zinc-400 text-xs">No return requests found.</div>
        ) : (
          returns.map((ret) => (
            <div key={ret.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    Order #{ret.orderNumber}
                  </span>
                  <div className="text-xs font-semibold text-zinc-800 mt-0.5">
                    {ret.customerName}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Requested on {new Date(ret.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black font-mono text-zinc-900">
                    ₹{ret.refundAmount.toLocaleString()}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ret.status === 'REFUNDED'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : ret.status === 'APPROVED'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : ret.status === 'REJECTED'
                      ? 'bg-zinc-100 text-zinc-600'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {ret.status}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-1">
                <div className="text-zinc-500 font-medium">Customer Reason:</div>
                <div className="text-zinc-800 font-semibold italic">"{ret.reason}"</div>
                {ret.items && ret.items.length > 0 && (
                  <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/60 mt-1">
                    Items: {ret.items.map(i => `${i.productTitle} (x${i.quantity})`).join(', ')}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                {ret.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleApprove(ret)}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve Return
                    </button>
                    <button
                      onClick={() => handleReject(ret)}
                      className="py-1.5 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </>
                )}

                {ret.status === 'APPROVED' && (
                  <button
                    onClick={() => handleRefund(ret)}
                    className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Process Refund (₹{ret.refundAmount})
                  </button>
                )}

                {ret.status === 'REFUNDED' && (
                  <div className="w-full py-1.5 text-center text-xs text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 font-semibold">
                    ✓ Refund Completed
                  </div>
                )}
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
