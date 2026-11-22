import React, { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  formatCr,
  formatNumber,
  HoldingRow,
  IsinMappingRow,
} from '../types/db';

interface FundOption {
  fund_code: string;
  fund_name: string;
  fund_category: string;
  amfi_ssd_fund_id: string | null;
  months_available: number;
  latest_month: string;
  fund_aum_cr: number | null;
  ter_direct: number | null;
  ter_regular: number | null;
}

export const PortfolioHoldingsView: React.FC = () => {
  const [subTab, setSubTab] = useState<'holdings' | 'mappings'>('holdings');

  // Holdings filters
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [assetGroups, setAssetGroups] = useState<string[]>([]);
  const [fundCode, setFundCode] = useState('ALL');
  const [monthEnd, setMonthEnd] = useState('ALL');
  const [assetGroup, setAssetGroup] = useState('ALL');
  const [aggregated, setAggregated] = useState(true);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<HoldingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [allocation, setAllocation] = useState<
    Array<{ asset_group: string; total_value_lakh: number; total_pct: number; row_count: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  // ISIN Mappings state
  const [mappingCategory, setMappingCategory] = useState('ALL');
  const [mappingQ, setMappingQ] = useState('');
  const [mappings, setMappings] = useState<IsinMappingRow[]>([]);
  const [mappingCategories, setMappingCategories] = useState<string[]>([]);
  const [mappingTotal, setMappingTotal] = useState(0);
  const [loadingMappings, setLoadingMappings] = useState(false);

  const pageSize = 50;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(0);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let active = true;
    fetch('/api/db/holdings/filters')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const fundList: FundOption[] = data.funds || [];
        const monthList: string[] = data.months || [];
        setFunds(fundList);
        setMonths(monthList);
        setAssetGroups(data.assetGroups || []);
        if (monthList.length > 0) {
          setMonthEnd(monthList[0]);
        }
        if (fundList.length > 0) {
          const preferred =
            fundList.find((f) => f.fund_code === 'HDFCFLEXICAP') ||
            fundList.find((f) => f.fund_code === 'PPFAS') ||
            fundList[0];
          setFundCode(preferred.fund_code);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
        aggregated: aggregated ? 'true' : 'false',
      });
      if (fundCode !== 'ALL') sp.set('fundCode', fundCode);
      if (monthEnd !== 'ALL') sp.set('monthEnd', monthEnd);
      if (assetGroup !== 'ALL') sp.set('assetGroup', assetGroup);
      if (debouncedQ.trim()) sp.set('q', debouncedQ.trim());

      const res = await fetch(`/api/db/holdings?${sp.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setAllocation(data.allocationByGroup || []);
    } finally {
      setLoading(false);
    }
  }, [fundCode, monthEnd, assetGroup, aggregated, debouncedQ, page]);

  useEffect(() => {
    if (subTab === 'holdings') {
      fetchHoldings();
    }
  }, [subTab, fetchHoldings]);

  useEffect(() => {
    if (subTab !== 'mappings') return;
    setLoadingMappings(true);
    const sp = new URLSearchParams({ limit: '100', offset: '0' });
    if (mappingCategory !== 'ALL') sp.set('category', mappingCategory);
    if (mappingQ.trim()) sp.set('q', mappingQ.trim());

    fetch(`/api/db/isin-mappings?${sp.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setMappings(data.rows || []);
        setMappingTotal(data.total || 0);
        if (data.categories?.length) setMappingCategories(data.categories);
      })
      .finally(() => setLoadingMappings(false));
  }, [subTab, mappingCategory, mappingQ]);

  const selectedFundMeta = funds.find((f) => f.fund_code === fundCode);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#090e1a]">
            Monthly Portfolio Holdings & ISIN Mappings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            24 equity mutual fund disclosures with automatic <span className="font-mono text-xs text-slate-800">SUM(market_value_lakh)</span> ISIN aggregation and text-keyed <span className="font-mono text-xs text-slate-800">amfi_ssd_fund_id</span> join to daily AUM and TER.
          </p>
        </div>

        {/* Segmented Sub-Tab Control */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('holdings')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subTab === 'holdings'
                ? 'bg-white text-[#090e1a] shadow-xs'
                : 'text-slate-600 hover:text-[#090e1a]'
            }`}
          >
            Portfolio Holdings
          </button>
          <button
            type="button"
            onClick={() => setSubTab('mappings')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subTab === 'mappings'
                ? 'bg-white text-[#090e1a] shadow-xs'
                : 'text-slate-600 hover:text-[#090e1a]'
            }`}
          >
            ISIN Mappings ({formatNumber(mappingTotal || 323)})
          </button>
        </div>
      </div>

      {subTab === 'holdings' ? (
        <>
          {/* Filter Controls */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label htmlFor="holdings-fund" className="block text-[11px] font-medium text-slate-500 mb-1">
                  Mutual Fund ({funds.length})
                </label>
                <select
                  id="holdings-fund"
                  value={fundCode}
                  onChange={(e) => { setFundCode(e.target.value); setPage(0); }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                >
                  <option value="ALL">All 24 Equity Funds</option>
                  {funds.map((f) => (
                    <option key={f.fund_code} value={f.fund_code}>
                      {f.fund_name} ({f.fund_category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="holdings-month" className="block text-[11px] font-medium text-slate-500 mb-1">
                  Month-End
                </label>
                <select
                  id="holdings-month"
                  value={monthEnd}
                  onChange={(e) => { setMonthEnd(e.target.value); setPage(0); }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                >
                  <option value="ALL">All Months</option>
                  {months.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="holdings-group" className="block text-[11px] font-medium text-slate-500 mb-1">
                  Asset Group
                </label>
                <select
                  id="holdings-group"
                  value={assetGroup}
                  onChange={(e) => { setAssetGroup(e.target.value); setPage(0); }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                >
                  <option value="ALL">All Asset Groups</option>
                  {assetGroups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label htmlFor="holdings-search" className="block text-[11px] font-medium text-slate-500 mb-1">
                  Security / NSE Symbol / ISIN
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="holdings-search"
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="e.g. HDFCBANK, INE040A01034, SYN…"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aggregated}
                  onChange={(e) => { setAggregated(e.target.checked); setPage(0); }}
                  className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span>
                  Use <span className="font-mono text-slate-900">v_portfolio_enriched</span> (SUM by fund_code, month_end, isin)
                </span>
              </label>

              {selectedFundMeta && (
                <div className="font-mono text-[11px] text-slate-600 flex items-center gap-3 flex-wrap">
                  <span>SSD ID: {selectedFundMeta.amfi_ssd_fund_id || '—'}</span>
                  <span aria-hidden="true">·</span>
                  <span>AUM: {formatCr(selectedFundMeta.fund_aum_cr)}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    TER: {selectedFundMeta.ter_direct != null ? `${selectedFundMeta.ter_direct.toFixed(2)}%` : '—'} Dir /{' '}
                    {selectedFundMeta.ter_regular != null ? `${selectedFundMeta.ter_regular.toFixed(2)}%` : '—'} Reg
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Asset Group Breakdown Chart */}
          {allocation.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="font-display text-sm font-semibold text-[#090e1a]">
                  Asset Group Allocation (₹ Crore)
                </h2>
                <div className="flex items-center gap-3 font-mono text-xs text-slate-500">
                  {allocation.some((a) => a.total_value_lakh < 0) && (
                    <span className="text-amber-700">
                      Net payables excluded from positive bar scale
                    </span>
                  )}
                  <span>
                    {formatNumber(total)} {aggregated ? 'aggregated ISINs' : 'raw filed lines'}
                  </span>
                </div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={allocation
                      .filter((a) => a.total_value_lakh > 0)
                      .slice(0, 7)
                      .map((a) => ({
                        ...a,
                        total_value_cr: Number((a.total_value_lakh / 100).toFixed(2)),
                      }))}
                    layout="vertical"
                    margin={{ top: 4, right: 44, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 'auto']}
                      tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                      tickFormatter={(v) => {
                        const n = Number(v);
                        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L Cr`;
                        if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k Cr`;
                        return `₹${n.toFixed(0)} Cr`;
                      }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="asset_group"
                      width={120}
                      tick={{ fontSize: 11, fill: '#334155' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: unknown) => [`₹${formatNumber(Number(val), 2)} Cr`, 'Market Value']}
                      contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="total_value_cr" fill="#090e1a" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Holdings Table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Security & NSE Symbol</th>
                    <th className="py-2.5 px-4">ISIN · Type</th>
                    <th className="py-2.5 px-4">Fund & Month</th>
                    <th className="py-2.5 px-4">Asset Class</th>
                    <th className="py-2.5 px-4 text-right">Quantity</th>
                    <th className="py-2.5 px-4 text-right">Value (₹ Lakh)</th>
                    <th className="py-2.5 px-4 text-right">% Fund</th>
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
                        No holdings found for this filter selection.
                      </td>
                    </tr>
                  ) : (
                    rows.map((h, idx) => (
                      <tr key={`${h.fund_code}-${h.month_end}-${h.isin}-${h.id ?? idx}`} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 max-w-xs">
                          <div className="font-medium text-[#090e1a] truncate" title={h.security_name}>
                            {h.security_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {h.nse_symbol || 'Unlisted / Non-NSE'}
                            {h.mapping_category ? ` · ${h.mapping_category}` : ''}
                            {h.line_count && h.line_count > 1 ? ` · ${h.line_count} lines merged` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap font-mono">
                          <div className="text-slate-800">{h.isin}</div>
                          <div className="text-[11px] text-slate-500">{h.isin_type || 'ISIN'}</div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="font-mono text-slate-800">{h.fund_code}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{h.month_end}</div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                          <div>{h.asset_group || '—'}</div>
                          <div className="text-[11px] text-slate-500">{h.asset_subgroup || '—'}</div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {formatNumber(h.quantity, 0)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-[#090e1a] whitespace-nowrap">
                          {formatNumber(h.market_value_lakh, 2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[#2563eb] whitespace-nowrap">
                          {h.pct_of_fund.toFixed(2)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

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
        </>
      ) : (
        /* ISIN Mappings Sub-Tab */
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={mappingQ}
                onChange={(e) => setMappingQ(e.target.value)}
                placeholder="Search as-filed ISIN, synthetic SYN code, security name, or reason…"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
              />
            </div>
            <select
              aria-label="Filter mapping category"
              value={mappingCategory}
              onChange={(e) => setMappingCategory(e.target.value)}
              className="sm:w-64 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
            >
              <option value="ALL">All Mapping Categories</option>
              {mappingCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">ISIN As Filed</th>
                    <th className="py-2.5 px-4">Normalized ISIN</th>
                    <th className="py-2.5 px-4">Security & Reason</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Coverage</th>
                    <th className="py-2.5 px-4 text-right">Funds / Rows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingMappings ? (
                    <tr>
                      <td colSpan={6} className="py-8 px-4 text-center text-slate-500">Loading ISIN mappings…</td>
                    </tr>
                  ) : mappings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 px-4 text-center text-slate-500">No mappings found.</td>
                    </tr>
                  ) : (
                    mappings.map((m) => (
                      <tr key={m.isin_as_filed} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">{m.isin_as_filed}</td>
                        <td className="py-2.5 px-4 font-mono font-medium text-[#2563eb] whitespace-nowrap">{m.isin}</td>
                        <td className="py-2.5 px-4 max-w-sm">
                          <div className="font-medium text-[#090e1a]">{m.security_name}</div>
                          <div className="text-[11px] text-slate-500">{m.mapping_reason || '—'}</div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                          {m.mapping_category}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {m.first_month} → {m.last_month}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                          {m.funds} / {m.rows}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
