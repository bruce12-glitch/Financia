import test from 'node:test';
import assert from 'node:assert/strict';
import {
  amfiSchemesToHeatmapTiles,
  applyHeatmapTick,
  buildCustomHeatmapTiles,
  buildSectorGroups,
  calculateRealizedVolatility,
  classifyAmfiSchemeToSector,
  computeD3TreemapLayout,
  filterHeatmapTilesByQuery,
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

test('calculateRealizedVolatility and getVolatilityTileStyle separate calm Debt vs volatile Equity funds', () => {
  const calmDebtVol = calculateRealizedVolatility([100, 100.05, 100.1, 100.12, 100.16], 0.08);
  const volatileVol = calculateRealizedVolatility([100, 105, 98, 107, 101], 3.8);

  assert.ok(calmDebtVol >= 8.5 && calmDebtVol < 22);
  assert.ok(volatileVol > calmDebtVol);
  assert.equal(getVolatilityTileStyle(calmDebtVol).tier, 'Calm');
  assert.equal(getVolatilityTileStyle(42).tier, 'Extreme');
});

test('expanded neutral HEATMAP_STOCKS universe includes broad multi-AMC coverage across India and Global', () => {
  const indiaTiles = HEATMAP_STOCKS.filter((t) => t.market === 'india');
  const globalTiles = HEATMAP_STOCKS.filter((t) => t.market === 'global');

  assert.ok(indiaTiles.length >= 40, `Expected >=40 India funds, got ${indiaTiles.length}`);
  assert.ok(globalTiles.length >= 28, `Expected >=28 Global ETFs, got ${globalTiles.length}`);

  const indiaGroups = buildSectorGroups(HEATMAP_STOCKS, 'india', 'All');
  const globalGroups = buildSectorGroups(HEATMAP_STOCKS, 'global', 'All');
  const allGroups = buildSectorGroups(HEATMAP_STOCKS, 'all', 'All');

  assert.equal(indiaGroups.length, 7);
  assert.equal(globalGroups.length, 5);
  assert.equal(allGroups.length, 12);
});

test('applyHeatmapTick advances NAVs/prices, preserves formatting, and bounds sparkline history', () => {
  const next = applyHeatmapTick(HEATMAP_STOCKS, 1);
  assert.equal(next.length, HEATMAP_STOCKS.length);
  const sgb = next.find((t) => t.symbol === 'SGBMAR31');
  assert.ok(sgb && sgb.price.includes(','));
  assert.ok(next[0].sparkline.length === HEATMAP_STOCKS[0].sparkline.length + 1);
});

test('computeD3TreemapLayout supports AUM, Equal, and Move sizing with bounded rectangles', () => {
  const groups = buildSectorGroups(HEATMAP_STOCKS, 'india', 'All');
  const aumLayout = computeD3TreemapLayout(groups, 1180, 520, 'aum');
  const eqLayout = computeD3TreemapLayout(groups, 1180, 520, 'equal');
  const moveLayout = computeD3TreemapLayout(groups, 1180, 520, 'move');

  assert.equal(aumLayout.sectors.length, 7);
  assert.equal(aumLayout.tiles.length, eqLayout.tiles.length);
  assert.equal(aumLayout.tiles.length, moveLayout.tiles.length);
  assert.ok(aumLayout.maxVolatilityPct > 0);

  for (const leaf of aumLayout.tiles) {
    assert.ok(leaf.x0 >= 0 && leaf.x1 <= 1180);
    assert.ok(leaf.y0 >= 0 && leaf.y1 <= 520);
    assert.ok(leaf.x1 > leaf.x0 && leaf.y1 > leaf.y0);
  }
});

test('classifyAmfiSchemeToSector and amfiSchemesToHeatmapTiles convert SQLite schemes into categorized tiles', () => {
  assert.equal(classifyAmfiSchemeToSector('Parag Parikh Liquid Fund Direct'), 'Liquid & Overnight');
  assert.equal(classifyAmfiSchemeToSector('SBI Magnum Gilt Direct Growth'), 'Gilt & Corporate Debt');
  assert.equal(classifyAmfiSchemeToSector('Motilal Oswal Midcap Direct'), 'Mid & Multi Cap');
  assert.equal(classifyAmfiSchemeToSector('Quant Small Cap Direct'), 'Small Cap & Value');
  assert.equal(classifyAmfiSchemeToSector('ICICI Pru Balanced Advantage'), 'Hybrid & Multi-Asset');

  const tiles = amfiSchemesToHeatmapTiles([
    { scheme_code: '122639', scheme_name: 'Parag Parikh Flexi Cap Direct Growth', latest_nav: 89.42, nav_count: 1500 },
    { scheme_code: '120503', scheme_name: 'Axis ELSS Tax Saver Direct Growth', latest_nav: 102.15, nav_count: 1200 },
    { scheme_code: '120503', scheme_name: 'Duplicate Should Deduplicate', latest_nav: 99.0 },
  ]);

  assert.equal(tiles.length, 2);
  assert.equal(tiles[0].symbol, '122639');
  assert.equal(tiles[0].source, 'amfi-db');
  assert.equal(tiles[0].sparkline.length, 5);
});

test('buildCustomHeatmapTiles and filterHeatmapTilesByQuery allow users to define custom buckets and filter funds', () => {
  const customTiles = buildCustomHeatmapTiles(
    [
      { symbol: 'PPFAS', name: 'Parag Parikh Flexi Cap Direct', sector: 'My Core Equity', market: 'india' },
      { symbol: '122639', name: 'Custom AMFI Scheme Direct', sector: 'My Satellite', market: 'india', price: '142.50', unit: 'INR' },
    ],
    HEATMAP_STOCKS
  );

  assert.equal(customTiles.length, 2);
  assert.equal(customTiles[0].sector, 'My Core Equity');
  assert.equal(customTiles[1].sector, 'My Satellite');
  assert.equal(customTiles[1].price, '142.50');

  const matched = filterHeatmapTilesByQuery(customTiles, 'satellite');
  assert.equal(matched.length, 1);
  assert.equal(matched[0].symbol, '122639');
});

test('getHeatmapTileSpan and heatmapTileToMarketSymbolRow preserve clean layout and quote conversion', () => {
  assert.equal(getHeatmapTileSpan(0, 1), 'col-span-4 row-span-2');
  const goldTile = HEATMAP_STOCKS.find((t) => t.symbol === 'GLD')!;
  const row = heatmapTileToMarketSymbolRow(goldTile);
  assert.equal(row.symbol, 'GLD');
  assert.equal(row.category, 'gold');
  assert.ok(row.sparkline.length >= 4);
});
