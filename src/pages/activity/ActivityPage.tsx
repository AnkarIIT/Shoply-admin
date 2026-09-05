import React, { useState, useEffect } from 'react';
import { auditService } from '../../services/auditService';
import { AuditLog } from '../../types';
import { Search, ShieldAlert, CheckCircle2, Clock, Filter, User } from 'lucide-react';

export const ActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const data = await auditService.getLogs({ search });
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Security & Operational Audit Log
          </h1>
          <p className="text-xs text-zinc-500">
            Immutable chronicle of administrative updates, financial verifications, and system events.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, admin, IP..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 font-mono">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">Loading audit history...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">No audit events found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900 whitespace-nowrap">
                      {log.adminName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-zinc-100 text-zinc-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-700">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500 text-[11px] whitespace-nowrap">
                      {log.ipAddress}
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
