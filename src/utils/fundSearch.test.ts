import test from 'node:test';
import assert from 'node:assert/strict';
import type { TerminalFundSummary } from '../types/db';
import {
  filterAmfiSchemesLocally,
  getTop5SchemeSuggestions,
  highlightMatchedTokens,
} from './fundSearch';

const MOCK_AMFI_DATASET: TerminalFundSummary[] = [
  {
    scheme_code: '122639',
    isin: 'INF879O01027',
    scheme_name: 'Parag Parikh Flexi Cap Fund',
    amc: 'PPFAS Mutual Fund',
    structure: 'Open Ended',
    instrument_type: 'MUTUAL_FUND',
    asset_class: 'Equity',
    sub_category: 'Flexi Cap Fund',
    plan_type: 'Direct',
    option_type: 'Growth',
    nav: 95.4585,
    nav_date: '2026-11-20',
    is_active: 1,
    is_segregated: 0,
    is_zero_nav: 0,
    fund_family_key: 'ppfas::parag parikh flexi cap fund',
    fund_aum_cr: 156000,
    ter_direct: 0.68,
    ter_regular: 1.29,
    riskometer: 'Very High',
  },
  {
    scheme_code: '122640',
    isin: 'INF879O01019',
    scheme_name: 'Parag Parikh Flexi Cap Fund',
    amc: 'PPFAS Mutual Fund',
    structure: 'Open Ended',
    instrument_type: 'MUTUAL_FUND',
    asset_class: 'Equity',
    sub_category: 'Flexi Cap Fund',
    plan_type: 'Regular',
    option_type: 'Growth',
    nav: 86.8633,
    nav_date: '2026-11-20',
    is_active: 1,
    is_segregated: 0,
    is_zero_nav: 0,
    fund_family_key: 'ppfas::parag parikh flexi cap fund',
    fund_aum_cr: 156000,
    ter_direct: 0.68,
    ter_regular: 1.29,
    riskometer: 'Very High',
  },
  {
    scheme_code: '118955',
    isin: 'INF179K01UT0',
    scheme_name: 'HDFC Flexi Cap Fund',
    amc: 'HDFC Mutual Fund',
    structure: 'Open Ended',
    instrument_type: 'MUTUAL_FUND',
    asset_class: 'Equity',
    sub_category: 'Flexi Cap Fund',
    plan_type: 'Direct',
    option_type: 'Growth',
    nav: 2427.514,
    nav_date: '2026-11-20',
    is_active: 1,
    is_segregated: 0,
    is_zero_nav: 0,
    fund_family_key: 'hdfc::hdfc flexi cap fund',
    fund_aum_cr: 122000,
    ter_direct: 0.74,
    ter_regular: 1.45,
    riskometer: 'Very High',
  },
  {
    scheme_code: '120166',
    isin: 'INF174K01LS2',
    scheme_name: 'Kotak Flexi Cap Fund',
    amc: 'Kotak Mahindra Mutual Fund',
    structure: 'Open Ended',
    instrument_type: 'MUTUAL_FUND',
    asset_class: 'Equity',
    sub_category: 'Flexi Cap Fund',
    plan_type: 'Direct',
    option_type: 'Growth',
    nav: 101.222,
    nav_date: '2026-11-20',
    is_active: 1,
    is_segregated: 0,
    is_zero_nav: 0,
    fund_family_key: 'kotak::kotak flexi cap fund',
    fund_aum_cr: 57212,
    ter_direct: 0.66,
    ter_regular: 1.41,
    riskometer: 'Very High',
  },
  {
    scheme_code: '120564',
    isin: 'INF209K01YY7',
    scheme_name: 'Aditya Birla Sun Life Flexi Cap Fund',
    amc: 'Aditya Birla Sun Life Mutual Fund',
    structure: 'Open Ended',
    instrument_type: 'MUTUAL_FUND',
    asset_class: 'Equity',
    sub_category: 'Flexi Cap Fund',
    plan_type: 'Direct',
    option_type: 'Growth',
    nav: 2302.87,
    nav_date: '2026-11-20',
    is_active: 1,
    is_segregated: 0,
    is_zero_nav: 0,
    fund_family_key: 'absl::aditya birla sun life flexi cap fund',
    fund_aum_cr: 30800,
    ter_direct: 0.89,
    ter_regular: 1.65,
    riskometer: 'Very High',
  },
  {
    scheme_code: '148990',
    isin: 'INF109KC1S64',
    scheme_name: 'ICICI Prudential Flexi Cap Fund',
    amc: 'ICICI Prudential Mutual Fund',
    structure: 'Open Ended',
    instrument_type: 'MUTUAL_FUND',
    asset_class: 'Equity',
    sub_category: 'Flexi Cap Fund',
    plan_type: 'Direct',
    option_type: 'Growth',
    nav: 22.72,
    nav_date: '2026-11-20',
    is_active: 1,
    is_segregated: 0,
    is_zero_nav: 0,
    fund_family_key: 'icici::icici prudential flexi cap fund',
    fund_aum_cr: 27892,
    ter_direct: 0.86,
    ter_regular: 1.68,
    riskometer: 'Very High',
  },
  {
    scheme_code: '120662',
    isin: 'INF789F01XA0',
    scheme_name: 'UTI Flexi Cap Fund',
    amc: 'UTI Mutual Fund',
    structure: 'Open Ended',
    instrument_type: 'MUTUAL_FUND',
    asset_class: 'Equity',
    sub_category: 'Flexi Cap Fund',
    plan_type: 'Direct',
    option_type: 'Growth',
    nav: 365.9324,
    nav_date: '2026-11-20',
    is_active: 1,
    is_segregated: 0,
    is_zero_nav: 0,
    fund_family_key: 'uti::uti flexi cap fund',
    fund_aum_cr: 24087,
    ter_direct: 1.17,
    ter_regular: 1.72,
    riskometer: 'Very High',
  },
  {
    scheme_code: '140088',
    isin: 'INF204KB17I5',
    scheme_name: 'Nippon India ETF Gold BeES',
    amc: 'Nippon India Mutual Fund',
    structure: 'Open Ended',
    instrument_type: 'ETF',
    asset_class: 'Commodity',
    sub_category: 'Gold ETF',
    plan_type: 'Direct',
    option_type: 'Unspecified',
    nav: 102.028,
    nav_date: '2026-11-20',
    is_active: 1,
    is_segregated: 0,
    is_zero_nav: 0,
    fund_family_key: 'nippon::nippon india etf gold bees',
    fund_aum_cr: 53927,
    ter_direct: 0.81,
    ter_regular: null,
    riskometer: 'High',
  },
  {
    scheme_code: '118553',
    isin: 'INF090I01JL3',
    scheme_name: 'Franklin India Credit Risk Fund (No. of segregated portfolios-3)',
    amc: 'Franklin Templeton Mutual Fund',
    structure: 'Open Ended',
    instrument_type: 'MUTUAL_FUND',
    asset_class: 'Debt',
    sub_category: 'Credit Risk Fund',
    plan_type: 'Direct',
    option_type: 'Growth',
    nav: 25.565,
    nav_date: '2023-06-11',
    is_active: 0,
    is_segregated: 1,
    is_zero_nav: 0,
    fund_family_key: 'franklin::franklin india credit risk fund',
    fund_aum_cr: null,
    ter_direct: null,
    ter_regular: null,
    riskometer: null,
  },
];

