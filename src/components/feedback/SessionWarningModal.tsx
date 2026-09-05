import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  timeRemainingSec: number;
  onStaySignedIn: () => void;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  timeRemainingSec,
  onStaySignedIn,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(timeRemainingSec / 60);
  const seconds = timeRemainingSec % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div 
        id="session-warning-modal"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-amber-200 p-6 animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1">
            <h3 className="text-base font-bold text-[#111111] mb-1">
              Inactivity Notice
            </h3>
            <p className="text-sm text-[#6B6B6B] leading-relaxed mb-4">
              Your session will expire soon because of inactivity. You will be signed out in{' '}
              <span className="font-semibold text-amber-600 font-mono text-base">{formattedTime}</span>.
            </p>

            <button
              id="btn-stay-signed-in"
              onClick={onStaySignedIn}
              className="w-full py-2.5 px-4 bg-[#FF5A36] hover:bg-[#e04e2d] text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              STAY SIGNED IN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
