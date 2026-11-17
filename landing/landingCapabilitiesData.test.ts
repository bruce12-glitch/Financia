import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptCandlesForTimeframe,
  computeCandleEma,
  LANDING_AGENT_SAMPLES,
  LANDING_SECTOR_PULSES,
} from './landingCapabilitiesData';
import { SUPERCHART_INSTRUMENTS } from '../frontend/data/tradingViewData';

test('adaptCandlesForTimeframe preserves candle validity across all timeframes', () => {
  const base = SUPERCHART_INSTRUMENTS[0].candles;
  for (const tf of ['15m', '1h', '4h', '1D'] as const) {
    const adapted = adaptCandlesForTimeframe(base, tf);
    assert.equal(adapted.length, base.length);
    for (const c of adapted) {
      assert.ok(c.high >= Math.max(c.open, c.close));
      assert.ok(c.low <= Math.min(c.open, c.close));
      assert.ok(c.low > 0);
    }
  }
});

test('computeCandleEma returns smoothed EMA points matching candle count', () => {
  const base = SUPERCHART_INSTRUMENTS[0].candles;
  const ema = computeCandleEma(base, 5);
  assert.equal(ema.length, base.length);
  assert.equal(ema[0], base[0].close);
  assert.ok(ema.every((v) => Number.isFinite(v) && v > 0));
});

test('LANDING_AGENT_SAMPLES and LANDING_SECTOR_PULSES provide complete showcase entries', () => {
  assert.ok(LANDING_AGENT_SAMPLES.length >= 4);
  assert.ok(LANDING_SECTOR_PULSES.length >= 4);
  for (const sample of LANDING_AGENT_SAMPLES) {
    assert.ok(sample.convictionScore >= 70 && sample.convictionScore <= 100);
    assert.ok(sample.evidencePoints.length >= 3);
  }
});
