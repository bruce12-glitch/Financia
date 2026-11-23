import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_FUNDS } from './screenerEngine';
import { getFundIntelligence } from './fundIntelligenceEngine';
import { buildBullBearSectorTreemapData, classifySectorStance } from './sectorHeatmapEngine';

test('classifySectorStance maps momentum bands to Bullish, Neutral, and Bearish stances', () => {
  assert.equal(classifySectorStance(2.8).stance, 'Bullish');
  assert.equal(classifySectorStance(0.6).stance, 'Bullish');
  assert.equal(classifySectorStance(0.1).stance, 'Neutral');
  assert.equal(classifySectorStance(-0.8).stance, 'Bearish');
  assert.equal(classifySectorStance(-2.5).stance, 'Bearish');
});

test('buildBullBearSectorTreemapData computes accurate Bull/Neutral/Bear totals and filters across all funds', () => {
  for (const fund of SCREENER_FUNDS) {
    const intel = getFundIntelligence(fund);
    const summary = buildBullBearSectorTreemapData(intel.sectorHeatmap);

    assert.ok(summary.nodes.length >= 2, `${fund.symbol} should produce at least 2 treemap nodes`);
    const total = Number(
      (summary.bullWeightPct + summary.neutralWeightPct + summary.bearWeightPct).toFixed(1)
    );
    assert.ok(total >= 99 && total <= 101, `${fund.symbol} stance weights should sum to ~100%, got ${total}`);
    assert.equal(
      summary.netTiltPct,
      Number((summary.bullWeightPct - summary.bearWeightPct).toFixed(1))
    );
  }
});

test('buildBullBearSectorTreemapData respects Bullish/Bearish filtering with graceful fallback', () => {
  const sample = [
    { sector: 'Technology', weightPct: 50, change1MPct: -2.4, topHolding: 'Apple', peMultiple: 30 },
    { sector: 'Financials', weightPct: 30, change1MPct: 1.8, topHolding: 'HDFC Bank', peMultiple: 17 },
    { sector: 'Cash', weightPct: 20, change1MPct: 0.1, topHolding: 'T-Bills', peMultiple: null },
  ];

  const all = buildBullBearSectorTreemapData(sample, 'ALL');
  assert.equal(all.bullWeightPct, 30);
  assert.equal(all.bearWeightPct, 50);
  assert.equal(all.neutralWeightPct, 20);
  assert.equal(all.netTiltPct, -20);
  assert.equal(all.dominantStance, 'Bearish');
  assert.equal(all.strongestBull?.name, 'Financials');
  assert.equal(all.strongestBear?.name, 'Technology');

  const bullOnly = buildBullBearSectorTreemapData(sample, 'Bullish');
  assert.equal(bullOnly.nodes.length, 1);
  assert.equal(bullOnly.nodes[0].name, 'Financials');

  const bearOnly = buildBullBearSectorTreemapData(sample, 'Bearish');
  assert.equal(bearOnly.nodes.length, 1);
  assert.equal(bearOnly.nodes[0].name, 'Technology');
});
