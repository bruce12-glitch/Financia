import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createBackendApp } from '../app.ts';
import { createPersistenceStore } from '../services/persistenceService.ts';
import { NavDatabaseService } from '../services/navDatabaseService.ts';
import { FinanciaMutualFundDatabase } from './database.ts';

test('portfolio holdings database & /api/db/holdings endpoints aggregate ISIN lines and enrich AUM/TER', async () => {
  const mfDb = new FinanciaMutualFundDatabase(':memory:');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'financia-holdings-test-'));
  const store = createPersistenceStore(path.join(tmpDir, 'store.json'));
  const navDb = new NavDatabaseService({
    cwd: tmpDir,
    sqlSeedPath: path.resolve(process.cwd(), 'amfi_nav_dev.sql'),
  });

  const detailsCsv = [
    'scheme_code,isin,scheme_name,fund_name_latest,amc,category_group_clean,category_sub,scheme_plan,is_active,amfi_ssd_fund_id,fund_dedup_flag,amfi_daily_fund_name,amfi_daily_fund_aum_cr_all_plans,amfi_daily_aum_date,amfi_daily_riskometer,amfi_daily_benchmark,ssd_fund_managers,ssd_allotment_date,ssd_exit_load,ssd_objective,ter_date,ter_regular,ter_direct,source',
    '122639,INF879O01027,Parag Parikh Flexi Cap - Direct,Parag Parikh Flexi Cap Fund,PPFAS Mutual Fund,Equity Scheme,Flexi Cap Fund,Direct,true,scheme:9054,true,Parag Parikh Flexi Cap Fund,82500.5,2026-11-19,Very High,NIFTY 500 TRI,Rajeev Thakkar,2013-05-24,2% within 365D,Long-term equity,2026-11-19,1.33,0.63,MF',
    '122640,INF879O01019,Parag Parikh Flexi Cap - Regular,Parag Parikh Flexi Cap Fund,PPFAS Mutual Fund,Equity Scheme,Flexi Cap Fund,Regular,true,scheme:9054,false,Parag Parikh Flexi Cap Fund,82500.5,2026-11-19,Very High,NIFTY 500 TRI,Rajeev Thakkar,2013-05-24,2% within 365D,Long-term equity,2026-11-19,1.33,0.63,MF',
  ].join('\n');

  const holdingsCsv = [
    'fund_code,fund_name,fund_category,month_end,isin,security_name,nse_symbol,market_value_lakh,quantity,pct_of_fund,asset_group,asset_subgroup,mapping_category,mapping_reason,isin_as_filed,instrument_name_as_filed,amfi_ssd_fund_id,isin_type',
    'PPFASFLEXICAP,Parag Parikh Flexi Cap Fund,flexicap,2026-10-31,SYN000TREPS,TREPS / Triparty Repo,,1200.25,0,2.0,Cash,TREPS and triparty repo,TREPS_AGGREGATE,Grouped cash,,TREPS Line 1,scheme:9054,Group code',
    'PPFASFLEXICAP,Parag Parikh Flexi Cap Fund,flexicap,2026-10-31,SYN000TREPS,TREPS / Triparty Repo,,800.75,0,1.5,Cash,TREPS and triparty repo,TREPS_AGGREGATE,Grouped cash,,TREPS Line 2,scheme:9054,Group code',
    'PPFASFLEXICAP,Parag Parikh Flexi Cap Fund,flexicap,2026-10-31,INE040A01034,HDFC BANK LIMITED,HDFCBANK,650000,40000000,8.12,Equity,Listed shares,,,INE040A01034,HDFC Bank Ltd,scheme:9054,ISIN',
  ].join('\n');

  assert.equal(mfDb.replaceSchemeDetailsFromCsv(detailsCsv), 2);
  assert.equal(mfDb.replacePortfolioHoldingsFromCsv(holdingsCsv), 3);

  const app = await createBackendApp(undefined, { store, navDb, mfDb, skipVite: true });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  assert(addr && typeof addr === 'object');
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const filtersRes = await fetch(`${baseUrl}/api/db/holdings/filters`);
    assert.equal(filtersRes.status, 200);
    const filters = (await filtersRes.json()) as {
      funds: Array<{ fund_code: string; fund_aum_cr: number; ter_direct: number; latest_month: string }>;
      months: string[];
      assetGroups: string[];
      categories: string[];
    };
    assert.equal(filters.funds.length, 1);
    assert.equal(filters.funds[0].fund_code, 'PPFASFLEXICAP');
    assert.equal(filters.funds[0].fund_aum_cr, 82500.5);
    assert.equal(filters.funds[0].ter_direct, 0.63);
    assert.equal(filters.funds[0].latest_month, '2026-10-31');
    assert.deepEqual(filters.months, ['2026-10-31']);

    const aggRes = await fetch(
      `${baseUrl}/api/db/holdings?fundCode=PPFASFLEXICAP&monthEnd=2026-10-31&aggregated=true&limit=250`
    );
    assert.equal(aggRes.status, 200);
    const agg = (await aggRes.json()) as {
      total: number;
      aggregated: boolean;
      rows: Array<{ isin: string; market_value_lakh: number; line_count: number; fund_aum_cr: number }>;
    };
    assert.equal(agg.aggregated, true);
    assert.equal(agg.total, 2);
    const treps = agg.rows.find((r) => r.isin === 'SYN000TREPS');
    assert.ok(treps);
    assert.equal(treps.market_value_lakh, 2001);
    assert.equal(treps.line_count, 2);
    assert.equal(treps.fund_aum_cr, 82500.5);

    const rawRes = await fetch(
      `${baseUrl}/api/db/holdings?fundCode=PPFASFLEXICAP&monthEnd=2026-10-31&aggregated=false`
    );
    assert.equal(rawRes.status, 200);
    const raw = (await rawRes.json()) as { total: number; aggregated: boolean };
    assert.equal(raw.aggregated, false);
    assert.equal(raw.total, 3);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    navDb.close();
    mfDb.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
