import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_FUNDS } from './screenerEngine';
import {
  buildScreenerFundFromNavDbDetail,
  buildTerminalSuggestions,
  computeInstrumentWealthSimulation,
  NavDbSchemeDetail,
  NavDbSchemeSummary,
} from './terminalSearchEngine';

const SAMPLE_DB_SCHEMES: NavDbSchemeSummary[] = [
  {
    scheme_code: 1,
    scheme_name: 'qsif Equity Long Short Fund - Growth Option - Direct Plan',
    isin: 'INF966L30019',
    source: 'SIF',
    latest_date: '2026-03-20',
    latest_nav: 11.425,
    earliest_date: '2025-10-08',
    observation_count: 112,
  },
  {
    scheme_code: 9,
    scheme_name: 'Altiva Hybrid Long-Short Fund - Direct Plan - Growth',
    isin: 'INF999A10099',
    source: 'SIF',
    latest_date: '2026-03-20',
    latest_nav: 10.892,
    earliest_date: '2025-10-15',
    observation_count: 105,
  },
];

test('buildTerminalSuggestions merges catalog funds and SQLite nav_master schemes with exact match priority', () => {
  const results = buildTerminalSuggestions({
    query: 'qsif',
    catalogFunds: SCREENER_FUNDS,
    navDbSchemes: SAMPLE_DB_SCHEMES,
    filter: 'ALL',
  });
  assert.ok(results.length >= 1);
  assert.equal(results[0].symbol, '1');
  assert.equal(results[0].source, 'sqlite-nav-db');
  assert.equal(results[0].isin, 'INF966L30019');

  const etfOnly = buildTerminalSuggestions({
    query: 'QQQ',
    catalogFunds: SCREENER_FUNDS,
    navDbSchemes: SAMPLE_DB_SCHEMES,
    filter: 'ETF',
  });
  assert.equal(etfOnly[0].symbol, 'QQQ');
  assert.equal(etfOnly[0].instrumentType, 'ETF');

  const dbOnly = buildTerminalSuggestions({
    query: '',
    catalogFunds: SCREENER_FUNDS,
    navDbSchemes: SAMPLE_DB_SCHEMES,
    filter: 'SQLITE_DB',
  });
  assert.equal(dbOnly.length, 2);
  assert.ok(dbOnly.every((r) => r.source === 'sqlite-nav-db'));
});

test('buildScreenerFundFromNavDbDetail populates every required dossier field strictly', () => {
  const detail: NavDbSchemeDetail = {
    ...SAMPLE_DB_SCHEMES[0],
    previous_date: '2026-03-19',
    previous_nav: 11.35,
    day_change: 0.075,
    day_change_pct: 0.66,
    inception_nav: 10.0054,
    total_return_pct: 14.19,
    cagr_1y_pct: 18.4,
    max_drawdown_pct: -6.4,
    annualized_volatility_pct: 11.8,
  };

  const dossier = buildScreenerFundFromNavDbDetail(detail);
  assert.equal(dossier.symbol, '1');
  assert.equal(dossier.currency, 'INR');
  assert.equal(dossier.about.isin, 'INF966L30019');
  assert.equal(dossier.about.cusipOrAmfi, '1');
  assert.ok(dossier.optionsVolume.length >= 3);
  assert.ok(dossier.optionsOpenInterest.length >= 3);
  assert.ok(dossier.regions.length >= 3);
  assert.ok(dossier.exposure.length >= 2);
  assert.ok(dossier.news.moreEvents.length >= 2);
  assert.equal(dossier.keyStats.maxDrawdown3YPct, -6.4);
});

test('computeInstrumentWealthSimulation computes compounding wealth, TER fee drag, and real value accurately', () => {
  const sim = computeInstrumentWealthSimulation({
    lumpsum: 100_000,
    monthlySip: 10_000,
    years: 10,
    expectedCagrPct: 12,
    expenseRatioPct: 0.75,
    inflationPct: 5,
  });

  assert.equal(sim.points.length, 11);
  assert.equal(sim.totalInvested, 100_000 + 10_000 * 120);
  assert.ok(sim.endingGross > sim.endingNet);
  assert.ok(sim.endingNet > sim.endingReal);
  assert.ok(sim.totalFeeDrag > 0);
  assert.ok(sim.netGainPct > 50);
});
