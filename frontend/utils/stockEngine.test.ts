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
    name: 'Aarav Mehta',
    email: 'amehta@financia.io',
    phone: '+91 98201 11223',
    message: 'Interested in AMFI mutual fund and sovereign gilt duration analytics.',
  });
  assert.equal(good.valid, true);
  assert.equal(Object.keys(good.errors).length, 0);
});

test('formatCurrency formats positive and negative currency figures', () => {
  assert.equal(formatCurrency(1234.5), '$1,234.50');
  assert.equal(formatCurrency(-42.126, 2), '-$42.13');
});

test('synthesizeCustomTickerReport classifies Mutual Funds, Gold, Debt Funds & ETFs and produces 4-pillar reports', () => {
  const fund = synthesizeCustomTickerReport('hdfcmid', []);
  assert.equal(fund.ticker, 'HDFCMID');
  assert.equal(fund.sector, 'Mutual Funds');
  assert.equal(fund.amfiSchemeCode, '118989');

  const gilt = synthesizeCustomTickerReport('sbigilt', []);
  assert.equal(gilt.sector, 'Debt Funds');
  assert.equal(gilt.assetClass, 'Debt Fund');

  const gold = synthesizeCustomTickerReport('goldbees', []);
  assert.equal(gold.sector, 'Gold & Bullion');

  const etf = synthesizeCustomTickerReport('niftybees', []);
  assert.equal(etf.sector, 'ETFs');

  assert.equal(fund.report.financial_charts.stock_price_4m.length, 12);
  assert.equal(fund.report.financial_charts.financial_performance_4q.length, 4);

  const intraday = getSeriesForTimeframe(fund.report.financial_charts.stock_price_4m, '1D');
  assert.equal(intraday.length, 10);
  assert.equal(intraday[intraday.length - 1].price, fund.report.financial_charts.stock_price_4m[11].price);

  const yearly = getSeriesForTimeframe(fund.report.financial_charts.stock_price_4m, '1Y');
  assert.equal(yearly.length, 18);
});

test('buildThirtyDayPerformanceSeries generates 30 anchored chronological points and valid summary', () => {
  const quote = synthesizeCustomTickerReport('goldbees', []);
  const series = buildThirtyDayPerformanceSeries(
    quote.report.financial_charts.stock_price_4m,
    74.85,
    'GOLDBEES',
    '2026-06-20'
  );

  assert.equal(series.length, 30);
  assert.equal(series[0].isoDate, '2026-05-22');
  assert.equal(series[29].isoDate, '2026-06-20');
  assert.equal(series[29].price, 74.85);
  assert.equal(series[0].dailyChangePct, 0);

  for (let i = 0; i < series.length; i++) {
    const pt = series[i];
    assert.ok(pt.low <= pt.price && pt.price <= pt.high, `Point ${i} bounds violated`);
    assert.ok(pt.volume >= 1, `Point ${i} volume invalid`);
    if (i > 0) {
      assert.ok(pt.isoDate > series[i - 1].isoDate, 'Dates must be strictly ascending');
    }
  }

  const summary = summarizeThirtyDayPerformance(series);
  assert.equal(summary.startPrice, series[0].price);
  assert.equal(summary.endPrice, 74.85);
  assert.ok(summary.periodHigh >= 74.85);
  assert.ok(summary.periodLow <= summary.startPrice);
  assert.ok(summary.avgVolume > 0);
});

test('buildThirtyDayPerformanceSeries handles empty series gracefully', () => {
  const fallback = buildThirtyDayPerformanceSeries([], 250.5, 'TESTETF', '2026-06-20');
  assert.equal(fallback.length, 30);
  assert.equal(fallback[29].price, 250.5);
  const emptySummary = summarizeThirtyDayPerformance([]);
  assert.equal(emptySummary.returnPct, 0);
});

test('calculateRSISeries handles warm-up nulls, uptrends, flat prices, downtrends, and bounds', () => {
  assert.throws(() => calculateRSISeries([100, 102], 0));
  assert.deepEqual(calculateRSISeries([], 4), []);

  const flat = [100, 100, 100, 100, 100, 100];
  assert.deepEqual(calculateRSISeries(flat, 4), [null, null, null, null, 50, 50]);

  const uptrend = [100, 102, 104, 107, 110, 115];
  const upRsi = calculateRSISeries(uptrend, 3);
  assert.equal(upRsi[0], null);
  assert.equal(upRsi[2], null);
  assert.equal(upRsi[3], 100);
  assert.equal(upRsi[5], 100);

  const volatile = [100, 105, 101, 106, 99, 104, 98, 96];
  const rsiVol = calculateRSISeries(volatile, 4);
  for (let i = 0; i < rsiVol.length; i++) {
    if (i < 4) {
      assert.equal(rsiVol[i], null);
    } else {
      const val = rsiVol[i] as number;
      assert.ok(val >= 0 && val <= 100, `RSI ${val} out of bounds at ${i}`);
    }
  }
});

test('getEffectiveRSIPeriod and summarizeRSIZone classify zones accurately', () => {
  assert.equal(getEffectiveRSIPeriod(12, 14), 10);
  assert.equal(getEffectiveRSIPeriod(12, 4), 4);
  assert.equal(getEffectiveRSIPeriod(5, 14), 3);

  assert.equal(summarizeRSIZone(null).label, 'Warm-up');
  assert.equal(summarizeRSIZone(72.4).label, 'Overbought');
  assert.equal(summarizeRSIZone(28.0).label, 'Oversold');
  assert.equal(summarizeRSIZone(54.2).label, 'Neutral');
});

test('buildMultiTickerComparisonSeries normalizes Mutual Fund, Gold, and Debt tickers to 0% start and deduplicates primary', () => {
  const gold = synthesizeCustomTickerReport('GOLDBEES', []);
  const ppfas = synthesizeCustomTickerReport('PPFAS', []);
  const gilt = synthesizeCustomTickerReport('SBIGILT', []);

  const comparison = buildMultiTickerComparisonSeries(gold, [gold, ppfas, gilt], '4M', 4);
  assert.equal(comparison.tickers.length, 3);
  assert.equal(comparison.tickers[0].ticker, 'GOLDBEES');
  assert.equal(comparison.tickers[0].isPrimary, true);
  assert.equal(comparison.tickers[1].ticker, 'PPFAS');
  assert.equal(comparison.tickers[1].isPrimary, false);
  assert.equal(comparison.tickers[2].ticker, 'SBIGILT');

  for (const series of comparison.tickers) {
    assert.equal(series.points.length, comparison.dates.length);
    assert.equal(series.points[0].pctReturn, 0);
    assert.equal(series.rsiSeries.length, comparison.dates.length);
    assert.ok(series.color.startsWith('#'));
  }

  assert.ok(comparison.minPct <= 0);
  assert.ok(comparison.maxPct >= 0);
});
