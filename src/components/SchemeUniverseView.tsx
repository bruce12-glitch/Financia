import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import {
  formatCr,
  formatNumber,
  SchemeDossierResponse,
  SchemeRow,
} from '../types/db';

export const SchemeUniverseView: React.FC = () => {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [amc, setAmc] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [plan, setPlan] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [activeOnly, setActiveOnly] = useState(true);
  const [sortBy, setSortBy] = useState('aum');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<SchemeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [amcs, setAmcs] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [dossier, setDossier] = useState<SchemeDossierResponse | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  const pageSize = 40;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
      setPage(0);
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
        sortBy,
        sortDir,
        activeOnly: activeOnly ? '1' : '0',
      });
      if (debouncedQ.trim()) sp.set('q', debouncedQ.trim());
      if (amc !== 'ALL') sp.set('amc', amc);
      if (category !== 'ALL') sp.set('category', category);
      if (plan !== 'ALL') sp.set('plan', plan);
      if (source !== 'ALL') sp.set('source', source);

      const res = await fetch(`/api/db/schemes?${sp.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
      if (data.facets?.amcs?.length) setAmcs(data.facets.amcs);
      if (data.facets?.categories?.length) setCategories(data.facets.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schemes');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, amc, category, plan, source, activeOnly, sortBy, sortDir, page]);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  const openDossier = async (schemeCode: string) => {
    setSelectedCode(schemeCode);
    setLoadingDossier(true);
    setDossier(null);
    try {
      const res = await fetch(`/api/db/schemes/${encodeURIComponent(schemeCode)}`);
      if (res.ok) {
        setDossier(await res.json());
      }
    } finally {
      setLoadingDossier(false);
    }
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#090e1a]">
            Scheme Universe & TER Dossier
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Relational join of <span className="font-mono text-xs text-slate-800">scheme_universe</span> (latest AMFI NAVs & SIFs) with <span className="font-mono text-xs text-slate-800">scheme_details</span> (daily AUM, TER, riskometer, and fund managers).
          </p>
        </div>
        <div className="font-mono text-xs text-slate-600 tabular-nums">
          {formatNumber(total)} matching schemes
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <label htmlFor="scheme-search" className="sr-only">
              Search schemes by name, code, ISIN, or AMC
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="scheme-search"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search scheme name, AMFI code, or ISIN…"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="amc-filter" className="sr-only">Filter by AMC</label>
            <select
              id="amc-filter"
              value={amc}
              onChange={(e) => { setAmc(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
            >
              <option value="ALL">All AMCs ({amcs.length})</option>
              {amcs.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="category-filter" className="sr-only">Filter by Category</label>
            <select
              id="category-filter"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <label htmlFor="plan-filter" className="sr-only">Filter by Plan</label>
            <select
              id="plan-filter"
              value={plan}
              onChange={(e) => { setPlan(e.target.value); setPage(0); }}
              className="flex-1 px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
            >
              <option value="ALL">All Plans</option>
              <option value="Direct">Direct</option>
              <option value="Regular">Regular</option>
            </select>

            <label htmlFor="source-filter" className="sr-only">Filter by Source</label>
            <select
              id="source-filter"
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(0); }}
              className="w-24 px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
            >
              <option value="ALL">MF+SIF</option>
              <option value="MF">MF</option>
              <option value="SIF">SIF</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => { setActiveOnly(e.target.checked); setPage(0); }}
              className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
            />
            <span>Active schemes only (hide matured / merged schemes)</span>
          </label>

          {(q || amc !== 'ALL' || category !== 'ALL' || plan !== 'ALL' || source !== 'ALL' || !activeOnly) && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setAmc('ALL');
                setCategory('ALL');
                setPlan('ALL');
                setSource('ALL');
                setActiveOnly(true);
                setPage(0);
              }}
              className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8]"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* High-Density Data Grid */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Code / ISIN</th>
                <th className="py-2.5 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('scheme_name')}
                    className="inline-flex items-center gap-1 hover:text-[#090e1a]"
                  >
                    <span>Scheme & AMC</span>
                    {sortBy === 'scheme_name' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-4">Category · Plan</th>
                <th className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('nav')}
                    className="inline-flex items-center gap-1 hover:text-[#090e1a]"
                  >
                    <span>Latest NAV</span>
                    {sortBy === 'nav' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('aum')}
                    className="inline-flex items-center gap-1 hover:text-[#090e1a]"
                  >
                    <span>Fund AUM (Cr)</span>
                    {sortBy === 'aum' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('ter_direct')}
                    className="inline-flex items-center gap-1 hover:text-[#090e1a]"
                  >
                    <span>TER Dir / Reg</span>
                    {sortBy === 'ter_direct' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-slate-500">
                    No mutual fund schemes matched your query criteria.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const aumVal = r.amfi_daily_fund_aum_cr_all_plans ?? r.aaum_cr_quarterly_avg;
                  return (
                    <tr
                      key={r.scheme_code}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono">
                        <div className="text-[#090e1a] font-medium">{r.scheme_code}</div>
                        <div className="text-[11px] text-slate-500">{r.isin || r.isin2 || '—'}</div>
                      </td>
                      <td className="py-2.5 px-4 max-w-sm">
                        <div className="font-medium text-[#090e1a] truncate" title={r.scheme_name}>
                          {r.scheme_name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {r.amc || 'Unknown AMC'} · {r.source} {r.is_active ? '' : '· Inactive'}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                        <div>{r.category_sub || r.category_group_clean || '—'}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.scheme_plan || '—'} · {r.scheme_option || '—'}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                        <div className="text-[#090e1a] font-medium">
                          {r.nav !== null ? `₹${r.nav.toFixed(4)}` : '—'}
                        </div>
                        <div className="text-[11px] text-slate-500">{r.nav_date || '—'}</div>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono tabular-nums text-slate-800">
                        {formatCr(aumVal)}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono tabular-nums text-slate-700">
                        {r.ter_direct !== null || r.ter_regular !== null
                          ? `${r.ter_direct !== null ? `${r.ter_direct.toFixed(2)}%` : '—'} / ${r.ter_regular !== null ? `${r.ter_regular.toFixed(2)}%` : '—'}`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDossier(r.scheme_code)}
                          className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <div className="font-mono tabular-nums">
            Page {page + 1} of {totalPages} · {formatNumber(total)} rows
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 bg-white rounded-md hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 bg-white rounded-md hover:bg-slate-50 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scheme Dossier Slide-Over Drawer */}
      {selectedCode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Scheme Database Dossier"
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
          onClick={() => setSelectedCode(null)}
        >
          <div
            className="w-full max-w-xl bg-white h-full overflow-y-auto border-l border-slate-200 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="font-mono text-xs text-slate-500">
                  SCHEME CODE {selectedCode}
                </div>
                <h2 className="mt-1 font-display text-lg font-semibold text-[#090e1a]">
                  {dossier?.scheme.scheme_name || 'Loading scheme dossier…'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close scheme dossier"
                onClick={() => setSelectedCode(null)}
                className="p-1.5 text-slate-500 hover:text-[#090e1a] rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDossier || !dossier ? (
              <div className="space-y-3">
                <div className="h-16 bg-slate-100 rounded animate-pulse" />
                <div className="h-32 bg-slate-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-5">
                  <div>
                    <dt className="text-slate-500">Latest NAV</dt>
                    <dd className="mt-1 font-mono text-base font-semibold text-[#090e1a] tabular-nums">
                      {dossier.scheme.nav !== null ? `₹${dossier.scheme.nav.toFixed(4)}` : '—'}
                    </dd>
                    <dd className="text-[11px] text-slate-500">{dossier.scheme.nav_date || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Daily Fund AUM (All Plans)</dt>
                    <dd className="mt-1 font-mono text-base font-semibold text-[#090e1a] tabular-nums">
                      {formatCr(dossier.scheme.amfi_daily_fund_aum_cr_all_plans ?? dossier.scheme.aaum_cr_quarterly_avg)}
                    </dd>
                    <dd className="text-[11px] text-slate-500">
                      amfi_ssd_fund_id: <span className="font-mono">{dossier.scheme.amfi_ssd_fund_id || '—'}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">TER Direct / Regular</dt>
                    <dd className="mt-1 font-mono font-semibold text-[#090e1a] tabular-nums">
                      {dossier.scheme.ter_direct !== null ? `${dossier.scheme.ter_direct}%` : '—'} /{' '}
                      {dossier.scheme.ter_regular !== null ? `${dossier.scheme.ter_regular}%` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Riskometer & Benchmark</dt>
                    <dd className="mt-1 font-medium text-[#090e1a]">
                      {dossier.scheme.amfi_daily_riskometer || '—'}
                    </dd>
                    <dd className="text-[11px] text-slate-500 truncate">
                      {dossier.scheme.amfi_daily_benchmark || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Primary / Secondary ISIN</dt>
                    <dd className="mt-1 font-mono text-slate-800">
                      {dossier.scheme.isin || '—'} {dossier.scheme.isin2 ? `/ ${dossier.scheme.isin2}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">History Window</dt>
                    <dd className="mt-1 font-mono text-slate-800">
                      {dossier.scheme.first_date || '—'} → {dossier.scheme.last_date || '—'}
                    </dd>
                  </div>
                </dl>

                {dossier.scheme.ssd_fund_managers && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-slate-700">Fund Managers</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{dossier.scheme.ssd_fund_managers}</p>
                  </div>
                )}

                {dossier.scheme.ssd_exit_load && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-slate-700">Exit Load Terms</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{dossier.scheme.ssd_exit_load}</p>
                  </div>
                )}

                {dossier.scheme.ssd_objective && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-slate-700">Investment Objective</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{dossier.scheme.ssd_objective}</p>
                  </div>
                )}

                {dossier.amfiFeedEntries.length > 0 && (
                  <div className="space-y-2 border-t border-slate-200 pt-4">
                    <h3 className="text-xs font-semibold text-[#090e1a]">
                      AMFI Semicolon Feed Ledger Matches ({dossier.amfiFeedEntries.length})
                    </h3>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                      {dossier.amfiFeedEntries.map((e) => (
                        <div key={`${e.scheme_code}-${e.nav_date}`} className="px-3 py-2 flex justify-between text-xs font-mono">
                          <span>{e.nav_date} · {e.plan || 'Standard'}</span>
                          <span className="font-semibold">₹{e.nav.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(dossier.qualityFlags.length > 0 || dossier.aumNotes.length > 0) && (
                  <div className="space-y-2 border-t border-slate-200 pt-4">
                    <h3 className="text-xs font-semibold text-amber-800">
                      Data Quality Annotations ({dossier.qualityFlags.length + dossier.aumNotes.length})
                    </h3>
                    {dossier.qualityFlags.map((flag) => (
                      <div key={flag.id} className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs">
                        <div className="font-mono font-medium text-amber-900">
                          {flag.issue_code} · {flag.status}
                        </div>
                        <div className="mt-1 text-slate-700">{flag.detail || flag.issue}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
