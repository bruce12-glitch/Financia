import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHoldingsHierarchy,
  computeD3SunburstLayout,
  computeD3TreemapLayout,
  DbHoldingRow,
  formatMarketValueCr,
  roundHalfEven,
} from './holdingsHierarchyEngine';

function makeRow(overrides: Partial<DbHoldingRow>): DbHoldingRow {
  return {
    fund_code: 'PPFASFLEXICAP',
    fund_name: 'Parag Parikh Flexi Cap Fund',
    fund_category: 'flexicap',
    month_end: '2026-10-31',
    isin: 'INE040A01034',
    security_name: 'HDFC BANK LIMITED',
    nse_symbol: 'HDFCBANK',
    market_value_lakh: 1200000,
    quantity: 140000000,
    pct_of_fund: 8.1,
    asset_group: 'Equity',
    asset_subgroup: 'Listed shares',
    mapping_category: null,
    isin_type: 'ISIN',
    line_count: 1,
    amfi_ssd_fund_id: '7086',
    amc: 'PPFAS Mutual Fund',
    fund_aum_cr: 159446.05,
    riskometer: 'Very High',
    ter_direct: 0.68,
    ter_regular: 1.29,
    ...overrides,
  };
}

test('roundHalfEven applies Banker rounding deterministically', () => {
  assert.equal(roundHalfEven(2.5, 0), 2);
  assert.equal(roundHalfEven(3.5, 0), 4);
  assert.equal(roundHalfEven(1.235, 2), 1.24);
  assert.equal(roundHalfEven(1.225, 2), 1.22);
  assert.equal(roundHalfEven(Number.NaN, 2), 0);
});

test('buildHoldingsHierarchy ignores zero/negative rows, deduplicates ISINs, and computes HHI & asset breakdown', () => {
  const rows: DbHoldingRow[] = [
    makeRow({ isin: 'INE040A01034', security_name: 'HDFC Bank', nse_symbol: 'HDFCBANK', pct_of_fund: 10.0, market_value_lakh: 100000 }),
    // Duplicate ISIN with smaller weight (e.g. historical leak) must be deduped cleanly
    makeRow({ isin: 'INE040A01034', security_name: 'HDFC Bank Old', nse_symbol: 'HDFCBANK', pct_of_fund: 7.5, market_value_lakh: 75000 }),
    // Zero and negative weights must be discarded safely
    makeRow({ isin: 'INE999Z00001', security_name: 'Zero Row', pct_of_fund: 0, market_value_lakh: 0 }),
    makeRow({ isin: 'INE999Z00002', security_name: 'Negative Row', pct_of_fund: -1.5, market_value_lakh: -500 }),
    makeRow({ isin: 'INE154A01025', security_name: 'ITC Ltd', nse_symbol: 'ITC', pct_of_fund: 8.0, market_value_lakh: 80000 }),
    makeRow({
      isin: 'US02079K3059',
      security_name: 'Alphabet Inc.',
      nse_symbol: null,
      pct_of_fund: 6.0,
      market_value_lakh: 60000,
      asset_group: 'Foreign stocks',
      asset_subgroup: 'Foreign shares',
    }),
    makeRow({
      isin: 'SYNTREPS00001',
      security_name: 'TREPS',
      nse_symbol: null,
      pct_of_fund: 4.0,
      market_value_lakh: 40000,
      asset_group: 'Cash',
      asset_subgroup: 'TREPS and triparty repo',
    }),
  ];

  const analysis = buildHoldingsHierarchy(rows);
  assert.equal(analysis.securityCount, 4);
  assert.equal(analysis.totalWeightPct, 28);
  assert.equal(analysis.top5WeightPct, 28);
  // HHI = 10^2 + 8^2 + 6^2 + 4^2 = 100 + 64 + 36 + 16 = 216
  assert.equal(analysis.hhiIndex, 216);
  assert.equal(analysis.effectiveHoldings, roundHalfEven(10000 / 216, 1));
  assert.equal(analysis.assetGroupBreakdown.length, 3);
  assert.equal(analysis.assetGroupBreakdown[0].assetGroup, 'Equity');
  assert.equal(analysis.assetGroupBreakdown[0].weightPct, 18);
  assert.equal(formatMarketValueCr(100000), '₹1,000 Cr');
});

