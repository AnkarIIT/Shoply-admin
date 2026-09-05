import React, { useState } from 'react';
import { ShieldAlert, X, KeyRound, Check } from 'lucide-react';

interface HighRiskConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  requireTotp?: boolean;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export const HighRiskConfirmModal: React.FC<HighRiskConfirmModalProps> = ({
  isOpen,
  title,
  description,
  requireTotp = true,
  confirmLabel = 'CONFIRM ACTION',
  onConfirm,
  onClose,
}) => {
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireTotp && totpCode.trim().length !== 6) {
      setError('Please enter your 6-digit authenticator code');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div 
        id="high-risk-confirm-modal"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-red-200 p-6 animate-in fade-in zoom-in duration-200 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 cursor-pointer p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 leading-snug">
              {title}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
              HIGH-RISK OPERATION
            </span>
          </div>
        </div>

        <p className="text-sm text-zinc-600 leading-relaxed mb-5">
          {description}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {requireTotp && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                Enter 6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => {
                  setTotpCode(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="123456"
                className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                autoFocus
              />
              <p className="text-xs text-zinc-400 mt-1 text-center">
                Demo code: any 6 digits (e.g. 123456)
              </p>
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Verifying...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
