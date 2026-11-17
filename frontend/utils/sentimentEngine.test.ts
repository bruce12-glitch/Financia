import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicHistory90d,
  clampSentimentScore,
  computeCompositeMarketSentiment,
  getSentimentHistoryWindow,
  getSentimentZone,
  parseAlternativeMeFng,
  scoreToNeedleAngle,
} from './sentimentEngine';
import { CRYPTO_ASSETS, MACRO_SPARK_ROWS, MAJOR_INDICES } from '../data/tradingViewData';

test('getSentimentZone maps exact boundaries across all five market regimes', () => {
  assert.equal(getSentimentZone(0).zone, 'Extreme Fear');
  assert.equal(getSentimentZone(24).zone, 'Extreme Fear');
  assert.equal(getSentimentZone(25).zone, 'Fear');
  assert.equal(getSentimentZone(44).zone, 'Fear');
  assert.equal(getSentimentZone(45).zone, 'Neutral');
  assert.equal(getSentimentZone(55).zone, 'Neutral');
  assert.equal(getSentimentZone(56).zone, 'Greed');
  assert.equal(getSentimentZone(74).zone, 'Greed');
  assert.equal(getSentimentZone(75).zone, 'Extreme Greed');
  assert.equal(getSentimentZone(100).zone, 'Extreme Greed');
});

test('scoreToNeedleAngle maps 0..100 cleanly to -90deg..+90deg with clamping', () => {
  assert.equal(clampSentimentScore(-18), 0);
  assert.equal(clampSentimentScore(142), 100);
  assert.equal(scoreToNeedleAngle(0), -90);
  assert.equal(scoreToNeedleAngle(50), 0);
  assert.equal(scoreToNeedleAngle(100), 90);
  assert.equal(scoreToNeedleAngle(130), 90);
});

test('parseAlternativeMeFng extracts live reading, 90d history, and handles malformed payloads', () => {
  assert.equal(parseAlternativeMeFng(null), null);
  assert.equal(parseAlternativeMeFng({ data: [] }), null);

  const mockRows = Array.from({ length: 90 }, (_, idx) => ({
    value: String(Math.max(10, 75 - Math.floor(idx / 2))),
    value_classification: idx === 0 ? 'Extreme Greed' : 'Greed',
    timestamp: String(1763308800 - idx * 86400),
  }));
  const parsed = parseAlternativeMeFng({ data: mockRows });
  assert.ok(parsed);
  assert.equal(parsed.currentScore, 75);
  assert.equal(parsed.previousClose, 75);
  assert.equal(parsed.oneWeekAgo, 72);
  assert.equal(parsed.oneMonthAgo, 61);
  assert.equal(parsed.history7d.length, 7);
  assert.equal(parsed.history90d.length, 90);
  assert.equal(parsed.history90d[89].score, 75);
  assert.equal(parsed.classification, 'Extreme Greed');
});

test('buildDeterministicHistory90d and getSentimentHistoryWindow slice 7d, 30d, and 90d cleanly', () => {
  const series90 = buildDeterministicHistory90d({
    endScore: 68,
    previousClose: 65,
    oneWeekAgo: 61,
    oneMonthAgo: 54,
    nowIso: '2026-11-16T16:35:00.000Z',
    seedOffset: 7,
  });
  assert.equal(series90.length, 90);
  assert.equal(series90[89].score, 68);
  assert.equal(series90[89].date, '2026-11-16');

  assert.equal(getSentimentHistoryWindow(series90, '7d').length, 7);
  assert.equal(getSentimentHistoryWindow(series90, '30d').length, 30);
  assert.equal(getSentimentHistoryWindow(series90, '90d').length, 90);
});

test('computeCompositeMarketSentiment returns valid bounded scopes and reflects live overrides', () => {
  const sample90 = buildDeterministicHistory90d({
    endScore: 71,
    previousClose: 68,
    oneWeekAgo: 60,
    oneMonthAgo: 48,
    nowIso: '2026-11-16T16:35:00.000Z',
    seedOffset: 5,
  });

  const payload = computeCompositeMarketSentiment({
    indices: MAJOR_INDICES,
    crypto: CRYPTO_ASSETS,
    macro: MACRO_SPARK_ROWS,
    liveCryptoFng: {
      currentScore: 71,
      previousClose: 68,
      oneWeekAgo: 60,
      oneMonthAgo: 48,
      history7d: [60, 62, 64, 65, 67, 68, 71],
      history90d: sample90,
      classification: 'Greed',
    },
    liveBtcChangePercent: 3.4,
    isLive: true,
    nowIso: '2026-11-16T16:35:00.000Z',
  });

  assert.equal(payload.isLive, true);
  assert.equal(payload.scopes.crypto.score, 71);
  assert.equal(payload.scopes.crypto.zone, 'Greed');
  assert.equal(payload.scopes.crypto.deltaFromClose, 3);
  assert.equal(payload.scopes.crypto.sourceLabel, 'Alternative.me Live F&G');
  assert.equal(payload.scopes.crypto.history90d.length, 90);

  for (const scope of Object.values(payload.scopes)) {
    assert.ok(scope.score >= 0 && scope.score <= 100);
    assert.equal(scope.drivers.length, 4);
    assert.equal(scope.history90d.length, 90);
    for (const driver of scope.drivers) {
      assert.ok(driver.score >= 0 && driver.score <= 100);
    }
  }
});
