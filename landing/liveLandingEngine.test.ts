import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBullionSummary,
  computePeerSpreadPct,
  computeRangePositionPct,
  computeYieldCurveAnalytics,
  FEATURED_AMFI_SCHEMES,
  formatAumCrores,
  formatDecimalPercent,
  formatDirectPercent,
  normalizeNavComparisonSeries,
  normalizeSingleNavSeries,
} from './liveLandingEngine';

test('FEATURED_AMFI_SCHEMES contains unique numeric AMFI scheme codes across pillars', () => {
  assert.ok(FEATURED_AMFI_SCHEMES.length >= 6);
  const codes = new Set(FEATURED_AMFI_SCHEMES.map((s) => s.schemeCode));
  assert.equal(codes.size, FEATURED_AMFI_SCHEMES.length);
  for (const scheme of FEATURED_AMFI_SCHEMES) {
    assert.ok(Number.isInteger(scheme.schemeCode) && scheme.schemeCode > 100000);
  }
});

test('normalizeNavComparisonSeries aligns shared dates chronologically and rebases to 100', () => {
  const scheme = [
    { nav_date: '2026-11-18', nav: 110 },
    { nav_date: '2026-11-17', nav: 105 },
    { nav_date: '2026-11-16', nav: 100 },
  ];
  const bench = [
    { nav_date: '2026-11-18', nav: 204 },
    { nav_date: '2026-11-17', nav: 202 },
    { nav_date: '2026-11-16', nav: 200 },
    { nav_date: '2026-11-15', nav: 199 },
  ];

  const result = normalizeNavComparisonSeries(scheme, bench);
  assert.ok(result);
  assert.equal(result.points.length, 3);
  assert.equal(result.startDate, '2026-11-16');
  assert.equal(result.endDate, '2026-11-18');
  assert.equal(result.points[0].schemeIndex, 100);
  assert.equal(result.points[0].benchmarkIndex, 100);
  assert.equal(result.schemeReturnPct, 10);
  assert.equal(result.benchmarkReturnPct, 2);
  assert.equal(result.spreadPct, 8);
});

test('formatAumCrores and percentage formatters handle valid and null values cleanly', () => {
  assert.equal(formatAumCrores(9854461.33), '₹98,545 Cr');
  assert.equal(formatAumCrores(null), '—');
  assert.equal(formatDecimalPercent(0.1254), '+12.54%');
  assert.equal(formatDecimalPercent(-0.106), '-10.60%');
  assert.equal(formatDecimalPercent(undefined), '—');
  assert.equal(formatDirectPercent(-0.1525), '-0.15%');
});

test('computeYieldCurveAnalytics computes 2s10s and 3m10y spreads and regimes accurately', () => {
  const normal = computeYieldCurveAnalytics([
    { label: '3M', yieldPct: 4.34 },
    { label: '2Y', yieldPct: 4.8 },
    { label: '10Y', yieldPct: 5.07 },
  ]);
  assert.equal(normal.spread2s10sBps, 27);
  assert.equal(normal.spread3m10yBps, 73);
  assert.equal(normal.regime, 'Normal');

  const inverted = computeYieldCurveAnalytics([
    { label: '2Y', yieldPct: 4.95 },
    { label: '10Y', yieldPct: 4.5 },
  ]);
  assert.equal(inverted.spread2s10sBps, -45);
  assert.equal(inverted.regime, 'Inverted');
});

test('computeBullionSummary derives exact period return, high, and low from OHLCV candles', () => {
  const summary = computeBullionSummary([
    { time: '00:00', open: 3800, high: 3840, low: 3780, close: 3800, volume: 100 },
    { time: '00:00', open: 3800, high: 3920, low: 3790, close: 3914, volume: 120 },
  ]);
  assert.ok(summary);
  assert.equal(summary.latestClose, 3914);
  assert.equal(summary.periodHigh, 3920);
  assert.equal(summary.periodLow, 3780);
  assert.equal(summary.periodChangePct, 3);
  assert.equal(summary.candleCount, 2);
});

test('normalizeSingleNavSeries, computePeerSpreadPct, and computeRangePositionPct calculate cleanly', () => {
  const single = normalizeSingleNavSeries([
    { nav_date: '2026-10-08', nav: 11.0 },
    { nav_date: '2026-10-01', nav: 10.0 },
  ]);
  assert.ok(single);
  assert.equal(single.points.length, 2);
  assert.equal(single.schemeReturnPct, 10);

  assert.equal(computePeerSpreadPct(0.218, 0.173), 4.5);
  assert.equal(computePeerSpreadPct(null, 0.17), null);

  assert.equal(computeRangePositionPct(3900, 3800, 4000), 50);
  assert.equal(computeRangePositionPct(4100, 3800, 4000), 100);
  assert.equal(computeRangePositionPct(3700, 3800, 4000), 0);
});
