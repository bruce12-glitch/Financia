import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeExchangeLiveSession,
  getExchangeProfile,
  summarizeGlobalExchangeSessions,
} from './exchangeSessionEngine';
import { GLOBAL_STOCK_EXCHANGES } from './globalExchanges';

test('every global exchange has a valid operational profile with featured symbols', () => {
  for (const ex of GLOBAL_STOCK_EXCHANGES) {
    const profile = getExchangeProfile(ex.id);
    assert.equal(profile.id, ex.id);
    assert.ok(profile.listedEtfsCount > 0);
    assert.ok(profile.featuredSymbols.length >= 2);
  }
});

test('computeExchangeLiveSession detects open market for NSE during Indian trading hours', () => {
  // Wednesday 2026-11-18 06:00 UTC = 11:30 IST (NSE open 09:15 - 15:30 IST)
  const midIndia = new Date('2026-11-18T06:00:00Z');
  const nse = computeExchangeLiveSession('nse', midIndia);
  assert.equal(nse.status, 'OPEN');
  assert.equal(nse.localTimeStr, '11:30');
  assert.ok(nse.sessionProgressPct > 20 && nse.sessionProgressPct < 60);

  // NYSE at 06:00 UTC = 01:00 EST (closed)
  const nyse = computeExchangeLiveSession('nyse', midIndia);
  assert.equal(nyse.status, 'CLOSED');
});

test('summarizeGlobalExchangeSessions identifies London-NY peak liquidity overlap', () => {
  // Wednesday 2026-11-18 15:00 UTC = 15:00 GMT (LSE open) & 10:00 EST (NYSE open)
  const overlapTime = new Date('2026-11-18T15:00:00Z');
  const summary = summarizeGlobalExchangeSessions(GLOBAL_STOCK_EXCHANGES, overlapTime);
  assert.ok(summary.openCount >= 4);
  assert.equal(summary.activeOverlapName, 'London ↔ New York Peak Liquidity Overlap');
  assert.ok(summary.totalListedEtfs > 10000);
});
