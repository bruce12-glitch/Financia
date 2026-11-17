import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSvgAreaPath,
  buildSvgPolylinePath,
  computeDivergingBarMetrics,
  filterSymbolsByQuery,
  formatSignedPercent,
} from './marketCalculations';
import { ForexPerformanceItem, MarketSymbolRow } from '../types/markets';

test('computeDivergingBarMetrics normalizes positive and negative FX returns accurately', () => {
  const sampleFx: ForexPerformanceItem[] = [
    {
      pair: 'EURUSD',
      baseFlag: '🇪🇺',
      quoteFlag: '🇺🇸',
      spotRate: '1.1045',
      returns: { '1D': -0.11, '1W': -0.45, '1M': -1.2, '3M': 0.8, '6M': 1.4, YTD: 1.1, '1Y': 2.3, '5Y': -4.2, All: -8.1 },
    },
    {
      pair: 'INRUSD',
      baseFlag: '🇮🇳',
      quoteFlag: '🇺🇸',
      spotRate: '0.01065',
      returns: { '1D': 0.37, '1W': 0.52, '1M': 1.15, '3M': 0.95, '6M': -0.6, YTD: -0.9, '1Y': -1.8, '5Y': -12.4, All: -22.5 },
    },
  ];

  const metrics = computeDivergingBarMetrics(sampleFx, '1D');
  assert.equal(metrics.length, 2);
  assert.equal(metrics[0].isPositive, false);
  assert.equal(metrics[0].formattedValue, '−0.11%');
  assert.equal(metrics[1].isPositive, true);
  assert.equal(metrics[1].formattedValue, '+0.37%');
  assert.equal(metrics[1].widthPercent, 92);
  assert.ok(metrics[0].widthPercent > 20 && metrics[0].widthPercent < 35);
});

test('buildSvgPolylinePath and buildSvgAreaPath produce valid bounded SVG coordinates', () => {
  const path = buildSvgPolylinePath([100, 120, 110, 140], 300, 100, 10);
  assert.ok(path.startsWith('M 0.0,'));
  assert.ok(path.includes('L 300.0,10.0'));

  const area = buildSvgAreaPath([100, 120, 110, 140], 300, 100, 10);
  assert.ok(area.endsWith('L 300.0,100.0 L 0,100.0 Z'));
});

test('filterSymbolsByQuery matches ticker, name, and optional category filter', () => {
  const rows: MarketSymbolRow[] = [
    {
      symbol: 'NIFTY',
      name: 'Nifty 50',
      price: '25,291.10',
      changePercent: 0.58,
      badgeText: '50',
      badgeColor: '#1E2A78',
      category: 'indices',
      sparkline: [25100, 25291],
    },
    {
      symbol: 'EURUSD',
      name: 'Euro / U.S. Dollar',
      price: '1.1045',
      changePercent: -0.11,
      badgeText: 'EU',
      badgeColor: '#2962FF',
      category: 'forex',
      sparkline: [1.11, 1.1045],
    },
  ];

  assert.equal(filterSymbolsByQuery(rows, 'nifty').length, 1);
  assert.equal(filterSymbolsByQuery(rows, 'euro', 'forex').length, 1);
  assert.equal(filterSymbolsByQuery(rows, 'euro', 'indices').length, 0);
});

test('formatSignedPercent formats positive, negative, and flat signs properly', () => {
  assert.equal(formatSignedPercent(0.58), '+0.58%');
  assert.equal(formatSignedPercent(-1.28), '−1.28%');
  assert.equal(formatSignedPercent(0), '0.00%');
});
