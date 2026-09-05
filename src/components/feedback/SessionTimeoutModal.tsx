import React from 'react';
import { Clock, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLoginAgain = () => {
    onClose();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div 
        id="session-timeout-modal"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#E7E7E4] p-6 text-center animate-in fade-in zoom-in duration-200"
      >
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
          <Clock className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-[#111111] mb-2 tracking-tight">
          Session Timeout
        </h3>

        <p className="text-sm text-[#6B6B6B] leading-relaxed mb-6">
          Your admin session expired because there was no activity for 10 minutes.
          For your security, you have been automatically signed out.
        </p>

        <button
          id="btn-login-again"
          onClick={handleLoginAgain}
          className="w-full py-2.5 px-4 bg-[#111111] hover:bg-black text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <LogIn className="w-4 h-4" />
          LOGIN AGAIN
        </button>
      </div>
    </div>
  );
};
