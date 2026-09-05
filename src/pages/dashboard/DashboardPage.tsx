import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Package,
  Tag,
  TrendingUp,
  RotateCcw,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  ShieldAlert,
  Truck,
  UserPlus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { ordersService } from '../../services/ordersService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';
import { Order, Product, AuditLog, DashboardMetrics } from '../../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [dateRange, setDateRange] = useState('Today');
  const [chartRange, setChartRange] = useState('Last 30 days');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    revenueChangePct: 0,
    totalOrders: 0,
    ordersChangePct: 0,
    paidOrders: 0,
    pendingPayments: 0,
    pendingFulfilment: 0,
    averageOrderValue: 0,
    estimatedProfit: 0,
    profitChangePct: 0,
    returnsCount: 0,
    returnsChangePct: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [chartData, setChartData] = useState<{ date: string; revenue: number; orders?: number }[]>([]);
  const [statusDist, setStatusDist] = useState<{ name: string; count: number; pct: number; color: string }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const m = await analyticsService.getDashboardMetrics();
        if (m) setMetrics(m);
        const orders = await ordersService.getOrders();
        setRecentOrders(orders.slice(0, 5));
        const low = await analyticsService.getLowStockProducts();
        setLowStock(low);
        const top = await analyticsService.getTopSellingProducts();
        setTopProducts(top);
        const logs = await auditService.getAuditLogs();
        setActivityLogs(logs.slice(0, 5));
        const rev = await analyticsService.getRevenueChartData();
        setChartData(rev);
        const dist = await analyticsService.getStatusDistribution();
        setStatusDist(dist);
      } catch (e) {
        console.error('Dashboard load error', e);
      }
    };
    loadData();
  }, []);

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);
  const CHART_W = 600;
  const CHART_H = 160;
  const chartPoints = chartData.map((d, i) => ({
    x: chartData.length > 1 ? (i * CHART_W) / (chartData.length - 1) : 0,
    y: CHART_H - (d.revenue / maxRevenue) * (CHART_H - 10) - 10,
  }));
  const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`;
  const yTicks = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxRevenue * i) / 4);
    return v >= 1000 ? `₹${(v / 1000).toFixed(1)}K` : `₹${v}`;
  }).reverse();
  const xLabels = chartData.filter((_, i) => chartData.length > 7 ? i % Math.ceil(chartData.length / 7) === 0 : true);

  let donutOffset = 0;
  const donutSegments = statusDist.map((s) => {
    const seg = { ...s, offset: donutOffset };
    donutOffset -= s.pct || 0;
    return seg;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Welcome Header & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
            Good morning, {currentUser?.name || 'Admin'}!
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Here's what's happening with your store today.
          </p>
        </div>

        <button 
          id="btn-dashboard-date-filter"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E7E7E4] rounded-lg text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 cursor-pointer transition-colors self-start sm:self-auto"
        >
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span>{dateRange}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>

      {/* 8 Metric KPI Cards (Live from Neon PostgreSQL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-[#E7E7E4] shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF5A36] shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-[#111111] tracking-tight">
                ₹{metrics.totalRevenue.toLocaleString('en-IN')}
              </span>
              {metrics.revenueChangePct > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
                  ↑ {metrics.revenueChangePct}%
                </span>
              )}
            </div>
            <div className="text-xs text-[#6B6B6B]">Total Revenue</div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-4 rounded-xl border border-[#E7E7E4] shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-[#111111] tracking-tight">
                {metrics.totalOrders}
              </span>
              {metrics.ordersChangePct > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
                  ↑ {metrics.ordersChangePct}%
                </span>
              )}
            </div>
            <div className="text-xs text-[#6B6B6B]">Total Orders</div>
          </div>
        </div>

        {/* Paid Orders */}
        <div className="bg-white p-4 rounded-xl border border-[#E7E7E4] shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#111111] tracking-tight">
              {metrics.paidOrders}
            </div>
            <div className="text-xs text-[#6B6B6B]">Paid Orders</div>
          </div>
        </div>

        {/* Pending Payments */}
        <div 
          onClick={() => navigate('/orders?status=PENDING_PAYMENT')}
          className="bg-white p-4 rounded-xl border border-[#E7E7E4] shadow-2xs flex items-center gap-3.5 hover:border-amber-300 cursor-pointer transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#111111] tracking-tight group-hover:text-amber-600 transition-colors">
              {metrics.pendingPayments}
            </div>
            <div className="text-xs text-[#6B6B6B]">Pending Payments</div>
          </div>
        </div>

        {/* Pending Fulfilment */}
        <div 
          onClick={() => navigate('/fulfilment')}
          className="bg-white p-4 rounded-xl border border-[#E7E7E4] shadow-2xs flex items-center gap-3.5 hover:border-orange-300 cursor-pointer transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#111111] tracking-tight group-hover:text-orange-600 transition-colors">
              {metrics.pendingFulfilment}
            </div>
            <div className="text-xs text-[#6B6B6B]">Pending Fulfilment</div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-4 rounded-xl border border-[#E7E7E4] shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#111111] tracking-tight">
              ₹{metrics.averageOrderValue.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[#6B6B6B]">Average Order Value</div>
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="bg-white p-4 rounded-xl border border-[#E7E7E4] shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-[#111111] tracking-tight">
                ₹{metrics.estimatedProfit.toLocaleString('en-IN')}
              </span>
              {metrics.profitChangePct > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
                  ↑ {metrics.profitChangePct}%
                </span>
              )}
            </div>
            <div className="text-xs text-[#6B6B6B]">Estimated Profit</div>
          </div>
        </div>

        {/* Returns */}
        <div 
          onClick={() => navigate('/returns')}
          className="bg-white p-4 rounded-xl border border-[#E7E7E4] shadow-2xs flex items-center gap-3.5 hover:border-rose-300 cursor-pointer transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-[#111111] tracking-tight group-hover:text-rose-600 transition-colors">
                {metrics.returnsCount}
              </span>
              {metrics.returnsChangePct > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
                  ↑ {metrics.returnsChangePct}%
                </span>
              )}
            </div>
            <div className="text-xs text-[#6B6B6B]">Returns</div>
          </div>
        </div>
      </div>

      {/* Row: Revenue Overview Chart (2/3) + Order Status Distribution Donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Overview (SVG Gradient Chart matching Screenshot) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E7E7E4] shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#111111]">Revenue Overview</h2>
            <button className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 border border-[#E7E7E4] px-2.5 py-1 rounded-md">
              <span>{chartRange}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
          </div>

          <div className="h-56 w-full relative pt-2">
            {/* Y Axis Guide labels */}
            <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-[10px] text-zinc-400 font-mono">
              {yTicks.map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>

            {/* SVG Area Chart */}
            <div className="ml-12 h-full pb-6 relative">
              <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FF5A36" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1="0" y1={(CHART_H / 4) * i} x2={CHART_W} y2={(CHART_H / 4) * i} stroke={i === 4 ? '#E7E7E4' : '#F0F0EE'} strokeWidth="1" />
                ))}

                {chartPoints.length > 1 && (
                  <>
                    {/* Shaded Area */}
                    <path d={areaPath} fill="url(#revenueGrad)" />
                    {/* Revenue Line */}
                    <path d={linePath} fill="none" stroke="#FF5A36" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Data Points */}
                    {chartPoints.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={i === chartPoints.length - 1 ? 4 : 3} fill="#FF5A36" stroke={i === chartPoints.length - 1 ? '#FFFFFF' : 'none'} strokeWidth={i === chartPoints.length - 1 ? 2 : 0} />
                    ))}
                  </>
                )}
              </svg>

              {/* X Axis Dates */}
              <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-zinc-400 font-medium">
                {xLabels.map((d, i) => (
                  <span key={i}>{d.date}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Distribution (Donut Chart matching Screenshot) */}
        <div className="bg-white rounded-xl border border-[#E7E7E4] shadow-2xs p-5 flex flex-col justify-between">
          <h2 className="text-sm font-bold text-[#111111]">Order Status Distribution</h2>

          <div className="flex items-center justify-between gap-4 my-auto py-2">
            {/* Donut Graphic */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {donutSegments.map((s, i) => (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke={s.color}
                    strokeWidth="14"
                    strokeDasharray={`${s.pct || 1} ${100 - (s.pct || 1)}`}
                    strokeDashoffset={String(s.offset)}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-[#111111]">{metrics.totalOrders}</span>
                <span className="text-[10px] text-zinc-500 font-medium">Orders</span>
              </div>
            </div>

            {/* Legend & Breakdown */}
            <div className="flex-1 space-y-1.5 text-xs">
              {donutSegments.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                    <span className="text-zinc-700">{s.name}</span>
                  </div>
                  <span className="text-zinc-500 font-mono text-[11px]">{s.count} ({s.pct}%)</span>
                </div>
              ))}
              {donutSegments.length === 0 && (
                <div className="py-8 text-center text-[11px] text-zinc-400">
                  No order data yet. Orders will appear here as they are placed.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Recent Orders Table (2/3) + Pending Actions (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table matching Screenshot */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E7E7E4] shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#111111]">Recent Orders</h2>
            <Link
              to="/orders"
              className="text-xs font-semibold text-[#FF5A36] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <span>→</span>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-2 text-zinc-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-zinc-700">No Orders Placed Yet</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                New store transactions and customer orders will stream in here live.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400 font-semibold text-[11px]">
                    <th className="pb-2.5 font-medium">#</th>
                    <th className="pb-2.5 font-medium">Customer</th>
                    <th className="pb-2.5 font-medium">Amount</th>
                    <th className="pb-2.5 font-medium">Payment</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {recentOrders.map((ord) => (
                    <tr 
                      key={ord.id} 
                      onClick={() => navigate(`/orders/${ord.id}`)}
                      className="hover:bg-[#F7F7F5] cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-semibold text-zinc-900 font-mono">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 text-zinc-800 font-medium">
                        {ord.customer?.name || 'Customer'}
                      </td>
                      <td className="py-3 font-semibold text-zinc-900 font-mono">
                        ₹{ord.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3">
                        {ord.paymentStatus === 'PAID' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            PAID
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            UTR Submitted
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {ord.orderStatus === 'PROCESSING' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Processing
                          </span>
                        )}
                        {ord.orderStatus === 'PAYMENT_REVIEW' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            Payment Review
                          </span>
                        )}
                        {ord.orderStatus === 'SHIPPED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Shipped
                          </span>
                        )}
                        {ord.orderStatus === 'DELIVERED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Delivered
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right text-zinc-500 text-[11px] font-mono">
                        {new Date(ord.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })},{' '}
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Actions matching Screenshot */}
        <div className="bg-white rounded-xl border border-[#E7E7E4] shadow-2xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#111111]">Pending Actions</h2>
            <Link
              to="/orders"
              className="text-xs font-semibold text-[#FF5A36] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <span>→</span>
            </Link>
          </div>

          <div className="space-y-3">
            {/* Action 1: Payments to review */}
            <div 
              onClick={() => navigate('/orders?status=PENDING_PAYMENT')}
              className="p-3 bg-[#F7F7F5] rounded-xl flex items-center justify-between hover:bg-zinc-100 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  metrics.pendingPayments > 0 ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {metrics.pendingPayments}
                </span>
                <span className="text-xs font-medium text-zinc-800">
                  Payments to review
                </span>
              </div>
              <span className="text-xs font-semibold text-[#FF5A36] flex items-center gap-0.5">
                View →
              </span>
            </div>

            {/* Action 2: Orders pending fulfilment */}
            <div 
              onClick={() => navigate('/fulfilment')}
              className="p-3 bg-[#F7F7F5] rounded-xl flex items-center justify-between hover:bg-zinc-100 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  metrics.pendingFulfilment > 0 ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {metrics.pendingFulfilment}
                </span>
                <span className="text-xs font-medium text-zinc-800">
                  Orders pending fulfilment
                </span>
              </div>
              <span className="text-xs font-semibold text-[#FF5A36] flex items-center gap-0.5">
                View →
              </span>
            </div>

            {/* Action 3: Supplier orders pending */}
            <div 
              onClick={() => navigate('/suppliers')}
              className="p-3 bg-[#F7F7F5] rounded-xl flex items-center justify-between hover:bg-zinc-100 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  metrics.pendingFulfilment > 0 ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {metrics.pendingFulfilment}
                </span>
                <span className="text-xs font-medium text-zinc-800">
                  Supplier orders pending
                </span>
              </div>
              <span className="text-xs font-semibold text-[#FF5A36] flex items-center gap-0.5">
                View →
              </span>
            </div>

            {/* Action 4: Return requests */}
            <div 
              onClick={() => navigate('/returns')}
              className="p-3 bg-[#F7F7F5] rounded-xl flex items-center justify-between hover:bg-zinc-100 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  metrics.returnsCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {metrics.returnsCount}
                </span>
                <span className="text-xs font-medium text-zinc-800">
                  Return requests
                </span>
              </div>
              <span className="text-xs font-semibold text-[#FF5A36] flex items-center gap-0.5">
                View →
              </span>
            </div>

            {/* Action 5: Low stock products */}
            <div 
              onClick={() => navigate('/products')}
              className="p-3 bg-[#F7F7F5] rounded-xl flex items-center justify-between hover:bg-zinc-100 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  lowStock.length > 0 ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {lowStock.length}
                </span>
                <span className="text-xs font-medium text-zinc-800">
                  Low stock products
                </span>
              </div>
              <span className="text-xs font-semibold text-[#FF5A36] flex items-center gap-0.5">
                View →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: 3 Equal Cards matching Screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Low Stock Products */}
        <div className="bg-white rounded-xl border border-[#E7E7E4] shadow-2xs p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#111111]">Low Stock Products</h2>
            <Link
              to="/products"
              className="text-xs font-semibold text-[#FF5A36] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <span>→</span>
            </Link>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-400 font-semibold text-[11px]">
                <th className="pb-2 font-medium text-left">Product</th>
                <th className="pb-2 font-medium text-center">Stock</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {lowStock.map((prod) => (
                <tr key={prod.id} className="hover:bg-zinc-50">
                  <td className="py-2.5 flex items-center gap-2 font-medium text-zinc-800">
                    <div className="w-7 h-7 rounded bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden">
                      <Package className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <span className="truncate max-w-[130px]">{prod.title}</span>
                  </td>
                  <td className="py-2.5 text-center font-bold text-red-600 font-mono">
                    {prod.stock}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => navigate(`/products`)}
                      className="text-[#FF5A36] hover:underline font-semibold text-xs cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card 2: Top Selling Products */}
        <div className="bg-white rounded-xl border border-[#E7E7E4] shadow-2xs p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#111111]">Top Selling Products</h2>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-[#FF5A36] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <span>→</span>
            </Link>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-400 font-semibold text-[11px]">
                <th className="pb-2 font-medium text-left">Product</th>
                <th className="pb-2 font-medium text-center">Sold</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {topProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-zinc-50">
                  <td className="py-2.5 flex items-center gap-2 font-medium text-zinc-800">
                    <div className="w-7 h-7 rounded bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden">
                      <Package className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <span className="truncate max-w-[120px]">{prod.title}</span>
                  </td>
                  <td className="py-2.5 text-center font-mono text-zinc-600 font-semibold">
                    {prod.soldCount}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-zinc-900">
                    ₹{prod.revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card 3: Recent Activity matching Screenshot */}
        <div className="bg-white rounded-xl border border-[#E7E7E4] shadow-2xs p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#111111]">Recent Activity</h2>
            <Link
              to="/activity"
              className="text-xs font-semibold text-[#FF5A36] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <span>→</span>
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 text-xs">
                <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0 mt-0.5">
                  {log.action.includes('PAYMENT') && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                  {log.action.includes('CATALOG') && <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />}
                  {log.action.includes('SHIPPED') && <Truck className="w-3.5 h-3.5 text-blue-600" />}
                  {log.action.includes('CUSTOMER') && <UserPlus className="w-3.5 h-3.5 text-teal-600" />}
                  {log.action.includes('STOCK') && <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
                  {!['PAYMENT', 'CATALOG', 'SHIPPED', 'CUSTOMER', 'STOCK'].some((k) => log.action.includes(k)) && (
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-800 font-medium leading-snug line-clamp-1">
                    {log.description}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Branding matching Screenshot bottom */}
      <div className="pt-6 pb-2 flex items-center justify-between text-xs text-[#6B6B6B] border-t border-zinc-200">
        <span>Shoply Admin v1.0.0</span>
        <span className="flex items-center gap-1">
          Built with <span className="text-[#FF5A36]">❤️</span> for better commerce
        </span>
      </div>
    </div>
  );
};
