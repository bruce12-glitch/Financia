import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FinnhubService,
  isSafeHttpUrl,
  sanitizeGlobalSymbol,
} from './finnhubService.ts';

test('sanitizeGlobalSymbol enforces strict symbol allowlist and rejects injection attempts', () => {
  assert.equal(sanitizeGlobalSymbol('spy'), 'SPY');
  assert.equal(sanitizeGlobalSymbol(' brk.b '), 'BRK.B');
  assert.equal(sanitizeGlobalSymbol('NVDA'), 'NVDA');
  assert.equal(sanitizeGlobalSymbol(''), null);
  assert.equal(sanitizeGlobalSymbol('../etc/passwd'), null);
  assert.equal(sanitizeGlobalSymbol('SPY&token=leak'), null);
  assert.equal(sanitizeGlobalSymbol('TOOLONGSYMBOLNAME12345'), null);
});

test('isSafeHttpUrl allows only http/https schemes and blocks javascript/data URIs', () => {
  assert.equal(isSafeHttpUrl('https://finnhub.io/news/1'), true);
  assert.equal(isSafeHttpUrl('http://example.com'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,<script>'), false);
  assert.equal(isSafeHttpUrl(''), false);
});

test('FinnhubService falls back cleanly to curated catalog when FINNHUB_API_KEY is unset', async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  delete process.env.FINNHUB_API_KEY;
  try {
    const service = new FinnhubService();
    assert.equal(service.isConfigured(), false);

    const search = await service.searchSymbols('gold');
    assert.equal(search.source, 'curated_catalog');
    assert.ok(search.items.some((i) => i.symbol === 'GLD'));

    const dossier = await service.getInstrumentDossier('SPY');
    assert.ok(dossier);
    assert.equal(dossier.liveSource, 'curated_catalog');
    assert.equal(dossier.instrument.symbol, 'SPY');
    assert.ok(dossier.instrument.dayLow <= dossier.instrument.price);
    assert.ok(dossier.instrument.price <= dossier.instrument.dayHigh);
    assert.ok(dossier.news.length > 0);
    assert.ok(dossier.peers.length > 0);
  } finally {
    if (originalKey !== undefined) process.env.FINNHUB_API_KEY = originalKey;
  }
});

test('FinnhubService merges live Finnhub quote and metric payloads cleanly when configured', async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  process.env.FINNHUB_API_KEY = 'test-key-in-memory';
  try {
    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('/quote?')) {
        return new Response(
          JSON.stringify({ c: 605.5, d: 7.25, dp: 1.21, h: 607.1, l: 599.2, o: 600.0, pc: 598.25 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/stock/metric?')) {
        return new Response(
          JSON.stringify({ metric: { '52WeekHigh': 612.0, '52WeekLow': 470.0, beta: 1.02 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const service = new FinnhubService(mockFetch);
    assert.equal(service.isConfigured(), true);

    const dossier = await service.getInstrumentDossier('SPY');
    assert.ok(dossier);
    assert.equal(dossier.liveSource, 'finnhub_enriched_catalog');
    assert.equal(dossier.instrument.price, 605.5);
    assert.equal(dossier.instrument.changePercent, 1.21);
    assert.equal(dossier.instrument.week52High, 612);
    assert.equal(dossier.instrument.beta, 1.02);
  } finally {
    if (originalKey !== undefined) process.env.FINNHUB_API_KEY = originalKey;
    else delete process.env.FINNHUB_API_KEY;
  }
});
