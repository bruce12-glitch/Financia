import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_FUNDS } from './screenerEngine';
import { getFundIntelligence } from './fundIntelligenceEngine';
import {
  buildScreenerFundFromNavDbDetail,
  buildScreenerFundFromV1Dossier,
  buildTerminalSuggestions,
  buildUniformTop10HoldingsForFund,
  computeInstrumentWealthSimulation,
  NavDbSchemeDetail,
  NavDbSchemeSummary,
} from './terminalSearchEngine';
import type { V1SearchFundItem, V1UniformFundDossier } from '../services/financiaApiClient';

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

const SAMPLE_V1_ITEMS: V1SearchFundItem[] = [
  {
    scheme_code: '122639',
    isin: 'INF879O01027',
    scheme_name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    amc: 'PPFAS Mutual Fund',
    instrument_type: 'Mutual Fund',
    asset_class: 'Equity',
    sub_category: 'Flexi Cap',
    plan_type: 'Direct',
    option_type: 'Growth',
    nav: 84.62,
    nav_date: '2026-11-20',
    is_active: 1,
    fund_aum_cr: 81400,
    ter_direct: 0.62,
  },
];

test('buildTerminalSuggestions merges catalog funds, SQLite nav_master schemes, and 14k V1 AMFI schemes', () => {
  const results = buildTerminalSuggestions({
    query: 'qsif',
    catalogFunds: SCREENER_FUNDS,
    navDbSchemes: SAMPLE_DB_SCHEMES,
    v1CatalogItems: SAMPLE_V1_ITEMS,
    filter: 'ALL',
  });
  assert.ok(results.length >= 1);
  assert.equal(results[0].symbol, '1');
  assert.equal(results[0].source, 'sqlite-nav-db');
  assert.equal(results[0].isin, 'INF966L30019');

  const v1Search = buildTerminalSuggestions({
    query: '122639',
    catalogFunds: SCREENER_FUNDS,
    navDbSchemes: SAMPLE_DB_SCHEMES,
    v1CatalogItems: SAMPLE_V1_ITEMS,
    filter: 'ALL',
  });
  assert.ok(v1Search.some((r) => r.symbol === '122639' && r.source === 'amfi-directory'));

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
    v1CatalogItems: SAMPLE_V1_ITEMS,
    filter: 'SQLITE_DB',
  });
  assert.ok(dbOnly.length >= 2);
  assert.ok(dbOnly.every((r) => r.source === 'sqlite-nav-db' || r.source === 'amfi-directory'));
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

test('buildScreenerFundFromV1Dossier hydrates inception date, TER, asset allocation, and Top 10 holdings uniformly', () => {
  const sampleDossier: V1UniformFundDossier = {
    scheme_code: '122639',
    scheme_name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    amc: 'PPFAS Mutual Fund',
    isin: 'INF879O01027',
    isin2: null,
    instrument_type: 'Mutual Fund',
    asset_class: 'Equity',
    sub_category: 'Flexi Cap',
    plan_type: 'Direct',
    option_type: 'Growth',
    nav: 84.62,
    nav_date: '2026-11-20',
    is_active: true,
    inception_date: '2013-05-24',
    expense_ratio: 0.62,
    ter_direct: 0.62,
    ter_regular: 1.33,
    aum_cr: 81400,
    riskometer: 'Very High',
    benchmark: 'NIFTY 500 TRI',
    fund_managers: 'Rajeev Thakkar, Raunak Onkar',
    exit_load: '2% within 365 days',
    objective: 'Long-term capital appreciation from value-oriented equity portfolio.',
    asset_allocation: [
      { label: 'Domestic Equity', pct: 72, color: '#2563eb' },
      { label: 'Global Equity', pct: 16, color: '#059669' },
      { label: 'Cash & Debt', pct: 12, color: '#f59e0b' },
    ],
    top_10_holdings: Array.from({ length: 10 }, (_, idx) => ({
      rank: idx + 1,
      name: `Holding ${idx + 1} Ltd.`,
      isin: `INE000A010${String(idx).padStart(2, '0')}`,
      sector: idx % 2 === 0 ? 'Financial Services' : 'Information Technology',
      asset_group: 'Equity',
      weight_pct: Number((8.5 - idx * 0.5).toFixed(2)),
    })),
    holdings_source: 'sqlite_portfolio_holdings',
  };

  const hydrated = buildScreenerFundFromV1Dossier(sampleDossier);
  assert.equal(hydrated.symbol, '122639');
  assert.equal(hydrated.about.inceptionDate, '2013-05-24');
  assert.equal(hydrated.about.expenseRatioPct, 0.62);
  assert.equal(hydrated.about.isin, 'INF879O01027');
  assert.equal(hydrated.exposure.length, 3);

  const top10FromDb = buildUniformTop10HoldingsForFund(
    hydrated,
    getFundIntelligence(hydrated).topHoldings,
    sampleDossier.top_10_holdings
  );
  assert.equal(top10FromDb.length, 10);
  assert.equal(top10FromDb[0].name, 'Holding 1 Ltd.');

  // Every catalog equity / debt / US ETF also guarantees a uniform holdings dataset
  for (const sym of ['PPFAS', 'QQQ', 'HDFCCORP', 'GOLDBEES']) {
    const fund = SCREENER_FUNDS.find((f) => f.symbol === sym);
    assert.ok(fund, `Expected ${sym} in SCREENER_FUNDS`);
    const uniformHoldings = buildUniformTop10HoldingsForFund(
      fund,
      getFundIntelligence(fund).topHoldings
    );
    if (sym === 'GOLDBEES') {
      assert.ok(uniformHoldings.length >= 2);
    } else {
      assert.equal(uniformHoldings.length, 10, `${sym} must always return 10 uniform top holdings`);
    }
  }
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
