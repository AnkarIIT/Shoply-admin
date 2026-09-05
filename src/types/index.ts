export type AdminRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'MANAGER' 
  | 'FULFILMENT' 
  | 'SUPPORT' 
  | 'EDITOR';

export type Permission = 
  | 'dashboard:read'
  | 'orders:read'
  | 'orders:update'
  | 'products:read'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'payments:read'
  | 'payments:verify'
  | 'refunds:create'
  | 'customers:read'
  | 'coupons:create'
  | 'coupons:update'
  | 'suppliers:read'
  | 'suppliers:update'
  | 'catalog:read'
  | 'catalog:sync'
  | 'analytics:read'
  | 'settings:read'
  | 'settings:update'
  | 'admins:read'
  | 'admins:manage'
  | 'activity:read'
  | 'security:manage';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string;
  totpEnabled: boolean;
  totpSecret?: string; // only in setup context
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  lastLoginAt: string;
}

export interface AdminSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}

export type OrderStatus = 
  | 'PAYMENT_REVIEW'
  | 'PAID'
  | 'FULFILMENT_PENDING'
  | 'SUPPLIER_ORDERED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'REFUNDED';

export type PaymentStatus = 
  | 'PENDING'
  | 'UTR_SUBMITTED'
  | 'PAID'
  | 'REJECTED'
  | 'REFUNDED';

export interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // Admin-only internal supplier fields
  supplierId: string;
  supplierName: string;
  supplierSku: string;
  supplierCost: number;
  imageUrl?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. #10482
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  paymentMethod: 'UPI' | 'CARD' | 'NET_BANKING' | 'COD';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  utrNumber?: string;
  paymentProofUrl?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  supplierOrderId?: string;
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
  carrier?: string;
  awbNumber?: string;
  trackingStatus?: string;
  supplierOrderedAt?: string;
  timeline?: any[];
  // Internal calculation metrics
  totalSupplierCost?: number;
  estimatedMargin?: number;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: string;
  slug?: string;
  images: string[];
  sellingPrice: number;
  mrp: number;
  stock: number;
  status: 'PUBLISHED' | 'DRAFT' | 'PENDING_REVIEW' | 'REJECTED' | 'OUT_OF_STOCK';
  rating?: number;
  reviewCount?: number;
  sourceType?: string;
  soldCount: number;
  revenue: number;
  // Internal supplier details (admin-only)
  supplierId: string;
  supplierName: string;
  supplierProductId: string;
  supplierSku?: string;
  supplierCost: number;
  supplierUrl?: string;
  margin: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
}

export type SupplierIntegrationType = 'MANUAL' | 'CSV' | 'FEED' | 'API' | 'WEBHOOK';

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  contactEmail: string;
  contactPhone: string;
  integrationType: SupplierIntegrationType;
  isConnected: boolean; // Must be false if no real API connection exists
  connectionDetails: string;
  lastSyncAt: string | null;
  productCount: number;
  pendingOrdersCount: number;
  apiStatusMessage: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  addressSummary: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  perCustomerLimit: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ReturnRequest {
  id: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  productTitle: string;
  reason: string;
  amount: number;
  refundAmount?: number;
  items?: Array<{ productTitle: string; quantity: number }>;
  status: 'PENDING' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RETURN_IN_TRANSIT' | 'RECEIVED' | 'REFUNDED';
  requestedAt: string;
  createdAt?: string;
  notes?: string;
}

export interface CatalogSyncLog {
  id: string;
  supplierName: string;
  productsAdded: number;
  productsUpdated: number;
  productsDeactivated: number;
  timestamp: string;
  durationMs: number;
}

export interface AuditLog {
  id: string;
  adminName: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  revenueChangePct: number;
  totalOrders: number;
  ordersChangePct: number;
  paidOrders: number;
  pendingPayments: number;
  pendingFulfilment: number;
  averageOrderValue: number;
  estimatedProfit: number;
  profitChangePct: number;
  returnsCount: number;
  returnsChangePct: number;
}
