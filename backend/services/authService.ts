import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type express from 'express';
import {
  AuthUser,
  deriveDisplayNameAndInitials,
} from '../../frontend/utils/authEngine.ts';
import {
  DEFAULT_STORE_PATH,
  financiaStore,
  PersistenceStore,
  StoredAccountRecord,
} from './persistenceService.ts';

export type { StoredAccountRecord };

function resolveSessionSecret(): string {
  if (process.env.AUTH_SESSION_SECRET && process.env.AUTH_SESSION_SECRET.length >= 16) {
    return process.env.AUTH_SESSION_SECRET;
  }
  const secretPath = path.join(path.dirname(DEFAULT_STORE_PATH), '.session-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const dir = path.dirname(secretPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const AUTH_SESSION_SECRET = resolveSessionSecret();

export const revokedTokens = new Set<string>();

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHex: string
): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function signAuthToken(user: AuthUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      user,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', AUTH_SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAuthToken(token: string): AuthUser | null {
  if (!token || revokedTokens.has(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as {
      user?: AuthUser;
      exp?: number;
    };
    if (!decoded.user || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    return decoded.user;
  } catch {
    return null;
  }
}

export function extractBearerOrCookieToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const match = rawCookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('financia_session='));
    if (match) {
      return decodeURIComponent(match.slice('financia_session='.length));
    }
  }
  return null;
}

export function getAuthenticatedUser(req: express.Request): AuthUser | null {
  const token = extractBearerOrCookieToken(req);
  return token ? verifyAuthToken(token) : null;
}

export function ensureDemoInvestorAccount(store: PersistenceStore = financiaStore): void {
  const email = 'demo@financia.io';
  if (store.hasAccount(email)) return;
  const salt = crypto.randomBytes(16).toString('hex');
  const { displayName, initials } = deriveDisplayNameAndInitials('Demo Investor', email);
  store.setAccount(email, {
    user: {
      id: 'usr_demo_financia',
      name: displayName,
      email,
      provider: 'email',
      initials,
      createdAt: new Date().toISOString(),
    },
    salt,
    passwordHash: hashPassword('DemoPass2026!', salt),
  });
}

ensureDemoInvestorAccount(financiaStore);
