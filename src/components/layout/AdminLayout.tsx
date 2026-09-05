import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../contexts/AuthContext';
import { SessionTimeoutModal } from '../feedback/SessionTimeoutModal';
import { SessionWarningModal } from '../feedback/SessionWarningModal';

export const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { 
    showTimeoutModal, 
    showWarningModal, 
    timeRemainingSec, 
    staySignedIn, 
    dismissTimeout 
  } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F7F5] dark:bg-[#0F0F0F] text-zinc-900 dark:text-zinc-100 antialiased transition-colors duration-200">
      {/* Dark Sidebar with Desktop/Tablet/Mobile support */}
      <Sidebar 
        isOpenOnMobile={mobileMenuOpen} 
        onCloseMobile={() => setMobileMenuOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 bg-[#F7F7F5] dark:bg-[#0F0F0F] transition-colors duration-200">
          <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mandatory Inactivity Security Modals (Rules 15, 18) */}
      <SessionWarningModal
        isOpen={showWarningModal}
        timeRemainingSec={timeRemainingSec}
        onStaySignedIn={staySignedIn}
      />

      <SessionTimeoutModal
        isOpen={showTimeoutModal}
        onClose={dismissTimeout}
      />
    </div>
  );
};
