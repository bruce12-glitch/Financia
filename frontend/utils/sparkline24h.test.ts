import test from 'node:test';
import assert from 'node:assert/strict';
import {
  build24hSparklineSeries,
  buildSparklineSvgGeometry,
  buildWatchlistCsv,
  computePortfolioAllocationPlan,
  computeSipProjection,
} from './sparkline24h.ts';
import { INITIAL_STOCKS } from '../data/marketData.ts';

test('build24hSparklineSeries anchors open and live close cleanly and blends live ticks', () => {
  const sample = INITIAL_STOCKS[0];
  const base = build24hSparklineSeries(sample);
  assert.equal(base.points.length, 24);
  assert.ok(base.min > 0 && base.max >= base.min);
  assert.ok(Math.abs(base.close - sample.price) < 0.01);
  assert.ok(base.rangePositionPct >= 0 && base.rangePositionPct <= 100);

  const withTicks = build24hSparklineSeries(sample, [sample.price * 1.003, sample.price * 1.006]);
  assert.equal(withTicks.points.length, 24);
  assert.ok(Math.abs(withTicks.close - sample.price * 1.006) < 0.01);
});

test('buildSparklineSvgGeometry outputs bounded SVG paths and handles invalid input', () => {
  assert.equal(buildSparklineSvgGeometry([100], 96, 30), null);
  const geom = buildSparklineSvgGeometry([100, 102, 101, 105, 108], 96, 30, 3, 4);
  assert.ok(geom);
  assert.ok(geom.linePath.startsWith('M3,'));
  assert.ok(geom.areaPath.endsWith('Z'));
  assert.equal(geom.isPositive, true);
  assert.ok(geom.lastX <= 93 && geom.lastX >= 3);
  assert.ok(geom.lastY <= 26 && geom.lastY >= 4);
});

test('buildWatchlistCsv produces valid CSV with header and all watchlist rows', () => {
  const csv = buildWatchlistCsv(INITIAL_STOCKS.slice(0, 3));
  const lines = csv.split('\n');
  assert.equal(lines.length, 4);
  assert.ok(lines[0].includes('Ticker,Instrument Name,Category'));
  assert.ok(lines[1].startsWith(`${INITIAL_STOCKS[0].ticker},`));
});

test('computeSipProjection accurately compounds Step-Up SIP and Direct plan fee savings', () => {
  const res = computeSipProjection({
    monthlySipInr: 25000,
    annualStepUpPct: 10,
    years: 10,
    expectedAnnualReturnPct: 14,
    initialLumpsumInr: 100000,
    directTerPct: 0.6,
    regularTerPct: 1.65,
  });

  assert.equal(res.yearlySnapshots.length, 10);
  assert.ok(res.directCorpusInr > res.totalInvestedInr);
  assert.ok(res.directCorpusInr > res.regularCorpusInr);
  assert.equal(res.directFeeSavingsInr, res.directCorpusInr - res.regularCorpusInr);
  assert.ok(res.directFeeSavingsInr > 100000);
});

test('computePortfolioAllocationPlan normalizes weights and computes multi-asset risk metrics', () => {
  const plan = computePortfolioAllocationPlan(1000000, [
    { id: 'equity_mf', label: 'Equity MF', weightPct: 50, expectedReturnPct: 14.5, volatilityPct: 14.0, colorHex: '#2563eb' },
    { id: 'gold', label: 'Gold', weightPct: 25, expectedReturnPct: 12.0, volatilityPct: 13.5, colorHex: '#f59e0b' },
    { id: 'debt', label: 'Debt', weightPct: 25, expectedReturnPct: 7.4, volatilityPct: 4.2, colorHex: '#059669' },
  ]);

  const totalNorm = plan.normalizedBuckets.reduce((s, b) => s + b.normalizedWeightPct, 0);
  assert.ok(Math.abs(totalNorm - 100) < 0.2);
  assert.ok(plan.weightedReturnPct > 11 && plan.weightedReturnPct < 13);
  assert.ok(plan.weightedVolatilityPct < 12);
  assert.ok(plan.projected5YCorpusInr > 1600000);
});
