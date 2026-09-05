import React from 'react';
import { Permission } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldX } from 'lucide-react';

interface PermissionGuardProps {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  fallback,
  children,
}) => {
  const { hasPermission, currentUser } = useAuth();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="p-8 text-center bg-white rounded-xl border border-[#E7E7E4] shadow-xs my-4">
      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3 text-zinc-400">
        <ShieldX className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-zinc-900 mb-1">
        Access Restricted
      </h3>
      <p className="text-sm text-zinc-500 max-w-md mx-auto">
        Your assigned role ({currentUser?.role || 'User'}) does not have the required permission (
        <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 font-mono">
          {permission}
        </code>
        ) to view or manage this section.
      </p>
    </div>
  );
};
