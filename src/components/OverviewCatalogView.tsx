import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  Database,
  ExternalLink,
  HardDrive,
  RefreshCw,
  SearchCode,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  CatalogDataset,
  formatBytes,
  formatCr,
  formatNumber,
  formatShortTimestamp,
  OverviewResponse,
} from '../types/db';

interface OverviewCatalogViewProps {
  overview: OverviewResponse | null;
  loading: boolean;
  syncingAll: boolean;
  onSyncDataset: (datasetId: string) => Promise<void>;
  onProbeParquet: (datasetId: string) => Promise<void>;
  onNavigateTab: (tab: string) => void;
}

export const OverviewCatalogView: React.FC<OverviewCatalogViewProps> = ({
  overview,
  loading,
  syncingAll,
  onSyncDataset,
  onProbeParquet,
  onNavigateTab,
}) => {
  const [busyDatasetId, setBusyDatasetId] = useState<string | null>(null);
  const [probingId, setProbingId] = useState<string | null>(null);

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-24 rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">Unable to load database overview. Retry refreshing the engine.</p>
      </div>
    );
  }

  const { kpis, topAmcsByAum, datasets, tables, recentSyncRuns } = overview;

  const handleSingleSync = async (ds: CatalogDataset) => {
    setBusyDatasetId(ds.id);
    try {
      await onSyncDataset(ds.id);
    } finally {
      setBusyDatasetId(null);
    }
  };

  const handleProbe = async (ds: CatalogDataset) => {
    setProbingId(ds.id);
    try {
      await onProbeParquet(ds.id);
    } finally {
      setProbingId(null);
    }
  };

  const chartData = topAmcsByAum.map((item) => ({
    name: item.amc.replace(/\s+Mutual Fund$/i, '').slice(0, 22),
    fullAmc: item.amc,
    aumCr: Math.round(item.total_aum_cr),
    funds: item.fund_count,
  }));

  return (
    <div className="space-y-8">
      {/* Page Title & Architectural Context */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#090e1a]">
            Relational Mutual Fund Database
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            Local SQLite WAL warehouse synchronized with the MFPRO AMFI catalog and raw AMFI semicolon NAV feeds, exposing Financia-compatible relational views for deduplicated AUM, aggregated ISIN holdings, and read-only SQL analytics.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 font-mono shrink-0">
          <span>{overview.dbFile}</span>
          <span aria-hidden="true">·</span>
          <span>{formatBytes(overview.dbSizeBytes)}</span>
          <span aria-hidden="true">·</span>
          <span>AS OF {kpis.latestNavDate || '2026-11-22'}</span>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <section aria-label="Database Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Total Indexed SQLite Rows</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#090e1a] tabular-nums">
            {formatNumber(kpis.totalLocalRows)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            7 core tables · 4 analytical views
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Deduplicated Industry AUM</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#090e1a] tabular-nums">
            {formatCr(kpis.totalDedupAumCr)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            {formatNumber(kpis.dedupFundCount)} funds · {formatNumber(kpis.amcCount)} AMCs
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Scheme Universe Coverage</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#090e1a] tabular-nums">
            {formatNumber(kpis.totalSchemes)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            {formatNumber(kpis.activeSchemes)} active · {formatNumber(kpis.sifSchemes)} SIF · {formatNumber(kpis.amfiFeedRows)} AMFI ledger
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Equity Portfolio Disclosures</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#090e1a] tabular-nums">
            {formatNumber(kpis.trackedEquityFunds)} Funds
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            {kpis.holdingsMonthCount} month-ends · {formatNumber(kpis.openQualityFlags)} audit flags
          </div>
        </div>
      </section>

      {/* Two-Column Analytics & Table Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Top AMCs by Deduplicated AUM */}
        <section className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-5 flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#090e1a]">
                Top AMCs by Deduplicated Fund AUM
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Computed from <span className="font-mono text-slate-700">v_dedup_fund_aum</span> where <span className="font-mono text-slate-700">fund_dedup_flag = 1</span> (₹ Crore)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('schemes')}
              className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] whitespace-nowrap shrink-0"
            >
              Explore Schemes →
            </button>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                    tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={136}
                    tick={{ fontSize: 11, fill: '#334155' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`₹${formatNumber(Number(value), 0)} Cr`, 'Deduplicated AUM']}
                    labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullAmc || ''}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="aumCr" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-md">
              <p className="text-sm text-slate-600">Scheme Details dataset has not been synced yet.</p>
              <button
                type="button"
                onClick={() => onSyncDataset('mf.scheme_details_latest')}
                className="mt-3 px-3.5 py-2 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-md"
              >
                Sync Scheme Details
              </button>
            </div>
          )}
        </section>

        {/* SQLite Table Inventory */}
        <section className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-5 flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#090e1a]">
                SQLite Table Inventory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live row counts across normalized Financia tables
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('sql')}
              className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] whitespace-nowrap shrink-0"
            >
              Open SQL Console →
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {tables.map((t) => (
              <div key={t.tableName} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-medium text-[#090e1a] truncate">
                    {t.tableName}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{t.label}</div>
                </div>
                <div className="font-mono text-xs font-semibold text-slate-800 tabular-nums shrink-0">
                  {formatNumber(t.rowCount)} rows
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Financia Compatibility Views</span>
            <span className="font-mono text-slate-700">nav_master · v_portfolio_enriched</span>
          </div>
        </section>
      </div>

      {/* MFPRO 8-Dataset Catalog & Live Sync Manager */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#090e1a]">
              MFPRO Data Catalog & Ingestion Pipelines
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              6 datasets ingest directly into local SQLite via verified HTTPS streams; 2 multi-million-row archives expose live Parquet HTTP Range requests.
            </p>
          </div>
          <a
            href={overview.catalogMeta.summaryUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#090e1a] whitespace-nowrap shrink-0"
          >
            <span>Source Index</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Dataset & SQLite Target</th>
                <th className="py-2.5 px-4">Mode & Cadence</th>
                <th className="py-2.5 px-4 text-right">Catalog Rows</th>
                <th className="py-2.5 px-4 text-right">Local Rows</th>
                <th className="py-2.5 px-4">Sync State</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {datasets.map((ds) => {
                const isSqlite = ds.ingestionMode === 'sqlite';
                const isBusy = busyDatasetId === ds.id || (syncingAll && isSqlite);
                const isProbing = probingId === ds.id;

                return (
                  <tr key={ds.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-medium text-[#090e1a]">{ds.title}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>{ds.id}</span>
                        <span aria-hidden="true">→</span>
                        <span className="text-slate-700">{ds.tableName}</span>
                      </div>
                      {ds.parquetProbe && (
                        <div className="mt-1 font-mono text-[11px] text-emerald-700">
                          HTTP {ds.parquetProbe.httpStatus} · Magic {ds.parquetProbe.footerMagic} · {ds.parquetProbe.contentRange || 'Range OK'} ({ds.parquetProbe.latencyMs}ms)
                        </div>
                      )}
                      {ds.lastError && (
                        <div className="mt-1 text-[11px] text-red-600">{ds.lastError}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div className="font-medium text-slate-800">
                        {isSqlite ? `SQLite (${ds.primaryIngestFormat})` : 'Parquet HTTP Range'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {ds.updateCadence} · as of {ds.dataAsOf}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {formatNumber(ds.catalogRowCount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#090e1a] whitespace-nowrap">
                      {isSqlite ? formatNumber(ds.localRowCount) : 'In-Place'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {ds.syncStatus === 'synced' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Synced {formatShortTimestamp(ds.lastSyncedAt)}</span>
                        </span>
                      ) : ds.syncStatus === 'error' ? (
                        <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Error</span>
                        </span>
                      ) : ds.syncStatus === 'remote-parquet' ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <HardDrive className="w-3.5 h-3.5 shrink-0" />
                          <span>{ds.parquetProbe ? 'Range Verified' : 'Remote Parquet'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-700">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{ds.syncStatus === 'syncing' ? 'Syncing…' : 'Pending'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isSqlite ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSingleSync(ds)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-[#090e1a] disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                          <span>{isBusy ? 'Syncing' : 'Sync Now'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isProbing}
                          onClick={() => handleProbe(ds)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2563eb] bg-white border border-slate-300 rounded-md hover:bg-blue-50/50 disabled:opacity-50 transition-colors"
                        >
                          <SearchCode className="w-3.5 h-3.5" />
                          <span>{isProbing ? 'Probing…' : 'Probe Range'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Ingestion Audit Trail */}
      {recentSyncRuns.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#090e1a]">
              Recent Ingestion Runs
            </h2>
            <span className="text-xs text-slate-500 font-mono">sync_runs audit log</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-2 px-4">Dataset</th>
                  <th className="py-2 px-4">Target Table</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4 text-right">Rows Written</th>
                  <th className="py-2 px-4 text-right">Duration</th>
                  <th className="py-2 px-4 text-right">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSyncRuns.slice(0, 8).map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50/60">
                    <td className="py-2 px-4 font-mono text-slate-800">{run.dataset_id}</td>
                    <td className="py-2 px-4 font-mono text-slate-600">{run.table_name}</td>
                    <td className="py-2 px-4">
                      <span
                        className={
                          run.status === 'success'
                            ? 'text-emerald-700 font-medium'
                            : run.status === 'error'
                            ? 'text-red-600 font-medium'
                            : 'text-amber-700 font-medium'
                        }
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-800">
                      {formatNumber(run.rows_ingested)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600">
                      {run.duration_ms} ms
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-slate-500">
                      {formatShortTimestamp(run.completed_at || run.started_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
