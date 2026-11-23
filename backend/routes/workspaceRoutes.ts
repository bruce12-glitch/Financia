import { Router } from 'express';
import crypto from 'crypto';
import {
  PriceAlert,
  validatePriceAlertInput,
} from '../../frontend/utils/alertEngine.ts';
import { normalizeAlertPriority } from '../../frontend/utils/alertSoundEngine.ts';
import {
  validateInquiryForm,
  validateTickerInput,
} from '../../frontend/utils/stockEngine.ts';
import { getAuthenticatedUser } from '../services/authService.ts';
import { securityAuditLog } from '../services/auditLogService.ts';
import { extractClientIp } from '../middleware/securityMiddleware.ts';
import {
  financiaStore,
  PersistenceStore,
  ResearchInquiry,
} from '../services/persistenceService.ts';

export function createWorkspaceRouter(store: PersistenceStore = financiaStore): Router {
  const router = Router();

  // --- Price Alerts CRUD (Authenticated) ---
  router.get('/alerts', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required to access saved alerts.' });
      return;
    }
    res.json({ alerts: store.getUserAlerts(user.id) });
  });

  router.post('/alerts', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required to save price alerts.' });
      return;
    }

    const body = (req.body || {}) as {
      ticker?: string;
      companyName?: string;
      targetPrice?: number | string;
      currentPriceAtSet?: number;
      condition?: string;
      priority?: string;
      notificationsEnabled?: boolean;
      note?: string;
    };

    const tickerCheck = validateTickerInput(String(body.ticker || ''));
    if (!tickerCheck.valid) {
      res.status(400).json({ error: tickerCheck.error || 'Invalid ticker symbol.' });
      return;
    }

    const currentPrice = Number(body.currentPriceAtSet);
    const safeCurrentPrice = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 100;
    const priceValidation = validatePriceAlertInput({
      targetPriceRaw: String(body.targetPrice ?? ''),
      currentPrice: safeCurrentPrice,
    });
    if (!priceValidation.valid || typeof priceValidation.parsedPrice !== 'number') {
      res.status(400).json({ error: priceValidation.error || 'Invalid target price.' });
      return;
    }

    const condition = body.condition === 'below' ? 'below' : 'above';
    const alert: PriceAlert = {
      id: `alrt_${crypto.randomUUID().slice(0, 10)}`,
      ticker: tickerCheck.normalized,
      companyName: String(body.companyName || `${tickerCheck.normalized} Holdings`).trim().slice(0, 80),
      targetPrice: priceValidation.parsedPrice,
      currentPriceAtSet: safeCurrentPrice,
      condition,
      priority: normalizeAlertPriority(body.priority),
      notificationsEnabled: body.notificationsEnabled !== false,
      note: typeof body.note === 'string' ? body.note.trim().slice(0, 200) : undefined,
      createdAt: new Date().toISOString(),
      triggered: false,
    };

    const alerts = store.addUserAlert(user.id, alert);
    securityAuditLog.record({
      event: 'alerts.create',
      userId: user.id,
      rawIp: extractClientIp(req),
      detail: `Created ${alert.priority} alert for ${alert.ticker} (${alert.condition} ${alert.targetPrice})`,
    });
    res.status(201).json({ alert, alerts });
  });

  router.patch('/alerts/:id', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required to update alerts.' });
      return;
    }

    const alertId = String(req.params.id || '').trim();
    const body = (req.body || {}) as {
      notificationsEnabled?: boolean;
      triggered?: boolean;
      targetPrice?: number;
      note?: string;
      priority?: string;
    };

    const patch: Partial<
      Pick<PriceAlert, 'notificationsEnabled' | 'triggered' | 'targetPrice' | 'note' | 'priority'>
    > = {};
    if (typeof body.notificationsEnabled === 'boolean') {
      patch.notificationsEnabled = body.notificationsEnabled;
    }
    if (typeof body.triggered === 'boolean') {
      patch.triggered = body.triggered;
    }
    if (typeof body.targetPrice === 'number' && Number.isFinite(body.targetPrice) && body.targetPrice > 0) {
      patch.targetPrice = Number(body.targetPrice.toFixed(4));
    }
    if (typeof body.note === 'string') {
      patch.note = body.note.trim().slice(0, 200);
    }
    if (typeof body.priority === 'string') {
      patch.priority = normalizeAlertPriority(body.priority);
    }

    const updated = store.updateUserAlert(user.id, alertId, patch);
    if (!updated) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }
    res.json({ alert: updated });
  });

  router.delete('/alerts/:id', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required to delete alerts.' });
      return;
    }

    const alertId = String(req.params.id || '').trim();
    const removed = store.deleteUserAlert(user.id, alertId);
    if (!removed) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }
    securityAuditLog.record({
      event: 'alerts.delete',
      userId: user.id,
      rawIp: extractClientIp(req),
      detail: `Deleted price alert ${alertId}`,
    });
    res.json({ ok: true, alerts: store.getUserAlerts(user.id) });
  });

  // --- Watchlist & Side-by-Side Comparison Tickers (Authenticated) ---
  router.get('/watchlist', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required to access saved watchlist.' });
      return;
    }
    res.json({ watchlist: store.getUserWatchlist(user.id) });
  });

  router.put('/watchlist', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required to update watchlist.' });
      return;
    }

    const body = (req.body || {}) as {
      primaryTicker?: string;
      watchlistTickers?: unknown;
      comparisonTickers?: unknown;
    };

    if (body.primaryTicker !== undefined) {
      const check = validateTickerInput(String(body.primaryTicker));
      if (!check.valid) {
        res.status(400).json({ error: check.error || 'Invalid primary ticker.' });
        return;
      }
    }

    const watchlist = store.setUserWatchlist(user.id, {
      primaryTicker: typeof body.primaryTicker === 'string' ? body.primaryTicker : undefined,
      watchlistTickers: Array.isArray(body.watchlistTickers)
        ? body.watchlistTickers.map(String)
        : undefined,
      comparisonTickers: Array.isArray(body.comparisonTickers)
        ? body.comparisonTickers.map(String)
        : undefined,
    });
    res.json({ watchlist });
  });

  // --- Institutional Research Inquiries ---
  router.post('/inquiries', (req, res) => {
    const body = (req.body || {}) as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };

    const validation = validateInquiryForm({
      name: String(body.name || ''),
      email: String(body.email || ''),
      phone: String(body.phone || ''),
      message: String(body.message || ''),
    });

    if (!validation.valid) {
      const firstErr =
        validation.errors.name ||
        validation.errors.email ||
        validation.errors.phone ||
        validation.errors.message ||
        'Invalid inquiry fields.';
      res.status(400).json({ error: firstErr, fieldErrors: validation.errors });
      return;
    }

    const user = getAuthenticatedUser(req);
    const inquiry: ResearchInquiry = {
      id: `inq_${crypto.randomUUID().slice(0, 10)}`,
      userId: user?.id || null,
      name: String(body.name).trim().slice(0, 100),
      email: String(body.email).trim().slice(0, 160),
      phone: String(body.phone).trim().slice(0, 40),
      message: String(body.message).trim().slice(0, 2000),
      status: 'received',
      createdAt: new Date().toISOString(),
    };

    store.addInquiry(inquiry);
    res.status(201).json({ inquiry });
  });

  router.get('/inquiries', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required to list inquiries.' });
      return;
    }
    res.json({ inquiries: store.listUserInquiries(user.id) });
  });

  return router;
}
