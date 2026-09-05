import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.requires2FA) {
        navigate('/verify-2fa', { state: { email: res.pendingEmail || email } });
      } else if (res.user && !res.user.totpEnabled) {
        // First sign-in: force enrollment in Google/Microsoft Authenticator
        navigate('/setup-2fa');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#FF5A36] text-white font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            S
          </div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            SHOPLY ADMIN
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Enterprise Ecommerce Operations & Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-[#E7E7E4] shadow-sm p-8">
          <h2 className="text-base font-bold text-[#111111] mb-1">
            Administrator Sign In
          </h2>
          <p className="text-xs text-[#6B6B6B] mb-6">
            Enter your credentials to access the operations console.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@shoply.in"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7E7E4] rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7E7E4] rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>CONTINUE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span>First time signing in?</span>
            <button
              type="button"
              onClick={() => navigate('/setup-2fa')}
              className="font-semibold text-[#FF5A36] hover:underline cursor-pointer"
            >
              Set up 2FA Authenticator
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-200/60 rounded-full text-[11px] text-zinc-600">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
            <span>Protected by 10-min Idle Timeout & TOTP 2FA</span>
          </div>
        </div>
      </div>
    </div>
  );
};
