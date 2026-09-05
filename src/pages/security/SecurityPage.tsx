import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { AdminSession } from '../../types';
import { ShieldCheck, Laptop, Smartphone, Globe, Trash2, LogOut, CheckCircle2, AlertTriangle, KeyRound, Clock } from 'lucide-react';
import { HighRiskConfirmModal } from '../../components/feedback/HighRiskConfirmModal';
import { useNavigate } from 'react-router-dom';

export const SecurityPage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadSessions = async () => {
    if (!currentUser) return;
    setLoading(true);
    const data = await authService.getActiveSessions(currentUser.id);
    setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, [currentUser]);

  const handleRevokeSession = (session: AdminSession) => {
    if (session.isCurrent) {
      setHighRiskAction({
        isOpen: true,
        title: 'Revoke Current Session',
        description: 'Revoking your current active session will log you out immediately.',
        onConfirm: async () => {
          await authService.revokeSession(session.id, currentUser?.name || 'Admin');
          await logout();
          navigate('/login');
        },
      });
      return;
    }

    setHighRiskAction({
      isOpen: true,
      title: `Revoke Session (${session.device})`,
      description: `Confirm revoking active session from IP ${session.ipAddress}. The remote device will be forced to re-authenticate with 2FA.`,
      onConfirm: async () => {
        await authService.revokeSession(session.id, currentUser?.name || 'Admin');
        await loadSessions();
      },
    });
  };

  const handleRevokeAllOther = () => {
    setHighRiskAction({
      isOpen: true,
      title: 'Revoke All Other Sessions',
      description: 'Are you sure you want to terminate all other signed-in sessions across all browsers and devices?',
      onConfirm: async () => {
        if (!currentUser) return;
        await authService.revokeAllOtherSessions(currentUser.id, currentUser.name);
        await loadSessions();
      },
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          Security & Access Controls
        </h1>
        <p className="text-xs text-zinc-500">
          Manage active administrative sessions, device tokens, and 2FA authentication settings.
        </p>
      </div>

      {/* 2FA Status Card */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Two-Factor Authentication (TOTP)
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Mandatory protection requiring a 6-digit authenticator code on every sign-in.
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            currentUser?.totpEnabled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {currentUser?.totpEnabled ? 'ENFORCED & ACTIVE' : 'NOT ENROLLED'}
          </span>
        </div>

        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            Enrolled for <span className="font-semibold text-zinc-800">{currentUser?.email}</span>
          </span>
          <button
            onClick={() => navigate('/setup-2fa')}
            className="text-xs font-semibold text-[#FF5A36] hover:underline cursor-pointer"
          >
            Reconfigure Authenticator App →
          </button>
        </div>
      </div>

      {/* Active Sessions Table (Rule 17) */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Active Administrative Sessions</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Devices and browsers currently authorized to access this administration portal.
            </p>
          </div>

          <button
            id="btn-revoke-all-other-sessions"
            onClick={handleRevokeAllOther}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>REVOKE ALL OTHER SESSIONS</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Device / Platform</th>
                <th className="py-2.5 px-3">Browser</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Last Active</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400">Loading active sessions...</td>
                </tr>
              ) : (
                sessions.map((ses) => (
                  <tr key={ses.id} className="hover:bg-zinc-50/70">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {ses.device.includes('iPhone') || ses.device.includes('Android') ? (
                          <Smartphone className="w-4 h-4 text-zinc-500 shrink-0" />
                        ) : (
                          <Laptop className="w-4 h-4 text-zinc-500 shrink-0" />
                        )}
                        <span className="font-semibold text-zinc-900">{ses.device}</span>
                        {ses.isCurrent && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            This device
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-600 font-medium">
                      {ses.browser}
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-600">
                      {ses.ipAddress}
                    </td>
                    <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                      {ses.lastActivityAt ? new Date(ses.lastActivityAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleRevokeSession(ses)}
                        className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactivity Timeout Notice (Rules 15, 18) */}
      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-1 text-zinc-600">
        <div className="font-bold text-zinc-900 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>Automatic 10-Minute Idle Timeout Policy</span>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          In compliance with enterprise operational standards, administrators are automatically signed out after 10 continuous minutes of inactivity. A reminder modal is shown 2 minutes prior to session expiration.
        </p>
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
