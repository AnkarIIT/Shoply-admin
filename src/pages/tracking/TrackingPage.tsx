import React, { useState, useEffect } from 'react';
import { ordersService } from '../../services/ordersService';
import { Order } from '../../types';
import { Truck, Search, ExternalLink, MapPin, CheckCircle, Clock } from 'lucide-react';

export const TrackingPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await ordersService.getOrders();
      setOrders(data.filter(o => o.trackingNumber));
    };
    load();
  }, []);

  const filtered = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    (o.trackingNumber && o.trackingNumber.toLowerCase().includes(search.toLowerCase())) ||
    o.customer.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Shipment Tracking
          </h1>
          <p className="text-xs text-zinc-500">
            Real-time airway bill monitoring across Delhivery, BlueDart, and express couriers.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search AWB or order #..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((ord) => (
          <div key={ord.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-zinc-900">
                  {ord.orderNumber}
                </span>
                <div className="text-xs font-bold text-zinc-800 mt-0.5">
                  {ord.customer.name}
                </div>
                <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  <span>{ord.shippingAddress.city}, {ord.shippingAddress.state}</span>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                ord.orderStatus === 'DELIVERED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {ord.orderStatus}
              </span>
            </div>

            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Courier Partner:</span>
                <span className="font-bold text-zinc-900">{ord.courierName || 'Delhivery Express'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">AWB Tracking #:</span>
                <span className="font-bold text-blue-600">{ord.trackingNumber}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
              <span className="text-[11px]">
                Shipped items: {ord.items.map(i => i.productTitle).join(', ')}
              </span>
              <a
                href={ord.trackingUrl || `https://www.delhivery.com/track/package/${ord.trackingNumber}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#FF5A36] hover:underline font-semibold flex items-center gap-1 shrink-0"
              >
                <span>Track Courier</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
