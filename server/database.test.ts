import test from 'node:test';
import assert from 'node:assert/strict';
import { FinanciaMutualFundDatabase } from './database';
import { parseAmfiNavText } from './parsers';

test('FinanciaMutualFundDatabase enforces text amfi_ssd_fund_id joins, AUM dedup, and ISIN holding aggregation', () => {
  const db = new FinanciaMutualFundDatabase(':memory:');
  try {
    // 1. Seed pre-loaded AMFI Interval Fund rows must exist immediately
    const initialAmfi = db.queryAmfiNavRecords({ limit: 100 });
    assert.equal(initialAmfi.total, 41);

    // 2. Load scheme_details with BOTH numeric ID and text "scheme:101244" ID and dedup flags
    const detailsCsv = [
      'scheme_code,isin,scheme_name,fund_name_latest,amc,category_group_clean,category_sub,scheme_plan,is_active,amfi_ssd_fund_id,fund_dedup_flag,amfi_daily_fund_name,amfi_daily_fund_aum_cr_all_plans,amfi_daily_aum_date,amfi_daily_riskometer,amfi_daily_benchmark,ssd_fund_managers,ssd_allotment_date,ssd_exit_load,ssd_objective,ter_date,ter_regular,ter_direct,source',
      '100001,INF100001,HDFC Flexi Cap - Regular,HDFC Flexi Cap Fund,HDFC Mutual Fund,Equity Scheme,Flexi Cap Fund,Regular,true,scheme:101244,true,HDFC Flexi Cap Fund,65000.5,2026-11-19,Very High,NIFTY 500 TRI,Roshi Jain,1995-01-01,1% within 1Y,Growth,2026-11-19,1.45,0.72,MF',
      '100002,INF100002,HDFC Flexi Cap - Direct,HDFC Flexi Cap Fund,HDFC Mutual Fund,Equity Scheme,Flexi Cap Fund,Direct,true,scheme:101244,false,HDFC Flexi Cap Fund,65000.5,2026-11-19,Very High,NIFTY 500 TRI,Roshi Jain,1995-01-01,1% within 1Y,Growth,2026-11-19,1.45,0.72,MF',
    ].join('\n');
    assert.equal(db.replaceSchemeDetailsFromCsv(detailsCsv), 2);

    // Total deduplicated AUM must NOT double-count Regular + Direct plans
    const overview = db.getOverview();
    assert.equal(overview.kpis.dedupFundCount, 1);
    assert.equal(overview.kpis.totalDedupAumCr, 65000.5);

    // 3. Load portfolio_holdings with TWO rows sharing SYN000TREPS for the same fund-month
    const holdingsCsv = [
      'fund_code,fund_name,fund_category,month_end,isin,security_name,nse_symbol,market_value_lakh,quantity,pct_of_fund,asset_group,asset_subgroup,mapping_category,mapping_reason,isin_as_filed,instrument_name_as_filed,amfi_ssd_fund_id,isin_type',
      'HDFCFLEXICAP,HDFC Flexi Cap Fund,flexicap,2026-10-31,SYN000TREPS,TREPS / Triparty Repo,,1200.25,0,2.0,Cash,TREPS and triparty repo,TREPS_AGGREGATE,Grouped cash,,TREPS Line 1,scheme:101244,Group code',
      'HDFCFLEXICAP,HDFC Flexi Cap Fund,flexicap,2026-10-31,SYN000TREPS,TREPS / Triparty Repo,,800.75,0,1.5,Cash,TREPS and triparty repo,TREPS_AGGREGATE,Grouped cash,,TREPS Line 2,scheme:101244,Group code',
      'HDFCFLEXICAP,HDFC Flexi Cap Fund,flexicap,2026-10-31,INE040A01034,HDFC BANK LTD,HDFCBANK,50000.0,3000000,8.5,Equity,Listed shares,,,INE040A01034,HDFC Bank Ltd £,scheme:101244,ISIN',
    ].join('\n');
    assert.equal(db.replacePortfolioHoldingsFromCsv(holdingsCsv), 3);

    // Aggregated view must merge the two SYN000TREPS rows and join fund_aum_cr via text "scheme:101244"
    const agg = db.queryHoldings({ fundCode: 'HDFCFLEXICAP', monthEnd: '2026-10-31', aggregated: true });
    assert.equal(agg.total, 2);
    const aggRows = agg.rows as Array<Record<string, unknown>>;
    const treps = aggRows.find((r) => r.isin === 'SYN000TREPS');
    assert.ok(treps);
    assert.equal(treps.market_value_lakh, 2001);
    assert.equal(treps.line_count, 2);
    assert.equal(treps.fund_aum_cr, 65000.5);

    // Raw mode must keep all 3 rows
    const raw = db.queryHoldings({ fundCode: 'HDFCFLEXICAP', monthEnd: '2026-10-31', aggregated: false });
    assert.equal(raw.total, 3);

    // 4. Upsert a new AMFI NAV row and verify Financia-compatible nav_master view & SQL export
    const customFeed = [
      'Open Ended Schemes(Equity)',
      'Parag Parikh Mutual Fund',
      '122639;INF879O01027;-;Parag Parikh Flexi Cap Fund - Direct Plan;Direct Plan;Growth Option;91.2450;21-Nov-2026',
    ].join('\n');
    const parsed = parseAmfiNavText(customFeed, 'TEST_INGEST');
    const upsertRes = db.upsertAmfiNavRecords(parsed.records);
    assert.equal(upsertRes.upserted, 1);
    assert.equal(upsertRes.totalInTable, 42);

    const sqlRes = db.executeReadOnlySql(
      'SELECT scheme_code, date, nav, isin FROM nav_master WHERE scheme_code = 122639'
    );
    assert.equal(sqlRes.rowCount, 1);
    assert.equal(sqlRes.rows[0].nav, 91.245);
    assert.equal(sqlRes.rows[0].date, '2026-11-21');

    const sqlDump = db.exportFinanciaNavMasterSql(10);
    assert.ok(sqlDump.includes('CREATE TABLE IF NOT EXISTS "nav_master"'));
    assert.ok(sqlDump.includes("122639,'2026-11-21',91.245"));

    // 5. Ensure SQL Workbench rejects write operations
    assert.throws(() => db.executeReadOnlySql('DELETE FROM portfolio_holdings'));
  } finally {
    db.close();
  }
});

