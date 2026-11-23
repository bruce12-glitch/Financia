import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  computeNavMetricsFromSeries,
  NavDatabaseService,
  resolveNavDatabaseConfig,
} from './services/navDatabaseService.ts';

const ROOT_SQL_PATH = path.resolve(process.cwd(), 'amfi_nav_dev.sql');
const SILENT_LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

test('resolveNavDatabaseConfig prefers DATABASE_PATH when set and falls back to dev seeding otherwise', () => {
  const cwd = '/tmp/example-workspace';

  const ext = resolveNavDatabaseConfig({
    env: { DATABASE_PATH: '/var/data/prod_amfi.db', NODE_ENV: 'production' },
    cwd,
  });
  assert.equal(ext.mode, 'external');
  assert.equal(ext.dbPath, '/var/data/prod_amfi.db');
  assert.equal(ext.shouldSeedFromSql, false);

  const dev = resolveNavDatabaseConfig({
    env: { NODE_ENV: 'development' },
    cwd: process.cwd(),
  });
  assert.equal(dev.mode, 'dev-seeded');
  assert.equal(dev.dbPath, path.resolve(process.cwd(), 'amfi_nav_dev.db'));
  assert.equal(dev.shouldSeedFromSql, true);
  assert.ok(dev.sqlSeedPath && fs.existsSync(dev.sqlSeedPath));
});

test('NavDatabaseService creates ./amfi_nav_dev.db in development, executes amfi_nav_dev.sql, and is idempotent on restart', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'financia-nav-dev-'));
  try {
    fs.copyFileSync(ROOT_SQL_PATH, path.join(tempDir, 'amfi_nav_dev.sql'));

    // First startup: creates ./amfi_nav_dev.db and executes amfi_nav_dev.sql
    const service1 = new NavDatabaseService({
      env: { NODE_ENV: 'development' },
      cwd: tempDir,
      logger: SILENT_LOGGER,
    });

    const dbFile = path.join(tempDir, 'amfi_nav_dev.db');
    assert.equal(fs.existsSync(dbFile), true);
    assert.equal(service1.isConnected(), true);

    const status1 = service1.getStatus();
    assert.equal(status1.mode, 'dev-seeded');
    assert.equal(status1.seededFromSql, true);
    assert.ok(status1.totalRows >= 4900, `Expected >=4900 seeded rows, got ${status1.totalRows}`);
    assert.equal(status1.distinctSchemes, 25);
    assert.deepEqual(status1.sources, ['SIF']);

    // Verify scheme query, ISIN resolution, search, and history
    const detail = service1.getSchemeDetail('1');
    assert.ok(detail);
    assert.equal(detail.scheme_code, 1);
    assert.equal(detail.isin, 'INF966L30019');
    assert.ok(detail.latest_nav > 0);
    assert.ok(detail.observation_count > 100);

    const byIsin = service1.getSchemeDetail('INF966L30019');
    assert.ok(byIsin);
    assert.equal(byIsin.scheme_code, 1);

    const search = service1.searchSchemes('qsif', 10);
    assert.ok(search.length >= 1);
    assert.equal(search[0].scheme_code, 1);

    const history = service1.getSchemeHistory('1', { page: 1, pageSize: 15 });
    assert.ok(history);
    assert.equal(history.data.length, 15);
    assert.equal(history.has_more, true);
    assert.ok(history.data[0].nav_date >= history.data[1].nav_date);

    service1.close();

    // Second startup: reuses existing populated ./amfi_nav_dev.db without duplicating rows
    const service2 = new NavDatabaseService({
      env: { NODE_ENV: 'development' },
      cwd: tempDir,
      logger: SILENT_LOGGER,
    });
    const status2 = service2.getStatus();
    assert.equal(status2.seededFromSql, false);
    assert.equal(status2.totalRows, status1.totalRows);
    assert.equal(status2.distinctSchemes, status1.distinctSchemes);
    service2.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('NavDatabaseService connects directly to existing SQLite .db file when DATABASE_PATH is set', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'financia-nav-ext-'));
  try {
    const customDbPath = path.join(tempDir, 'custom_prod_amfi.db');
    const rawDb = new Database(customDbPath);
    rawDb.exec(`
      CREATE TABLE nav_master(scheme_code BIGINT, date VARCHAR, nav DOUBLE, scheme_name VARCHAR, isin VARCHAR, "source" VARCHAR);
      INSERT INTO nav_master VALUES (900001, '2026-01-02', 100.0000, 'Institutional Sovereign Gilt Direct Growth', 'INF000TEST01', 'AMFI');
      INSERT INTO nav_master VALUES (900001, '2026-01-05', 101.2500, 'Institutional Sovereign Gilt Direct Growth', 'INF000TEST01', 'AMFI');
    `);
    rawDb.close();

    const service = new NavDatabaseService({
      env: { DATABASE_PATH: customDbPath, NODE_ENV: 'production' },
      cwd: tempDir,
      logger: SILENT_LOGGER,
    });

    // Must NOT create ./amfi_nav_dev.db when DATABASE_PATH is set
    assert.equal(fs.existsSync(path.join(tempDir, 'amfi_nav_dev.db')), false);

    const status = service.getStatus();
    assert.equal(status.connected, true);
    assert.equal(status.mode, 'external');
    assert.equal(status.seededFromSql, false);
    assert.equal(status.totalRows, 2);
    assert.equal(status.distinctSchemes, 1);

    const detail = service.getSchemeDetail('900001');
    assert.ok(detail);
    assert.equal(detail.latest_nav, 101.25);
    assert.equal(detail.day_change, 1.25);
    assert.equal(detail.day_change_pct, 1.25);
    assert.equal(detail.total_return_pct, 1.25);

    service.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('computeNavMetricsFromSeries computes drawdown and returns without fabricating 1Y CAGR on short windows', () => {
  const metrics = computeNavMetricsFromSeries([
    { date: '2026-01-01', nav: 100 },
    { date: '2026-01-02', nav: 110 },
    { date: '2026-01-03', nav: 99 },
    { date: '2026-01-04', nav: 105 },
  ]);

  assert.equal(metrics.inceptionNav, 100);
  assert.equal(metrics.totalReturnPct, 5);
  assert.equal(metrics.maxDrawdownPct, -10);
  assert.equal(metrics.cagr1yPct, null);
});
