import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Check,
  Download,
  Play,
  Table2,
  Eye,
} from 'lucide-react';
import { formatNumber, SchemaObject } from '../types/db';

interface SqlPreset {
  id: string;
  label: string;
  description: string;
  sql: string;
}

const SQL_PRESETS: SqlPreset[] = [
  {
    id: 'amc_aum',
    label: 'Deduplicated AMC AUM Leaderboard',
    description: 'Sums daily fund AUM using fund_dedup_flag = 1 so Direct/Regular plans are never double-counted.',
    sql: `SELECT
  amc,
  COUNT(*) AS dedup_funds,
  ROUND(SUM(fund_aum_cr), 2) AS total_aum_cr,
  ROUND(AVG(ter_direct), 3) AS avg_ter_direct,
  ROUND(AVG(ter_regular), 3) AS avg_ter_regular
FROM v_dedup_fund_aum
GROUP BY amc
ORDER BY total_aum_cr DESC
LIMIT 15;`,
  },
  {
    id: 'stock_overlap',
    label: 'Most Held Stocks Across 24 Equity Funds',
    description: 'Uses v_fund_holdings_aggregated on the latest month-end to rank institutional consensus holdings.',
    sql: `WITH latest_m AS (
  SELECT MAX(month_end) AS m FROM portfolio_holdings
)
SELECT
  h.nse_symbol,
  h.isin,
  MAX(h.security_name) AS security_name,
  COUNT(DISTINCT h.fund_code) AS funds_holding,
  ROUND(SUM(h.market_value_lakh) / 100.0, 2) AS combined_value_cr,
  ROUND(AVG(h.pct_of_fund), 2) AS avg_weight_pct
FROM v_fund_holdings_aggregated h
JOIN latest_m ON h.month_end = latest_m.m
WHERE h.asset_group = 'Equity'
GROUP BY h.isin, h.nse_symbol
ORDER BY combined_value_cr DESC
LIMIT 20;`,
  },
  {
    id: 'ter_spread',
    label: 'Largest Regular vs Direct TER Spread',
    description: 'Identifies active funds with the widest expense ratio gap between Regular and Direct plans.',
    sql: `SELECT
  fund_name,
  amc,
  category_sub,
  ROUND(fund_aum_cr, 1) AS aum_cr,
  ter_direct,
  ter_regular,
  ROUND(ter_regular - ter_direct, 2) AS spread_pct
FROM v_dedup_fund_aum
WHERE ter_direct > 0 AND ter_regular > ter_direct AND fund_aum_cr > 1000
ORDER BY spread_pct DESC
LIMIT 20;`,
  },
  {
    id: 'financia_nav_master',
    label: 'Financia nav_master Compatibility View',
    description: 'Queries the unified nav_master SQL view matching bruce12-glitch/Financia navDatabaseService.ts.',
    sql: `SELECT
  scheme_code,
  date,
  nav,
  scheme_name,
  isin,
  source
FROM nav_master
WHERE source IN ('AMFI_INTERVAL_SEED', 'AMFI_USER_INGEST')
ORDER BY date DESC, scheme_code ASC
LIMIT 25;`,
  },
  {
    id: 'synthetic_holdings',
    label: 'Grouped Synthetic & Corporate-Action Lines',
    description: 'Inspects TREPS, T-Bills, CDs, and corporate-action ISINs merged by v_fund_holdings_aggregated.',
    sql: `SELECT
  fund_code,
  month_end,
  isin,
  security_name,
  mapping_category,
  line_count,
  ROUND(market_value_lakh, 2) AS total_value_lakh,
  ROUND(pct_of_fund, 3) AS pct_of_fund
FROM v_fund_holdings_aggregated
WHERE mapping_category IS NOT NULL AND mapping_category != ''
ORDER BY market_value_lakh DESC
LIMIT 25;`,
  },
];

const PARQUET_DUCKDB_SNIPPET = `-- Query 37.8M-row AMFI NAV history in place over HTTP Range requests (zero full-file download):
SELECT scheme_code, scheme_name, count(*) AS nav_days, min(date) AS first_dt, max(date) AS last_dt
FROM read_parquet('https://api.tigzig.com/mf/v1/download/amfi_nav_master.parquet')
WHERE scheme_code IN (122639, 118989, 105689, 118691)
GROUP BY 1, 2;

-- Query 2.45M-row daily AUM history joined by TEXT amfi_ssd_fund_id:
SELECT amfi_ssd_fund_id, report_date, aum_cr, riskometer
FROM read_parquet('https://api.tigzig.com/mf/v1/download/fund_aum_daily.parquet')
WHERE CAST(amfi_ssd_fund_id AS VARCHAR) = '6453'
ORDER BY report_date DESC
LIMIT 30;`;

