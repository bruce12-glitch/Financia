import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAllSipInstrumentOptions,
  filterSipInstruments,
  formatSipCurrency,
} from './sipCalculatorEngine';
import { SCREENER_FUNDS } from './screenerEngine';
import { computeSipProjection } from './sparkline24h';

test('buildAllSipInstrumentOptions exposes every single Mutual Fund and ETF in SCREENER_FUNDS (all 20)', () => {
  const options = buildAllSipInstrumentOptions();
  assert.equal(options.length, SCREENER_FUNDS.length);
  assert.equal(options.length, 20);

  const mutualFunds = options.filter((o) => o.instrumentType === 'Mutual Fund');
  const etfs = options.filter((o) => o.instrumentType === 'ETF');
  assert.ok(mutualFunds.length >= 9, 'Expected at least 9 mutual funds');
  assert.ok(etfs.length >= 10, 'Expected at least 10 ETFs');

  for (const opt of options) {
    assert.ok(opt.annualReturn3YPct >= 1 && opt.annualReturn3YPct <= 35, `${opt.symbol} return out of bounds`);
    assert.ok(opt.directTerPct >= 0 && opt.directTerPct <= 3, `${opt.symbol} TER out of bounds`);
    assert.ok(opt.estimatedRegularTerPct >= opt.directTerPct, `${opt.symbol} regular TER must be >= direct TER`);
  }
});

test('filterSipInstruments filters cleanly by instrument type and search text', () => {
  const options = buildAllSipInstrumentOptions();

  const onlyEtfs = filterSipInstruments(options, '', 'ETF');
  assert.ok(onlyEtfs.length >= 10);
  assert.ok(onlyEtfs.every((o) => o.instrumentType === 'ETF'));

  const onlyMfs = filterSipInstruments(options, '', 'Mutual Fund');
  assert.ok(onlyMfs.length >= 9);
  assert.ok(onlyMfs.every((o) => o.instrumentType === 'Mutual Fund'));

  const bySymbol = filterSipInstruments(options, 'silver', 'ETF');
  assert.equal(bySymbol.length, 1);
  assert.equal(bySymbol[0].symbol, 'SILVERBEES');

  const byCategory = filterSipInstruments(options, 'small cap', 'ALL');
  assert.ok(byCategory.some((o) => o.symbol === 'QUANTSC'));
  assert.ok(byCategory.some((o) => o.symbol === 'NIPSMALL'));
});

test('computeSipProjection works with pure custom percentage and zero TER (no fund selected)', () => {
  const pureCustom = computeSipProjection({
    monthlySipInr: 15000,
    annualStepUpPct: 5,
    years: 10,
    expectedAnnualReturnPct: 16.5,
    initialLumpsumInr: 0,
    directTerPct: 0,
    regularTerPct: 0,
  });

  assert.equal(pureCustom.effectiveDirectRatePct, 16.5);
  assert.equal(pureCustom.effectiveRegularRatePct, 16.5);
  assert.equal(pureCustom.directFeeSavingsInr, 0);
  assert.ok(pureCustom.directCorpusInr > pureCustom.totalInvestedInr * 2);
});

test('formatSipCurrency formats INR and USD cleanly', () => {
  assert.equal(formatSipCurrency(12500000, 'INR'), '₹1.25 Cr');
  assert.equal(formatSipCurrency(450000, 'INR'), '₹4.50 L');
  assert.equal(formatSipCurrency(25000, 'INR'), '₹25,000');

  assert.equal(formatSipCurrency(1500000, 'USD'), '$1.50M');
  assert.equal(formatSipCurrency(45200, 'USD'), '$45.2K');
  assert.equal(formatSipCurrency(850, 'USD'), '$850');
});
