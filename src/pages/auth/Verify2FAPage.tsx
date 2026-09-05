import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPendingEmail } from '../../services/authService';
import { Shield, ArrowRight, AlertCircle, Smartphone } from 'lucide-react';

export const Verify2FAPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const { verify2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fromState = location.state?.email;
    if (typeof fromState === 'string' && fromState) {
      setEmail(fromState);
    } else {
      setEmail(getPendingEmail());
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verify2FA(email, code);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid authentication code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#111111] text-white font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Shield className="w-6 h-6 text-[#FF5A36]" />
          </div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            VERIFY YOUR LOGIN
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Two-factor authenticator verification
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-2xl border border-[#E7E7E4] shadow-sm p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto mb-3 text-[#FF5A36]">
            <Smartphone className="w-5 h-5" />
          </div>

          <h2 className="text-base font-bold text-[#111111] mb-1">
            Authenticator Code
          </h2>
          <p className="text-xs text-[#6B6B6B] leading-relaxed mb-6">
            Open your authenticator app (Google Authenticator, Microsoft Authenticator, or Authy) and enter the 6-digit code for <span className="font-semibold text-zinc-900">{email}</span>.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                id="totp-code-input"
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="• • • • • •"
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest bg-[#F7F7F5] border border-[#E7E7E4] rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#111111] focus:bg-white transition-all font-bold"
                autoFocus
              />
              <p className="text-[11px] text-zinc-400 mt-2">
                Enter the live 6-digit code from your authenticator app.
              </p>
            </div>

            <button
              id="btn-verify-2fa"
              type="submit"
              disabled={loading || code.length !== 6 || !email}
              className="w-full py-2.5 px-4 bg-[#FF5A36] hover:bg-[#E04E2D] text-white rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>VERIFY & LOGIN</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <span>Lost access to authenticator?</span>
            <button
              onClick={() => navigate('/setup-2fa', { state: { email } })}
              className="font-semibold text-[#111111] hover:underline cursor-pointer"
            >
              Re-enroll 2FA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};