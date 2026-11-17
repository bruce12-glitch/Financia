import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUITY_UNIVERSE,
  PORTFOLIO_SNAPSHOTS,
  PREBUILT_SCREENS,
} from '../data/indianMarketData';
import {
  filterScreenerStocks,
  formatINR,
  formatIndianPrice,
  generatePortfolioAiReply,
  searchEquities,
  sortScreenerStocks,
} from './screenerEngine';

test('formatINR formats Indian lakh and crore values accurately', () => {
  assert.equal(formatINR(4862310), '₹48,62,310');
  assert.equal(formatINR(-20815), '−₹20,815');
});

test('formatIndianPrice handles both INR and USD formatting', () => {
  assert.equal(formatIndianPrice(1742.9, '₹'), '₹1,742.90');
  assert.equal(formatIndianPrice(138.6, '$'), '$138.60');
});

test('filterScreenerStocks applies Growth Bargains filters cleanly', () => {
  const growthFilters = PREBUILT_SCREENS[0].filters;
  const matched = filterScreenerStocks(EQUITY_UNIVERSE, growthFilters);
  const symbols = matched.map((m) => m.symbol);
  assert.ok(symbols.includes('COALINDIA'));
  assert.ok(symbols.includes('HCLTECH'));
  assert.ok(symbols.includes('HAL'));
  assert.ok(symbols.includes('PETRONET'));
  assert.ok(symbols.includes('CASTROLIND'));
  assert.ok(!symbols.includes('BHARTIARTL')); // PE > 25 & D/E > 0.5
});

test('sortScreenerStocks orders by numeric columns ascending and descending', () => {
  const sortedPeAsc = sortScreenerStocks(EQUITY_UNIVERSE, 'pe', 'asc');
  assert.equal(sortedPeAsc[0].symbol, 'COALINDIA');

  const sortedRetDesc = sortScreenerStocks(EQUITY_UNIVERSE, 'return1Y', 'desc');
  assert.equal(sortedRetDesc[0].symbol, 'NVDA');
});

test('searchEquities matches symbols and names case-insensitively', () => {
  const hdfc = searchEquities('hdfc');
  assert.equal(hdfc[0].symbol, 'HDFCBANK');

  const nvda = searchEquities('nvidia');
  assert.equal(nvda[0].symbol, 'NVDA');
});

test('generatePortfolioAiReply addresses red flags, benchmark comparison, and concentration', () => {
  const snapshot = PORTFOLIO_SNAPSHOTS[0];
  const flagsReply = generatePortfolioAiReply('Show red flags', snapshot);
  assert.match(flagsReply, /Vakrangee/);

  const benchReply = generatePortfolioAiReply('Compare with NIFTY', snapshot);
  assert.match(benchReply, /16\.4%/);

  const bankReply = generatePortfolioAiReply('banking concentration', snapshot);
  assert.match(bankReply, /34%/);
});
