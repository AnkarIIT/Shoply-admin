import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { Product, DashboardMetrics } from '../../types';
import { BarChart3, TrendingUp, DollarSign, Package, ShoppingBag, ArrowUpRight } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    const load = async () => {
      const [prods, m] = await Promise.all([
        analyticsService.getTopSellingProducts(),
        analyticsService.getDashboardMetrics(),
      ]);
      setTopProducts(prods);
      setMetrics(m);
    };
    load().catch(() => {});
  }, []);

  const profitRatio = metrics && metrics.totalRevenue > 0
    ? Math.round((metrics.totalProfit / metrics.totalRevenue) * 100)
    : 0;
  const aov = metrics && metrics.totalOrders > 0
    ? Math.round(metrics.totalRevenue / metrics.totalOrders)
    : 0;
  const unitsDispatched = metrics?.totalUnitsSold ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Store Performance & Analytics
          </h1>
          <p className="text-xs text-zinc-500">
            Revenue trajectory, gross margins, average order value, and unit economics.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Gross Merchandise Value</span>
            <DollarSign className="w-4 h-4 text-[#FF5A36]" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-mono">
            ₹{(metrics?.totalRevenue ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-zinc-500 font-medium">
            {metrics ? `${metrics.totalOrders} order(s) all-time` : 'Loading...'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Net Operating Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-mono">
            ₹{(metrics?.totalProfit ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{profitRatio}% profit ratio</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Total Units Dispatched</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-mono">{unitsDispatched.toLocaleString()}</div>
          <div className="text-[11px] text-zinc-500 font-medium">Units sold across all orders</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Average Order Value (AOV)</span>
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-mono">₹{aov.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-zinc-500 font-medium">Per order average revenue</div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-900">Highest Revenue Product Lines</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Units Sold</th>
                <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                <th className="py-2.5 px-3 text-right">Profit Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {topProducts.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-3 font-semibold text-zinc-900">{p.title}</td>
                  <td className="py-3 px-3 text-zinc-600">{p.category}</td>
                  <td className="py-3 px-3 text-center font-mono font-semibold text-zinc-800">{p.soldCount}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900">₹{p.revenue.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                    +₹{(p.profit ?? Math.round(p.revenue * (profitRatio / 100))).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
