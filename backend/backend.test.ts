import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createBackendApp } from './app.ts';
import { createPersistenceStore } from './services/persistenceService.ts';

async function startTestServer() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'financia-test-'));
  const dbPath = path.join(tempDir, 'db.json');
  const store = createPersistenceStore(dbPath);
  const app = await createBackendApp(undefined, { store, skipVite: true });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('Failed to bind ephemeral port');
  }
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const cleanup = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tempDir, { recursive: true, force: true });
  };

  return { baseUrl, store, dbPath, cleanup };
}

test('Backend API: health, 4-pillar analysis, heatmap, sentiment & policy calendar work cleanly', async () => {
  const { baseUrl, cleanup } = await startTestServer();
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = (await healthRes.json()) as {
      status: string;
      assetPillars: string[];
      zeroKeyEndpoints: {
        mfnavAnalyticsApi: boolean;
        amfiMutualFundNavApi: boolean;
        amfiSchemeSearch: boolean;
        binanceSpotGoldRestAndWs: boolean;
      };
      configuredKeys: { marketstack: boolean; twelveData: boolean; apiNinjas: boolean; fmp: boolean };
    };
    assert.equal(health.status, 'ok');
    assert.deepEqual(health.assetPillars, ['Mutual Funds', 'Gold & Bullion', 'Debt Funds', 'ETFs']);
    assert.equal(health.zeroKeyEndpoints.mfnavAnalyticsApi, true);
    assert.equal(health.zeroKeyEndpoints.amfiMutualFundNavApi, true);
    assert.equal(health.zeroKeyEndpoints.amfiSchemeSearch, true);
    assert.equal(health.zeroKeyEndpoints.binanceSpotGoldRestAndWs, true);
    assert.equal(typeof health.configuredKeys.marketstack, 'boolean');
    assert.equal(typeof health.configuredKeys.twelveData, 'boolean');
    assert.equal(typeof health.configuredKeys.apiNinjas, 'boolean');
    assert.equal(typeof health.configuredKeys.fmp, 'boolean');

    const etfListRes = await fetch(`${baseUrl}/api/etf/list?offset=0`);
    assert.equal(etfListRes.status, 200);
    const etfListJson = (await etfListRes.json()) as { tickers: string[] };
    assert.ok(Array.isArray(etfListJson.tickers) && etfListJson.tickers.length > 0);

    const etfSearchRes = await fetch(`${baseUrl}/api/etf/search?min_aum=10000000000&country=US`);
    assert.equal(etfSearchRes.status, 200);
    const etfSearchJson = (await etfSearchRes.json()) as { results: unknown[] };
    assert.ok(Array.isArray(etfSearchJson.results) && etfSearchJson.results.length > 0);

    const etfDetailRes = await fetch(`${baseUrl}/api/etf/detail/AGG`);
    assert.equal(etfDetailRes.status, 200);
    const etfDetailJson = (await etfDetailRes.json()) as { symbol: string; summary: { ticker: string } };
    assert.equal(etfDetailJson.symbol, 'AGG');
    assert.equal(etfDetailJson.summary.ticker, 'AGG');

    const curveRes = await fetch(`${baseUrl}/api/macro/treasury-rates`);
    assert.equal(curveRes.status, 200);
    const curveJson = (await curveRes.json()) as {
      usTreasury: { tenors: Array<{ label: string; yieldPct: number }> };
      indiaGsecBenchmark: Array<{ label: string; yieldPct: number }>;
    };
    assert.ok(curveJson.usTreasury.tenors.length >= 3);
    assert.ok(curveJson.indiaGsecBenchmark.length >= 3);

    const holdingsRes = await fetch(`${baseUrl}/api/etf/holdings/SPY`);
    assert.equal(holdingsRes.status, 200);
    const holdingsJson = (await holdingsRes.json()) as { symbol: string; source: string; data: unknown };
    assert.equal(holdingsJson.symbol, 'SPY');
    assert.ok('data' in holdingsJson);

    const weightingsRes = await fetch(`${baseUrl}/api/etf/weightings/SPY`);
    assert.equal(weightingsRes.status, 200);
    const weightingsJson = (await weightingsRes.json()) as {
      symbol: string;
      sectorWeightings: unknown;
      countryWeightings: unknown;
    };
    assert.equal(weightingsJson.symbol, 'SPY');
    assert.ok('sectorWeightings' in weightingsJson && 'countryWeightings' in weightingsJson);

    const batchEtfsRes = await fetch(`${baseUrl}/api/fmp/batch/etfs`);
    assert.equal(batchEtfsRes.status, 200);
    const batchEtfsJson = (await batchEtfsRes.json()) as { source: string; data: unknown };
    assert.ok('source' in batchEtfsJson && 'data' in batchEtfsJson);

    const batchCommRes = await fetch(`${baseUrl}/api/fmp/batch/commodities`);
    assert.equal(batchCommRes.status, 200);
    const batchCommJson = (await batchCommRes.json()) as { source: string; data: unknown };
    assert.ok('source' in batchCommJson && 'data' in batchCommJson);

    const macroIndRes = await fetch(`${baseUrl}/api/macro/indicators?name=CPI`);
    assert.equal(macroIndRes.status, 200);
    const macroIndJson = (await macroIndRes.json()) as { indicator: string };
    assert.equal(macroIndJson.indicator, 'CPI');

    const disclosuresRes = await fetch(`${baseUrl}/api/fmp/funds/disclosures?symbol=GLD`);
    assert.equal(disclosuresRes.status, 200);
    const disclosuresJson = (await disclosuresRes.json()) as { symbol: string; data: unknown };
    assert.equal(disclosuresJson.symbol, 'GLD');
    assert.ok('data' in disclosuresJson);

    const mfnavSearchRes = await fetch(`${baseUrl}/api/mfnav/search?q=hdfc&page=1&page_size=2`);
    assert.equal(mfnavSearchRes.status, 200);
    const mfnavSearchJson = (await mfnavSearchRes.json()) as {
      results: Array<{ scheme_code: number; scheme_name: string }>;
    };
    assert.ok(Array.isArray(mfnavSearchJson.results) && mfnavSearchJson.results.length > 0);

    const mfnavCatRes = await fetch(`${baseUrl}/api/mfnav/categories`);
    assert.equal(mfnavCatRes.status, 200);
    const mfnavCatJson = (await mfnavCatRes.json()) as { categories: unknown[] };
    assert.ok(Array.isArray(mfnavCatJson.categories) && mfnavCatJson.categories.length > 0);

    const mfnavNavRes = await fetch(`${baseUrl}/api/mfnav/nav/100641?page=1&page_size=2`);
    assert.equal(mfnavNavRes.status, 200);

    const isinAnalyzeRes = await fetch(`${baseUrl}/api/funds/analyze?ticker=INF200K01LJ4`);
    assert.equal(isinAnalyzeRes.status, 200);
    const isinJson = (await isinAnalyzeRes.json()) as {
      stock: { ticker: string; currencyUnit?: string };
    };
    assert.equal(isinJson.stock.ticker, 'INF200K01LJ4');
    assert.equal(isinJson.stock.currencyUnit, 'INR');

    const mfSearchRes = await fetch(`${baseUrl}/api/mf/search?q=parag`);
    assert.equal(mfSearchRes.status, 200);
    const mfSearchJson = (await mfSearchRes.json()) as {
      schemes: Array<{ schemeCode: number; schemeName: string }>;
    };
    assert.ok(Array.isArray(mfSearchJson.schemes) && mfSearchJson.schemes.length > 0);

    const mfListRes = await fetch(`${baseUrl}/api/mf?limit=10&offset=0`);
    assert.equal(mfListRes.status, 200);
    const mfListJson = (await mfListRes.json()) as {
      schemes: Array<{ schemeCode: number; schemeName: string }>;
    };
    assert.ok(mfListJson.schemes.length > 0 && mfListJson.schemes.length <= 10);

    const mfLatestRes = await fetch(`${baseUrl}/api/mf/125497/latest`);
    assert.equal(mfLatestRes.status, 200);
    const mfLatestJson = (await mfLatestRes.json()) as {
      payload: { data?: Array<{ date?: string; nav?: string }> };
    };
    assert.ok(Array.isArray(mfLatestJson.payload.data) && mfLatestJson.payload.data.length >= 1);

    const mfHistoryRes = await fetch(`${baseUrl}/api/mf/125497`);
    assert.equal(mfHistoryRes.status, 200);
    const mfHistoryJson = (await mfHistoryRes.json()) as {
      payload: { data?: Array<{ date?: string; nav?: string }> };
    };
    assert.ok(Array.isArray(mfHistoryJson.payload.data) && mfHistoryJson.payload.data.length >= 1);

    const numericFundRes = await fetch(`${baseUrl}/api/funds/analyze?ticker=125497`);
    assert.equal(numericFundRes.status, 200);
    const numericFundJson = (await numericFundRes.json()) as {
      stock: { ticker: string; currencyUnit?: string };
    };
    assert.equal(numericFundJson.stock.ticker, '125497');
    assert.equal(numericFundJson.stock.currencyUnit, 'INR');

    const fundRes = await fetch(`${baseUrl}/api/funds/analyze?ticker=PPFAS`);
    assert.equal(fundRes.status, 200);
    const fundJson = (await fundRes.json()) as {
      stock: { ticker: string; assetClass?: string; currencyUnit?: string; amfiSchemeCode?: string };
    };
    assert.equal(fundJson.stock.ticker, 'PPFAS');
    assert.equal(fundJson.stock.currencyUnit, 'INR');

    const badFundRes = await fetch(`${baseUrl}/api/funds/analyze?ticker=BAD$$SYMBOL`);
    assert.equal(badFundRes.status, 400);

    const techRes = await fetch(`${baseUrl}/api/funds/technicals/GOLDBEES?timeframe=1M&rsiPeriod=14`);
    assert.equal(techRes.status, 200);
    const techJson = (await techRes.json()) as {
      ticker: string;
      points: Array<{ date: string; price: number; rsi: number | null }>;
    };
    assert.equal(techJson.ticker, 'GOLDBEES');
    assert.ok(techJson.points.length >= 4);

    const cmpRes = await fetch(`${baseUrl}/api/funds/compare?primary=GOLDBEES&secondary=SBIGILT`);
    assert.equal(cmpRes.status, 200);
    const cmpJson = (await cmpRes.json()) as {
      comparison: { tickers: Array<{ ticker: string }>; dates: string[] };
    };
    assert.equal(cmpJson.comparison.tickers[0].ticker, 'GOLDBEES');
    assert.equal(cmpJson.comparison.tickers[1].ticker, 'SBIGILT');

    const heatRes = await fetch(`${baseUrl}/api/heatmap?market=india`);
    assert.equal(heatRes.status, 200);
    const heatJson = (await heatRes.json()) as {
      market: string;
      tiles: Array<{ sector: string }>;
    };
    assert.equal(heatJson.market, 'india');
    assert.ok(heatJson.tiles.length > 0);
    assert.ok(
      heatJson.tiles.every((t) =>
        [
          'Flexi & Mid Cap Funds',
          'Nifty & Index ETFs',
          'Gold BeES & SGBs',
          'Gilt & Debt Funds',
          'Liquid & Money Mkt',
          'Banking & PSU Debt',
        ].includes(t.sector)
      )
    );

    const sentRes = await fetch(`${baseUrl}/api/sentiment`);
    assert.equal(sentRes.status, 200);
    const sentJson = (await sentRes.json()) as {
      scopes: { global: { title: string; score: number }; crypto: { title: string }; india: { title: string } };
    };
    assert.equal(sentJson.scopes.global.title, 'All 4-Pillar Assets');
    assert.equal(sentJson.scopes.crypto.title, 'Gold & Bullion Sentiment');
    assert.equal(sentJson.scopes.india.title, 'Mutual Funds & Debt');

    const calRes = await fetch(`${baseUrl}/api/policy-calendar`);
    assert.equal(calRes.status, 200);
    const calJson = (await calRes.json()) as { events: Array<{ ticker: string }> };
    assert.ok(calJson.events.length >= 10);
  } finally {
    await cleanup();
  }
});

