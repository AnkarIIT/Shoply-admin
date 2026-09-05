import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Users,
  Tag,
  PackageCheck,
  Truck,
  MapPin,
  RotateCcw,
  BookOpen,
  RefreshCw,
  UploadCloud,
  BarChart3,
  Settings,
  ShieldCheck,
  History,
  LogOut,
  ChevronRight,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ordersService } from '../../services/ordersService';

interface SidebarProps {
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpenOnMobile, onCloseMobile }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [orderBadgeCount, setOrderBadgeCount] = useState<number>(12);
  const [fulfilmentBadgeCount, setFulfilmentBadgeCount] = useState<number>(8);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const orders = await ordersService.getOrders();
        setOrderBadgeCount(orders.length);
        const pendingFulf = orders.filter(
          (o) => o.orderStatus === 'PAID' || o.orderStatus === 'PROCESSING' || o.orderStatus === 'FULFILMENT_PENDING'
        ).length;
        setFulfilmentBadgeCount(pendingFulf);
      } catch {
        // keep defaults
      }
    };
    loadCounts();
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3.5 py-2 text-xs font-medium rounded-lg transition-all duration-150 group ${
      isActive
        ? 'bg-[#C84B28] text-white font-semibold shadow-xs'
        : 'text-[#A3A3A3] hover:text-white hover:bg-[#262626]'
    }`;

  const handleNavClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenOnMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside 
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#141414] text-white flex flex-col h-screen shrink-0 select-none border-r border-[#262626] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenOnMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF5A36] flex items-center justify-center text-white font-black text-lg shadow-sm">
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">Shoply</span>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-[#FF5A36] uppercase">
                ADMIN
              </span>
            </div>
          </div>

          {/* Close button visible only on mobile/tablet */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Overview / Dashboard */}
          <div>
            <NavLink to="/dashboard" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </div>
            </NavLink>
          </div>

        {/* COMMERCE */}
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-[#6B6B6B] uppercase">
            Commerce
          </div>
          <div className="space-y-0.5">
            <NavLink to="/orders" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders</span>
              </div>
              {orderBadgeCount > 0 && (
                <span className="text-[10px] font-semibold bg-[#262626] group-hover:bg-[#333333] text-[#D4D4D4] px-1.5 py-0.5 rounded-full">
                  {orderBadgeCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/products" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4" />
                <span>Products</span>
              </div>
            </NavLink>

            <NavLink to="/categories" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Categories</span>
              </div>
            </NavLink>

            <NavLink to="/customers" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </div>
            </NavLink>

            <NavLink to="/coupons" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4" />
                <span>Coupons</span>
              </div>
            </NavLink>
          </div>
        </div>

        {/* FULFILMENT */}
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-[#6B6B6B] uppercase">
            Fulfilment
          </div>
          <div className="space-y-0.5">
            <NavLink to="/fulfilment" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <PackageCheck className="w-4 h-4" />
                <span>Pending Fulfilment</span>
              </div>
              {fulfilmentBadgeCount > 0 && (
                <span className="text-[10px] font-semibold bg-[#262626] group-hover:bg-[#333333] text-[#D4D4D4] px-1.5 py-0.5 rounded-full">
                  {fulfilmentBadgeCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/suppliers" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4" />
                <span>Suppliers</span>
              </div>
            </NavLink>

            <NavLink to="/tracking" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4" />
                <span>Tracking</span>
              </div>
            </NavLink>

            <NavLink to="/returns" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4" />
                <span>Returns</span>
              </div>
            </NavLink>
          </div>
        </div>

        {/* CATALOG */}
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-[#6B6B6B] uppercase">
            Catalog
          </div>
          <div className="space-y-0.5">
            <NavLink to="/catalog" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>Catalog</span>
              </div>
            </NavLink>

            <NavLink to="/catalog/sync" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4" />
                <span>Sync</span>
              </div>
            </NavLink>

            <NavLink to="/catalog/import" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-4 h-4" />
                <span>Import</span>
              </div>
            </NavLink>
          </div>
        </div>

        {/* INSIGHTS */}
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-[#6B6B6B] uppercase">
            Insights
          </div>
          <div className="space-y-0.5">
            <NavLink to="/analytics" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </div>
            </NavLink>
          </div>
        </div>

        {/* SYSTEM */}
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-[#6B6B6B] uppercase">
            System
          </div>
          <div className="space-y-0.5">
            <NavLink to="/settings" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </NavLink>

            <NavLink to="/security" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Security</span>
              </div>
            </NavLink>

            <NavLink to="/activity" onClick={handleNavClick} className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4" />
                <span>Activity Log</span>
              </div>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Footer Profile & Sign out */}
      <div className="p-3 border-t border-[#262626] bg-[#111111] space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#1A1A1A] border border-[#2B2B2B]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-zinc-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {currentUser?.name?.charAt(0) || 'A'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white leading-tight truncate">
                {currentUser?.name || 'Admin'}
              </div>
              <div className="text-[10px] text-[#FF5A36] font-medium leading-tight">
                {currentUser?.role?.replace('_', ' ') || 'Super Admin'}
              </div>
            </div>
          </div>

          <button
            id="btn-sidebar-signout"
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-[#737373]">
          <span>Shoply Admin v1.0.0</span>
          <span className="text-emerald-400 font-mono text-[9px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live
          </span>
        </div>
      </div>
    </aside>
    </>
  );
};
