import React, { useState, useEffect } from 'react';
import { Search, Bell, Shield, ChevronDown, User, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabaseStatus } from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onSearch?: (query: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onSearch, onToggleMobileMenu }) => {
  const { currentUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const status = await getDatabaseStatus();
        if (!cancelled) setDbConnected(status.connected);
      } catch {
        if (!cancelled) setDbConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/orders?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AD';

  return (
    <header className="h-16 bg-white border-b border-[#E7E7E4] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shrink-0">
      {/* Left: Mobile Menu Toggle & Global Search Bar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
        {/* Mobile Hamburger Toggle Button */}
        <button
          id="btn-mobile-menu-toggle"
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9E9E9E] absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="topbar-search-input"
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search orders, products, customers..."
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-[#F7F7F5] border border-transparent focus:border-[#E7E7E4] rounded-lg text-xs text-[#111111] placeholder-[#8C8C8C] focus:bg-white focus:outline-none transition-all shadow-2xs"
            />
          </div>
        </form>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Neon PostgreSQL Live Database Status Badge */}
        <button
          onClick={() => navigate('/settings')}
          title="Neon Serverless PostgreSQL Database Status"
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 border rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
            dbConnected === false
              ? 'bg-rose-50 hover:bg-rose-100/70 border-rose-200/80 text-rose-700'
              : 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200/80 text-emerald-800'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              dbConnected === false ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'
            }`}
          ></span>
          <span>{dbConnected === false ? 'Database: Offline' : dbConnected === null ? 'Checking DB...' : 'Neon PostgreSQL: Connected'}</span>
        </button>

        {/* 10-Minute Idle Timeout Guard Indicator (Rule 15) */}
        <div
          title="Inactivity security: automatic sign-out after 10 minutes of idle time"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-md text-[11px] font-medium text-emerald-800"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>10m Idle Timeout Active</span>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            id="btn-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg relative transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E7E7E4] rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-zinc-100 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900">Notifications</span>
              </div>
              <div className="px-4 py-6 text-center">
                <Bell className="w-5 h-5 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">You're all caught up.</p>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar with Dropdown */}
        <div className="relative">
          <button
            id="btn-topbar-user"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center justify-center border border-zinc-300">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-zinc-900 leading-tight">{currentUser?.name || 'Admin'}</div>
              <div className="text-[10px] text-zinc-500 leading-tight">{currentUser?.role?.replace('_', ' ') || 'Admin'}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E7E7E4] rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-zinc-100">
                <div className="text-xs font-bold text-zinc-900">{currentUser?.name || 'Admin'}</div>
                <div className="text-[11px] text-zinc-500 truncate">{currentUser?.email || ''}</div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/security');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-zinc-700 hover:bg-[#F7F7F5] flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-zinc-500" />
                  Security & 2FA
                </button>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-zinc-700 hover:bg-[#F7F7F5] flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  Admin Settings
                </button>
              </div>
              <div className="border-t border-zinc-100 pt-1">
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                    navigate('/login');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};