import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyHeatmapTick,
  buildSectorGroups,
  calculateRealizedVolatility,
  computeD3TreemapLayout,
  getHeatmapTileSpan,
  getHeatmapTileStyle,
  getVolatilityTileStyle,
  HEATMAP_STOCKS,
  heatmapTileToMarketSymbolRow,
} from './heatmapEngine';

test('getHeatmapTileStyle returns high-contrast green for gains and red for losses', () => {
  const strongGain = getHeatmapTileStyle(3.6);
  assert.equal(strongGain.tier, 'Strong Gain');
  assert.equal(strongGain.text, '#FFFFFF');

  const mildGain = getHeatmapTileStyle(0.25);
  assert.equal(mildGain.tier, 'Gain');

  const flat = getHeatmapTileStyle(0);
  assert.equal(flat.tier, 'Flat');

  const sharpLoss = getHeatmapTileStyle(-2.45);
  assert.equal(sharpLoss.tier, 'Sharp Loss');
  assert.equal(sharpLoss.text, '#FFFFFF');
});

test('calculateRealizedVolatility and getVolatilityTileStyle separate calm Debt vs volatile Bullion/Equity funds', () => {
  const calmDebtVol = calculateRealizedVolatility([100, 100.05, 100.1, 100.12, 100.16], 0.08);
  const volatileVol = calculateRealizedVolatility([100, 105, 98, 107, 101], 3.8);

  assert.ok(calmDebtVol >= 8.5 && calmDebtVol < 22);
  assert.ok(volatileVol > calmDebtVol);
  assert.equal(getVolatilityTileStyle(calmDebtVol).tier, 'Calm');
  assert.equal(getVolatilityTileStyle(42).tier, 'Extreme');
});

test('applyHeatmapTick advances NAVs/prices, preserves formatting, and bounds sparkline history', () => {
  const next = applyHeatmapTick(HEATMAP_STOCKS, 1);
  assert.equal(next.length, HEATMAP_STOCKS.length);
  const sgb = next.find((t) => t.symbol === 'SGBMAR31');
  assert.ok(sgb && sgb.price.includes(','));
  assert.ok(next[0].sparkline.length === HEATMAP_STOCKS[0].sparkline.length + 1);
});

test('buildSectorGroups filters by market and 4-pillar sector with AUM descending sort and volatility metrics', () => {
  const globalGroups = buildSectorGroups(HEATMAP_STOCKS, 'global', 'All');
  assert.equal(globalGroups.length, 6);
  assert.ok(globalGroups[0].totalCapB >= globalGroups[1].totalCapB);
  assert.ok(globalGroups[0].volatilityPct > 0);
  assert.ok(globalGroups[0].dispersionPct >= 0);

  const goldOnly = buildSectorGroups(HEATMAP_STOCKS, 'global', 'Gold & Bullion ETFs');
  assert.equal(goldOnly.length, 1);
  assert.equal(goldOnly[0].sector, 'Gold & Bullion ETFs');
  assert.equal(goldOnly[0].advancers, 3);
  assert.equal(goldOnly[0].decliners, 0);

  const indiaGroups = buildSectorGroups(HEATMAP_STOCKS, 'india', 'All');
  assert.equal(indiaGroups.length, 6);
  assert.ok(indiaGroups.every((g) => g.tiles.every((t) => t.market === 'india')));
});

test('computeD3TreemapLayout generates bounded non-zero D3 treemap rectangles for every fund/ETF asset class', () => {
  const groups = buildSectorGroups(HEATMAP_STOCKS, 'global', 'All');
  const layout = computeD3TreemapLayout(groups, 1160, 480);

  assert.equal(layout.sectors.length, 6);
  assert.equal(layout.tiles.length, 17);
  assert.ok(layout.maxVolatilityPct > 0);

  for (const s of layout.sectors) {
    assert.ok(s.x0 >= 0 && s.x1 <= 1160);
    assert.ok(s.y0 >= 0 && s.y1 <= 480);
    assert.ok(s.x1 > s.x0 && s.y1 > s.y0);
  }
  for (const leaf of layout.tiles) {
    assert.ok(leaf.x0 >= 0 && leaf.x1 <= 1160);
    assert.ok(leaf.y0 >= 0 && leaf.y1 <= 480);
    assert.ok(leaf.x1 > leaf.x0 && leaf.y1 > leaf.y0);
    assert.ok(leaf.volatilityPct >= 8.5);
  }
});

test('getHeatmapTileSpan fills exact 4-column grid rectangles with zero orphan gaps', () => {
  assert.equal(getHeatmapTileSpan(0, 1), 'col-span-4 row-span-2');
  assert.equal(getHeatmapTileSpan(0, 2), 'col-span-2 row-span-2');
  assert.equal(getHeatmapTileSpan(1, 3), 'col-span-2 row-span-1');
  assert.equal(getHeatmapTileSpan(2, 4), 'col-span-1 row-span-1');
  assert.equal(getHeatmapTileSpan(3, 5), 'col-span-1 row-span-1');
});

test('heatmapTileToMarketSymbolRow converts 4-pillar tile into valid quote modal payload', () => {
  const goldTile = HEATMAP_STOCKS.find((t) => t.symbol === 'GLD')!;
  const row = heatmapTileToMarketSymbolRow(goldTile);
  assert.equal(row.symbol, goldTile.symbol);
  assert.equal(row.price, goldTile.price);
  assert.equal(row.category, 'gold');
  assert.ok(row.sparkline.length >= 4);
});
