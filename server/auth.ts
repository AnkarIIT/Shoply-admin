import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { query } from './db';

// --- Password hashing (scrypt) ---

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${16384}$${8}$${1}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export function verifyPassword(stored: string, password: string): boolean {
  try {
    const [algo, N, r, p, saltB64, hashB64] = stored.split('$');
    if (algo !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = crypto.scryptSync(password, salt, expected.length, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// --- TOTP (RFC 6238, SHA-1, 6 digits, 30s window) ---
// Base32 follows RFC 4648 exactly (alphabet A-Z, 2-7). This is the same
// format Google Authenticator & Microsoft Authenticator encode secrets with,
// so any secret generated here can be typed manually into those apps.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out; // Unpadded RFC 4648 Base32 (Google Authenticator & MS Authenticator compatible)
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/g, '').replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 secret character: ' + ch);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateHOTP(secretBuffer: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secretBuffer).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, '0');
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20)); // 160-bit key => 32-char secret
}

export function generateTotp(secret: string): string {
  const secretBuffer = base32Decode(secret);
  const counter = Math.floor(Date.now() / 30000);
  return generateHOTP(secretBuffer, counter);
}

export function verifyTotp(secret: string, code: string): boolean {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length !== 6) return false;
  const secretBuffer = base32Decode(secret);
  const counter = Math.floor(Date.now() / 30000);
  for (let window = -1; window <= 1; window++) {
    if (generateHOTP(secretBuffer, counter + window) === cleaned) return true;
  }
  return false;
}

export function buildOtpauthUrl(email: string, secret: string): string {
  const issuer = 'Shoply Admin';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// --- Sessions ---

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface AuthAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  totpEnabled: boolean;
  status: string;
}

export interface AuthenticatedAdmin extends AuthAdmin {
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h hard cap

export async function createSession(
  adminId: string,
  info: { device: string; browser: string; os: string; ipAddress: string }
): Promise<string> {
  const token = generateSessionToken();
  const now = new Date();
  await query(
    `INSERT INTO admin_sessions (id, admin_id, token_hash, device, browser, os, ip_address, created_at, last_activity_at, expires_at, revoked, is_current)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, FALSE, TRUE)`,
    [
      `sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      adminId,
      hashToken(token),
      info.device,
      info.browser,
      info.os,
      info.ipAddress,
      now,
      new Date(now.getTime() + SESSION_TTL_MS),
    ]
  );
  return token;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await query(`UPDATE admin_sessions SET revoked = TRUE, is_current = FALSE WHERE id = $1`, [sessionId]);
}

export async function revokeOtherSessions(adminId: string, currentSessionId: string): Promise<void> {
  await query(
    `UPDATE admin_sessions SET revoked = TRUE, is_current = FALSE WHERE admin_id = $1 AND id <> $2 AND revoked = FALSE`,
    [adminId, currentSessionId]
  );
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.', code: 'NO_TOKEN' });
  }

  try {
    const result = await query(
      `SELECT s.id AS session_id, s.revoked, s.expires_at, s.is_current,
              a.id, a.name, a.email, a.role, a.totp_enabled, a.status
       FROM admin_sessions s
       JOIN admins a ON a.id = s.admin_id
       WHERE s.token_hash = $1`,
      [hashToken(token)]
    );
    const row = result.rows[0];
    if (!row || row.revoked || row.status !== 'ACTIVE' || new Date(row.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired or revoked.', code: 'SESSION_EXPIRED' });
    }
    req.admin = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      totpEnabled: row.totp_enabled,
      status: row.status,
      sessionId: row.session_id,
    };
    await query(`UPDATE admin_sessions SET last_activity_at = NOW() WHERE id = $1`, [row.session_id]);
    next();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Authentication check failed.' });
  }
}

// --- Audit logging ---

export async function logAudit(
  req: Request,
  action: string,
  resource: string,
  resourceId: string,
  description: string
): Promise<void> {
  try {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    await query(
      `INSERT INTO audit_logs (id, admin_name, admin_email, action, resource, resource_id, description, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        req.admin?.name || 'Unknown',
        req.admin?.email || 'unknown@shoply.in',
        action,
        resource,
        resourceId || 'N/A',
        description,
        ip,
      ]
    );
  } catch {
    // Audit logging must never break the main request
  }
}

// --- Bootstrap admin (no dummy data: real credential or generated secret) ---

export async function bootstrapAdmin(): Promise<void> {
  const check = await query(`SELECT count(*)::int AS count FROM admins`);
  if ((check.rows[0]?.count || 0) > 0) return;

  const name = process.env.ADMIN_NAME || 'Shoply Admin';
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD || '';
  let generated = false;

  if (!email) {
    console.error('[Auth] No ADMIN_EMAIL set. Add ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD to .env to create the first admin.');
    return;
  }
  if (!password) {
    password = crypto.randomBytes(6).toString('base64url');
    generated = true;
  }

  await query(
    `INSERT INTO admins (id, name, email, role, password_hash, totp_secret, totp_enabled, status, created_at, last_login_at)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, 'ACTIVE', NOW(), NULL)
     ON CONFLICT (email) DO NOTHING`,
    [
      `admin_${Date.now()}`,
      name,
      email,
      process.env.ADMIN_ROLE || 'SUPER_ADMIN',
      hashPassword(password),
      process.env.ADMIN_TOTP_SECRET || '',
    ]
  );

  console.log(`[Auth] Created initial admin account: ${email}`);
  if (generated) {
    console.log(`[Auth] Generated one-time password (change it after first login): ${password}`);
  }
}