export const SqlWorkbenchView: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string | null>(SQL_PRESETS[0].id);
  const [sql, setSql] = useState(SQL_PRESETS[0].sql);
  const [result, setResult] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    truncated: boolean;
    durationMs: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const [schemaObjects, setSchemaObjects] = useState<SchemaObject[]>([]);
  const [expandedObj, setExpandedObj] = useState<string | null>('v_portfolio_enriched');
  const [copiedParquet, setCopiedParquet] = useState(false);

  const executeQuery = async (queryText: string) => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: queryText, maxRows: 250 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'SQL execution failed');
        setResult(null);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetch('/api/db/schema')
      .then((r) => r.json())
      .then((data) => setSchemaObjects(data.objects || []))
      .catch(() => {});
    executeQuery(SQL_PRESETS[0].sql);
  }, []);

  const exportCsv = () => {
    if (!result || result.columns.length === 0) return;
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      result.columns.map(esc).join(','),
      ...result.rows.map((r) => result.columns.map((c) => esc(r[c])).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financia_sql_result.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyParquetSnippet = async () => {
    try {
      await navigator.clipboard.writeText(PARQUET_DUCKDB_SNIPPET);
      setCopiedParquet(true);
      setTimeout(() => setCopiedParquet(false), 1800);
    } catch {
      // Clipboard API fallback ignored
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#090e1a]">
          Read-Only SQL Workbench & Schema Inspector
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Execute live <span className="font-mono text-xs text-slate-800">SELECT</span> and <span className="font-mono text-xs text-slate-800">WITH</span> queries against the Financia SQLite database on an isolated read-only connection.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Query Editor & Results */}
        <div className="lg:col-span-8 space-y-5">
          {/* Preset Query Bar */}
          <div className="flex flex-wrap gap-2">
            {SQL_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setActivePresetId(preset.id);
                    setSql(preset.sql);
                    executeQuery(preset.sql);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#090e1a] text-white border-[#090e1a]'
                      : 'text-slate-700 bg-white border-slate-200 hover:border-[#2563eb] hover:text-[#2563eb]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* SQL Editor Box */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">SQLite Read-Only Query Editor</span>
              <div className="flex items-center gap-2">
                {result && (
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={running}
                  onClick={() => executeQuery(sql)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-md disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{running ? 'Running…' : 'Run Query'}</span>
                </button>
              </div>
            </div>

            <label htmlFor="sql-editor" className="sr-only">SQL Query Input</label>
            <textarea
              id="sql-editor"
              value={sql}
              onChange={(e) => {
                setSql(e.target.value);
                setActivePresetId(null);
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  executeQuery(sql);
                }
              }}
              rows={9}
              spellCheck={false}
              className="w-full p-4 font-mono text-xs text-[#090e1a] bg-white focus:outline-none resize-y"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-mono">{error}</span>
            </div>
          )}

          {/* Results Table */}
          {result && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="font-mono tabular-nums">
                  {formatNumber(result.rowCount)} rows returned{result.truncated ? ' (capped at 250)' : ''}
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  {result.durationMs} ms
                </span>
              </div>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr>
                      {result.columns.map((col) => (
                        <th key={col} className="py-2 px-3 font-mono text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(1, result.columns.length)} className="py-8 px-4 text-center text-slate-500">
                          Query returned 0 rows.
                        </td>
                      </tr>
                    ) : (
                      result.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/70">
                          {result.columns.map((col) => {
                            const val = row[col];
                            const isNum = typeof val === 'number';
                            return (
                              <td
                                key={col}
                                className={`py-2 px-3 whitespace-nowrap max-w-xs truncate ${
                                  isNum ? 'font-mono tabular-nums text-[#090e1a]' : 'text-slate-700'
                                }`}
                                title={val === null || val === undefined ? '' : String(val)}
                              >
                                {val === null || val === undefined ? (
                                  <span className="text-slate-400">NULL</span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Parquet HTTP Range Query-In-Place Reference */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-semibold text-[#090e1a]">
                  Parquet Query-In-Place (DuckDB / HTTP Range Requests)
                </h2>
                <p className="text-xs text-slate-500">
                  For the 37.8M-row NAV history and 2.45M-row daily AUM archives on api.tigzig.com
                </p>
              </div>
              <button
                type="button"
                onClick={copyParquetSnippet}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
              >
                {copiedParquet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedParquet ? 'Copied' : 'Copy DuckDB SQL'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto leading-relaxed">
              {PARQUET_DUCKDB_SNIPPET}
            </pre>
          </div>
        </div>

        {/* Right Schema Inspector Sidebar */}
        <aside className="lg:col-span-4 rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h2 className="font-display text-sm font-semibold text-[#090e1a]">
              SQLite Schema Explorer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any table or view to inspect columns
            </p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
            {schemaObjects.map((obj) => {
              const isOpen = expandedObj === obj.name;
              return (
                <div key={obj.name}>
                  <button
                    type="button"
                    onClick={() => setExpandedObj(isOpen ? null : obj.name)}
                    aria-expanded={isOpen}
                    className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      {obj.type === 'view' ? (
                        <Eye className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                      ) : (
                        <Table2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className="font-mono text-xs font-medium text-[#090e1a] truncate">
                        {obj.name}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                      {obj.type === 'view' ? 'VIEW' : `${formatNumber(obj.rowCount)} rows`}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 pt-1 bg-slate-50/50 space-y-1">
                      {obj.columns.map((c) => (
                        <div key={c.name} className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-800 truncate">
                            {c.name}
                            {c.pk ? ' (PK)' : ''}
                          </span>
                          <span className="text-slate-500 shrink-0 ml-2">{c.type || 'TEXT'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
