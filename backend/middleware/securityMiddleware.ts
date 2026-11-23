import crypto from 'crypto';
import type express from 'express';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  onLimitExceeded?: (req: express.Request, ip: string) => void;
}

interface Bucket {
  timestamps: number[];
}

/**
 * Masks the trailing octet / segments of an IP address before storing in audit logs.
 */
export function anonymizeClientIp(rawIp: string | undefined): string {
  if (!rawIp) return 'unknown';
  const cleaned = rawIp.replace(/^::ffff:/, '').trim();
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (cleaned.includes(':')) {
    const segs = cleaned.split(':').filter(Boolean);
    return segs.length > 0 ? `${segs.slice(0, 3).join(':')}::` : 'ipv6-local';
  }
  return 'masked';
}

export function extractClientIp(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Applies hardened FinTech HTTP security headers while preserving iframe preview compatibility.
 */
export function applySecurityHeaders(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const requestId =
    typeof req.headers['x-request-id'] === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(req.headers['x-request-id'])
      ? req.headers['x-request-id']
      : crypto.randomUUID();

  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Prevent intermediate caching of authenticated or sensitive API responses
  if (
    req.path.startsWith('/api/auth') ||
    req.path.startsWith('/api/alerts') ||
    req.path.startsWith('/api/watchlist') ||
    req.path.startsWith('/api/security') ||
    req.path.startsWith('/api/portfolio')
  ) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
  }

  next();
}

/**
 * In-memory sliding-window rate limiter per client IP.
 */
export function createRateLimiter(options: RateLimitOptions): express.RequestHandler {
  const buckets = new Map<string, Bucket>();
  const prefix = options.keyPrefix || 'api';

  // Periodic cleanup to keep memory bounded
  const sweep = setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [key, bucket] of buckets.entries()) {
      const fresh = bucket.timestamps.filter((ts) => ts > cutoff);
      if (fresh.length === 0) buckets.delete(key);
      else bucket.timestamps = fresh;
    }
  }, Math.max(30_000, options.windowMs));
  sweep.unref?.();

  return (req, res, next) => {
    const ip = extractClientIp(req);
    const key = `${prefix}:${ip}`;
    const now = Date.now();
    const cutoff = now - options.windowMs;

    const bucket = buckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

    if (bucket.timestamps.length >= options.maxRequests) {
      const oldest = bucket.timestamps[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      options.onLimitExceeded?.(req, ip);
      res.status(429).json({
        error: 'Too many requests. Please wait a moment before retrying.',
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);

    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.maxRequests - bucket.timestamps.length)));
    next();
  };
}

/**
 * Verifies Origin / Host match on cookie-authenticated state-changing API requests (CSRF defense).
 * Requests carrying an explicit Authorization Bearer token or X-Requested-With custom header pass.
 */
export function verifyMutationOrigin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  // Bearer token auth or explicit X-Requested-With header is immune to simple cross-site form CSRF
  const hasBearer = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ');
  const hasCustomHeader = typeof req.headers['x-requested-with'] === 'string' && req.headers['x-requested-with'].length > 0;
  const hasSessionCookie = typeof req.headers.cookie === 'string' && req.headers.cookie.includes('financia_session=');

  if (!hasSessionCookie || hasBearer || hasCustomHeader) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const expectedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .toLowerCase();

    if (expectedHost && originHost === expectedHost) {
      next();
      return;
    }
  } catch {
    // Malformed origin rejected below
  }

  res.status(403).json({ error: 'Cross-origin state-changing request blocked by security policy.' });
}

/**
 * Centralized sanitized API error handler that never leaks internal stack traces.
 */
export function apiErrorHandler(
  err: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
): void {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const message =
    safeStatus === 413
      ? 'Request payload exceeds maximum allowed size.'
      : safeStatus === 400
        ? 'Malformed JSON request body.'
        : 'An unexpected server error occurred.';
  res.status(safeStatus).json({ error: message });
}
