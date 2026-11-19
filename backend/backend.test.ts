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