test('FinanciaMutualFundDatabase ingests Fund Terminal catalog, ranks autocomplete, joins details/holdings, and compares funds', () => {
  const db = new FinanciaMutualFundDatabase(':memory:');
  try {
    const detailsCsv = [
      'scheme_code,isin,scheme_name,fund_name_latest,amc,category_group_clean,category_sub,scheme_plan,is_active,amfi_ssd_fund_id,fund_dedup_flag,amfi_daily_fund_name,amfi_daily_fund_aum_cr_all_plans,amfi_daily_aum_date,amfi_daily_riskometer,amfi_daily_benchmark,ssd_fund_managers,ssd_allotment_date,ssd_exit_load,ssd_objective,ter_date,ter_regular,ter_direct,source',
      '122639,INF879O01027,Parag Parikh Flexi Cap Fund - Direct Plan,Parag Parikh Flexi Cap Fund,PPFAS Mutual Fund,Equity Scheme,Flexi Cap Fund,Direct,true,9054,true,Parag Parikh Flexi Cap Fund,82500.0,2026-11-20,Very High,NIFTY 500 TRI,Rajeev Thakkar,2013-05-24,2% within 365D,Long-term equity,2026-11-20,1.33,0.63,MF',
    ].join('\n');
    db.replaceSchemeDetailsFromCsv(detailsCsv);

    const holdingsCsv = [
      'fund_code,fund_name,fund_category,month_end,isin,security_name,nse_symbol,market_value_lakh,quantity,pct_of_fund,asset_group,asset_subgroup,mapping_category,mapping_reason,isin_as_filed,instrument_name_as_filed,amfi_ssd_fund_id,isin_type',
      'PPFASFC,Parag Parikh Flexi Cap Fund,flexicap,2026-10-31,INE040A01034,HDFC BANK LTD,HDFCBANK,650000,40000000,8.12,Equity,Listed shares,,,INE040A01034,HDFC Bank,9054,ISIN',
    ].join('\n');
    db.replacePortfolioHoldingsFromCsv(holdingsCsv);

    const amfiSample = [
      'Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date',
      'Open Ended Schemes(Equity Scheme - Flexi Cap Fund)',
      'PPFAS Mutual Fund',
      '122639;INF879O01027;-;Parag Parikh Flexi Cap Fund - Direct Plan;Direct;Growth;91.5000;20-Nov-2026',
      '122640;INF879O01019;-;Parag Parikh Flexi Cap Fund - Regular Plan;Regular;Growth;84.0000;20-Nov-2026',
      'HDFC Mutual Fund',
      '118955;INF179K01UT0;-;HDFC Flexi Cap Fund - Direct Plan - Growth;Direct;Growth;1942.1000;20-Nov-2026',
      'Open Ended Schemes(Other Scheme - Gold ETF)',
      'Nippon India Mutual Fund',
      '101305;INF204KB17I5;-;Nippon India ETF Gold BeES;-;-;78.4200;20-Nov-2026',
    ].join('\n');

    const audit = db.ingestTerminalCatalogText(amfiSample, 'unit_test_amfi.txt');
    assert.equal(audit.parsedCount, 4);
    assert.equal(audit.activeCount, 4);
    assert.equal(audit.etfCount, 1);
    assert.equal(audit.mutualFundCount, 3);

    const stats = db.getTerminalStats();
    assert.equal(stats.totalSchemes, 4);
    assert.equal(stats.etfCount, 1);
    assert.equal(stats.enrichedWithDetailsCount, 1);

    // Autocomplete with empty query must not fail SQLite ORDER BY and should rank active schemes
    const emptyAuto = db.autocompleteTerminalFunds({ q: '', instrumentType: 'ALL', activeOnly: true, limit: 10 });
    assert.equal(emptyAuto.count, 4);

    // Autocomplete filtering by ETF scope
    const etfAuto = db.autocompleteTerminalFunds({ q: 'Gold', instrumentType: 'ETF', activeOnly: true });
    assert.equal(etfAuto.count, 1);
    assert.equal((etfAuto.items[0] as Record<string, unknown>).scheme_code, '101305');

    // Dossier must include Direct vs Regular NAV advantage, share classes, category peers, and cross-joined top holdings
    const dossier = db.getTerminalFundDossier('122639');
    assert.ok(dossier);
    assert.equal(dossier.shareClasses.length, 2);
    assert.equal(dossier.directVsRegular.directNav, 91.5);
    assert.equal(dossier.directVsRegular.regularNav, 84);
    assert.equal(dossier.directVsRegular.navAdvantagePct, 8.93);
    assert.equal(dossier.directVsRegular.terSpreadBps, 70);
    assert.ok((dossier.directVsRegular.illustrative10YrSavingsInr ?? 0) > 100000);
    assert.equal(dossier.categoryPeers.length, 1);
    assert.equal(dossier.categoryPeers[0].scheme_code, '118955');
    assert.equal(dossier.holdings.items.length, 1);
    assert.equal(dossier.holdings.items[0].nse_symbol, 'HDFCBANK');

    // Side-by-side comparison
    const compare = db.compareTerminalFunds(['122639', '101305']);
    assert.equal(compare.count, 2);
    assert.equal(compare.items[0].scheme_code, '122639');
    assert.equal(compare.items[1].instrument_type, 'ETF');
  } finally {
    db.close();
  }
});