test('computeD3TreemapLayout and computeD3SunburstLayout produce valid non-overlapping geometry without double counting', () => {
  const rows: DbHoldingRow[] = [
    makeRow({ isin: 'INE1', security_name: 'HDFC Bank', nse_symbol: 'HDFCBANK', pct_of_fund: 12.5 }),
    makeRow({ isin: 'INE2', security_name: 'ICICI Bank', nse_symbol: 'ICICIBANK', pct_of_fund: 9.5 }),
    makeRow({ isin: 'INE3', security_name: 'Infosys', nse_symbol: 'INFY', pct_of_fund: 7.0 }),
    makeRow({
      isin: 'US1',
      security_name: 'Microsoft Corp',
      nse_symbol: 'MSFT',
      pct_of_fund: 8.0,
      asset_group: 'Foreign stocks',
      asset_subgroup: 'Foreign shares',
    }),
    makeRow({
      isin: 'REIT1',
      security_name: 'Embassy Office Parks REIT',
      nse_symbol: 'EMBASSY',
      pct_of_fund: 5.0,
      asset_group: 'REITs and InvITs',
      asset_subgroup: 'REIT units',
    }),
    makeRow({
      isin: 'CASH1',
      security_name: 'TREPS',
      nse_symbol: null,
      pct_of_fund: 3.0,
      asset_group: 'Cash',
      asset_subgroup: 'TREPS and triparty repo',
    }),
  ];

  const analysis = buildHoldingsHierarchy(rows);

  const treemap = computeD3TreemapLayout(analysis.root, 680, 420);
  assert.equal(treemap.totalValue, 45);
  assert.equal(treemap.groups.length, 4);
  assert.equal(treemap.leaves.length, 6);
  for (const leaf of treemap.leaves) {
    assert.ok(leaf.x1 > leaf.x0, `Expected positive width for ${leaf.name}`);
    assert.ok(leaf.y1 > leaf.y0, `Expected positive height for ${leaf.name}`);
    assert.ok(leaf.x0 >= 0 && leaf.x1 <= 680);
    assert.ok(leaf.y0 >= 0 && leaf.y1 <= 420);
  }

  const sunburst = computeD3SunburstLayout(analysis.root, 210);
  assert.equal(sunburst.totalValue, 45);
  // 4 asset groups + 4 subgroups + 6 leaf securities = 14 arcs
  assert.equal(sunburst.arcs.length, 14);
  assert.ok(sunburst.arcs.every((a) => a.pathD.length > 10));
});

test('buildHoldingsHierarchy supports asset-group drill-down focus and handles empty rows gracefully', () => {
  const empty = buildHoldingsHierarchy([]);
  assert.equal(empty.securityCount, 0);
  assert.equal(computeD3TreemapLayout(empty.root, 600, 400).leaves.length, 0);
  assert.equal(computeD3SunburstLayout(empty.root, 200).arcs.length, 0);

  const focused = buildHoldingsHierarchy(
    [
      makeRow({ isin: 'INE1', pct_of_fund: 10, asset_group: 'Equity' }),
      makeRow({ isin: 'CASH1', pct_of_fund: 5, asset_group: 'Cash', asset_subgroup: 'TREPS' }),
    ],
    { focusAssetGroup: 'Cash' }
  );
  assert.equal(focused.root.children?.length, 1);
  assert.equal(focused.root.children?.[0].name, 'Cash');
  // Full-portfolio breakdown remains intact for navigation
  assert.equal(focused.assetGroupBreakdown.length, 2);
});
