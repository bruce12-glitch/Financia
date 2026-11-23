import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAmfiRecord,
  formatCsvExport,
  inferAmcFromSchemeName,
  normalizeFundFamilyKey,
  parseAmfiDateToIso,
  parseAmfiNavText,
  parseCsvRows,
  sanitizeAmfiText,
  validateIsin,
  validateReadOnlySql,
} from './parsers';
import { isAllowedDatasetUrl, SEED_AMFI_INTERVAL_FEED } from './catalog';

test('parseAmfiDateToIso converts DD-MMM-YYYY and ISO dates accurately', () => {
  assert.equal(parseAmfiDateToIso('17-Apr-2019'), '2019-04-17');
  assert.equal(parseAmfiDateToIso('20-Nov-2026'), '2026-11-20');
  assert.equal(parseAmfiDateToIso('05-May-2019'), '2019-05-05');
  assert.equal(parseAmfiDateToIso('2026-10-31'), '2026-10-31');
  assert.equal(parseAmfiDateToIso('invalid-date'), null);
});

test('parseAmfiNavText parses all 41 seeded Kotak & Nippon Interval Fund records cleanly', () => {
  const result = parseAmfiNavText(SEED_AMFI_INTERVAL_FEED, 'AMFI_SEED_TEST');
  assert.equal(result.records.length, 41);
  assert.equal(result.skippedLines.length, 0);
  assert.deepEqual(result.detectedCategories, ['Interval Fund Schemes(Income)']);
  assert.deepEqual(result.detectedAmcs, ['Kotak Mahindra Mutual Fund', 'Nippon India Mutual Fund']);

  // Verify first Kotak row
  const first = result.records[0];
  assert.equal(first.scheme_code, '146839');
  assert.equal(first.isin_div_payout_growth, null);
  assert.equal(first.isin_div_reinvestment, 'INF174KA1DD0');
  assert.equal(first.amc, 'Kotak Mahindra Mutual Fund');
  assert.equal(first.nav, 10.0087785);
  assert.equal(first.nav_date, '2019-04-17');

  // Verify Nippon row with Plan & Option populated
  const nipponDirectGrowth = result.records.find((r) => r.scheme_code === '118691');
  assert.ok(nipponDirectGrowth);
  assert.equal(nipponDirectGrowth.plan, 'Direct Plan');
  assert.equal(nipponDirectGrowth.option_name, 'Growth Option');
  assert.equal(nipponDirectGrowth.nav, 39.5575);
  assert.equal(nipponDirectGrowth.nav_date, '2026-11-20');
});

test('parseAmfiNavText supports 6-column classic AMFI format and reports malformed lines', () => {
  const sample = [
    'Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date',
    'Open Ended Schemes(Equity Scheme - Flexi Cap Fund)',
    'PPFAS Mutual Fund',
    '122639;INF879O01027;-;Parag Parikh Flexi Cap Fund - Direct Plan - Growth;89.4512;20-Nov-2026',
    'BAD;ROW;ONLY;FOUR',
  ].join('\n');

  const result = parseAmfiNavText(sample);
  assert.equal(result.records.length, 1);
  assert.equal(result.skippedLines.length, 1);
  assert.equal(result.records[0].scheme_code, '122639');
  assert.equal(result.records[0].amc, 'PPFAS Mutual Fund');
  assert.equal(result.records[0].nav, 89.4512);
});

test('sanitizeAmfiText, validateIsin, inferAmcFromSchemeName, and parseAmfiNavText handle real-world AMFI anomalies', () => {
  const mojibake = sanitizeAmfiText('Open Ended Schemes(Childrenâ€™s Fund â€“ Plan)..  ');
  assert.equal(mojibake.hadMojibake, true);
  assert.equal(mojibake.value, "Open Ended Schemes(Children's Fund - Plan)");

  assert.deepEqual(validateIsin('INF879O01027'), { isin: 'INF879O01027', invalidRaw: null });
  assert.deepEqual(validateIsin('Redeemed'), { isin: null, invalidRaw: 'Redeemed' });
  assert.deepEqual(validateIsin('HDFCNIVODG'), { isin: null, invalidRaw: 'HDFCNIVODG' });

  assert.equal(inferAmcFromSchemeName('Franklin India Income Opportunities Fund'), 'Franklin Templeton Mutual Fund');
  assert.equal(inferAmcFromSchemeName('UTI Annual Interval Fund - I'), 'UTI Mutual Fund');

  const dirtyFeed = [
    'Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date',
    'Open Ended Schemes(Debt Scheme - Medium Duration Fund)',
    '118554;INF090I01JV8;-;Franklin India Income Opportunities Fund â€“ Direct Plan;Direct;Growth;31.4250;20-Nov-2026',
    'Close Ended Schemes(Income/Debt Oriented Schemes - Other Debt Scheme)',
    'IL&FS Mutual Fund (IDF)',
    '128001;INF966L01010;Redeemed;IL&FS Infrastructure Debt Fund - Series 1A;-;-;0.0000;30-Apr-2021',
    '✕Merlin',
  ].join('\n');

  const res = parseAmfiNavText(dirtyFeed);
  assert.equal(res.records.length, 2);
  assert.equal(res.skippedLines.length, 0);
  assert.equal(res.ignoredNoiseLines.length, 1);
  assert.equal(res.inferredAmcCount, 1);
  assert.equal(res.mojibakeFixedCount, 1);
  assert.equal(res.invalidIsinCount, 1);
  assert.equal(res.records[0].amc, 'Franklin Templeton Mutual Fund');
  assert.equal(res.records[0].scheme_name, 'Franklin India Income Opportunities Fund - Direct Plan');
  assert.equal(res.records[1].amc, 'IL&FS Mutual Fund (IDF)');
  assert.equal(res.records[1].isin_div_reinvestment, null);
  assert.equal(res.records[1].invalid_isin_note, 'ISIN2:Redeemed');
});

