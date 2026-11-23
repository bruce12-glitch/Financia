import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDonutArcs,
  computeRangeMarkerPct,
  computeTechnicalGauge,
  filterAndSortScreenerFunds,
  mergeLiveAmfiIntoScreenerFund,
  SCREENER_FUNDS,
} from './screenerEngine';

test('computeRangeMarkerPct clamps within 0..100 cleanly', () => {
  assert.equal(computeRangeMarkerPct(650, 600, 700), 50);
  assert.equal(computeRangeMarkerPct(580, 600, 700), 0);
  assert.equal(computeRangeMarkerPct(720, 600, 700), 100);
  assert.equal(computeRangeMarkerPct(100, 100, 100), 50);
});

test('computeTechnicalGauge maps -100..+100 scores to accurate labels and angles', () => {
  assert.equal(computeTechnicalGauge(-75).label, 'Strong Sell');
  assert.equal(computeTechnicalGauge(-42).label, 'Sell');
  assert.equal(computeTechnicalGauge(0).label, 'Neutral');
  assert.equal(computeTechnicalGauge(38).label, 'Buy');
  assert.equal(computeTechnicalGauge(76).label, 'Strong Buy');
  assert.ok(computeTechnicalGauge(-42).angleDeg < 0);
  assert.ok(computeTechnicalGauge(76).angleDeg > 0);
});

test('filterAndSortScreenerFunds filters by instrument type, category, and query and sorts by expense or AUM', () => {
  const etfsOnly = filterAndSortScreenerFunds(SCREENER_FUNDS, {
    query: '',
    instrumentType: 'ETF',
    category: 'All',
    sortBy: 'aum',
  });
  assert.ok(etfsOnly.length >= 4);
  assert.ok(etfsOnly.every((f) => f.instrumentType === 'ETF'));
  assert.ok(etfsOnly[0].keyStats.aumSortUsdB >= etfsOnly[1].keyStats.aumSortUsdB);

  const mfsOnly = filterAndSortScreenerFunds(SCREENER_FUNDS, {
    query: '122639',
    instrumentType: 'Mutual Fund',
    category: 'All',
    sortBy: 'expense',
  });
  assert.equal(mfsOnly.length, 1);
  assert.equal(mfsOnly[0].symbol, 'PPFAS');
});

test('computeDonutArcs produces full circumference segments summing accurately', () => {
  const arcs = computeDonutArcs(
    [
      { label: 'Stocks', pct: 99.85, color: '#F59E0B' },
      { label: 'Bonds, Cash & Other', pct: 0.15, color: '#7C3AED' },
    ],
    44
  );
  assert.equal(arcs.length, 2);
  assert.equal(arcs[0].dashOffset, 0);
  assert.ok(arcs[1].dashOffset < 0);
});

test('mergeLiveAmfiIntoScreenerFund overlays live AMFI NAV and metrics safely', () => {
  const base = SCREENER_FUNDS.find((f) => f.symbol === 'PPFAS')!;
  const merged = mergeLiveAmfiIntoScreenerFund(base, {
    latest_nav: 93.45,
    latest_nav_date: '2026-11-19',
    daily_metrics: {
      return_1d: 0.0112,
      return_1y: 0.245,
      cagr_3y: 0.22,
      aum_crores: 92400,
    },
  });
  assert.equal(merged.price, 93.45);
  assert.equal(merged.changePct, 1.12);
  assert.equal(merged.returnsPrice['1Y'], 24.5);
  assert.ok((merged.returnsPrice['3Y'] ?? 0) > 80);
  assert.match(merged.keyStats.aumLabel, /92,400/);
});
