import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSectorGroups,
  getHeatmapTileSpan,
  getHeatmapTileStyle,
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

test('buildSectorGroups filters by market and sector with market-cap descending sort', () => {
  const globalGroups = buildSectorGroups(HEATMAP_STOCKS, 'global', 'All');
  assert.equal(globalGroups.length, 6);
  assert.ok(globalGroups[0].totalCapB >= globalGroups[1].totalCapB);

  const techOnly = buildSectorGroups(HEATMAP_STOCKS, 'global', 'Technology');
  assert.equal(techOnly.length, 1);
  assert.equal(techOnly[0].sector, 'Technology');
  assert.equal(techOnly[0].advancers, 4);
  assert.equal(techOnly[0].decliners, 1);

  const indiaGroups = buildSectorGroups(HEATMAP_STOCKS, 'india', 'All');
  assert.equal(indiaGroups.length, 6);
  assert.ok(indiaGroups.every((g) => g.tiles.every((t) => t.market === 'india')));
});

test('getHeatmapTileSpan fills exact 4-column grid rectangles with zero orphan gaps', () => {
  assert.equal(getHeatmapTileSpan(0, 1), 'col-span-4 row-span-2');
  assert.equal(getHeatmapTileSpan(0, 2), 'col-span-2 row-span-2');
  assert.equal(getHeatmapTileSpan(1, 3), 'col-span-2 row-span-1');
  assert.equal(getHeatmapTileSpan(2, 4), 'col-span-1 row-span-1');
  assert.equal(getHeatmapTileSpan(3, 5), 'col-span-1 row-span-1');
});

test('heatmapTileToMarketSymbolRow converts tile into valid quote modal payload', () => {
  const nvda = HEATMAP_STOCKS[0];
  const row = heatmapTileToMarketSymbolRow(nvda);
  assert.equal(row.symbol, nvda.symbol);
  assert.equal(row.price, nvda.price);
  assert.equal(row.changePercent, nvda.changePercent);
  assert.ok(row.sparkline.length >= 4);
});
