import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import {
  anonymizeClientIp,
  applySecurityHeaders,
  createRateLimiter,
  verifyMutationOrigin,
} from './middleware/securityMiddleware.ts';
import { createScreenerRouter } from './routes/screenerRoutes.ts';

function startTestApp(app: express.Express): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test('anonymizeClientIp masks IPv4 last octet and IPv6 suffix', () => {
  assert.equal(anonymizeClientIp('203.0.113.42'), '203.0.113.0');
  assert.equal(anonymizeClientIp('::ffff:198.51.100.77'), '198.51.100.0');
  assert.equal(anonymizeClientIp('2001:db8:85a3:0:0:8a2e:370:7334'), '2001:db8:85a3::');
  assert.equal(anonymizeClientIp(undefined), 'unknown');
});

test('applySecurityHeaders attaches hardened FinTech headers and X-Request-Id without blocking iframe', async () => {
  const app = express();
  app.use(applySecurityHeaders);
  app.get('/api/auth/ping', (_req, res) => res.json({ ok: true }));

  const { server, baseUrl } = await startTestApp(app);
  try {
    const res = await fetch(`${baseUrl}/api/auth/ping`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('cache-control'), 'no-store, max-age=0');
    assert.ok(res.headers.get('x-request-id'));
    assert.equal(res.headers.get('x-frame-options'), null);
  } finally {
    server.close();
  }
});

test('createRateLimiter blocks excess requests with 429 and Retry-After', async () => {
  const app = express();
  app.use(createRateLimiter({ windowMs: 10_000, maxRequests: 2, keyPrefix: 'test' }));
  app.get('/limited', (_req, res) => res.json({ ok: true }));

  const { server, baseUrl } = await startTestApp(app);
  try {
    const r1 = await fetch(`${baseUrl}/limited`);
    const r2 = await fetch(`${baseUrl}/limited`);
    const r3 = await fetch(`${baseUrl}/limited`);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429);
    assert.ok(Number(r3.headers.get('retry-after')) >= 1);
  } finally {
    server.close();
  }
});

test('verifyMutationOrigin blocks cross-origin cookie-authenticated POST and allows same-origin or Bearer', async () => {
  const app = express();
  app.use(express.json());
  app.use(verifyMutationOrigin);
  app.post('/mutate', (_req, res) => res.json({ ok: true }));

  const { server, baseUrl } = await startTestApp(app);
  try {
    const blocked = await fetch(`${baseUrl}/mutate`, {
      method: 'POST',
      headers: {
        cookie: 'financia_session=abc',
        origin: 'https://evil.example.com',
      },
    });
    assert.equal(blocked.status, 403);

    const allowedBearer = await fetch(`${baseUrl}/mutate`, {
      method: 'POST',
      headers: {
        cookie: 'financia_session=abc',
        origin: 'https://evil.example.com',
        authorization: 'Bearer token123',
      },
    });
    assert.equal(allowedBearer.status, 200);
  } finally {
    server.close();
  }
});

test('screenerRoutes validates inputs and returns server-computed multi-fund comparison matrix', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', createScreenerRouter());

  const { server, baseUrl } = await startTestApp(app);
  try {
    const badCompare = await fetch(`${baseUrl}/api/screener/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['QQQ'] }),
    });
    assert.equal(badCompare.status, 400);

    const okCompare = await fetch(`${baseUrl}/api/screener/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['QQQ', 'PPFAS', 'GOLDBEES'] }),
    });
    assert.equal(okCompare.status, 200);
    const data = (await okCompare.json()) as { comparison: { items: unknown[]; winners: { lowestExpense: string } } };
    assert.equal(data.comparison.items.length, 3);
    assert.equal(data.comparison.winners.lowestExpense, 'QQQ');

    const unauthAudit = await fetch(`${baseUrl}/api/security/audit`);
    assert.equal(unauthAudit.status, 401);
  } finally {
    server.close();
  }
});
