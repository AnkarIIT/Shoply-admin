import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomBytes } from 'crypto';
import { query, pool } from './db';

const CSV_PATH = process.env.CATALOG_CSV || resolve(process.cwd(), 'shoply_deodap_catalog_verified_sample.csv');

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else if (ch === '\r') {
      // ignore
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 && r.some((c) => c.trim() !== ''));
}

let seq = 0;
function genId(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now()}_${randomBytes(3).toString('hex')}_${seq}`;
}

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function ensureSchema() {
  await query(`ALTER TABLE products ALTER COLUMN sku TYPE VARCHAR(255)`);
  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(255)`);
  await query(`ALTER TABLE products ALTER COLUMN slug TYPE VARCHAR(255)`);
  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2)`);
  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0`);
  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS source_type VARCHAR(64)`);
  await query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website VARCHAR(255)`);
}

async function upsertSupplier(name: string, sourceType: string): Promise<string> {
  const existing = await query(`SELECT id FROM suppliers WHERE name = $1`, [name]);
  if (existing.rows.length > 0) {
    await query(`UPDATE suppliers SET integration_type = 'CSV', is_connected = TRUE, connection_details = $2 WHERE id = $1`,
      [existing.rows[0].id, `${sourceType} CSV feed (imported from shoply_deodap_catalog_verified_sample.csv)`]);
    return existing.rows[0].id as string;
  }
  const id = genId('sup');
  await query(
    `INSERT INTO suppliers (id, name, integration_type, is_connected, connection_details, product_count, pending_orders_count, created_at)
     VALUES ($1, $2, 'CSV', TRUE, $3, 0, 0, NOW())`,
    [id, name, `${sourceType} CSV feed (imported from shoply_deodap_catalog_verified_sample.csv)`]
  );
  return id;
}

async function upsertCategory(name: string): Promise<void> {
  const slug = slugify(name);
  const existing = await query(`SELECT id FROM categories WHERE slug = $1`, [slug]);
  if (existing.rows.length === 0) {
    await query(
      `INSERT INTO categories (id, name, slug, product_count, status, created_at)
       VALUES ($1, $2, $3, 0, 'ACTIVE', NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [genId('cat'), name, slug]
    );
  }
}

async function importProducts() {
  console.log(`[Catalog Import] Reading ${CSV_PATH}`);
  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  if (rows.length < 2) {
    throw new Error('CSV is empty (expected a header row and product rows).');
  }

  const header = rows[0];
  const col = (name: string) => header.indexOf(name);
  const idx = {
    supplier: col('supplier'),
    sourceType: col('source_type'),
    name: col('product_name'),
    supplierCost: col('supplier_price_inr'),
    mrp: col('mrp_inr'),
    rating: col('rating'),
    reviewCount: col('review_count'),
    category: col('category'),
    sellingPrice: col('selling_price_inr'),
    slug: col('slug'),
    sourceUrl: col('source_url'),
    stockStatus: col('stock_status'),
  };
  if (Object.values(idx).some((i) => i === -1)) {
    throw new Error(`CSV header mismatch. Expected columns: ${header.join(', ')}`);
  }

  await ensureSchema();

  const suppliers = new Map<string, string>();
  const categories = new Set<string>();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const supplierName = (row[idx.supplier] || '').trim();
    const category = (row[idx.category] || 'General').trim();
    const title = (row[idx.name] || '').trim();
    const slugRaw = (row[idx.slug] || slugify(title)).trim();
    if (!title || !slugRaw) {
      skipped++;
      continue;
    }

    const sellingPrice = Math.round(Number(row[idx.sellingPrice]) || 0);
    const supplierCost = Math.round(Number(row[idx.supplierCost]) || 0);
    const mrp = Math.round(Number(row[idx.mrp]) || 0);
    const rating = Number(row[idx.rating]);
    const reviewCount = Math.round(Number(row[idx.reviewCount]) || 0);
    const sourceType = (row[idx.sourceType] || '').trim();
    const stockStatus = (row[idx.stockStatus] || '').trim().toUpperCase();
    const status = stockStatus.includes('VERIFY') ? 'PENDING_REVIEW' : 'PUBLISHED';

    if (!suppliers.has(supplierName)) {
      suppliers.set(supplierName, await upsertSupplier(supplierName, sourceType));
    }
    categories.add(category);
    const supplierId = suppliers.get(supplierName) as string;
    const margin = sellingPrice - supplierCost;

    const exists = await query(`SELECT id FROM products WHERE sku = $1`, [slugRaw]);
    if (exists.rows.length > 0) {
      await query(
        `UPDATE products SET
           title = $1, description = $2, category = $3, slug = $4,
           selling_price = $5, mrp = $6, rating = $7, review_count = $8,
           source_type = $9, status = $10,
           supplier_id = $11, supplier_name = $12, supplier_product_id = $13,
           supplier_sku = $14, supplier_cost = $15, supplier_url = $16, margin = $17,
           updated_at = NOW()
         WHERE sku = $18`,
        [title, sourceType, category, slugRaw, sellingPrice, mrp, rating, reviewCount,
         sourceType, status, supplierId, supplierName, slugRaw, slugRaw, supplierCost,
         row[idx.sourceUrl] || '', margin, slugRaw]
      );
      updated++;
    } else {
      await query(
        `INSERT INTO products (id, sku, title, description, category, slug, images, selling_price, mrp, stock, status, rating, review_count, source_type, sold_count, revenue, supplier_id, supplier_name, supplier_product_id, supplier_sku, supplier_cost, supplier_url, margin, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, '[]', $7, $8, 0, $9, $10, $11, $12, 0, 0, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())`,
        [genId('prod'), slugRaw, title, sourceType, category, slugRaw, sellingPrice, mrp,
         status, rating, reviewCount, sourceType, supplierId, supplierName, slugRaw, slugRaw,
         supplierCost, row[idx.sourceUrl] || '', margin]
      );
      created++;
    }
  }

  for (const cat of categories) {
    await upsertCategory(cat);
  }

  for (const cat of categories) {
    await query(`UPDATE categories SET product_count = (
      SELECT count(*)::int FROM products WHERE category = $1
    ) WHERE slug = $2`, [cat, slugify(cat)]);
  }

  await query(`UPDATE suppliers SET product_count = (
    SELECT count(*)::int FROM products WHERE supplier_name = $1
  ) WHERE name = $1`, [Array.from(suppliers.keys())[0]]);

  return { created, updated, skipped, categories: categories.size };
}

importProducts()
  .then((summary) => {
    console.log(`[Catalog Import] Done: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.categories} categories.`);
    return pool.end();
  })
  .catch((err) => {
    console.error('[Catalog Import] FAILED:', err?.message || err);
    return pool.end().then(() => process.exit(1));
  });