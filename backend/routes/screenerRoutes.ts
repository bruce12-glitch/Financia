import { Router } from 'express';
import {
  filterAndSortScreenerFunds,
  SCREENER_FUNDS,
  ScreenerInstrumentType,
} from '../../frontend/utils/screenerEngine.ts';
import {
  buildMultiFundComparison,
  computeFundValidationScore,
  getFundIntelligence,
} from '../../frontend/utils/fundIntelligenceEngine.ts';
import { getAuthenticatedUser } from '../services/authService.ts';
import { securityAuditLog } from '../services/auditLogService.ts';
import { extractClientIp } from '../middleware/securityMiddleware.ts';

const SYMBOL_REGEX = /^[A-Za-z0-9._-]{1,20}$/;

export function createScreenerRouter(): Router {
  const router = Router();

  // GET /api/screener/funds — Filtered & enriched Mutual Funds and ETFs
  router.get('/screener/funds', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : '';
    const rawType = typeof req.query.type === 'string' ? req.query.type : 'ALL';
    const instrumentType: 'ALL' | ScreenerInstrumentType =
      rawType === 'ETF' || rawType === 'Mutual Fund' ? rawType : 'ALL';
    const category = typeof req.query.category === 'string' && req.query.category.length <= 50 ? req.query.category : 'All';
    const rawSort = typeof req.query.sort === 'string' ? req.query.sort : 'aum';
    const sortBy: 'aum' | 'return1y' | 'return3y' | 'expense' | 'change' =
      rawSort === 'return1y' || rawSort === 'return3y' || rawSort === 'expense' || rawSort === 'change'
        ? rawSort
        : 'aum';

    const filtered = filterAndSortScreenerFunds(SCREENER_FUNDS, {
      query: q,
      instrumentType,
      category,
      sortBy,
    });

    const enriched = filtered.map((fund) => {
      const intel = getFundIntelligence(fund);
      const validation = computeFundValidationScore(fund, intel);
      return { fund, intel, validation };
    });

    res.json({
      count: enriched.length,
      items: enriched,
    });
  });

  // GET /api/screener/funds/:symbol — Complete single fund/ETF dossier
  router.get('/screener/funds/:symbol', (req, res) => {
    const rawSymbol = String(req.params.symbol || '').trim().toUpperCase();
    if (!SYMBOL_REGEX.test(rawSymbol)) {
      res.status(400).json({ error: 'Invalid fund or ETF symbol format.' });
      return;
    }

    const fund = SCREENER_FUNDS.find((f) => f.symbol.toUpperCase() === rawSymbol || f.id.toUpperCase() === rawSymbol);
    if (!fund) {
      res.status(404).json({ error: `Fund or ETF '${rawSymbol}' not found.` });
      return;
    }

    const intel = getFundIntelligence(fund);
    const validation = computeFundValidationScore(fund, intel);
    res.json({ fund, intel, validation });
  });

  // POST /api/screener/compare — Server-validated multi-fund & ETF side-by-side comparison matrix
  router.post('/screener/compare', (req, res) => {
    const body = (req.body || {}) as { ids?: unknown; symbols?: unknown };
    const rawList = Array.isArray(body.ids)
      ? body.ids
      : Array.isArray(body.symbols)
        ? body.symbols
        : null;
    if (!rawList) {
      res.status(400).json({ error: 'Request body must include an "ids" array of 2 to 4 fund or ETF symbols.' });
      return;
    }

    const normalizedIds: string[] = [];
    for (const raw of rawList) {
      if (typeof raw !== 'string') continue;
      const sym = raw.trim().toUpperCase();
      if (!SYMBOL_REGEX.test(sym)) continue;
      if (!normalizedIds.includes(sym)) normalizedIds.push(sym);
      if (normalizedIds.length >= 4) break;
    }

    if (normalizedIds.length < 2) {
      res.status(400).json({ error: 'Select at least 2 valid unique funds or ETFs to compare.' });
      return;
    }

    const matchedFunds = normalizedIds
      .map((sym) => SCREENER_FUNDS.find((f) => f.symbol.toUpperCase() === sym || f.id.toUpperCase() === sym))
      .filter((f): f is NonNullable<typeof f> => Boolean(f));

    if (matchedFunds.length < 2) {
      res.status(404).json({ error: 'Could not resolve at least 2 matching funds or ETFs from the screener universe.' });
      return;
    }

    const comparison = buildMultiFundComparison(matchedFunds);
    const user = getAuthenticatedUser(req);
    if (user) {
      securityAuditLog.record({
        event: 'screener.compare',
        userId: user.id,
        rawIp: extractClientIp(req),
        detail: `Compared ${matchedFunds.map((f) => f.symbol).join(' vs ')}`,
      });
    }

    res.json({
      computedAt: new Date().toISOString(),
      comparison,
    });
  });

  // GET /api/security/audit — Authenticated user security activity & protection posture
  router.get('/security/audit', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required to inspect security audit activity.' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      protections: {
        passwordHashing: 'scrypt (64-byte derived key, per-user random salt, timing-safe verify)',
        sessionSigning: 'HMAC-SHA256 signed tokens with revocation list',
        rateLimiting: 'Sliding-window IP throttling on auth & API endpoints',
        csrfDefense: 'Same-origin verification on cookie-authenticated mutations',
        transportHeaders: 'nosniff, strict referrer, permissions-policy, no-store on private APIs',
        payloadAudit: '64 KB JSON body cap, strict symbol validation & masked-IP audit log',
      },
      events: securityAuditLog.listForUser(user.id, 15),
    });
  });

  return router;
}
