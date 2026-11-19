import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTickerDelta,
  formatTickerPrice,
  INITIAL_HERO_TICKER_ITEMS,
  stepHeroTickerItems,
} from './heroTickerEngine.ts';

test('INITIAL_HERO_TICKER_ITEMS includes core Mutual Funds, Gold, Debt Funds, and ETFs', () => {
  const symbols = INITIAL_HERO_TICKER_ITEMS.map((item) => item.symbol);
  assert.ok(symbols.includes('GOLDBEES'));
  assert.ok(symbols.includes('SPOT GOLD'));
  assert.ok(symbols.includes('PPFAS NAV'));
  assert.ok(symbols.includes('NIFTYBEES'));
  assert.ok(symbols.includes('SBIGILT NAV'));
  assert.ok(symbols.includes('AGG BOND'));
});

test('formatTickerPrice and formatTickerDelta produce tabular price and directional arrows', () => {
  assert.equal(formatTickerPrice(3284.5, 2), '3,284.50');
  assert.equal(formatTickerPrice(1000, 0), '1,000');
  assert.deepEqual(formatTickerDelta(1.24), {
    isPositive: true,
    triangle: '▲',
    label: '+1.24%',
  });
  assert.deepEqual(formatTickerDelta(-0.62), {
    isPositive: false,
    triangle: '▼',
    label: '-0.62%',
  });
});

test('stepHeroTickerItems updates prices cleanly without NaN or negative values', () => {
  const next = stepHeroTickerItems(INITIAL_HERO_TICKER_ITEMS, 0.0005);
  assert.equal(next.length, INITIAL_HERO_TICKER_ITEMS.length);
  for (const item of next) {
    assert.ok(Number.isFinite(item.price) && item.price > 0);
    assert.ok(Number.isFinite(item.changePercent));
  }
});
