import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STOCKS } from '../data/marketData';
import {
  mergeFinnhubQuote,
  parseAlphaVantageDaily,
  parseAmfiMfNav,
  parseApiNinjasEtfDetail,
  parseBinanceKlines,
  parseFmpQuoteAndHistory,
  parseFmpTreasuryRates,
  parseMarketstackEod,
  parseMfnavFundDetail,
  parseTwelveDataTimeSeries,
} from './liveDataParsers';

test('parseBinanceKlines maps PAXGUSDT spot gold klines into SuperchartCandle objects', () => {
  const sample = [
    [1700000000000, '3240.50', '3255.00', '3235.25', '3251.10', '428.45'],
    [1700003600000, '3251.10', '3272.00', '3248.00', '3268.75', '394.12'],
  ];
  const parsed = parseBinanceKlines(sample);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].open, 3240.5);
  assert.equal(parsed[1].close, 3268.75);
  assert.match(parsed[0].time, /^\d{2}:\d{2}$/);
});

test('mergeFinnhubQuote overlays valid ETF quote price & delta cleanly', () => {
  const base = INITIAL_STOCKS[0]; // GOLDBEES
  const merged = mergeFinnhubQuote({ c: 309.45, d: 3.05, dp: 1.0, pc: 306.4 }, base);
  assert.equal(merged.price, 309.45);
  assert.equal(merged.change, 3.05);
  assert.equal(merged.changePercent, 1.0);
  assert.equal(merged.dataSource, 'Finnhub Live Quote');
});

test('parseAlphaVantageDaily extracts ETF OHLCV series and overview metadata for GLD', () => {
  const base = INITIAL_STOCKS[0];
  const daily = {
    'Time Series (Daily)': {
      '2026-06-18': { '1. open': '302.0', '2. high': '305.0', '3. low': '301.5', '4. close': '304.1', '5. volume': '8200000' },
      '2026-06-19': { '1. open': '304.1', '2. high': '307.0', '3. low': '303.0', '4. close': '306.4', '5. volume': '9100000' },
    },
  };
  const overview = {
    Name: 'SPDR Gold Shares ETF',
    MarketCapitalization: '78600000000',
    PERatio: '0.4',
  };

  const parsed = parseAlphaVantageDaily(daily, base, overview);
  assert.ok(parsed);
  assert.equal(parsed.name, 'SPDR Gold Shares ETF');
  assert.equal(parsed.price, 306.4);
  assert.equal(parsed.change, 2.3);
  assert.equal(parsed.marketCap, '$79B');
  assert.equal(parsed.report.financial_charts.stock_price_4m.length, 2);
});

test('parseAmfiMfNav extracts live Mutual Fund & Debt Fund NAVs from AMFI mfapi.in format', () => {
  const ppfasBase = INITIAL_STOCKS[1]; // PPFAS
  const amfiPayload = {
    meta: {
      fund_house: 'PPFAS Mutual Fund',
      scheme_type: 'Open Ended Schemes',
      scheme_category: 'Equity Scheme - Flexi Cap Fund',
      scheme_code: 122639,
      scheme_name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    },
    data: [
      { date: '19-06-2026', nav: '91.4500' },
      { date: '18-06-2026', nav: '90.8500' },
      { date: '17-06-2026', nav: '90.1000' },
      { date: '16-06-2026', nav: '89.7000' },
    ],
    status: 'SUCCESS',
  };

  const parsed = parseAmfiMfNav(amfiPayload, ppfasBase);
  assert.ok(parsed);
  assert.equal(parsed.price, 91.45);
  assert.equal(parsed.change, 0.6);
  assert.equal(parsed.amfiSchemeCode, '122639');
  assert.equal(parsed.dataSource, 'AMFI Live NAV (122639)');
  assert.equal(parsed.report.financial_charts.stock_price_4m.length, 4);
  assert.equal(parsed.report.financial_charts.stock_price_4m[3].price, 91.45);
  assert.equal(parsed.report.findings[0].sourceUrl, 'https://api.mfapi.in/mf/122639');
});

test('parseMarketstackEod parses newest-first EOD ETF bars chronologically', () => {
  const goldBase = INITIAL_STOCKS[0];
  const parsed = parseMarketstackEod(
    {
      data: [
        { date: '2026-06-20T00:00:00+0000', open: 304.0, high: 308.0, low: 303.5, close: 307.2, volume: 4200000 },
        { date: '2026-06-19T00:00:00+0000', open: 300.0, high: 304.5, low: 299.5, close: 304.0, volume: 3800000 },
      ],
    },
    goldBase
  );
  assert.ok(parsed);
  assert.equal(parsed.price, 307.2);
  assert.equal(parsed.change, 3.2);
  assert.equal(parsed.dataSource, 'Marketstack Live EOD');
  assert.equal(parsed.report.financial_charts.stock_price_4m.length, 2);
  assert.equal(parsed.report.financial_charts.stock_price_4m[0].date, '06-19');
  assert.equal(parsed.report.financial_charts.stock_price_4m[1].price, 307.2);
});

