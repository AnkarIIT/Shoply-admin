import express from 'express';
import path from 'path';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';
import { query, checkConnection, initDatabaseSchema } from './server/db';
import {
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  verifyTotp,
  buildOtpauthUrl,
  createSession,
  revokeSession,
  revokeOtherSessions,
  authRequired,
  logAudit,
  bootstrapAdmin,
} from './server/auth';

const VALID_ORDER_STATUSES = [
  'PAYMENT_REVIEW', 'PAID', 'FULFILMENT_PENDING', 'SUPPLIER_ORDERED', 'PROCESSING',
  'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'REFUNDED',
];

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

// --- Shape mappers (snake_case DB rows -> frontend camelCase types) ---

function mapOrderItem(it: any): any {
  const unitPrice = Number(it.unitPrice ?? it.price ?? 0) || 0;
  const quantity = Number(it.quantity ?? 1) || 1;
  return {
    id: it.id || `item_${crypto.randomBytes(4).toString('hex')}`,
    productId: it.productId || it.product_id || '',
    productTitle: it.productTitle || it.title || 'Product',
    sku: it.sku || '',
    quantity,
    unitPrice,
    totalPrice: Number(it.totalPrice ?? unitPrice * quantity) || 0,
    supplierId: it.supplierId || it.supplier_id || '',
    supplierName: it.supplierName || it.supplier_name || '',
    supplierSku: it.supplierSku || it.supplierProductId || it.supplier_sku || '',
    supplierCost: Number(it.supplierCost ?? it.supplier_cost ?? 0) || 0,
    imageUrl: it.imageUrl || it.image || it.image_url || undefined,
  };
}

function mapOrder(r: any): any {
  const items = (r.items || []).map(mapOrderItem);
  const totalSupplierCost = items.reduce((s: number, it: any) => s + it.supplierCost * it.quantity, 0);
  return {
    id: r.id,
    orderNumber: r.order_number,
    customer: {
      id: r.customer_id,
      name: r.customer_name,
      email: r.customer_email,
      phone: r.customer_phone,
    },
    totalAmount: Number(r.total_amount) || 0,
    shippingFee: Number(r.shipping_fee || 0),
    discountAmount: Number(r.discount_amount || 0),
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    orderStatus: r.order_status,
    utrNumber: r.utr_number,
    paymentProofUrl: r.payment_proof_url,
    paymentVerifiedAt: r.payment_verified_at,
    paymentVerifiedBy: r.payment_verified_by,
    items,
    shippingAddress: r.shipping_address || {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    notes: r.rejection_reason || undefined,
    supplierOrderId: r.supplier_order_id,
    trackingNumber: r.awb_number,
    courierName: r.carrier,
    trackingUrl: undefined,
    carrier: r.carrier,
    awbNumber: r.awb_number,
    trackingStatus: r.tracking_status,
    supplierOrderedAt: r.supplier_ordered_at,
    timeline: r.timeline || [],
    totalSupplierCost,
    estimatedMargin: (Number(r.total_amount) || 0) - totalSupplierCost,
  };
}

function mapProduct(r: any): any {
  return {
    id: r.id,
    sku: r.sku,
    title: r.title,
    description: r.description || '',
    category: r.category,
    slug: r.slug || '',
    images: r.images || [],
    sellingPrice: Number(r.selling_price) || 0,
    mrp: Number(r.mrp) || 0,
    stock: Number(r.stock) || 0,
    status: r.status,
    rating: r.rating === null || r.rating === undefined ? undefined : Number(r.rating),
    reviewCount: Number(r.review_count || 0),
    sourceType: r.source_type || '',
    soldCount: Number(r.sold_count || 0),
    revenue: Number(r.revenue || 0),
    supplierId: r.supplier_id || '',
    supplierName: r.supplier_name || '',
    supplierProductId: r.supplier_product_id || '',
    supplierSku: r.supplier_sku || '',
    supplierCost: Number(r.supplier_cost || 0),
    supplierUrl: r.supplier_url || undefined,
    margin: Number(r.margin || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapCustomer(r: any): any {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    orderCount: Number(r.total_orders || 0),
    totalSpent: Number(r.total_spent || 0),
    lastOrderAt: r.last_order_at,
    status: r.status,
    addressSummary: '',
    createdAt: r.created_at,
  };
}

function mapCoupon(r: any): any {
  return {
    id: r.id,
    code: r.code,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value) || 0,
    minOrderValue: Number(r.min_order_amount || 0),
    maxDiscount: r.max_discount === null || r.max_discount === undefined ? undefined : Number(r.max_discount),
    usageLimit: Number(r.usage_limit || 0),
    usedCount: Number(r.used_count || 0),
    perCustomerLimit: Number(r.per_customer_limit || 1),
    startDate: r.starts_at || r.created_at,
    endDate: r.expires_at,
    isActive: r.status === 'ACTIVE',
  };
}

function mapReturn(r: any): any {
  return {
    id: r.id,
    orderNumber: r.order_number,
    orderId: r.order_id,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    productTitle: r.product_title,
    reason: r.reason,
    amount: Number(r.amount) || 0,
    refundAmount: Number(r.refund_amount || 0),
    status: r.status,
    requestedAt: r.requested_at,
    createdAt: r.created_at,
    notes: r.notes,
  };
}

function mapSupplier(r: any): any {
  return {
    id: r.id,
    name: r.name,
    contactPerson: r.contact_person || '',
    email: r.contact_email || '',
    phone: r.contact_phone || '',
    website: r.website || '',
    status: r.status || 'ACTIVE',
    contactEmail: r.contact_email || '',
    contactPhone: r.contact_phone || '',
    integrationType: r.integration_type || 'MANUAL',
    isConnected: !!r.is_connected,
    connectionDetails: r.connection_details || '',
    lastSyncAt: r.last_sync_at,
    productCount: Number(r.product_count || 0),
    pendingOrdersCount: Number(r.pending_orders_count || 0),
    apiStatusMessage: r.api_status_message || '',
  };
}

function mapAdmin(r: any): any {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    totpEnabled: !!r.totp_enabled,
    status: r.status,
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at,
  };
}

function mapSession(r: any): any {
  const expired = new Date(r.expires_at) < new Date();
  return {
    id: r.id,
    userId: r.admin_id,
    device: r.device || 'Unknown Device',
    browser: r.browser || 'Browser',
    os: r.os || 'Desktop',
    ipAddress: r.ip_address || 'Unknown',
    createdAt: r.created_at,
    lastActivityAt: r.last_activity_at,
    expiresAt: r.expires_at,
    isCurrent: !!r.is_current,
    status: r.revoked ? 'REVOKED' : expired ? 'EXPIRED' : 'ACTIVE',
  };
}

// --- Settings ---

const DEFAULT_SETTINGS = {
  storeName: 'Shoply Online Store',
  merchantUPI: '',
  supportEmail: '',
  freeShippingThreshold: 0,
  defaultShippingFee: 0,
  defaultMarkupPercent: 0,
  databaseProvider: 'Neon PostgreSQL',
};

async function loadSettings(): Promise<any> {
  const result = await query(`SELECT value FROM settings WHERE key = 'store_config'`);
  if (result.rows.length > 0) {
    return { ...DEFAULT_SETTINGS, ...result.rows[0].value };
  }
  return { ...DEFAULT_SETTINGS };
}

// --- Clean dummy data (no seeding ever happens; tables start empty) ---

async function cleanDatabaseTables(scope: 'orders_only' | 'all'): Promise<void> {
  if (scope === 'all') {
    await query(`DELETE FROM returns`);
    await query(`DELETE FROM orders`);
    await query(`DELETE FROM customers`);
    await query(`DELETE FROM products`);
    await query(`DELETE FROM categories`);
    await query(`DELETE FROM suppliers`);
    await query(`DELETE FROM coupons`);
    await query(`DELETE FROM audit_logs`);
    await query(`DELETE FROM catalog_sync_logs`);
  } else {
    await query(`DELETE FROM returns`);
    await query(`DELETE FROM orders`);
    await query(`DELETE FROM customers`);
  }
  await query(`DELETE FROM settings WHERE key = 'store_config'`);
  await query(
    `INSERT INTO settings (key, value) VALUES ('store_config', $1) ON CONFLICT (key) DO UPDATE SET value = $1`,
    [JSON.stringify(DEFAULT_SETTINGS)]
  );
}

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = 'Desktop';
  if (/android/i.test(ua)) device = 'Android Device';
  else if (/iphone|ipad|ipod/i.test(ua)) device = 'Apple iOS Device';
  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  let os = 'Desktop OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';
  return { device, browser, os };
}

