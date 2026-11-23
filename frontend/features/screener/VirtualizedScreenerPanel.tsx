import React, { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Database,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { SCREENER_FUNDS } from '../../utils/screenerEngine';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { searchV1Funds, V1SearchFundItem } from '../../services/financiaApiClient';

export interface UnifiedScreenerRow {
  symbol: string;
  name: string;
  instrumentType: string;
  category: string;
  currency: 'INR' | 'USD';
  price: number;
  changePct: number;
  return3Y: number | null;
  sharpe3Y: number | null;
  terPct: number | null;
  source: 'catalog' | 'amfi-live';
}

type SortKey = 'symbol' | 'instrumentType' | 'category' | 'price' | 'return3Y' | 'sharpe3Y' | 'terPct';

/**
 * Parses natural-language screener expressions like "sharpe > 1.2 ter < 0.8 etf"
 * into structured numeric predicates + free-text terms.
 */
export function parseNaturalScreenerQuery(raw: string): {
  textTerms: string[];
  minSharpe?: number;
  maxTer?: number;
  minReturn3Y?: number;
  typeFilter?: 'ETF' | 'Mutual Fund';
} {
  let working = raw.toLowerCase().trim();
  let minSharpe: number | undefined;
  let maxTer: number | undefined;
  let minReturn3Y: number | undefined;
  let typeFilter: 'ETF' | 'Mutual Fund' | undefined;

  const sharpeMatch = working.match(/sharpe\s*(?:>|>=)\s*([0-9.]+)/);
  if (sharpeMatch) {
    minSharpe = Number(sharpeMatch[1]);
    working = working.replace(sharpeMatch[0], '');
  }

  const terMatch = working.match(/(?:ter|expense)\s*(?:<|<=)\s*([0-9.]+)/);
  if (terMatch) {
    maxTer = Number(terMatch[1]);
    working = working.replace(terMatch[0], '');
  }

  const cagrMatch = working.match(/(?:3y|cagr|return)\s*(?:>|>=)\s*([0-9.]+)/);
  if (cagrMatch) {
    minReturn3Y = Number(cagrMatch[1]);
    working = working.replace(cagrMatch[0], '');
  }

  if (/\betf\b/.test(working)) {
    typeFilter = 'ETF';
    working = working.replace(/\betf\b/g, '');
  } else if (/\bmutual\s*fund\b|\bmf\b/.test(working)) {
    typeFilter = 'Mutual Fund';
    working = working.replace(/\bmutual\s*fund\b|\bmf\b/g, '');
  }

  const textTerms = working
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return { textTerms, minSharpe, maxTer, minReturn3Y, typeFilter };
}

interface VirtualizedScreenerPanelProps {
  onInspectSymbol: (symbol: string) => void;
}

export const VirtualizedScreenerPanel: React.FC<VirtualizedScreenerPanelProps> = ({
  onInspectSymbol,
}) => {
  const queryClient = useQueryClient();
  const density = useWorkspaceStore((s) => s.density);
  const addToComparison = useWorkspaceStore((s) => s.addToComparison);

  const [nlQuery, setNlQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('return3Y');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const parentRef = useRef<HTMLDivElement | null>(null);
  const parsedQuery = useMemo(() => parseNaturalScreenerQuery(nlQuery), [nlQuery]);

  const { data: gatewayItems = [], isFetching } = useQuery<V1SearchFundItem[]>({
    queryKey: ['gateway-amfi-search', parsedQuery.textTerms.join(' '), categoryFilter],
    queryFn: () =>
      searchV1Funds({
        q: parsedQuery.textTerms.join(' '),
        category: categoryFilter,
        limit: 150,
      }),
    staleTime: 30_000,
  });

  const syncAmfiMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/db/sync/amfi', { method: 'POST' });
      if (!res.ok) throw new Error('AMFI sync failed');
      return (await res.json()) as {
        audit?: { parsedCount: number; status: string; source: string };
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gateway-amfi-search'] });
    },
  });

  const sortedRows = useMemo<UnifiedScreenerRow[]>(() => {
    const bySymbol = new Map<string, UnifiedScreenerRow>();

    for (const f of SCREENER_FUNDS) {
      bySymbol.set(f.symbol.toUpperCase(), {
        symbol: f.symbol.toUpperCase(),
        name: f.name,
        instrumentType: f.instrumentType,
        category: f.subCategory || f.category,
        currency: f.currency,
        price: f.price,
        changePct: f.changePct,
        return3Y: f.returnsTotal['3Y'] ?? f.returnsPrice['3Y'],
        sharpe3Y: f.keyStats.sharpe3Y,
        terPct: f.keyStats.trackingErrorPct,
        source: 'catalog',
      });
    }

    for (const item of gatewayItems) {
      const sym = item.scheme_code.toUpperCase();
      if (!bySymbol.has(sym)) {
        bySymbol.set(sym, {
          symbol: sym,
          name: item.scheme_name,
          instrumentType: item.instrument_type,
          category: item.sub_category || item.asset_class,
          currency: 'INR',
          price: item.nav,
          changePct: 0,
          return3Y: null,
          sharpe3Y: null,
          terPct: item.ter_direct ?? item.ter_regular ?? null,
          source: 'amfi-live',
        });
      }
    }

    const filtered = Array.from(bySymbol.values()).filter((row) => {
      if (categoryFilter !== 'ALL') {
        if (!`${row.category} ${row.name}`.toLowerCase().includes(categoryFilter.toLowerCase())) {
          return false;
        }
      }
      if (parsedQuery.typeFilter && row.instrumentType !== parsedQuery.typeFilter) {
        return false;
      }
      if (parsedQuery.minSharpe !== undefined && (row.sharpe3Y ?? -99) < parsedQuery.minSharpe) {
        return false;
      }
      if (parsedQuery.maxTer !== undefined && (row.terPct ?? 99) > parsedQuery.maxTer) {
        return false;
      }
      if (parsedQuery.minReturn3Y !== undefined && (row.return3Y ?? -99) < parsedQuery.minReturn3Y) {
        return false;
      }
      if (parsedQuery.textTerms.length > 0) {
        const hay = `${row.symbol} ${row.name} ${row.category} ${row.instrumentType}`.toLowerCase();
        for (const term of parsedQuery.textTerms) {
          if (!hay.includes(term)) return false;
        }
      }
      return true;
    });

    const mult = sortDir === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * mult;
      }
      return String(va).localeCompare(String(vb)) * mult;
    });
  }, [gatewayItems, categoryFilter, parsedQuery, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'symbol' || key === 'category' || key === 'instrumentType' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#2563eb]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#2563eb]" />
    );
  };

  const rowHeight = density === 'compact' ? 44 : 56;
  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  return (
    <div
      data-testid="virtualized-gateway-screener"
      className="rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#0d9488] dark:text-[#14b8a6]">
            <Database className="w-3.5 h-3.5" />
            TanStack Virtualized AMFI &amp; ETF Gateway Screener
          </div>
          <h2 className="font-display font-semibold text-lg text-[#090e1a] dark:text-white mt-0.5">
            Instant Multi-Facet &amp; Natural-Language Fund Screener
          </h2>
        </div>

        <button
          type="button"
          onClick={() => syncAmfiMutation.mutate()}
          disabled={syncAmfiMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] px-3 py-2 text-xs font-medium text-[#090e1a] dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncAmfiMutation.isPending ? 'animate-spin' : ''}`} />
          {syncAmfiMutation.isPending ? 'Syncing AMFI NAVAll…' : 'Sync Live AMFI Catalog'}
        </button>
      </div>

      {/* Natural Language + Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            placeholder='Try "sharpe > 1.0 ter < 0.7 etf" or "flexi cap" or "gold"'
            className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#090d16] pl-9 pr-3 py-2 text-xs text-[#090e1a] dark:text-white focus:outline-none focus:border-[#2563eb]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#090d16] px-3 py-2 text-xs text-[#090e1a] dark:text-white"
        >
          <option value="ALL">All Asset Categories</option>
          <option value="Flexi">Flexi &amp; Multi Cap</option>
          <option value="Mid">Mid &amp; Small Cap</option>
          <option value="Index">Index &amp; Large Cap</option>
          <option value="Gold">Gold &amp; Bullion</option>
          <option value="Debt">Debt &amp; Sovereign</option>
        </select>
      </div>

      {/* Quick Smart Query Presets */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px]">
        <span className="inline-flex items-center gap-1 text-[#64748b] font-mono mr-1">
          <Sparkles className="w-3 h-3 text-[#2563eb]" />
          Presets:
        </span>
        {['sharpe > 1.0 ter < 0.5', 'etf 3y > 12', 'gold', 'debt', 'flexi'].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setNlQuery(preset)}
            className="rounded-[6px] bg-[#f1f5f9] dark:bg-[#1e293b] text-[#334155] dark:text-[#cbd5e1] px-2 py-1 font-mono hover:bg-[#e2e8f0] dark:hover:bg-[#334155] cursor-pointer"
          >
            {preset}
          </button>
        ))}
        <span className="ml-auto font-mono text-[#64748b]">
          {sortedRows.length} matches {isFetching ? '· refreshing…' : ''}
        </span>
      </div>

      {syncAmfiMutation.data?.audit && (
        <div className="mb-3 rounded-[8px] bg-[#f0fdf4] dark:bg-[#052e16]/50 border border-[#bbf7d0] dark:border-[#065f46] px-3 py-2 text-xs font-mono text-[#15803d] dark:text-[#34d399]">
          AMFI Gateway synced {syncAmfiMutation.data.audit.parsedCount.toLocaleString()} schemes (
          {syncAmfiMutation.data.audit.source}).
        </div>
      )}

      {/* Virtualized Table Viewport */}
      <div
        ref={parentRef}
        className="h-[380px] overflow-auto rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937]"
      >
        <div className="min-w-[780px]">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 px-3 py-2.5 bg-[#f8fafc] dark:bg-[#0f172a] border-b border-[#e2e8f0] dark:border-[#1f2937] text-[10.5px] font-mono uppercase tracking-wider text-[#64748b]">
            <button
              type="button"
              onClick={() => toggleSort('symbol')}
              className="col-span-4 flex items-center gap-1 text-left cursor-pointer"
            >
              Instrument {renderSortIcon('symbol')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('instrumentType')}
              className="col-span-1 flex items-center gap-1 text-left cursor-pointer"
            >
              Type {renderSortIcon('instrumentType')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('category')}
              className="col-span-2 flex items-center gap-1 text-left cursor-pointer"
            >
              Category {renderSortIcon('category')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('price')}
              className="col-span-1 flex items-center justify-end gap-1 cursor-pointer"
            >
              NAV {renderSortIcon('price')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('return3Y')}
              className="col-span-1 flex items-center justify-end gap-1 cursor-pointer"
            >
              3Y {renderSortIcon('return3Y')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('sharpe3Y')}
              className="col-span-1 flex items-center justify-end gap-1 cursor-pointer"
            >
              Sharpe {renderSortIcon('sharpe3Y')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('terPct')}
              className="col-span-1 flex items-center justify-end gap-1 cursor-pointer"
            >
              TER {renderSortIcon('terPct')}
            </button>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* Virtualized Rows */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((vRow) => {
              const r = sortedRows[vRow.index];
              return (
                <div
                  key={r.symbol}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${vRow.size}px`,
                    transform: `translateY(${vRow.start}px)`,
                  }}
                  className="grid grid-cols-12 gap-2 px-3 items-center border-b border-[#e2e8f0] dark:border-[#1f2937] hover:bg-[#f8fafc] dark:hover:bg-[#1e293b]/50 transition"
                >
                  <div className="col-span-4 min-w-0">
                    <button
                      type="button"
                      onClick={() => onInspectSymbol(r.symbol)}
                      className="font-mono text-xs font-semibold text-[#090e1a] dark:text-white hover:text-[#2563eb] dark:hover:text-[#60a5fa] cursor-pointer"
                    >
                      {r.symbol}
                    </button>
                    <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] truncate">
                      {r.name}
                    </div>
                  </div>
                  <div className="col-span-1 font-mono text-[11px] text-[#475569] dark:text-[#cbd5e1] truncate">
                    {r.instrumentType}
                  </div>
                  <div className="col-span-2 text-xs text-[#475569] dark:text-[#94a3b8] truncate">
                    {r.category}
                  </div>
                  <div className="col-span-1 text-right font-mono text-xs tabular-nums font-medium text-[#090e1a] dark:text-white">
                    {r.currency === 'USD' ? '$' : '₹'}
                    {r.price.toFixed(2)}
                  </div>
                  <div className="col-span-1 text-right font-mono text-xs tabular-nums font-semibold">
                    {r.return3Y !== null ? (
                      <span
                        className={
                          r.return3Y >= 0
                            ? 'text-[#059669] dark:text-[#10b981]'
                            : 'text-[#dc2626] dark:text-[#f43f5e]'
                        }
                      >
                        {r.return3Y >= 0 ? '+' : ''}
                        {r.return3Y.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[#94a3b8]">—</span>
                    )}
                  </div>
                  <div className="col-span-1 text-right font-mono text-xs tabular-nums text-[#334155] dark:text-[#cbd5e1]">
                    {r.sharpe3Y !== null ? r.sharpe3Y.toFixed(2) : '—'}
                  </div>
                  <div className="col-span-1 text-right font-mono text-xs tabular-nums text-[#475569] dark:text-[#94a3b8]">
                    {r.terPct !== null ? `${r.terPct.toFixed(2)}%` : '—'}
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => addToComparison(r.symbol)}
                      className="rounded-[6px] border border-[#cbd5e1] dark:border-[#334155] px-2 py-1 text-[10.5px] font-mono text-[#334155] dark:text-[#cbd5e1] hover:border-[#2563eb] cursor-pointer"
                    >
                      +Cmp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