test('getTop5SchemeSuggestions caps results strictly to top 5 matches ordered by relevance, plan preference, and AUM', () => {
  const result = filterAmfiSchemesLocally(MOCK_AMFI_DATASET, 'Flexi Cap', { activeOnly: true });
  assert.equal(result.totalMatches, 7);
  assert.equal(result.suggestions.length, 5);
  // Direct Growth highest AUM (Parag Parikh 122639) must rank above Regular Growth (122640)
  assert.equal(result.suggestions[0].scheme_code, '122639');
  assert.equal(result.suggestions[1].scheme_code, '118955');
  assert.equal(result.suggestions[2].scheme_code, '120166');
});

test('filterAmfiSchemesLocally prioritizes exact scheme code, ISIN, prefix, word-boundary, and multi-token queries', () => {
  // Exact AMFI code match
  const byCode = getTop5SchemeSuggestions(MOCK_AMFI_DATASET, '140088');
  assert.equal(byCode.length, 1);
  assert.equal(byCode[0].scheme_name, 'Nippon India ETF Gold BeES');

  // Exact ISIN match
  const byIsin = getTop5SchemeSuggestions(MOCK_AMFI_DATASET, 'inf179k01ut0');
  assert.equal(byIsin.length, 1);
  assert.equal(byIsin[0].scheme_code, '118955');

  // Prefix match beats substring match
  const byPrefix = getTop5SchemeSuggestions(MOCK_AMFI_DATASET, 'HDFC');
  assert.equal(byPrefix[0].scheme_code, '118955');

  // Multi-token cross-reference against scheme name
  const multiToken = getTop5SchemeSuggestions(MOCK_AMFI_DATASET, 'gold bees');
  assert.equal(multiToken.length, 1);
  assert.equal(multiToken[0].scheme_code, '140088');
});

test('filterAmfiSchemesLocally enforces instrumentScope and activeOnly toggles', () => {
  const etfsOnly = getTop5SchemeSuggestions(MOCK_AMFI_DATASET, '', { instrumentScope: 'ETF', activeOnly: true });
  assert.equal(etfsOnly.length, 1);
  assert.equal(etfsOnly[0].instrument_type, 'ETF');

  const activeFranklin = getTop5SchemeSuggestions(MOCK_AMFI_DATASET, 'Franklin', { activeOnly: true });
  assert.equal(activeFranklin.length, 0);

  const allFranklin = getTop5SchemeSuggestions(MOCK_AMFI_DATASET, 'Franklin', { activeOnly: false });
  assert.equal(allFranklin.length, 1);
  assert.equal(allFranklin[0].scheme_code, '118553');
});

test('highlightMatchedTokens splits scheme names into matched and unmatched segments cleanly', () => {
  const segments = highlightMatchedTokens('Nippon India ETF Gold BeES', 'gold bees');
  assert.deepEqual(
    segments.filter((s) => s.matched).map((s) => s.text.toLowerCase()),
    ['gold', 'bees']
  );
  assert.equal(segments.map((s) => s.text).join(''), 'Nippon India ETF Gold BeES');
});