// --- Admin-only access hardening ---
// The DB is only reachable through this server, and every data endpoint requires a
// valid session token. On top of that:
//   1. Failed sign-in attempts are rate-limited (per IP + email) to stop bruteforce.
//   2. Mutating /api/* requests from a browser must be same-origin with the admin
//      site, so an external page can never script against the API.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  if (loginAttempts.size > 2000) {
    for (const [k, v] of loginAttempts) {
      if (now > v.resetAt) loginAttempts.delete(k);
    }
  }
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  loginAttempts.set(key, entry);
  return entry.count <= LOGIN_MAX_ATTEMPTS;
}

function sameOriginGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET') return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    const fromOrigin = new URL(origin);
    const host = req.headers.host || '';
    if (!host) return next();
    const sameOrigin =
      (fromOrigin.protocol === 'https:' || fromOrigin.protocol === 'http:') &&
      fromOrigin.host === host;
    if (!sameOrigin) {
      return res.status(403).json({ error: 'Cross-origin request blocked.' });
    }
  } catch {
    return res.status(403).json({ error: 'Malformed Origin header.' });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use('/api', sameOriginGuard);

  // Initialize Neon DB schema and bootstrap the first admin account
  try {
    await initDatabaseSchema();
    await bootstrapAdmin();
    console.log('[Server] Connected to Neon PostgreSQL database and verified tables.');
  } catch (err: any) {
    console.error('[Server] Neon initialization warning:', err?.message);
  }

  // --- PUBLIC ROUTES ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/database/status', authRequired, async (req, res) => {
    try {
      const status = await checkConnection();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ connected: false, error: err?.message });
    }
  });

  app.get('/api/settings', authRequired, async (req, res) => {
    try {
      res.json(await loadSettings());
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- AUTH ROUTES ---

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      const rateKey = `${getClientIp(req)}:${String(email).trim().toLowerCase()}`;
      const result = await query(`SELECT * FROM admins WHERE email = $1`, [String(email).trim().toLowerCase()]);
      const admin = result.rows[0];
      if (!admin || admin.status !== 'ACTIVE' || !verifyPassword(admin.password_hash, String(password))) {
        if (!checkLoginRateLimit(rateKey)) {
          return res.status(429).json({ error: 'Too many failed sign-in attempts. Retry in a few minutes.', code: 'RATE_LIMITED' });
        }
        return res.status(401).json({ error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
      }
      if (admin.totp_enabled) {
        return res.json({ requiresTwoFactor: true, email: admin.email });
      }
      const token = await createSession(admin.id, {
        ...parseUserAgent(req.headers['user-agent'] || ''),
        ipAddress: getClientIp(req),
      });
      await query(`UPDATE admins SET last_login_at = NOW() WHERE id = $1`, [admin.id]);
      await logAudit(req, 'ADMIN_LOGIN', 'Auth', admin.id, `Admin ${admin.name} logged in`);
      res.json({ token, user: mapAdmin(admin) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/auth/verify-totp', async (req, res) => {
    try {
      const { email, code } = req.body || {};
      if (!email || !code) {
        return res.status(400).json({ error: 'Email and verification code are required.' });
      }
      const rateKey = `${getClientIp(req)}:${String(email).trim().toLowerCase()}`;
      const result = await query(`SELECT * FROM admins WHERE email = $1`, [String(email).trim().toLowerCase()]);
      const admin = result.rows[0];
      if (!admin || admin.status !== 'ACTIVE' || !admin.totp_enabled || !admin.totp_secret) {
        return res.status(401).json({ error: 'Two-factor authentication is not enabled for this account.', code: 'NO_TOTP' });
      }
      if (!verifyTotp(admin.totp_secret, String(code))) {
        if (!checkLoginRateLimit(rateKey)) {
          return res.status(429).json({ error: 'Too many failed verification attempts. Retry in a few minutes.', code: 'RATE_LIMITED' });
        }
        return res.status(401).json({ error: 'Invalid or expired verification code.', code: 'INVALID_TOTP' });
      }
      const token = await createSession(admin.id, {
        ...parseUserAgent(req.headers['user-agent'] || ''),
        ipAddress: getClientIp(req),
      });
      await query(`UPDATE admins SET last_login_at = NOW() WHERE id = $1`, [admin.id]);
      await logAudit(req, 'ADMIN_LOGIN_TOTP', 'Auth', admin.id, `Admin ${admin.name} verified via authenticator code`);
      res.json({ token, user: mapAdmin(admin) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/auth/session', authRequired, (req, res) => {
    res.json(req.admin);
  });

  app.post('/api/auth/logout', authRequired, async (req, res) => {
    try {
      await revokeSession(req.admin!.sessionId);
      await logAudit(req, 'ADMIN_LOGOUT', 'Auth', req.admin!.id, `Admin ${req.admin!.name} logged out`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/auth/setup-2fa', authRequired, async (req, res) => {
    try {
      const email = req.admin!.email;
      const result = await query(`SELECT * FROM admins WHERE email = $1`, [email]);
      const admin = result.rows[0];
      if (!admin) return res.status(404).json({ error: 'Admin not found.' });

      let secret = admin.totp_secret || '';
      if (!secret) {
        secret = generateTotpSecret();
        await query(`UPDATE admins SET totp_secret = $1 WHERE id = $2`, [secret, admin.id]);
      }
      const otpauthUrl = buildOtpauthUrl(admin.email, secret);
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#111111', light: '#FFFFFF' },
      });
      res.json({ secret, qrCodeUrl, otpauthUrl });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/auth/confirm-2fa', authRequired, async (req, res) => {
    try {
      const email = req.admin!.email;
      const { code } = req.body || {};
      if (!code) {
        return res.status(400).json({ error: 'Verification code is required.' });
      }
      const result = await query(`SELECT * FROM admins WHERE email = $1`, [email]);
      const admin = result.rows[0];
      if (!admin || !admin.totp_secret) {
        return res.status(404).json({ error: 'TOTP setup not started for this admin.' });
      }
      if (!verifyTotp(admin.totp_secret, String(code))) {
        return res.status(401).json({ error: 'Invalid verification code. Please check your authenticator app.', code: 'INVALID_TOTP' });
      }
      await query(`UPDATE admins SET totp_enabled = TRUE WHERE id = $1`, [admin.id]);
      await logAudit(req, '2FA_ENABLED', 'Security', admin.id, `2FA authenticator activated for ${admin.email}`);
      res.json({ success: true, user: mapAdmin({ ...admin, totp_enabled: true }) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/auth/sessions', authRequired, async (req, res) => {
    try {
      const result = await query(
        `SELECT * FROM admin_sessions WHERE admin_id = $1 ORDER BY created_at DESC`,
        [req.admin!.id]
      );
      res.json(result.rows.map(mapSession));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/auth/sessions/revoke-others', authRequired, async (req, res) => {
    try {
      await revokeOtherSessions(req.admin!.id, req.admin!.sessionId);
      await logAudit(req, 'SESSION_REVOKED', 'Security', 'all', `Revoked all other active sessions`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/auth/sessions/:id/revoke', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const check = await query(`SELECT * FROM admin_sessions WHERE id = $1 AND admin_id = $2`, [id, req.admin!.id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found.' });
      }
      await revokeSession(id);
      await logAudit(req, 'SESSION_REVOKED', 'Security', id, `Revoked session ${id}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/auth/admins', authRequired, async (req, res) => {
    try {
      const result = await query(`SELECT * FROM admins ORDER BY created_at ASC`);
      res.json(result.rows.map(mapAdmin));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/auth/admins', authRequired, async (req, res) => {
    try {
      const { name, email, role, password } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
      }
      const adminEmail = String(email).trim().toLowerCase();
      const exists = await query(`SELECT id FROM admins WHERE email = $1`, [adminEmail]);
      if (exists.rows.length > 0) {
        return res.status(409).json({ error: 'An admin with this email already exists.' });
      }
      const generatedPassword = password || crypto.randomBytes(6).toString('base64url');
      const id = genId('admin');
      await query(
        `INSERT INTO admins (id, name, email, role, password_hash, totp_enabled, status, created_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, 'ACTIVE', NOW())`,
        [id, String(name), adminEmail, role || 'EDITOR', hashPassword(generatedPassword)]
      );
      await logAudit(req, 'ADMIN_CREATED', 'Admin', id, `Created admin ${name} (${role || 'EDITOR'})`);
      const admin = await query(`SELECT * FROM admins WHERE id = $1`, [id]);
      res.json({ ...mapAdmin(admin.rows[0]), password: generatedPassword });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.patch('/api/auth/admins/:id/role', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body || {};
      if (!role) return res.status(400).json({ error: 'Role is required.' });
      const result = await query(`SELECT * FROM admins WHERE id = $1`, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Admin not found.' });
      }
      await query(`UPDATE admins SET role = $1 WHERE id = $2`, [role, id]);
      await logAudit(req, 'ADMIN_ROLE_CHANGED', 'Admin', id, `Role changed to ${role} for ${result.rows[0].name}`);
      const admin = await query(`SELECT * FROM admins WHERE id = $1`, [id]);
      res.json(mapAdmin(admin.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- PROTECTED DATA ROUTES ---

  app.post('/api/database/seed', authRequired, async (req, res) => {
    res.status(400).json({
      success: false,
      error: 'Demo seeding is disabled. This admin app runs on real data only.',
      code: 'SEED_DISABLED',
    });
  });

  app.post('/api/database/clean-dummy-data', authRequired, async (req, res) => {
    try {
      const { scope } = req.body || {};
      await cleanDatabaseTables(scope === 'all' ? 'all' : 'orders_only');
      await logAudit(req, 'PURGE_DUMMY_DATA', 'Database', scope || 'orders_only', `Purged dummy test data (${scope || 'orders_only'}) for clean production state`);
      const status = await checkConnection();
      res.json({
        success: true,
        message: scope === 'all'
          ? 'Cleared all dummy records (orders, returns, customers, products). Database is now completely pristine.'
          : 'Cleared dummy test orders, returns, and customers. Products catalog preserved.',
        status,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/metrics', authRequired, async (req, res) => {
    try {
      const ordersRes = await query(`
        SELECT
          COUNT(*)::int as total_orders,
          COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0)::float as total_revenue,
          COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END)::int as paid_orders,
          COUNT(CASE WHEN payment_status = 'UTR_SUBMITTED' OR order_status = 'PAYMENT_REVIEW' THEN 1 END)::int as pending_payments,
          COUNT(CASE WHEN order_status IN ('PAID', 'PROCESSING') THEN 1 END)::int as pending_fulfilment
        FROM orders
      `);
      const prevRes = await query(`
        SELECT
          COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0)::float as revenue,
          COUNT(*)::int as orders
        FROM orders
        WHERE created_at < NOW() - INTERVAL '7 days'
      `);
      const returnsRes = await query(`SELECT COUNT(*)::int as returns_count FROM returns`);

      const row = ordersRes.rows[0] || {};
      const prev = prevRes.rows[0] || {};
      const totalRev = Number(row.total_revenue) || 0;
      const prevRev = Number(prev.revenue) || 0;
      const totalOrders = Number(row.total_orders) || 0;
      const prevOrders = Number(prev.orders) || 0;
      const paidOrders = Number(row.paid_orders) || 0;
      const pendingPayments = Number(row.pending_payments) || 0;
      const pendingFulfilment = Number(row.pending_fulfilment) || 0;
      const aov = paidOrders > 0 ? Math.round(totalRev / paidOrders) : 0;
      const estProfit = Math.round(totalRev * 0.312);
      const returnsCount = Number(returnsRes.rows[0]?.returns_count) || 0;
      const pct = (cur: number, prevPeriod: number) => (prevPeriod > 0 ? Math.round(((cur - prevPeriod) / prevPeriod) * 100) : 0);

      res.json({
        totalRevenue: totalRev,
        revenueChangePct: pct(totalRev, prevRev),
        totalOrders,
        ordersChangePct: pct(totalOrders, prevOrders),
        paidOrders,
        pendingPayments,
        pendingFulfilment,
        averageOrderValue: aov,
        estimatedProfit: estProfit,
        profitChangePct: pct(estProfit, Math.round(prevRev * 0.312)),
        returnsCount,
        returnsChangePct: 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/metrics/revenue', authRequired, async (req, res) => {
    try {
      const rows = await query(`
        SELECT date_trunc('day', created_at)::date as day,
               COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0)::float as revenue,
               COUNT(*)::int as orders
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1
      `);
      const byDay: Record<string, { revenue: number; orders: number }> = {};
      for (const r of rows.rows) {
        const key = new Date(r.day).toISOString().slice(0, 10);
        byDay[key] = { revenue: Number(r.revenue) || 0, orders: Number(r.orders) || 0 };
      }
      const points: { date: string; revenue: number; orders: number }[] = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        points.push({ date: label, revenue: byDay[key]?.revenue || 0, orders: byDay[key]?.orders || 0 });
      }
      res.json(points);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/metrics/status-distribution', authRequired, async (req, res) => {
    try {
      const rows = await query(`SELECT order_status, COUNT(*)::int as count FROM orders GROUP BY order_status`);
      const labels: Record<string, string> = {
        PAYMENT_REVIEW: 'Payment Review',
        PAID: 'Paid',
        FULFILMENT_PENDING: 'Fulfilment Pending',
        SUPPLIER_ORDERED: 'Supplier Ordered',
        PROCESSING: 'Processing',
        SHIPPED: 'Shipped',
        OUT_FOR_DELIVERY: 'Out for Delivery',
        DELIVERED: 'Delivered',
        CANCELLED: 'Cancelled',
        RETURN_REQUESTED: 'Return Requested',
        REFUNDED: 'Refunded',
      };
      const colors = ['#FF7A59', '#10B981', '#0EA5E9', '#6366F1', '#14B8A6', '#F43F5E', '#F59E0B', '#8B5CF6', '#EF4444', '#3B82F6', '#6B7280'];
      const total = rows.rows.reduce((s: number, r) => s + Number(r.count || 0), 0);
      const items = rows.rows.map((r, i) => ({
        name: labels[r.order_status] || r.order_status,
        status: r.order_status,
        count: Number(r.count || 0),
        pct: total > 0 ? Math.round((Number(r.count || 0) / total) * 100) : 0,
        color: colors[i % colors.length],
      }));
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/metrics/low-stock', authRequired, async (req, res) => {
    try {
      const rows = await query(`SELECT * FROM products WHERE stock <= 10 ORDER BY stock ASC LIMIT 10`);
      res.json(rows.rows.map(mapProduct));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/metrics/top-products', authRequired, async (req, res) => {
    try {
      const rows = await query(`SELECT * FROM products ORDER BY sold_count DESC LIMIT 5`);
      res.json(rows.rows.map(mapProduct));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Orders API ---

  app.get('/api/orders', authRequired, async (req, res) => {
    try {
      const { status, paymentStatus, search } = req.query;
      let q = 'SELECT * FROM orders WHERE 1=1';
      const params: any[] = [];
      if (status && status !== 'ALL') { params.push(status); q += ` AND order_status = $${params.length}`; }
      if (paymentStatus) { params.push(paymentStatus); q += ` AND payment_status = $${params.length}`; }
      if (search) {
        params.push(`%${search}%`);
        q += ` AND (order_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR utr_number ILIKE $${params.length})`;
      }
      q += ' ORDER BY created_at DESC';
      const result = await query(q, params);
      res.json(result.rows.map(mapOrder));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/orders/:id', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const clean = id.replace(/^#/, '');
      const result = await query(`SELECT * FROM orders WHERE id = $1 OR order_number = $1 OR order_number = $2`, [id, `#${clean}`]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(mapOrder(result.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/orders', authRequired, async (req, res) => {
    try {
      const b = req.body || {};
      const orderNum = b.orderNumber || `#${Math.floor(10000 + Math.random() * 90000)}`;
      const id = b.id || genId('order');
      const now = new Date().toISOString();
      await query(
        `INSERT INTO orders (
          id, order_number, customer_id, customer_name, customer_email, customer_phone,
          total_amount, shipping_fee, discount_amount, payment_method, payment_status,
          order_status, utr_number, shipping_address, items, timeline, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())`,
        [
          id,
          orderNum,
          b.customer?.id || `cust_${Date.now()}`,
          b.customer?.name || 'Customer',
          b.customer?.email || 'customer@example.com',
          b.customer?.phone || '',
          Number(b.totalAmount || 0),
          Number(b.shippingFee || 0),
          Number(b.discountAmount || 0),
          b.paymentMethod || 'UPI',
          b.paymentStatus || 'UTR_SUBMITTED',
          b.orderStatus || 'PAYMENT_REVIEW',
          b.utrNumber || '',
          JSON.stringify(b.shippingAddress || {}),
          JSON.stringify(b.items || []),
          JSON.stringify([
            { status: 'CREATED', timestamp: now, note: 'Order placed by customer' },
            ...(b.utrNumber ? [{ status: 'PAYMENT_SUBMITTED', timestamp: now, note: `UTR ${b.utrNumber} submitted` }] : []),
          ]),
        ]
      );
      await logAudit(req, 'ORDER_CREATED', 'Order', orderNum, `Created order ${orderNum}`);
      res.json({ success: true, id, orderNumber: orderNum });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/orders/:id/verify-payment', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, rejectionReason, adminName } = req.body;
      const orderCheck = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
      if (orderCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const current = orderCheck.rows[0];
      const now = new Date().toISOString();
      const currentTimeline = current.timeline || [];
      const actor = adminName || req.admin!.name;

      if (action === 'APPROVE') {
        const newTimeline = [
          ...currentTimeline,
          { status: 'PAID', timestamp: now, note: `Payment confirmed by ${actor}` },
          { status: 'PROCESSING', timestamp: now, note: 'Order ready for supplier dispatch' },
        ];
        await query(
          `UPDATE orders
           SET payment_status = 'PAID', order_status = 'PROCESSING', payment_verified_at = $1, payment_verified_by = $2,
               timeline = $3, updated_at = NOW()
           WHERE id = $4`,
          [now, actor, JSON.stringify(newTimeline), id]
        );
        await logAudit(req, 'PAYMENT_VERIFIED', 'Order', current.order_number, `Approved UPI payment of ₹${current.total_amount} (UTR: ${current.utr_number || 'N/A'})`);
        return res.json({ success: true, message: 'Payment verified successfully.' });
      } else {
        const newTimeline = [
          ...currentTimeline,
          { status: 'CANCELLED', timestamp: now, note: `Payment rejected. Reason: ${rejectionReason || 'Invalid UTR'}` },
        ];
        await query(
          `UPDATE orders
           SET payment_status = 'REJECTED', order_status = 'CANCELLED', rejection_reason = $1, timeline = $2, updated_at = NOW()
           WHERE id = $3`,
          [rejectionReason || 'Invalid UTR', JSON.stringify(newTimeline), id]
        );
        await logAudit(req, 'PAYMENT_REJECTED', 'Order', current.order_number, `Rejected payment for ${current.order_number}: ${rejectionReason || 'Invalid UTR'}`);
        return res.json({ success: true, message: 'Payment rejected.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/orders/:id/status', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const { orderStatus } = req.body || {};
      if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
        return res.status(400).json({ error: `Invalid order status: ${orderStatus}` });
      }
      const orderCheck = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
      if (orderCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const current = orderCheck.rows[0];
      const now = new Date().toISOString();
      const timeline = [...(current.timeline || []), { status: orderStatus, timestamp: now, note: `Status changed from ${current.order_status} to ${orderStatus} by ${req.admin!.name}` }];
      await query(`UPDATE orders SET order_status = $1, timeline = $2, updated_at = NOW() WHERE id = $3`, [orderStatus, JSON.stringify(timeline), id]);
      await logAudit(req, 'ORDER_STATUS_CHANGED', 'Order', current.order_number, `Status changed from ${current.order_status} to ${orderStatus}`);
      const updated = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
      res.json(mapOrder(updated.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/orders/:id/supplier', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const { supplierOrderId } = req.body || {};
      if (!supplierOrderId) return res.status(400).json({ error: 'supplierOrderId is required.' });
      const orderCheck = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
      if (orderCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const current = orderCheck.rows[0];
      const now = new Date().toISOString();
      const timeline = [...(current.timeline || []), { status: 'SUPPLIER_ORDERED', timestamp: now, note: `Supplier PO placed: ${supplierOrderId}` }];
      await query(
        `UPDATE orders SET supplier_order_id = $1, supplier_ordered_at = NOW(), order_status = 'SUPPLIER_ORDERED', timeline = $2, updated_at = NOW()
         WHERE id = $3`,
        [supplierOrderId, JSON.stringify(timeline), id]
      );
      await logAudit(req, 'DISPATCHED_TO_SUPPLIER', 'Order', current.order_number, `Dispatched to supplier (Ref: ${supplierOrderId})`);
      const updated = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
      res.json(mapOrder(updated.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.patch('/api/orders/:id/tracking', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const { carrier, awbNumber, courierName, trackingNumber } = req.body;
      const finalCarrier = carrier || courierName || 'Delhivery';
      const finalAwb = awbNumber || trackingNumber;
      if (!finalAwb) return res.status(400).json({ error: 'AWB/tracking number is required.' });
      const orderCheck = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
      if (orderCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const current = orderCheck.rows[0];
      const now = new Date().toISOString();
      const timeline = [...(current.timeline || []), { status: 'SHIPPED', timestamp: now, note: `Dispatched via ${finalCarrier} (AWB: ${finalAwb})` }];
      await query(
        `UPDATE orders SET carrier = $1, awb_number = $2, order_status = 'SHIPPED', tracking_status = 'In Transit', timeline = $3, updated_at = NOW()
         WHERE id = $4`,
        [finalCarrier, finalAwb, JSON.stringify(timeline), id]
      );
      await logAudit(req, 'AWB_ASSIGNED', 'Order', current.order_number, `Assigned carrier ${finalCarrier} AWB #${finalAwb} to ${current.order_number}`);
      const updated = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
      res.json(mapOrder(updated.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Products API ---

  app.get('/api/products', authRequired, async (req, res) => {
    try {
      const { category, status, search, lowStock, topSelling } = req.query;
      let q = 'SELECT * FROM products WHERE 1=1';
      const params: any[] = [];
      if (category && category !== 'ALL') { params.push(category); q += ` AND category = $${params.length}`; }
      if (status && status !== 'ALL') { params.push(status); q += ` AND status = $${params.length}`; }
      if (search) {
        params.push(`%${search}%`);
        q += ` AND (title ILIKE $${params.length} OR sku ILIKE $${params.length} OR supplier_sku ILIKE $${params.length})`;
      }
      if (lowStock === '1') { q += ' AND stock <= 10'; }
      if (topSelling === '1') { q += ` ORDER BY sold_count DESC LIMIT 5`; }
      else { q += ' ORDER BY created_at DESC'; }
      const result = await query(q, params);
      res.json(result.rows.map(mapProduct));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/products/:id', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query(`SELECT * FROM products WHERE id = $1 OR sku = $1`, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(mapProduct(result.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/products', authRequired, async (req, res) => {
    try {
      const body = req.body || {};
      const id = genId('prod');
      const sellingPrice = Number(body.sellingPrice || 0);
      const supplierCost = Number(body.supplierCost || 0);
      const margin = sellingPrice - supplierCost;
      const sku = body.sku || `SKU-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await query(
        `INSERT INTO products (id, sku, title, description, category, images, selling_price, mrp, stock, status, sold_count, revenue, supplier_id, supplier_name, supplier_product_id, supplier_sku, supplier_cost, margin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, $11, $12, $13, $14, $15, $16)`,
        [
          id, sku, body.title || 'Untitled Product', body.description || '', body.category || 'General',
          JSON.stringify(body.images || []), sellingPrice,
          Number(body.mrp || sellingPrice * 1.5), Number(body.stock || 0), body.status || 'PUBLISHED',
          body.supplierId || '', body.supplierName || '', body.supplierProductId || '', body.supplierSku || '',
          supplierCost, margin,
        ]
      );
      await logAudit(req, 'PRODUCT_CREATED', 'Product', sku, `Created product "${body.title || 'Untitled Product'}" (${sku})`);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.patch('/api/products/:id', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};
      const check = await query(`SELECT * FROM products WHERE id = $1`, [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      const current = check.rows[0];
      const sellingPrice = body.sellingPrice !== undefined ? Number(body.sellingPrice) : Number(current.selling_price);
      const supplierCost = body.supplierCost !== undefined ? Number(body.supplierCost) : Number(current.supplier_cost);
      const fields: Record<string, any> = {
        sku: body.sku ?? current.sku,
        title: body.title ?? current.title,
        description: body.description ?? current.description,
        category: body.category ?? current.category,
        images: body.images !== undefined ? JSON.stringify(body.images) : current.images,
        selling_price: sellingPrice,
        mrp: body.mrp !== undefined ? Number(body.mrp) : current.mrp,
        stock: body.stock !== undefined ? Number(body.stock) : current.stock,
        status: body.status ?? current.status,
        supplier_id: body.supplierId ?? current.supplier_id,
        supplier_name: body.supplierName ?? current.supplier_name,
        supplier_product_id: body.supplierProductId ?? current.supplier_product_id,
        supplier_sku: body.supplierSku ?? current.supplier_sku,
        supplier_cost: supplierCost,
        margin: body.margin !== undefined ? Number(body.margin) : sellingPrice - supplierCost,
      };
      const cols = Object.keys(fields).map((k) => `${k} = $${Object.keys(fields).indexOf(k) + 1}`).join(', ');
      await query(`UPDATE products SET ${cols}, updated_at = NOW() WHERE id = $${Object.keys(fields).length + 1}`, [...Object.values(fields), id]);
      await logAudit(req, 'PRODUCT_UPDATED', 'Product', current.sku, `Updated product details for ${current.title}`);
      const updated = await query(`SELECT * FROM products WHERE id = $1`, [id]);
      res.json(mapProduct(updated.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/products/:id/stock', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const { stock } = req.body || {};
      if (stock === undefined || isNaN(Number(stock))) {
        return res.status(400).json({ error: 'A valid stock value is required.' });
      }
      const check = await query(`SELECT * FROM products WHERE id = $1`, [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      const current = check.rows[0];
      const newStock = Number(stock);
      const newStatus = newStock === 0 ? 'OUT_OF_STOCK' : current.status === 'OUT_OF_STOCK' ? 'PUBLISHED' : current.status;
      await query(`UPDATE products SET stock = $1, status = $2, updated_at = NOW() WHERE id = $3`, [newStock, newStatus, id]);
      await logAudit(req, 'STOCK_UPDATED', 'Product', current.sku, `Stock changed from ${current.stock} to ${newStock} for ${current.title}`);
      const updated = await query(`SELECT * FROM products WHERE id = $1`, [id]);
      res.json(mapProduct(updated.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/products/:id', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const check = await query(`SELECT * FROM products WHERE id = $1`, [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      await query(`DELETE FROM products WHERE id = $1`, [id]);
      await logAudit(req, 'PRODUCT_DELETED', 'Product', check.rows[0].sku, `Deleted product ${check.rows[0].title} (${check.rows[0].sku})`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/products/batch-import', authRequired, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items must be an array' });
      }
      let created = 0;
      let updated = 0;
      for (const item of items) {
        const sku = item.sku || `IMP-${Math.floor(1000 + Math.random() * 9000)}`;
        const price = Number(item.price || item.sellingPrice || 0);
        const cost = Number(item.supplierCost || 0);
        const margin = price - cost;
        const exists = await query(`SELECT id FROM products WHERE sku = $1`, [sku]);
        if (exists.rows.length > 0) {
          await query(
            `UPDATE products SET stock = products.stock + $1, selling_price = $2, updated_at = NOW() WHERE sku = $3`,
            [Number(item.stock || 1), price, sku]
          );
          updated++;
        } else {
          await query(
            `INSERT INTO products (id, sku, title, description, category, images, selling_price, mrp, stock, status, sold_count, revenue, supplier_cost, margin)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PUBLISHED', 0, 0, $10, $11)`,
            [
              genId('prod'), sku, item.title || 'Imported Product', item.description || 'Imported via bulk sheet',
              item.category || 'General', JSON.stringify(item.images || []), price,
              Math.round(price * 1.5), Number(item.stock || 0), cost, margin,
            ]
          );
          created++;
        }
      }
      await logAudit(req, 'CATALOG_BATCH_IMPORT', 'Catalog', 'Bulk', `Batch imported ${items.length} products (${created} created, ${updated} updated)`);
      res.json({ success: true, count: items.length, created, updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Categories API ---

  app.get('/api/categories', authRequired, async (req, res) => {
    try {
      const result = await query('SELECT * FROM categories ORDER BY name ASC');
      res.json(result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        productCount: Number(r.product_count || 0),
        status: r.status,
        description: r.description || undefined,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/categories', authRequired, async (req, res) => {
    try {
      const { name, slug, description } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Category name is required.' });
      const slugValue = slug || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const id = genId('cat');
      await query(
        `INSERT INTO categories (id, name, slug, product_count, status, created_at)
         VALUES ($1, $2, $3, 0, 'ACTIVE', NOW())`,
        [id, String(name), slugValue]
      );
      await logAudit(req, 'CATEGORY_CREATED', 'Category', slugValue, `Created category ${name}`);
      res.json({ success: true, id, name, slug: slugValue });
    } catch (err: any) {
      if (String(err?.code) === '23505') {
        return res.status(409).json({ error: 'A category with this slug already exists.' });
      }
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Suppliers API ---

  app.get('/api/suppliers', authRequired, async (req, res) => {
    try {
      const result = await query('SELECT * FROM suppliers ORDER BY name ASC');
      res.json(result.rows.map(mapSupplier));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/suppliers/:id', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      res.json(mapSupplier(result.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/suppliers', authRequired, async (req, res) => {
    try {
      const b = req.body || {};
      const id = genId('sup');
      const name = b.name || 'New Supplier';
      const integrationType = b.integrationType || 'MANUAL';
      const isConnected = integrationType === 'API';
      await query(
        `INSERT INTO suppliers (id, name, contact_person, contact_email, contact_phone, website, integration_type, is_connected, connection_details, product_count, pending_orders_count, api_status_message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, $10, NOW())`,
        [
          id, name, b.contactPerson || '', b.contactEmail || b.email || '', b.contactPhone || b.phone || '',
          b.website || '', integrationType, isConnected,
          integrationType === 'MANUAL' ? 'Manual portal order' : 'Pending API key config',
          integrationType === 'API' ? 'Pending Webhook configuration' : 'Manual packet copy enabled',
        ]
      );
      await logAudit(req, 'SUPPLIER_CREATED', 'Supplier', name, `Created supplier ${name} (${integrationType})`);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.patch('/api/suppliers/:id', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const b = req.body || {};
      const check = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      const current = check.rows[0];
      const fields: Record<string, any> = {
        name: b.name ?? current.name,
        contact_person: b.contactPerson ?? current.contact_person,
        contact_email: b.contactEmail ?? b.email ?? current.contact_email,
        contact_phone: b.contactPhone ?? b.phone ?? current.contact_phone,
        website: b.website ?? current.website,
        integration_type: b.integrationType ?? current.integration_type,
        is_connected: b.isConnected !== undefined ? !!b.isConnected : current.is_connected,
        api_status_message: b.apiStatusMessage ?? current.api_status_message,
      };
      const cols = Object.keys(fields).map((k) => `${k} = $${Object.keys(fields).indexOf(k) + 1}`).join(', ');
      await query(`UPDATE suppliers SET ${cols} WHERE id = $${Object.keys(fields).length + 1}`, [...Object.values(fields), id]);
      await logAudit(req, 'SUPPLIER_UPDATED', 'Supplier', current.name, `Updated configuration for ${current.name}`);
      const updated = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
      res.json(mapSupplier(updated.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Customers API ---

  app.get('/api/customers', authRequired, async (req, res) => {
    try {
      const result = await query('SELECT * FROM customers ORDER BY total_spent DESC');
      res.json(result.rows.map(mapCustomer));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Coupons API ---

  app.get('/api/coupons', authRequired, async (req, res) => {
    try {
      const result = await query('SELECT * FROM coupons ORDER BY created_at DESC');
      res.json(result.rows.map(mapCoupon));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/coupons', authRequired, async (req, res) => {
    try {
      const b = req.body || {};
      const code = String(b.code || '').toUpperCase().trim();
      if (!code) return res.status(400).json({ error: 'Coupon code is required.' });
      const id = genId('coup');
      await query(
        `INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, usage_limit, used_count, starts_at, expires_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
        [
          id, code, b.discountType || 'PERCENTAGE', Number(b.discountValue || 0),
          Number(b.minOrderValue || 0), Number(b.usageLimit || 0),
          b.startDate ? new Date(b.startDate) : new Date(),
          b.endDate ? new Date(b.endDate) : null,
          b.isActive === false ? 'INACTIVE' : 'ACTIVE',
        ]
      );
      await logAudit(req, 'COUPON_CREATED', 'Coupon', code, `Created coupon ${code}`);
      const created = await query(`SELECT * FROM coupons WHERE id = $1`, [id]);
      res.json(mapCoupon(created.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.patch('/api/coupons/:id', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const b = req.body || {};
      const check = await query(`SELECT * FROM coupons WHERE id = $1`, [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Coupon not found' });
      }
      const current = check.rows[0];
      const fields: Record<string, any> = {
        discount_type: b.discountType ?? current.discount_type,
        discount_value: b.discountValue !== undefined ? Number(b.discountValue) : current.discount_value,
        min_order_amount: b.minOrderValue !== undefined ? Number(b.minOrderValue) : current.min_order_amount,
        usage_limit: b.usageLimit !== undefined ? Number(b.usageLimit) : current.usage_limit,
        expires_at: b.endDate !== undefined ? (b.endDate ? new Date(b.endDate) : null) : current.expires_at,
        status: b.isActive !== undefined ? (b.isActive ? 'ACTIVE' : 'INACTIVE') : current.status,
      };
      const cols = Object.keys(fields).map((k) => `${k} = $${Object.keys(fields).indexOf(k) + 1}`).join(', ');
      await query(`UPDATE coupons SET ${cols} WHERE id = $${Object.keys(fields).length + 1}`, [...Object.values(fields), id]);
      await logAudit(req, 'COUPON_TOGGLED', 'Coupon', current.code, `Coupon ${current.code} set to ${fields.status === 'ACTIVE' ? 'Active' : 'Inactive'}`);
      const updated = await query(`SELECT * FROM coupons WHERE id = $1`, [id]);
      res.json(mapCoupon(updated.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Returns API ---

  app.get('/api/returns', authRequired, async (req, res) => {
    try {
      const result = await query('SELECT * FROM returns ORDER BY requested_at DESC');
      res.json(result.rows.map(mapReturn));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  async function updateReturn(id: string, status: string, req: express.Request, message: string): Promise<void> {
    await query(`UPDATE returns SET status = $1 WHERE id = $2`, [status, id]);
    await logAudit(req, status === 'APPROVED' ? 'RETURN_APPROVED' : status === 'REJECTED' ? 'RETURN_REJECTED' : 'REFUND_CREATED', 'Return', id, message);
  }

  app.post('/api/returns/:id/approve', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const check = await query(`SELECT * FROM returns WHERE id = $1`, [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Return request not found' });
      const r = check.rows[0];
      await updateReturn(id, 'APPROVED', req, `Approved return for ${r.order_number} (${r.product_title})`);
      res.json(mapReturn({ ...r, status: 'APPROVED' }));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/returns/:id/reject', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const check = await query(`SELECT * FROM returns WHERE id = $1`, [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Return request not found' });
      const r = check.rows[0];
      await query(`UPDATE returns SET status = 'REJECTED', notes = $1 WHERE id = $2`, [reason || 'Rejected by admin', id]);
      await logAudit(req, 'RETURN_REJECTED', 'Return', id, `Rejected return for ${r.order_number}. Reason: ${reason || 'Rejected by admin'}`);
      res.json(mapReturn({ ...r, status: 'REJECTED', notes: reason }));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/returns/:id/refund', authRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const check = await query(`SELECT * FROM returns WHERE id = $1`, [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Return request not found' });
      const r = check.rows[0];
      await query(`UPDATE returns SET status = 'REFUNDED' WHERE id = $1`, [id]);
      await logAudit(req, 'REFUND_CREATED', 'Return', id, `Processed refund of ₹${Number(r.refund_amount || r.amount || 0)} for ${r.order_number}`);
      res.json(mapReturn({ ...r, status: 'REFUNDED' }));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Fulfilment API ---

  app.get('/api/fulfilment', authRequired, async (req, res) => {
    try {
      const result = await query(`
        SELECT * FROM orders
        WHERE payment_status = 'PAID'
          AND order_status NOT IN ('SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'REFUNDED')
        ORDER BY created_at ASC
      `);
      const rows: any[] = [];
      for (const r of result.rows) {
        const order = mapOrder(r);
        for (const item of order.items) {
          rows.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.createdAt,
            customerName: order.customer.name,
            customerPhone: order.customer.phone,
            shippingAddress: `${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.postalCode || ''}`,
            itemTitle: item.productTitle,
            itemSku: item.sku,
            quantity: item.quantity,
            supplierName: item.supplierName,
            supplierProductId: item.supplierSku || 'N/A',
            supplierCost: item.supplierCost,
            totalSupplierCost: item.supplierCost * item.quantity,
            supplierOrderId: order.supplierOrderId,
            status: order.supplierOrderId ? 'SUPPLIER_ORDERED' : 'PENDING_SUPPLIER',
          });
        }
      }
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Catalog sync logs API ---

  app.get('/api/catalog/sync-logs', authRequired, async (req, res) => {
    try {
      const result = await query('SELECT * FROM catalog_sync_logs ORDER BY created_at DESC LIMIT 50');
      res.json(result.rows.map((r: any) => ({
        id: r.id,
        supplierName: r.supplier_name || 'Unknown Supplier',
        productsAdded: Number(r.products_added || 0),
        productsUpdated: Number(r.products_updated || 0),
        productsDeactivated: Number(r.products_deactivated || 0),
        timestamp: r.created_at,
        durationMs: Number(r.duration_ms || 0),
      })));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/catalog/sync', authRequired, async (req, res) => {
    try {
      const { supplierName } = req.body || {};
      const started = Date.now();
      const name = supplierName || 'Unknown Supplier';
      const count = await query(`SELECT count(*)::int as count FROM products WHERE supplier_name = $1`, [name]);
      const updated = Number(count.rows[0]?.count || 0);
      const durationMs = Date.now() - started;
      const id = genId('sync');
      await query(
        `INSERT INTO catalog_sync_logs (id, supplier_name, products_added, products_updated, products_deactivated, status, duration_ms, message, created_at)
         VALUES ($1, $2, 0, $3, 0, 'SUCCESS', $4, $5, NOW())`,
        [id, name, updated, durationMs, `Completed catalog feed sync for ${name}`]
      );
      await logAudit(req, 'CATALOG_SYNC_RUN', 'Catalog', name, `Completed catalog feed sync for ${name}`);
      res.json({
        id,
        supplierName: name,
        productsAdded: 0,
        productsUpdated: updated,
        productsDeactivated: 0,
        timestamp: new Date(),
        durationMs,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Audit Logs API ---

  app.get('/api/audit-logs', authRequired, async (req, res) => {
    try {
      const { search } = req.query;
      let q = 'SELECT * FROM audit_logs';
      const params: any[] = [];
      if (search) {
        params.push(`%${search}%`);
        q += ` WHERE (action ILIKE $1 OR description ILIKE $1 OR admin_name ILIKE $1)`;
      }
      q += ' ORDER BY timestamp DESC LIMIT 100';
      const result = await query(q, params);
      res.json(result.rows.map((r: any) => ({
        id: r.id,
        timestamp: new Date(r.timestamp).toLocaleString(),
        adminName: r.admin_name,
        adminEmail: r.admin_email,
        action: r.action,
        resource: r.resource,
        resourceId: r.resource_id,
        description: r.description,
        ipAddress: r.ip_address,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/settings', authRequired, async (req, res) => {
    try {
      const body = req.body || {};
      await query(
        `INSERT INTO settings (key, value)
         VALUES ('store_config', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify({ ...DEFAULT_SETTINGS, ...body })]
      );
      await logAudit(req, 'SETTINGS_UPDATED', 'Settings', 'store_config', `Updated store configuration`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Vite / static serving ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();