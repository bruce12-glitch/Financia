import test from 'node:test';
import assert from 'node:assert/strict';
import Decimal from 'decimal.js';
import {
  computeDecimalXirr,
  computeFifoPortfolioValuation,
  computePortfolioOverlapMatrix,
  parsePortfolioCsvOrCas,
  SAMPLE_CAS_CSV_TEMPLATE,
} from './portfolioLedgerEngine.ts';

test('computeDecimalXirr solves exact 1-year 20% return and handles invalid/edge cashflows', () => {
  const xirr = computeDecimalXirr([
    { date: '2024-01-01', amount: new Decimal('-100000') },
    { date: '2025-01-01', amount: new Decimal('120000') },
  ]);
  assert.ok(xirr !== null);
  assert.ok(Math.abs(xirr - 19.94) < 0.15, `Expected ~20% XIRR, got ${xirr}`);

  // All outflows -> null
  assert.equal(
    computeDecimalXirr([
      { date: '2024-01-01', amount: new Decimal('-1000') },
      { date: '2025-01-01', amount: new Decimal('-1000') },
    ]),
    null
  );

  // Same-day zero span -> null
  assert.equal(
    computeDecimalXirr([
      { date: '2024-01-01', amount: new Decimal('-1000') },
      { date: '2024-01-01', amount: new Decimal('1200') },
    ]),
    null
  );
});

test('parsePortfolioCsvOrCas validates rows, handles DD-MM-YYYY, and deduplicates idempotently', () => {
  const first = parsePortfolioCsvOrCas(SAMPLE_CAS_CSV_TEMPLATE);
  assert.equal(first.errors.length, 0);
  assert.equal(first.validTransactions.length, 7);

  const existingKeys = new Set(first.validTransactions.map((t) => t.idempotencyKey));
  const second = parsePortfolioCsvOrCas(SAMPLE_CAS_CSV_TEMPLATE, existingKeys);
  assert.equal(second.validTransactions.length, 0);
  assert.equal(second.duplicateCount, 7);

  const badCsv = `Date,Symbol,Scheme Name,Type,Units,Price\n2024-01-01,PPFAS,Test,BUY,-10,50`;
  const badRes = parsePortfolioCsvOrCas(badCsv);
  assert.equal(badRes.validTransactions.length, 0);
  assert.equal(badRes.errors.length, 1);
});

test('computeFifoPortfolioValuation consumes oldest lots FIFO and classifies STCG/LTCG accurately', () => {
  const report = computeFifoPortfolioValuation({
    asOfDate: '2025-06-01',
    livePricesBySymbol: { PPFAS: 100 },
    transactions: [
      {
        id: 't1',
        symbol: 'PPFAS',
        schemeName: 'Parag Parikh Flexi Cap Direct',
        isin: '',
        assetClass: 'Equity',
        txType: 'BUY',
        tradeDate: '2023-01-01', // > 365 days -> LTCG
        units: '100.0000',
        price: '50.0000',
        amount: '5000.00',
        currency: 'INR',
        source: 'MANUAL',
        idempotencyKey: 'key_t1',
      },
      {
        id: 't2',
        symbol: 'PPFAS',
        schemeName: 'Parag Parikh Flexi Cap Direct',
        isin: '',
        assetClass: 'Equity',
        txType: 'BUY',
        tradeDate: '2025-01-01', // < 365 days -> STCG
        units: '100.0000',
        price: '80.0000',
        amount: '8000.00',
        currency: 'INR',
        source: 'MANUAL',
        idempotencyKey: 'key_t2',
      },
      {
        id: 't3',
        symbol: 'PPFAS',
        schemeName: 'Parag Parikh Flexi Cap Direct',
        isin: '',
        assetClass: 'Equity',
        txType: 'SELL',
        tradeDate: '2025-03-01',
        units: '60.0000', // Consumes 60 from lot 1 (cost 50 -> realized gain 60 * 40 = 2400)
        price: '90.0000',
        amount: '5400.00',
        currency: 'INR',
        source: 'MANUAL',
        idempotencyKey: 'key_t3',
      },
    ],
  });

  assert.equal(report.holdings.length, 1);
  const h = report.holdings[0];
  assert.equal(h.units, '140.0000');
  assert.equal(h.realizedPnl, '2400.00');
  // Remaining lot 1: 40 units @ 50 -> gain 2000 (LTCG); Lot 2: 100 units @ 80 -> gain 2000 (STCG)
  assert.equal(h.ltcgEligibleGain, '2000.00');
  assert.equal(h.stcgGain, '2000.00');
  assert.equal(report.totalCurrentValue, '14000.00');
});

test('computePortfolioOverlapMatrix detects underlying stock overlap between equity funds', () => {
  const pairs = computePortfolioOverlapMatrix(['PPFAS', 'UTI50', 'GOLDBEES']);
  assert.ok(pairs.length >= 1);
  assert.equal(pairs[0].fundA, 'PPFAS');
  assert.equal(pairs[0].fundB, 'UTI50');
  assert.ok(pairs[0].overlapPct > 10);
});
