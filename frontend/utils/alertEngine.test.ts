import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTargetPercentDelta,
  evaluateAlertTrigger,
  parseFormattedPrice,
  PriceAlert,
  validatePriceAlertInput,
} from './alertEngine';

test('validatePriceAlertInput rejects empty, zero, and negative thresholds cleanly', () => {
  assert.equal(validatePriceAlertInput({ targetPriceRaw: '', currentPrice: 138.6 }).valid, false);
  assert.equal(validatePriceAlertInput({ targetPriceRaw: '0', currentPrice: 138.6 }).valid, false);
  assert.equal(validatePriceAlertInput({ targetPriceRaw: '-25', currentPrice: 138.6 }).valid, false);
  assert.equal(validatePriceAlertInput({ targetPriceRaw: 'abc', currentPrice: 138.6 }).valid, false);

  const validRes = validatePriceAlertInput({ targetPriceRaw: '152.46', currentPrice: 138.6 });
  assert.equal(validRes.valid, true);
  assert.equal(validRes.parsedPrice, 152.46);
  assert.equal(validRes.percentDelta, 10);
});

test('evaluateAlertTrigger respects condition direction, notification toggle, and triggered flag', () => {
  const aboveAlert: PriceAlert = {
    id: 'a1',
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    targetPrice: 145,
    currentPriceAtSet: 138.6,
    condition: 'above',
    notificationsEnabled: true,
    createdAt: '2026-11-16T16:45:00.000Z',
  };

  assert.equal(evaluateAlertTrigger(aboveAlert, 144.99), false);
  assert.equal(evaluateAlertTrigger(aboveAlert, 145.0), true);
  assert.equal(evaluateAlertTrigger({ ...aboveAlert, notificationsEnabled: false }, 150), false);
  assert.equal(evaluateAlertTrigger({ ...aboveAlert, triggered: true }, 150), false);

  const belowAlert: PriceAlert = {
    ...aboveAlert,
    id: 'a2',
    targetPrice: 130,
    condition: 'below',
  };
  assert.equal(evaluateAlertTrigger(belowAlert, 130.5), false);
  assert.equal(evaluateAlertTrigger(belowAlert, 129.8), true);
});

test('computeTargetPercentDelta and parseFormattedPrice compute signed deltas and clean spot prices', () => {
  assert.equal(computeTargetPercentDelta(100, 115), 15);
  assert.equal(computeTargetPercentDelta(200, 180), -10);
  assert.equal(parseFormattedPrice('25,291.10'), 25291.1);
  assert.equal(parseFormattedPrice('$138.60'), 138.6);
});
