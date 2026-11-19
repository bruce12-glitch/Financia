import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  validateTickerInput,
  validateInquiryForm,
  formatCurrency,
  getSeriesForTimeframe,
  synthesizeCustomTickerReport,
  buildThirtyDayPerformanceSeries,
  summarizeThirtyDayPerformance,
  calculateRSISeries,
  getEffectiveRSIPeriod,
  summarizeRSIZone,
  buildMultiTickerComparisonSeries,
} from './stockEngine';

test('calculateSMA computes accurate rolling averages and nulls for warm-up window', () => {
  const prices = [100, 110, 120, 130, 140];
  const sma3 = calculateSMA(prices, 3);
  assert.deepEqual(sma3, [null, null, 110, 120, 130]);
});

test('calculateEMA computes accurate exponential moving average', () => {
  const prices = [10, 20, 30, 40, 50];
  const ema3 = calculateEMA(prices, 3);
  assert.equal(ema3[0], null);
  assert.equal(ema3[1], null);
  assert.equal(ema3[2], 20);
  assert.equal(ema3[3], 30);
  assert.equal(ema3[4], 40);
});

test('calculateBollingerBands returns upper, middle, and lower bands', () => {
  const prices = [100, 100, 100, 100, 100];
  const bands = calculateBollingerBands(prices, 5, 2);
  assert.equal(bands[3].middle, null);
  assert.deepEqual(bands[4], { upper: 100, middle: 100, lower: 100 });
});

test('calculateRSI bounds output between 0 and 100', () => {
  const rising = [100, 102, 105, 108, 112, 115, 120];
  assert.equal(calculateRSI(rising, 6), 100);

  const mixed = [100, 104, 102, 106, 103, 108, 107];
  const rsi = calculateRSI(mixed, 6);
  assert.ok(rsi > 50 && rsi < 90);
});

test('validateTickerInput rejects empty or malformed symbols and normalizes valid 4-pillar symbols', () => {
  const emptyRes = validateTickerInput('   ');
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.error);

  const invalidRes = validateTickerInput('GOLDBEES$$$');
  assert.equal(invalidRes.valid, false);

  const validRes = validateTickerInput(' ppfas ');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.normalized, 'PPFAS');

  const dashTicker = validateTickerInput('SGB-S4');
  assert.equal(dashTicker.valid, true);
  assert.equal(dashTicker.normalized, 'SGB-S4');
});

test('validateInquiryForm validates name, email, phone, and message length', () => {
  const bad = validateInquiryForm({
    name: 'A',
    email: 'invalid-email',
    phone: '123',
    message: 'short',
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.phone);
  assert.ok(bad.errors.message);

  const good = validateInquiryForm({
    name: 'John Vance',
    email: 'jvance@financia.io',
    phone: '+1 (415) 890-2311',
    message: 'Interested in institutional SEC filing API access.',
  });
  assert.equal(good.valid, true);
  assert.equal(Object.keys(good.errors).length, 0);
});

test('formatCurrency formats positive and negative USD figures', () => {
  assert.equal(formatCurrency(1234.5), '$1,234.50');
  assert.equal(formatCurrency(-42.126, 2), '-$42.13');
});

test('synthesizeCustomTickerReport and getSeriesForTimeframe produce valid report and chart series', () => {
  const quote = synthesizeCustomTickerReport('pltr', []);
  assert.equal(quote.ticker, 'PLTR');
  assert.ok(quote.price > 0);
  assert.equal(quote.report.financial_charts.stock_price_4m.length, 12);
  assert.equal(quote.report.financial_charts.financial_performance_4q.length, 4);

  const intraday = getSeriesForTimeframe(quote.report.financial_charts.stock_price_4m, '1D');
  assert.equal(intraday.length, 10);
  assert.equal(intraday[intraday.length - 1].price, quote.report.financial_charts.stock_price_4m[11].price);

  const yearly = getSeriesForTimeframe(quote.report.financial_charts.stock_price_4m, '1Y');
  assert.equal(yearly.length, 18);
});