test('Backend Auth, Alerts CRUD, Watchlist Persistence & Inquiry validation work end-to-end', async () => {
  const { baseUrl, dbPath, cleanup } = await startTestServer();
  try {
    // 1. Unauthenticated access rejected
    const unauthAlerts = await fetch(`${baseUrl}/api/alerts`);
    assert.equal(unauthAlerts.status, 401);

    // 2. Demo login works cleanly
    const demoLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@financia.io', password: 'DemoPass2026!' }),
    });
    assert.equal(demoLogin.status, 200);
    const demoData = (await demoLogin.json()) as { token: string; user: { email: string } };
    assert.equal(demoData.user.email, 'demo@financia.io');

    // 3. Register new investor + conflict on duplicate
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ananya Rao',
        email: 'ananya@financia.io',
        password: 'StrongPassword9!',
      }),
    });
    assert.equal(regRes.status, 201);
    const regData = (await regRes.json()) as { token: string; user: { id: string } };
    assert.ok(regData.token);

    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ananya Rao',
        email: 'ananya@financia.io',
        password: 'StrongPassword9!',
      }),
    });
    assert.equal(dupRes.status, 409);

    // 4. Watchlist update persists to JSON database
    const putWatch = await fetch(`${baseUrl}/api/watchlist`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData.token}`,
      },
      body: JSON.stringify({
        primaryTicker: 'PPFAS',
        comparisonTickers: ['SBIGILT', 'GOLDBEES'],
      }),
    });
    assert.equal(putWatch.status, 200);
    const watchJson = (await putWatch.json()) as {
      watchlist: { primaryTicker: string; comparisonTickers: string[] };
    };
    assert.equal(watchJson.watchlist.primaryTicker, 'PPFAS');
    assert.deepEqual(watchJson.watchlist.comparisonTickers, ['SBIGILT', 'GOLDBEES']);

    // Verify file persistence directly via fresh store read
    const reloadedStore = createPersistenceStore(dbPath);
    assert.equal(reloadedStore.getUserWatchlist(regData.user.id).primaryTicker, 'PPFAS');

    // 5. Price alert CRUD for GOLDBEES
    const createAlert = await fetch(`${baseUrl}/api/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData.token}`,
      },
      body: JSON.stringify({
        ticker: 'GOLDBEES',
        companyName: 'Nippon India ETF Gold BeES',
        targetPrice: 80.5,
        currentPriceAtSet: 74.85,
        condition: 'above',
        note: 'LBMA spot breakout check',
      }),
    });
    assert.equal(createAlert.status, 201);
    const createdJson = (await createAlert.json()) as { alert: { id: string; ticker: string } };
    assert.equal(createdJson.alert.ticker, 'GOLDBEES');

    const patchAlert = await fetch(`${baseUrl}/api/alerts/${createdJson.alert.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData.token}`,
      },
      body: JSON.stringify({ notificationsEnabled: false }),
    });
    assert.equal(patchAlert.status, 200);
    const patchedJson = (await patchAlert.json()) as { alert: { notificationsEnabled: boolean } };
    assert.equal(patchedJson.alert.notificationsEnabled, false);

    const delAlert = await fetch(`${baseUrl}/api/alerts/${createdJson.alert.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${regData.token}` },
    });
    assert.equal(delAlert.status, 200);

    // 6. Inquiry validation
    const badInq = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A',
        email: 'not-an-email',
        phone: '123',
        message: 'hi',
      }),
    });
    assert.equal(badInq.status, 400);

    const goodInq = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ananya Rao',
        email: 'ananya@financia.io',
        phone: '+919876543210',
        message: 'Requesting institutional Gilt vs Corporate Bond duration modeling.',
      }),
    });
    assert.equal(goodInq.status, 201);

    // 7. Logout revokes token
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${regData.token}` },
    });
    assert.equal(logoutRes.status, 200);

    const meAfterLogout = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${regData.token}` },
    });
    const meJson = (await meAfterLogout.json()) as { authenticated: boolean };
    assert.equal(meJson.authenticated, false);
  } finally {
    await cleanup();
  }
});

test('Backend AI routes validate inputs and return 503 cleanly without mock fallback when GEMINI_API_KEY is unset', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const { baseUrl, cleanup } = await startTestServer();

  try {
    const statusRes = await fetch(`${baseUrl}/api/ai/status`);
    assert.equal(statusRes.status, 200);
    const statusJson = (await statusRes.json()) as { configured: boolean; model: string };
    assert.equal(statusJson.configured, false);
    assert.equal(statusJson.model, 'gemini-4-hydrogen');

    const badTickerRes = await fetch(`${baseUrl}/api/ai/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: 'INVALID$$' }),
    });
    assert.equal(badTickerRes.status, 400);

    const aiRes = await fetch(`${baseUrl}/api/ai/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: 'GOLDBEES', mode: 'antigravity' }),
    });
    assert.equal(aiRes.status, 503);
    const aiErr = (await aiRes.json()) as { code: string };
    assert.equal(aiErr.code, 'GEMINI_KEY_MISSING');
  } finally {
    if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    await cleanup();
  }
});
