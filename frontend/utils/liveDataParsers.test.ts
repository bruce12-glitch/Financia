import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STOCKS } from '../data/marketData';
import {
  mergeFinnhubQuote,
  parseAlphaVantageDaily,
  parseBinanceKlines,
  parseSecCompanyFacts,
} from './liveDataParsers';

test('parseBinanceKlines maps valid kline arrays into SuperchartCandle objects', () => {
  const sample = [
    [1700000000000, '64100.50', '64450.00', '63950.25', '64320.10', '128.45'],
    [1700003600000, '64320.10', '64600.00', '64200.00', '64510.75', '94.12'],
  ];
  const parsed = parseBinanceKlines(sample);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].open, 64100.5);
  assert.equal(parsed[1].close, 64510.75);
  assert.match(parsed[0].time, /^\d{2}:\d{2}$/);
});

test('mergeFinnhubQuote overlays valid Finnhub price & delta cleanly', () => {
  const base = INITIAL_STOCKS[0];
  const merged = mergeFinnhubQuote({ c: 192.45, d: 4.15, dp: 2.21, pc: 188.3 }, base);
  assert.equal(merged.price, 192.45);
  assert.equal(merged.change, 4.15);
  assert.equal(merged.changePercent, 2.21);
  assert.equal(merged.dataSource, 'Finnhub Live Quote');
});

test('parseAlphaVantageDaily extracts OHLCV series and overview metadata for IBM', () => {
  const base = INITIAL_STOCKS[0];
  const daily = {
    'Time Series (Daily)': {
      '2026-11-12': { '1. open': '210.0', '2. high': '214.0', '3. low': '209.5', '4. close': '212.5', '5. volume': '3200000' },
      '2026-11-13': { '1. open': '212.5', '2. high': '216.0', '3. low': '211.0', '4. close': '215.2', '5. volume': '4100000' },
    },
  };
  const overview = {
    Name: 'International Business Machines',
    MarketCapitalization: '198500000000',
    PERatio: '24.6',
  };

  const parsed = parseAlphaVantageDaily(daily, base, overview);
  assert.ok(parsed);
  assert.equal(parsed.name, 'International Business Machines');
  assert.equal(parsed.price, 215.2);
  assert.equal(parsed.change, 2.7);
  assert.equal(parsed.peRatio, 24.6);
  assert.equal(parsed.marketCap, '$199B');
  assert.equal(parsed.report.financial_charts.stock_price_4m.length, 2);
});

test('parseSecCompanyFacts updates quarterly GAAP revenue & EDGAR CIK link', () => {
  const base = INITIAL_STOCKS[1];
  const secFacts = {
    entityName: 'Apple Inc.',
    facts: {
      'us-gaap': {
        RevenueFromContractWithCustomerExcludingAssessedTax: {
          units: {
            USD: [
              { start: '2025-09-28', end: '2025-12-28', val: 124300000000, form: '10-Q', fy: 2026, fp: 'Q1', frame: 'CY2025Q4' },
              { start: '2025-12-29', end: '2026-03-29', val: 95400000000, form: '10-Q', fy: 2026, fp: 'Q2', frame: 'CY2026Q1' },
            ],
          },
        },
        NetIncomeLoss: {
          units: {
            USD: [
              { start: '2025-09-28', end: '2025-12-28', val: 36330000000, form: '10-Q', fy: 2026, fp: 'Q1', frame: 'CY2025Q4' },
              { start: '2025-12-29', end: '2026-03-29', val: 24780000000, form: '10-Q', fy: 2026, fp: 'Q2', frame: 'CY2026Q1' },
            ],
          },
        },
        EarningsPerShareDiluted: {
          units: {
            'USD/shares': [
              { start: '2025-09-28', end: '2025-12-28', val: 2.4, form: '10-Q', fy: 2026, fp: 'Q1', frame: 'CY2025Q4' },
              { start: '2025-12-29', end: '2026-03-29', val: 1.65, form: '10-Q', fy: 2026, fp: 'Q2', frame: 'CY2026Q1' },
            ],
          },
        },
      },
    },
  };

  const enriched = parseSecCompanyFacts(secFacts, '0000320193', 'Apple Inc.', base);
  assert.equal(enriched.cik, '0000320193');
  assert.equal(enriched.report.financial_charts.financial_performance_4q[0].revenue, 124.3);
  assert.equal(enriched.report.financial_charts.financial_performance_4q[1].eps, 1.65);
  assert.equal(
    enriched.report.findings[0].sourceUrl,
    'https://www.sec.gov/edgar/browse/?CIK=0000320193'
  );
});
