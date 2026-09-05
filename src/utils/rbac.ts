import { AdminRole, Permission } from '../types';

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: [
    'dashboard:read',
    'orders:read',
    'orders:update',
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'payments:read',
    'payments:verify',
    'refunds:create',
    'customers:read',
    'coupons:create',
    'coupons:update',
    'suppliers:read',
    'suppliers:update',
    'catalog:read',
    'catalog:sync',
    'analytics:read',
    'settings:read',
    'settings:update',
    'admins:read',
    'admins:manage',
    'activity:read',
    'security:manage',
  ],
  ADMIN: [
    'dashboard:read',
    'orders:read',
    'orders:update',
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'payments:read',
    'payments:verify',
    'refunds:create',
    'customers:read',
    'coupons:create',
    'coupons:update',
    'suppliers:read',
    'suppliers:update',
    'catalog:read',
    'catalog:sync',
    'analytics:read',
    'settings:read',
    'activity:read',
    'security:manage',
  ],
  MANAGER: [
    'dashboard:read',
    'orders:read',
    'orders:update',
    'products:read',
    'products:create',
    'products:update',
    'payments:read',
    'customers:read',
    'coupons:create',
    'coupons:update',
    'suppliers:read',
    'catalog:read',
    'analytics:read',
  ],
  FULFILMENT: [
    'dashboard:read',
    'orders:read',
    'orders:update',
    'suppliers:read',
    'suppliers:update',
    'catalog:read',
  ],
  SUPPORT: [
    'dashboard:read',
    'orders:read',
    'customers:read',
    'refunds:create',
  ],
  EDITOR: [
    'dashboard:read',
    'products:read',
    'products:create',
    'products:update',
    'catalog:read',
  ],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  if (role === 'SUPER_ADMIN') return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function getRoleBadgeColor(role: AdminRole): { bg: string; text: string; border: string } {
  switch (role) {
    case 'SUPER_ADMIN':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'ADMIN':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'MANAGER':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'FULFILMENT':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'SUPPORT':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'EDITOR':
      return { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200' };
  }
}
