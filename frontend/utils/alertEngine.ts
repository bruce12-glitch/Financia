import type { AlertPriority } from './alertSoundEngine';

export type AlertCondition = 'above' | 'below';
export type { AlertPriority };

export interface PriceAlert {
  id: string;
  ticker: string;
  companyName: string;
  targetPrice: number;
  currentPriceAtSet: number;
  condition: AlertCondition;
  priority?: AlertPriority;
  notificationsEnabled: boolean;
  note?: string;
  createdAt: string;
  triggered?: boolean;
}

export interface AlertValidationResult {
  valid: boolean;
  parsedPrice?: number;
  percentDelta?: number;
  error?: string;
}

export const ALERTS_STORAGE_KEY = 'financia_price_alerts_v1';

export function computeTargetPercentDelta(currentPrice: number, targetPrice: number): number {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0 || !Number.isFinite(targetPrice)) {
    return 0;
  }
  return Number((((targetPrice - currentPrice) / currentPrice) * 100).toFixed(2));
}

export function validatePriceAlertInput(params: {
  targetPriceRaw: string;
  currentPrice: number;
}): AlertValidationResult {
  const trimmed = params.targetPriceRaw.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a target price threshold.' };
  }

  const numeric = Number(trimmed.replace(/,/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { valid: false, error: 'Target price must be a positive number greater than 0.' };
  }

  if (numeric > 10_000_000) {
    return { valid: false, error: 'Target price exceeds supported threshold limits.' };
  }

  return {
    valid: true,
    parsedPrice: Number(numeric.toFixed(4)),
    percentDelta: computeTargetPercentDelta(params.currentPrice, numeric),
  };
}

export function evaluateAlertTrigger(alert: PriceAlert, livePrice: number): boolean {
  if (!alert.notificationsEnabled || alert.triggered) return false;
  if (!Number.isFinite(livePrice) || livePrice <= 0) return false;
  if (alert.condition === 'above') {
    return livePrice >= alert.targetPrice;
  }
  return livePrice <= alert.targetPrice;
}

export function parseFormattedPrice(raw: string): number {
  const cleaned = String(raw || '').replace(/[^0-9.]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}

export function loadSavedAlerts(): PriceAlert[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistAlerts(alerts: PriceAlert[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // Ignore storage quota errors silently
  }
}
