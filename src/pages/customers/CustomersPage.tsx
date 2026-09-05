import React, { useState, useEffect } from 'react';
import { customersService } from '../../services/customersService';
import { Customer } from '../../types';
import { Search, UserCheck, Mail, Phone, MapPin, ShoppingBag } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await customersService.getCustomers(search);
      setCustomers(data);
      setLoading(false);
    };
    load();
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-zinc-500">
            Registered customer accounts, lifetime spending, and order history.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">No customers found.</td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center text-xs">
                          {cust.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900">{cust.name}</div>
                          <span className="text-[10px] text-emerald-600 font-semibold">Active Member</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      <div>{cust.email}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{cust.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        {cust.addressSummary}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-zinc-900">
                      {cust.orderCount}
                    </td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-zinc-900">
                      ₹{cust.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-500 font-mono text-[11px]">
                      {new Date(cust.lastOrderAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
