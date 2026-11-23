import test from 'node:test';
import assert from 'node:assert/strict';
import {
  build90DayCorrelationMatrix,
  build90DayDailyReturns,
  buildRollingPairCorrelationSeries90d,
  classifyCorrelationCell,
  computePearsonCorrelation,
} from './correlation90dEngine';

test('computePearsonCorrelation returns exact +1, -1, and bounded values', () => {
  assert.equal(computePearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]), 1);
  assert.equal(computePearsonCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]), -1);
  assert.equal(computePearsonCorrelation([5, 5, 5], [1, 2, 3]), 0);
  const r = computePearsonCorrelation([1, -2, 3, 0.5, -1], [0.8, -1.2, 2.7, 0.1, -0.4]);
  assert.ok(r >= -1 && r <= 1 && r > 0.85);
});

test('build90DayDailyReturns returns exactly 90 daily points anchored to price', () => {
  const fixedDate = new Date('2026-11-21T00:00:00Z');
  const series = build90DayDailyReturns('PPFAS', { referenceDate: fixedDate });
  assert.equal(series.length, 90);
  assert.equal(series[0].rebasedIndex, 100);
  assert.equal(series[0].dailyReturnPct, 0);
  assert.ok(series.every((pt) => Number.isFinite(pt.price) && pt.price > 0));
});

test('build90DayCorrelationMatrix produces symmetric N x N matrix with unit diagonal and realistic cross-asset correlations', () => {
  const fixedDate = new Date('2026-11-21T00:00:00Z');
  const res = build90DayCorrelationMatrix({
    symbols: ['PPFAS', 'NIFTYBEES', 'GOLDBEES', 'SBIGILT'],
    referenceDate: fixedDate,
  });

  assert.equal(res.lookbackDays, 90);
  assert.deepEqual(res.symbols, ['PPFAS', 'NIFTYBEES', 'GOLDBEES', 'SBIGILT']);
  assert.equal(res.matrix.length, 4);
  assert.equal(res.cells.length, 16);

  for (let i = 0; i < 4; i++) {
    assert.equal(res.matrix[i][i], 1);
    for (let j = 0; j < 4; j++) {
      assert.equal(res.matrix[i][j], res.matrix[j][i]);
      assert.ok(res.matrix[i][j] >= -1 && res.matrix[i][j] <= 1);
    }
  }

  // Equity peers (PPFAS vs NIFTYBEES) should correlate more strongly than Equity vs Gold or Equity vs Sovereign Debt
  const rEquityPair = res.matrix[0][1];
  const rEquityGold = res.matrix[1][2];
  const rEquityDebt = res.matrix[1][3];
  assert.ok(rEquityPair > rEquityGold, `Expected equity pair (${rEquityPair}) > equity-gold (${rEquityGold})`);
  assert.ok(rEquityPair > rEquityDebt, `Expected equity pair (${rEquityPair}) > equity-debt (${rEquityDebt})`);

  assert.ok(res.strongestPositivePair !== null);
  assert.ok(res.bestDiversifierPair !== null);
  assert.ok(res.strongestPositivePair.r >= res.bestDiversifierPair.r);
  assert.ok(res.diversificationScore >= 0 && res.diversificationScore <= 100);
});

test('buildRollingPairCorrelationSeries90d produces bounded 21-day rolling correlation points', () => {
  const fixedDate = new Date('2026-11-21T00:00:00Z');
  const res = build90DayCorrelationMatrix({
    symbols: ['QQQ', 'SPY', 'TLT'],
    referenceDate: fixedDate,
  });

  const rolling = buildRollingPairCorrelationSeries90d(res, 'QQQ', 'TLT', 21);
  assert.equal(rolling.length, 69); // 90 - 21
  assert.ok(rolling.every((pt) => pt.rollingCorrelation >= -1 && pt.rollingCorrelation <= 1));
  assert.ok(rolling.every((pt) => Number.isFinite(pt.rebasedA) && Number.isFinite(pt.rebasedB)));
});

test('classifyCorrelationCell maps ranges cleanly across positive, neutral, inverse, and identity', () => {
  assert.equal(classifyCorrelationCell(1, true).relationshipLabel, 'Identity (Self)');
  assert.equal(classifyCorrelationCell(0.82, false).relationshipLabel, 'Strong Positive');
  assert.equal(classifyCorrelationCell(0.45, false).relationshipLabel, 'Moderate Positive');
  assert.equal(classifyCorrelationCell(0.05, false).relationshipLabel, 'Low / Uncorrelated');
  assert.equal(classifyCorrelationCell(-0.4, false).relationshipLabel, 'Moderate Inverse');
  assert.equal(classifyCorrelationCell(-0.78, false).relationshipLabel, 'Strong Inverse');
});
