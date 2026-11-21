import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_FUNDS } from './screenerEngine';
import {
  buildAllocationProjectionCsv,
  buildBulkDataCsv,
  buildBulkInstrumentRows,
  buildHistoricalPortfolioReplay,
  buildProjectedPortfolioPerformance,
  computeAggregatedBasketSummary,
  computeMaxSharpeWeights,
  normalizeAllocationWeights,
  sortBulkInstrumentRows,
} from './portfolioAllocatorEngine';

test('normalizeAllocationWeights sums strictly to 100% and handles zero/unbalanced inputs', () => {
  const norm = normalizeAllocationWeights(['QQQ', 'GOLDBEES', 'HDFCCORP'], {
    QQQ: 50,
    GOLDBEES: 50,
    HDFCCORP: 100,
  });
  const total = Object.values(norm).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(total - 100) < 0.05);
  assert.equal(norm['HDFCCORP'], 50);
  assert.equal(norm['QQQ'], 25);

  const zeroFallback = normalizeAllocationWeights(['QQQ', 'GOLDBEES'], { QQQ: 0, GOLDBEES: 0 });
  assert.equal(zeroFallback['QQQ'], 50);
  assert.equal(zeroFallback['GOLDBEES'], 50);
});

test('computeMaxSharpeWeights returns valid integer weights summing to 100%', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['QQQ', 'GOLDBEES', 'PPFAS', 'HDFCCORP'].includes(f.symbol));
  const weights = computeMaxSharpeWeights(basket);
  const sum = Object.values(weights).reduce((s, v) => s + v, 0);
  assert.equal(sum, 100);
  for (const f of basket) {
    assert.ok(weights[f.symbol] >= 5 && weights[f.symbol] <= 95);
  }
});

test('buildHistoricalPortfolioReplay replays actual monthly returns chronologically with valid max drawdown', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['GOLDBEES', 'PPFAS', 'NIFTYBEES'].includes(f.symbol));
  const replay = buildHistoricalPortfolioReplay(
    basket,
    { GOLDBEES: 40, PPFAS: 35, NIFTYBEES: 25 },
    500_000
  );
  assert.ok(replay.monthsCount >= 12, `Expected >= 12 historical months, got ${replay.monthsCount}`);
  assert.equal(replay.points[0].portfolioIndex, 100);
  assert.equal(replay.points[0].portfolioValue, 500_000);
  assert.ok(replay.realizedMaxDrawdownPct <= 0);
  assert.ok(replay.endingValue > 0);
});

test('buildProjectedPortfolioPerformance respects Bull >= Base >= Bear ordering and SIP contributions', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['QUANTSC', 'GOLDBEES', 'SBIGILT'].includes(f.symbol));
  const proj = buildProjectedPortfolioPerformance(
    basket,
    { QUANTSC: 45, GOLDBEES: 30, SBIGILT: 25 },
    { startingCapital: 500_000, monthlySip: 10_000, horizonYears: 10 }
  );
  assert.equal(proj.points.length, 11);
  assert.equal(proj.totalInvestedEnd, 500_000 + 10_000 * 12 * 10);
  assert.ok(proj.bullEndingValue >= proj.baseEndingValue);
  assert.ok(proj.baseEndingValue >= proj.bearEndingValue);
  assert.ok(proj.baseEndingValue > proj.totalInvestedEnd);
  assert.ok(proj.portfolioVar95MonthlyPct < 0);

  const csv = buildAllocationProjectionCsv(
    basket,
    normalizeAllocationWeights(basket.map((f) => f.symbol), { QUANTSC: 45, GOLDBEES: 30, SBIGILT: 25 }),
    proj
  );
  assert.ok(csv.includes('Allocation,QUANTSC'));
  assert.ok(csv.includes('Projection,Yr 10'));
});

test('computeAggregatedBasketSummary and buildBulkInstrumentRows aggregate and sort all 20 instruments accurately', () => {
  const summary = computeAggregatedBasketSummary(SCREENER_FUNDS);
  assert.equal(summary.count, 20);
  assert.equal(summary.etfCount + summary.mfCount, 20);
  assert.ok(summary.combinedAumUsdB > 0);
  assert.ok(summary.avgVar95MonthlyPct < 0);
  assert.ok(summary.avgMaxDrawdown3YPct < 0);

  const rows = buildBulkInstrumentRows(SCREENER_FUNDS);
  assert.equal(rows.length, 20);
  const sortedBySharpe = sortBulkInstrumentRows(rows, 'sharpe3Y', 'desc');
  assert.ok(sortedBySharpe[0].sharpe3Y >= sortedBySharpe[19].sharpe3Y);
  const sortedByVarAsc = sortBulkInstrumentRows(rows, 'var95MonthlyPct', 'asc');
  assert.equal(sortedByVarAsc[0].symbol, 'LIQUIDBEES');

  const csv = buildBulkDataCsv(rows);
  assert.ok(csv.includes('1M VaR 95% %'));
  assert.ok(csv.includes('LIQUIDBEES'));
  assert.ok(csv.includes('QQQ'));
});