test('parseMfnavFundDetail parses ISIN/scheme analytics, AUM in Cr, 3Y CAGR & Sharpe cleanly', () => {
  const debtBase = INITIAL_STOCKS[2]; // SBIGILT
  const parsed = parseMfnavFundDetail(
    {
      scheme_code: 100641,
      scheme_name: 'SBI ULTRA SHORT TERM FUND - REGULAR PLAN - GROWTH',
      fund_house: 'SBI Mutual Fund',
      isin: 'INF200K01LJ4',
      category: 'Debt Scheme',
      sub_category: 'Ultra Short Term Fund',
      latest_nav_date: '2026-11-18',
      latest_nav: 6496.1372,
      latest_day_change_pct: 0.0133,
      aum_period: 'July - September 2026',
      average_aum_lakhs: 347152.84,
      daily_metrics: {
        cagr_1y: 0.06158,
        cagr_3y: 0.0689,
        max_dd_1y: -0.00127,
        sharpe_1y: 1.42,
      },
    },
    {
      data: [
        { nav_date: '2026-11-18', nav: 6496.1372 },
        { nav_date: '2026-11-17', nav: 6495.273 },
      ],
    },
    debtBase
  );
  assert.ok(parsed);
  assert.equal(parsed.price, 6496.14);
  assert.equal(parsed.assetClass, 'Debt Fund');
  assert.equal(parsed.sector, 'Debt Funds');
  assert.equal(parsed.currencyUnit, 'INR');
  assert.equal(parsed.amfiSchemeCode, '100641');
  assert.equal(parsed.marketCap, '₹3,472 Cr');
  assert.equal(parsed.ytmOrCagr, '6.89% 3Y CAGR');
  assert.equal(parsed.dataSource, 'mfnav.in Live AMFI (100641)');
  assert.equal(parsed.report.findings[0].sourceUrl, 'https://mfnav.in/api/funds/100641');
});

test('parseTwelveDataTimeSeries parses ETF OHLCV bars chronologically and skips error payloads', () => {
  const goldBase = INITIAL_STOCKS[0];
  const errRes = parseTwelveDataTimeSeries({ status: 'error', code: 400, message: 'Invalid' }, goldBase);
  assert.equal(errRes, null);

  const parsed = parseTwelveDataTimeSeries(
    {
      status: 'ok',
      meta: { symbol: 'GOLDBEES:NSE', currency: 'INR' },
      values: [
        { datetime: '2026-11-18', open: '74.20', high: '75.10', low: '74.00', close: '74.95', volume: '5400000' },
        { datetime: '2026-11-17', open: '73.50', high: '74.30', low: '73.40', close: '74.10', volume: '4900000' },
      ],
    },
    goldBase
  );
  assert.ok(parsed);
  assert.equal(parsed.price, 74.95);
  assert.equal(parsed.change, 0.85);
  assert.equal(parsed.currencyUnit, 'INR');
  assert.equal(parsed.dataSource, 'Twelve Data Live (GOLDBEES:NSE)');
  assert.equal(parsed.report.financial_charts.stock_price_4m[0].price, 74.1);
  assert.equal(parsed.report.financial_charts.stock_price_4m[1].price, 74.95);
});

test('parseApiNinjasEtfDetail enriches ETF AUM, TER & holdings count cleanly', () => {
  const base = INITIAL_STOCKS[0];
  const parsed = parseApiNinjasEtfDetail(
    {
      symbol: 'AGG',
      name: 'iShares Core U.S. Aggregate Bond ETF',
      price: 98.85,
      expense_ratio: 0.03,
      aum_usd: 121400000000,
      domicile: 'US',
      num_holdings: 11850,
    },
    base
  );
  assert.ok(parsed);
  assert.equal(parsed.price, 98.85);
  assert.equal(parsed.aum, '$121.40B');
  assert.equal(parsed.expenseRatio, '0.03% TER');
  assert.equal(parsed.dataSource, 'API Ninjas ETF (AGG)');
});

test('parseFmpQuoteAndHistory and parseFmpTreasuryRates parse FMP Stable endpoints', () => {
  const base = INITIAL_STOCKS[0];
  const parsed = parseFmpQuoteAndHistory(
    [{ symbol: 'GLD', name: 'SPDR Gold Shares', price: 308.45, change: 2.1, changePercentage: 0.69 }],
    [
      { date: '2026-11-18', open: 306.5, high: 309.0, low: 306.0, close: 308.45, volume: 7200000 },
      { date: '2026-11-17', open: 304.2, high: 306.9, low: 304.0, close: 306.35, volume: 6500000 },
    ],
    base
  );
  assert.ok(parsed);
  assert.equal(parsed.price, 308.45);
  assert.equal(parsed.change, 2.1);
  assert.equal(parsed.dataSource, 'FMP Stable Live (GLD)');

  const curve = parseFmpTreasuryRates([
    { date: '2026-11-18', month3: 4.52, year2: 4.18, year10: 4.35, year30: 4.62 },
  ]);
  assert.ok(curve);
  assert.equal(curve.tenors.length, 4);
  assert.equal(curve.tenors[2].label, '10Y');
  assert.equal(curve.tenors[2].yieldPct, 4.35);
});