test('classifyAmfiRecord separates ETFs, FoFs, Index Funds, Mutual Funds, and groups share classes by family key', () => {
  const etf = classifyAmfiRecord({
    scheme_code: '101305',
    isin_div_payout_growth: 'INF204KB17I5',
    isin_div_reinvestment: null,
    scheme_name: 'Nippon India ETF Gold BeES',
    plan: null,
    option_name: null,
    nav: 78.42,
    nav_date: '2026-11-20',
    amc: 'Nippon India Mutual Fund',
    scheme_category_header: 'Open Ended Schemes(Other Scheme - Gold ETF)',
    source: 'TEST',
  });
  assert.equal(etf.instrument_type, 'ETF');
  assert.equal(etf.asset_class, 'Commodity');
  assert.equal(etf.sub_category, 'Gold ETF');
  assert.equal(etf.is_active, 1);

  const goldFof = classifyAmfiRecord({
    scheme_code: '119132',
    isin_div_payout_growth: 'INF179K01LC5',
    isin_div_reinvestment: null,
    scheme_name: 'HDFC Gold ETF Fund of Fund - Direct Plan - Growth',
    plan: 'Direct',
    option_name: 'Growth',
    nav: 26.85,
    nav_date: '2026-11-20',
    amc: 'HDFC Mutual Fund',
    scheme_category_header: 'Open Ended Schemes(Other Scheme - FoF Domestic)',
    source: 'TEST',
  });
  assert.equal(goldFof.instrument_type, 'FOF');
  assert.equal(goldFof.asset_class, 'Commodity');
  assert.equal(goldFof.sub_category, 'Gold / Silver FoF');

  const famDirect = normalizeFundFamilyKey(
    'PPFAS Mutual Fund',
    'Parag Parikh Flexi Cap Fund - Direct Plan - Growth Option'
  );
  const famRegular = normalizeFundFamilyKey(
    'PPFAS Mutual Fund',
    'Parag Parikh Flexi Cap Fund - Regular Plan - Growth'
  );
  assert.equal(famDirect, famRegular);
});

test('parseCsvRows handles quoted commas, escaped quotes, and embedded newlines', () => {
  const csv = [
    'code,name,notes',
    '100,"HDFC Bank, Ltd.","Line 1\nLine ""2"" inside quotes"',
    '101,ICICI Bank,Simple',
  ].join('\n');

  const parsed = parseCsvRows(csv);
  assert.deepEqual(parsed.headers, ['code', 'name', 'notes']);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0][1], 'HDFC Bank, Ltd.');
  assert.equal(parsed.rows[0][2], 'Line 1\nLine "2" inside quotes');
  assert.equal(parsed.rows[1][1], 'ICICI Bank');
});

test('validateReadOnlySql allows SELECT/WITH/EXPLAIN and blocks mutations & multi-statements', () => {
  assert.equal(validateReadOnlySql('SELECT * FROM scheme_universe LIMIT 10;').valid, true);
  assert.equal(
    validateReadOnlySql('WITH top_amcs AS (SELECT amc FROM scheme_details) SELECT * FROM top_amcs').valid,
    true
  );

  // Blocked statements
  assert.equal(validateReadOnlySql('DROP TABLE scheme_universe').valid, false);
  assert.equal(validateReadOnlySql('DELETE FROM amfi_nav_records').valid, false);
  assert.equal(validateReadOnlySql('PRAGMA table_info(scheme_universe)').valid, false);
  assert.equal(validateReadOnlySql('SELECT 1; DROP TABLE scheme_universe').valid, false);
  assert.equal(validateReadOnlySql('ATTACH DATABASE "/tmp/x.db" AS x').valid, false);
  assert.equal(validateReadOnlySql('   ').valid, false);
});

test('isAllowedDatasetUrl strictly pins upstream hosts to HTTPS api.tigzig.com', () => {
  assert.equal(isAllowedDatasetUrl('https://api.tigzig.com/downloads/mf_portfolio_holdings.csv'), true);
  assert.equal(isAllowedDatasetUrl('http://api.tigzig.com/downloads/mf_portfolio_holdings.csv'), false);
  assert.equal(isAllowedDatasetUrl('https://127.0.0.1/secret'), false);
  assert.equal(isAllowedDatasetUrl('https://evil.example.com/data.csv'), false);
});

test('formatCsvExport escapes commas and double quotes properly', () => {
  const csv = formatCsvExport(
    ['fund', 'note'],
    [{ fund: 'HDFC, Flexi', note: 'Quoted "value"' }]
  );
  assert.equal(csv, 'fund,note\n"HDFC, Flexi","Quoted ""value"""');
});
