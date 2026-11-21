import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuarterlyNavBreakdown,
  buildSmoothSeriesPaths,
  computeSifDispersionSummary,
} from './liveWorkspaceAnalytics';

test('buildQuarterlyNavBreakdown computes authentic quarterly returns and drawdowns', () => {
  const points = [
    { date: '2025-10-10', nav: 100 },
    { date: '2025-11-15', nav: 105 },
    { date: '2025-12-20', nav: 102 },
    { date: '2026-01-12', nav: 104 },
    { date: '2026-02-18', nav: 110 },
    { date: '2026-03-25', nav: 108 },
    { date: '2026-04-08', nav: 109 },
    { date: '2026-06-22', nav: 118 },
  ];

  const quarters = buildQuarterlyNavBreakdown(points, 4);
  assert.equal(quarters.length, 3);
  assert.equal(quarters[0].quarterLabel, 'Q4 2025');
  assert.equal(quarters[0].periodReturnPct, 2);
  assert.ok(quarters[0].maxDrawdownPct < 0);
  assert.equal(quarters[2].quarterLabel, 'Q2 2026');
  assert.equal(quarters[2].endNav, 118);
});

test('buildSmoothSeriesPaths generates valid bounded SVG geometry and handles downsampling', () => {
  const series = Array.from({ length: 120 }, (_, i) => 50 + i * 0.4 + Math.sin(i) * 1.2);
  const paths = buildSmoothSeriesPaths(series, 400, 120);
  assert.ok(paths);
  assert.ok(paths.linePath.startsWith('M'));
  assert.ok(paths.areaPath.endsWith('Z'));
  assert.ok(paths.lastX <= 400 && paths.lastY >= 0 && paths.lastY <= 120);
});

test('computeSifDispersionSummary computes real median, top, and bottom SIF returns', () => {
  const summary = computeSifDispersionSummary([
    { scheme_code: '1', scheme_name: 'qsif A', latest_nav: 11.2, first_nav: 10.0 },
    { scheme_code: '2', scheme_name: 'qsif B', latest_nav: 10.5, first_nav: 10.0 },
    { scheme_code: '3', scheme_name: 'qsif C', latest_nav: 9.8, first_nav: 10.0 },
  ]);

  assert.equal(summary.count, 3);
  assert.equal(summary.medianReturnPct, 5);
  assert.equal(summary.topScheme?.code, '1');
  assert.equal(summary.bottomScheme?.code, '3');
  assert.equal(summary.positiveCount, 2);
});
