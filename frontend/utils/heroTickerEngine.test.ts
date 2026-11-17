import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTickerDelta,
  formatTickerPrice,
  INITIAL_HERO_TICKER_ITEMS,
  stepHeroTickerItems,
} from './heroTickerEngine.ts';

test('INITIAL_HERO_TICKER_ITEMS includes core India, FX, commodity, and US tickers', () => {
  const symbols = INITIAL_HERO_TICKER_ITEMS.map((item) => item.symbol);
  assert.ok(symbols.includes('RELIANCE'));
  assert.ok(symbols.includes('TCS'));
  assert.ok(symbols.includes('INFY'));
  assert.ok(symbols.includes('USD/INR'));
  assert.ok(symbols.includes('GOLD 10g'));
  assert.ok(symbols.includes('S&P 500'));
});

test('formatTickerPrice and formatTickerDelta produce TradingView-style price and directional arrows', () => {
  assert.equal(formatTickerPrice(2948.6, 2), '2,948.60');
  assert.equal(formatTickerPrice(72140, 0), '72,140');
  assert.deepEqual(formatTickerDelta(1.24), {
    isPositive: true,
    triangle: '▲',
    label: '+1.24%',
  });
  assert.deepEqual(formatTickerDelta(-0.66), {
    isPositive: false,
    triangle: '▼',
    label: '-0.66%',
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
