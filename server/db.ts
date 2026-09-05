import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. The Shoply admin server refuses to start without it. ' +
    'Add DATABASE_URL to your .env file (e.g. for your Neon PostgreSQL database).'
  );
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && duration > 500) {
      console.log(`[Neon DB] Executed query in ${duration}ms: ${text.slice(0, 100)}`);
    }
    return res;
  } catch (err: any) {
    console.error(`[Neon DB Error] Query failed: ${text.slice(0, 150)}`, err?.message);
    throw err;
  }
}

export async function checkConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  database: string;
  version: string;
  host: string;
  tableCounts: Record<string, number>;
  error?: string;
}> {
  const start = Date.now();
  try {
    const infoRes = await query(`SELECT current_database() as db, version() as ver`);
    const latencyMs = Date.now() - start;

    // Count rows in main tables if they exist
    const tables = ['orders', 'products', 'categories', 'suppliers', 'customers', 'coupons', 'returns', 'audit_logs'];
    const tableCounts: Record<string, number> = {};

    for (const tbl of tables) {
      try {
        const countRes = await query(`SELECT count(*)::int as count FROM ${tbl}`);
        tableCounts[tbl] = countRes.rows[0]?.count || 0;
      } catch {
        tableCounts[tbl] = 0;
      }
    }

    const host = DATABASE_URL.includes('@') ? DATABASE_URL.split('@')[1].split('/')[0] : 'neon.tech';

    return {
      connected: true,
      latencyMs,
      database: infoRes.rows[0]?.db || 'neondb',
      version: infoRes.rows[0]?.ver?.split(' ')[0] + ' ' + (infoRes.rows[0]?.ver?.split(' ')[1] || ''),
      host,
      tableCounts,
    };
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      database: 'neondb',
      version: 'unknown',
      host: 'neon.tech',
      tableCounts: {},
      error: err?.message || 'Failed to connect to Neon PostgreSQL',
    };
  }
}

export async function initDatabaseSchema() {
  console.log('[Neon DB] Initializing PostgreSQL schema in Neon...');

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      order_number VARCHAR(64) UNIQUE NOT NULL,
      customer_id VARCHAR(64),
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(64),
      total_amount NUMERIC(12, 2) NOT NULL,
      shipping_fee NUMERIC(12, 2) DEFAULT 0,
      discount_amount NUMERIC(12, 2) DEFAULT 0,
      payment_method VARCHAR(64) NOT NULL DEFAULT 'UPI',
      payment_status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
      order_status VARCHAR(64) NOT NULL DEFAULT 'PAYMENT_REVIEW',
      utr_number VARCHAR(128),
      payment_verified_at TIMESTAMPTZ,
      payment_verified_by VARCHAR(128),
      rejection_reason TEXT,
      shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
      supplier_order_id VARCHAR(128),
      supplier_ordered_at TIMESTAMPTZ,
      awb_number VARCHAR(128),
      carrier VARCHAR(128),
      tracking_status VARCHAR(128),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      sku VARCHAR(64) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(128) NOT NULL,
      slug VARCHAR(255),
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      selling_price NUMERIC(12, 2) NOT NULL,
      mrp NUMERIC(12, 2) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(64) NOT NULL DEFAULT 'PUBLISHED',
      rating NUMERIC(3, 2),
      review_count INTEGER DEFAULT 0,
      source_type VARCHAR(64),
      sold_count INTEGER DEFAULT 0,
      revenue NUMERIC(12, 2) DEFAULT 0,
      supplier_id VARCHAR(64),
      supplier_name VARCHAR(255),
      supplier_product_id VARCHAR(128),
      supplier_sku VARCHAR(128),
      supplier_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
      supplier_url TEXT,
      margin NUMERIC(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      slug VARCHAR(128) UNIQUE NOT NULL,
      product_count INTEGER DEFAULT 0,
      status VARCHAR(64) DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(128),
      contact_email VARCHAR(255),
      contact_phone VARCHAR(64),
      integration_type VARCHAR(64) DEFAULT 'MANUAL',
      is_connected BOOLEAN DEFAULT FALSE,
      connection_details TEXT,
      last_sync_at TIMESTAMPTZ,
      product_count INTEGER DEFAULT 0,
      pending_orders_count INTEGER DEFAULT 0,
      api_status_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(64),
      total_orders INTEGER DEFAULT 0,
      total_spent NUMERIC(12, 2) DEFAULT 0,
      last_order_at TIMESTAMPTZ,
      status VARCHAR(64) DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) UNIQUE NOT NULL,
      discount_type VARCHAR(64) NOT NULL,
      discount_value NUMERIC(12, 2) NOT NULL,
      min_order_amount NUMERIC(12, 2) DEFAULT 0,
      usage_limit INTEGER DEFAULT 100,
      used_count INTEGER DEFAULT 0,
      starts_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      status VARCHAR(64) DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS returns (
      id VARCHAR(64) PRIMARY KEY,
      order_number VARCHAR(64) NOT NULL,
      order_id VARCHAR(64),
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      product_title VARCHAR(255) NOT NULL,
      reason TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      refund_amount NUMERIC(12, 2) NOT NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'REQUESTED',
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      admin_name VARCHAR(255) NOT NULL,
      admin_email VARCHAR(255) NOT NULL,
      action VARCHAR(128) NOT NULL,
      resource VARCHAR(128) NOT NULL,
      resource_id VARCHAR(128) NOT NULL,
      description TEXT NOT NULL,
      ip_address VARCHAR(64)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(128) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(64) NOT NULL DEFAULT 'OPERATOR',
      password_hash VARCHAR(255) NOT NULL,
      totp_secret VARCHAR(64),
      totp_enabled BOOLEAN DEFAULT FALSE,
      status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id VARCHAR(64) PRIMARY KEY,
      admin_id VARCHAR(64) NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      token_hash VARCHAR(128) UNIQUE NOT NULL,
      device VARCHAR(128),
      browser VARCHAR(128),
      os VARCHAR(128),
      ip_address VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_activity_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      is_current BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS catalog_sync_logs (
      id VARCHAR(64) PRIMARY KEY,
      supplier_name VARCHAR(255),
      products_added INTEGER DEFAULT 0,
      products_updated INTEGER DEFAULT 0,
      products_deactivated INTEGER DEFAULT 0,
      status VARCHAR(64) NOT NULL DEFAULT 'SUCCESS',
      duration_ms INTEGER DEFAULT 0,
      message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('[Neon DB] Schema created successfully.');
}
