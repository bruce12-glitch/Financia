import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Search,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { AmfiNavRow, formatNumber } from '../types/db';

const SAMPLE_INCREMENTAL_FEED = `Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date
Open Ended Schemes(Equity Scheme - Flexi Cap Fund)
PPFAS Mutual Fund
122639;INF879O01027;-;Parag Parikh Flexi Cap Fund - Direct Plan;Direct Plan;Growth Option;91.4820;21-Nov-2026
122640;INF879O01019;-;Parag Parikh Flexi Cap Fund - Regular Plan;Regular Plan;Growth Option;84.1955;21-Nov-2026
HDFC Mutual Fund
118989;INF179K01UT0;-;HDFC Flexi Cap Fund - Direct Plan;Direct Plan;Growth Option;2148.6130;21-Nov-2026`;

interface AmfiIngestViewProps {
  onDatabaseChanged: () => void;
}

export const AmfiIngestView: React.FC<AmfiIngestViewProps> = ({ onDatabaseChanged }) => {
  const [rawText, setRawText] = useState(SAMPLE_INCREMENTAL_FEED);
  const [previewResult, setPreviewResult] = useState<{
    parsedCount: number;
    skippedCount: number;
    detectedAmcs: string[];
    detectedCategories: string[];
    preview: Array<Record<string, unknown>>;
    skippedLines: Array<{ lineNumber: number; raw: string; reason: string }>;
  } | null>(null);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Stored AMFI records ledger
  const [rows, setRows] = useState<AmfiNavRow[]>([]);
  const [total, setTotal] = useState(0);
  const [amcs, setAmcs] = useState<string[]>([]);
  const [amcFilter, setAmcFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loadingLedger, setLoadingLedger] = useState(true);

  const loadLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const sp = new URLSearchParams({ limit: '100', offset: '0' });
      if (amcFilter !== 'ALL') sp.set('amc', amcFilter);
      if (search.trim()) sp.set('q', search.trim());
      const res = await fetch(`/api/db/amfi-nav?${sp.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setAmcs(data.amcs || []);
    } finally {
      setLoadingLedger(false);
    }
  }, [amcFilter, search]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const handleIngest = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    setCommitMessage(null);
    try {
      const res = await fetch('/api/db/ingest/amfi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to parse AMFI text');
        return;
      }
      if (dryRun) {
        setPreviewResult(data);
      } else {
        setPreviewResult(null);
        setCommitMessage(
          `Upserted ${data.upsertedCount} AMFI NAV records across ${data.detectedAmcs.join(', ')}. Total rows in amfi_nav_records: ${data.totalInTable}.`
        );
        await loadLedger();
        onDatabaseChanged();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#090e1a]">
            AMFI Semicolon Feed Parser & Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ingest 6-column or 8-column AMFI NAV semicolon feeds directly into <span className="font-mono text-xs text-slate-800">amfi_nav_records</span> and export Financia-compatible <span className="font-mono text-xs text-slate-800">nav_master</span> SQL seed files.
          </p>
        </div>

        <a
          href="/api/db/export/nav-master.sql?limit=1000"
          download="financia_nav_master_export.sql"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-[#090e1a] whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Financia nav_master.sql</span>
        </a>
      </div>

      {/* Ingestion Workbench */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-semibold text-[#090e1a]">
              Paste Raw AMFI Semicolon Feed
            </h2>
            <p className="text-xs text-slate-500">
              Automatically tracks stateful Scheme Category headers, AMC headers, ISO date normalization (<span className="font-mono">20-Nov-2026 → 2026-11-20</span>), and ISIN cleanup.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRawText(SAMPLE_INCREMENTAL_FEED);
              setError(null);
              setPreviewResult(null);
            }}
            className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] whitespace-nowrap self-start sm:self-auto"
          >
            Load Sample Update
          </button>
        </div>

        <div>
          <label htmlFor="amfi-raw-input" className="sr-only">
            Raw AMFI semicolon-delimited text
          </label>
          <textarea
            id="amfi-raw-input"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={7}
            spellCheck={false}
            className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-md text-[#090e1a] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
            placeholder="Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleIngest(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Validate & Preview</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleIngest(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-md disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{busy ? 'Writing to SQLite…' : 'Upsert into SQLite'}</span>
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {commitMessage && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{commitMessage}</span>
          </div>
        )}

        {previewResult && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <div className="font-medium text-[#090e1a]">
              Dry-Run Validation Passed: <span className="font-mono">{previewResult.parsedCount}</span> valid rows ·{' '}
              <span className="font-mono">{previewResult.skippedCount}</span> skipped
            </div>
            <div className="text-slate-600">
              Detected AMCs: <span className="font-medium text-slate-800">{previewResult.detectedAmcs.join(', ')}</span>
              {' · '}
              Categories: <span className="font-medium text-slate-800">{previewResult.detectedCategories.join(', ')}</span>
            </div>
          </div>
        )}
      </section>

      {/* Stored AMFI NAV Records Table */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-[#090e1a]">
              Stored AMFI NAV Ledger ({formatNumber(total)} rows)
            </h2>
            <p className="text-xs text-slate-500">
              Pre-seeded with the 41 Kotak Mahindra & Nippon India Interval Fund records plus live upserts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Filter AMFI ledger"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Code, ISIN, scheme…"
                className="pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
              />
            </div>
            <select
              aria-label="Filter AMFI ledger by AMC"
              value={amcFilter}
              onChange={(e) => setAmcFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
            >
              <option value="ALL">All AMCs ({amcs.length})</option>
              {amcs.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Scheme Name & AMC</th>
                <th className="py-2.5 px-4">ISIN Growth / Reinv</th>
                <th className="py-2.5 px-4">Plan · Option</th>
                <th className="py-2.5 px-4 text-right">NAV</th>
                <th className="py-2.5 px-4 text-right">ISO Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingLedger ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-slate-500">Loading ledger…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-slate-500">No AMFI records matched.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={`${r.scheme_code}-${r.nav_date}`} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-medium text-[#090e1a] whitespace-nowrap">
                      {r.scheme_code}
                    </td>
                    <td className="py-2.5 px-4 max-w-sm">
                      <div className="font-medium text-[#090e1a] truncate" title={r.scheme_name}>
                        {r.scheme_name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {r.amc} · {r.scheme_category_header}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      <div>{r.isin_div_payout_growth || '—'}</div>
                      {r.isin_div_reinvestment && (
                        <div className="text-slate-500">{r.isin_div_reinvestment}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {r.plan || r.option_name ? `${r.plan || '—'} · ${r.option_name || '—'}` : 'Unspecified'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[#090e1a] whitespace-nowrap">
                      ₹{r.nav.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                      {r.nav_date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
