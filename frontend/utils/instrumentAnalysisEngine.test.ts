import test from 'node:test';
import assert from 'node:assert/strict';
import { HEATMAP_STOCKS } from './heatmapEngine';
import {
  buildAnalysisCsvExport,
  computeBollingerBands,
  computeEMA,
  computeMACD,
  computeRSI,
  computeSMA,
  computeStressScenarioImpact,
  computeVolatilityPositionSize,
  resolveDefaultBenchmarkForInstrument,
  runInstrumentAnalysis,
} from './instrumentAnalysisEngine';

test('SMA, EMA, Bollinger, RSI, and MACD produce mathematically valid series', () => {
  const prices = Array.from({ length: 60 }, (_, i) => 100 + i * 0.6 + Math.sin(i * 0.5) * 2.5);
  const sma = computeSMA(prices, 20);
  const ema = computeEMA(prices, 20);
  const bb = computeBollingerBands(prices, 20, 2);
  const rsi = computeRSI(prices, 14);
  const macd = computeMACD(prices, 12, 26, 9);

  assert.equal(sma[18], null);
  assert.ok(typeof sma[19] === 'number');
  assert.ok(typeof ema[59] === 'number');
  assert.ok(bb.upper[59]! > bb.middle[59]! && bb.middle[59]! > bb.lower[59]!);
  assert.ok(rsi[59]! >= 0 && rsi[59]! <= 100);
  assert.ok(typeof macd.macd[59] === 'number');
  assert.ok(typeof macd.signal[59] === 'number');
  assert.ok(typeof macd.histogram[59] === 'number');
});

test('runInstrumentAnalysis computes full series, technicals, risk, and benchmark relative metrics', () => {
  const ppfas = HEATMAP_STOCKS.find((t) => t.symbol === 'PPFAS')!;
  const uti50 = HEATMAP_STOCKS.find((t) => t.symbol === 'UTI50')!;
  const analysis = runInstrumentAnalysis(ppfas, '1Y', uti50);

  assert.equal(analysis.series.length, 252);
  const last = analysis.series[analysis.series.length - 1];
  assert.equal(last.close, 89.42);
  assert.ok(analysis.risk.annualizedVolPct > 0);
  assert.ok(analysis.risk.maxDrawdownPct <= 0);
  assert.ok(analysis.risk.var95DailyPct <= 0);
  assert.ok(analysis.risk.cvar95DailyPct <= analysis.risk.var95DailyPct);
  assert.ok(analysis.risk.beta !== null && analysis.risk.beta > 0);
  assert.ok(analysis.risk.correlation !== null && analysis.risk.correlation >= -1 && analysis.risk.correlation <= 1);
  assert.ok(analysis.technical.pivots.r2 >= analysis.technical.pivots.r1);
  assert.ok(analysis.technical.pivots.pivot >= analysis.technical.pivots.s1);
  assert.equal(analysis.histogram.length, 8);
});

test('runInstrumentAnalysis consumes real historical NAV points when provided', () => {
  const tile = HEATMAP_STOCKS[0];
  const realNav = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    nav: 50 + i * 0.4,
  }));
  const analysis = runInstrumentAnalysis(tile, '1M', null, realNav);
  assert.equal(analysis.series.length, 22);
  assert.equal(analysis.series[analysis.series.length - 1].close, Number((50 + 29 * 0.4).toFixed(2)));
  assert.ok(analysis.risk.cumulativeReturnPct > 0);
});

test('stress shock simulator and volatility position sizing compute bounded outputs', () => {
  const shock = computeStressScenarioImpact(100, 1.1, 14, 'Equity Correction', -15);
  assert.equal(shock.projectedMovePct, -16.5);
  assert.equal(shock.projectedPrice, 83.5);
  assert.ok(shock.estimatedRecoveryMonths > 0);

  const pos = computeVolatilityPositionSize(100, 18, -1.8, 500_000, 2);
  assert.equal(pos.maxLossAmount, 10_000);
  assert.ok(pos.recommendedAllocationAmount > 0 && pos.recommendedAllocationAmount <= 500_000);
  assert.ok(pos.estimatedUnits > 0);
});

test('resolveDefaultBenchmarkForInstrument selects neutral asset-class benchmark and CSV export formats cleanly', () => {
  const gilt = HEATMAP_STOCKS.find((t) => t.symbol === 'HDFCCORP')!;
  const bench = resolveDefaultBenchmarkForInstrument(gilt);
  assert.equal(bench?.symbol, 'SBIGILT');

  const analysis = runInstrumentAnalysis(gilt, '3M', bench);
  const csv = buildAnalysisCsvExport(analysis);
  assert.ok(csv.startsWith('Date,HDFCCORP_Price,'));
  assert.ok(csv.includes('SBIGILT_CumulativePct'));
});

test('multi-asset series stay within realistic CAGR, volatility, and Beta bounds', () => {
  const uti50 = HEATMAP_STOCKS.find((t) => t.symbol === 'UTI50')!;
  const hdfcmid = HEATMAP_STOCKS.find((t) => t.symbol === 'HDFCMID')!;
  const a1y = runInstrumentAnalysis(hdfcmid, '1Y', uti50);

  assert.ok(a1y.risk.cagrPct > -25 && a1y.risk.cagrPct < 60, `Expected realistic CAGR, got ${a1y.risk.cagrPct}`);
  assert.ok(a1y.risk.annualizedVolPct > 8 && a1y.risk.annualizedVolPct < 35, `Expected equity vol, got ${a1y.risk.annualizedVolPct}`);
  assert.ok(a1y.risk.beta !== null && a1y.risk.beta > 0.5 && a1y.risk.beta < 1.8, `Expected realistic equity Beta, got ${a1y.risk.beta}`);
  assert.ok(a1y.risk.winRatePct > 40 && a1y.risk.winRatePct < 68, `Expected realistic win rate, got ${a1y.risk.winRatePct}`);
});
