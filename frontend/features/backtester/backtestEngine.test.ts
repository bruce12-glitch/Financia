import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKTEST_PRESET_LEGS,
  computeBrinsonAttribution,
  runMultiAssetBacktest,
} from './backtestEngine.ts';

test('runMultiAssetBacktest produces consistent timeline, ratios, stress tests, and Monte Carlo percentiles', () => {
  const report = runMultiAssetBacktest({
    title: 'Core India + Global 65/20/15',
    initialCapital: 500000,
    monthlySip: 25000,
    horizonYears: 5,
    rebalanceFrequency: 'ANNUAL',
    benchmarkSymbol: 'NIFTY50',
    allocations: BACKTEST_PRESET_LEGS,
  });

  assert.equal(report.timeline.length, 61);
  assert.equal(report.totalInvested, 500000 + 25000 * 60);
  assert.ok(report.finalValue > report.totalInvested);
  assert.equal(report.rebalanceEventsCount, 5);
  assert.equal(report.regimeStressTests.length, 4);
  assert.equal(report.monteCarloFan.length, 6);

  // Monte Carlo percentiles must be monotonically ordered at terminal year
  const terminal = report.monteCarloFan[report.monteCarloFan.length - 1];
  assert.ok(terminal.p10 <= terminal.p25);
  assert.ok(terminal.p25 <= terminal.p50);
  assert.ok(terminal.p50 <= terminal.p75);
  assert.ok(terminal.p75 <= terminal.p90);
});

test('computeBrinsonAttribution preserves Allocation + Selection + Interaction === Total Effect per bucket', () => {
  const { rows } = computeBrinsonAttribution(BACKTEST_PRESET_LEGS);
  assert.equal(rows.length, 4);
  for (const row of rows) {
    const sum = Number(
      (row.allocationEffectPct + row.selectionEffectPct + row.interactionEffectPct).toFixed(2)
    );
    assert.ok(
      Math.abs(sum - row.totalEffectPct) <= 0.02,
      `Brinson sum mismatch for ${row.assetClass}: ${sum} vs ${row.totalEffectPct}`
    );
  }
});
