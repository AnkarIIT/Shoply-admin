import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService, TOTPSetupResult, getPendingEmail } from '../../services/authService';
import { ShieldCheck, Copy, Check, ArrowRight, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';

export const Setup2FAPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [setupData, setSetupData] = useState<TOTPSetupResult | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fromState = location.state?.email;
    const pendingEmail = getPendingEmail();
    const accountEmail = currentUser?.email || (typeof fromState === 'string' ? fromState : '') || pendingEmail || '';
    setEmail(accountEmail);
    const loadSetup = async () => {
      try {
        const data = await authService.setup2FA(accountEmail);
        setSetupData(data);
      } catch (err: any) {
        console.error('Failed to generate 2FA setup', err);
        setError(err?.message || 'Failed to generate 2FA setup details');
      } finally {
        setInitLoading(false);
      }
    };
    loadSetup();
  }, [currentUser, location.state]);

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter the 6-digit confirmation code from your app');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.confirm2FASetup(email, code);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#111111] text-white font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <ShieldCheck className="w-6 h-6 text-[#FF5A36]" />
          </div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            SET UP 2FA AUTHENTICATOR
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Mandatory security requirement for Shoply Admin operators
          </p>
        </div>

        {/* Setup Card */}
        <div className="bg-white rounded-2xl border border-[#E7E7E4] shadow-sm p-6 sm:p-8">
          {initLoading ? (
            <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
              <span>Generating cryptographic TOTP key and QR code...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Step 1: Scan QR */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Scan with Authenticator App
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                  Open Google Authenticator, Microsoft Authenticator, or Authy on your phone and scan the QR code:
                </p>

                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col items-center justify-center">
                  {setupData?.qrCodeUrl && (
                    <img
                      src={setupData.qrCodeUrl}
                      alt="Shoply Admin TOTP QR Code"
                      className="w-48 h-48 border border-white rounded-lg shadow-xs"
                    />
                  )}
                  <span className="text-[11px] text-zinc-400 mt-2 font-mono">
                    Account: {email || 'Your admin email'}
                  </span>
                </div>
              </div>

              {/* Manual Secret Key */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-white text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Or Enter Secret Manually
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={setupData?.secret || ''}
                    className="flex-1 px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800 tracking-wider"
                  />
                  <button
                    onClick={handleCopySecret}
                    className="px-3 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Step 3: Verify Code */}
              <form onSubmit={handleConfirm} className="pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white text-[11px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Enter Verification Code
                  </h4>
                </div>

                {error && (
                  <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    id="setup-totp-verify-input"
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    placeholder="Enter 6-digit code (e.g. 123456)"
                    className="flex-1 px-3 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-sm font-mono tracking-widest text-center text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                  <button
                    id="btn-confirm-2fa-setup"
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="px-5 py-2.5 bg-[#FF5A36] hover:bg-[#E04E2D] text-white font-semibold rounded-lg text-xs tracking-wide flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'ACTIVATE 2FA'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
