import { Router } from 'express';
import crypto from 'crypto';
import {
  PriceAlert,
  validatePriceAlertInput,
} from '../../frontend/utils/alertEngine.ts';
import {
  validateInquiryForm,
  validateTickerInput,
} from '../../frontend/utils/stockEngine.ts';
import { getAuthenticatedUser } from '../services/authService.ts';
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
      notificationsEnabled: body.notificationsEnabled !== false,
      note: typeof body.note === 'string' ? body.note.trim().slice(0, 200) : undefined,
      createdAt: new Date().toISOString(),
      triggered: false,
    };

    const alerts = store.addUserAlert(user.id, alert);
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
    };

    const patch: Partial<Pick<PriceAlert, 'notificationsEnabled' | 'triggered' | 'targetPrice' | 'note'>> = {};
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

    const updated = store.updateUserAlert(user.id, alertId, patch);
    if (!updated) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }
