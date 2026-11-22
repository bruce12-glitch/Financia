import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  GitCompare,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatCr,
  formatNumber,
  formatShortTimestamp,
  TerminalCompareItem,
  TerminalFundDossier,
  TerminalFundSummary,
  TerminalStatsResponse,
} from '../types/db';

interface FundTerminalProps {
  onDatabaseChanged?: () => void;
}

type InstrumentScope = 'ALL' | 'ETF' | 'MUTUAL_FUND' | 'INDEX_FUND' | 'FOF';

const INSTRUMENT_TABS: Array<{ id: InstrumentScope; label: string }> = [
  { id: 'ALL', label: 'All Instruments' },
  { id: 'ETF', label: 'ETFs' },
  { id: 'MUTUAL_FUND', label: 'Mutual Funds' },
  { id: 'INDEX_FUND', label: 'Index Funds' },
  { id: 'FOF', label: 'Fund of Funds' },
];

const QUICK_PICKS: Array<{ code: string; label: string; kind: string }> = [
  { code: '122639', label: 'Parag Parikh Flexi Cap', kind: 'Equity MF' },
  { code: '140088', label: 'Nippon India ETF Gold BeES', kind: 'Gold ETF' },
  { code: '118955', label: 'HDFC Flexi Cap Direct', kind: 'Equity MF' },
  { code: '119835', label: 'SBI Contra Direct', kind: 'Value MF' },
  { code: '148927', label: 'Mirae Asset NYSE FANG+ ETF', kind: 'Global ETF' },
  { code: '118553', label: 'Franklin Credit Risk (Segregated)', kind: 'Segregated' },
];

const WATCHLIST_STORAGE_KEY = 'financia_terminal_watchlist_v1';

function instrumentLabel(code: string): string {
  switch (code) {
    case 'ETF':
      return 'ETF';
    case 'INDEX_FUND':
      return 'Index Fund';
    case 'FOF':
      return 'Fund of Funds';
    default:
      return 'Mutual Fund';
  }
}

function formatNav(nav: number | null | undefined): string {
  if (nav === null || nav === undefined || !Number.isFinite(nav)) return '—';
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(nav)}`;
}

function formatInrCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lakh`;
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
}

interface WatchlistEntry {
  scheme_code: string;
  scheme_name: string;
  instrument_type: string;
  nav: number;
}

function loadWatchlist(): WatchlistEntry[] {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchlistEntry[]): void {
  try {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items.slice(0, 12)));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

export const FundTerminal: React.FC<FundTerminalProps> = ({ onDatabaseChanged }) => {
  const [stats, setStats] = useState<TerminalStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  // Autocomplete combobox state
  const [query, setQuery] = useState('');
  const [instrumentScope, setInstrumentScope] = useState<InstrumentScope>('ALL');
  const [activeOnly, setActiveOnly] = useState(true);
  const [suggestions, setSuggestions] = useState<TerminalFundSummary[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Selected fund dossier
  const [selectedCode, setSelectedCode] = useState<string>('122639');
  const [dossier, setDossier] = useState<TerminalFundDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(true);
  const [dossierError, setDossierError] = useState<string | null>(null);

  // Side-by-side compare tray (up to 4 schemes)
  const [compareCodes, setCompareCodes] = useState<string[]>([]);
  const [compareItems, setCompareItems] = useState<TerminalCompareItem[]>([]);
  const [compareExpanded, setCompareExpanded] = useState(true);

  // Local watchlist
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => loadWatchlist());

  const comboboxContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/db/terminal/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TerminalStatsResponse = await res.json();
      setStats(data);
    } catch {
      // Handled gracefully in UI
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadDossier = useCallback(async (schemeCode: string) => {
    setLoadingDossier(true);
    setDossierError(null);
    try {
      const res = await fetch(`/api/db/terminal/fund/${encodeURIComponent(schemeCode)}`);
      if (!res.ok) {
        // Fallback: if default code isn't present, fetch top active scheme from autocomplete
        const fallbackRes = await fetch('/api/db/terminal/autocomplete?activeOnly=true&limit=1');
        if (fallbackRes.ok) {
          const fb = await fallbackRes.json();
          const first = fb.items?.[0];
          if (first && first.scheme_code !== schemeCode) {
            setSelectedCode(first.scheme_code);
            return;
          }
        }
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Fund ${schemeCode} not found`);
      }
      const data: TerminalFundDossier = await res.json();
      setDossier(data);
    } catch (err) {
      setDossierError(err instanceof Error ? err.message : 'Unable to load fund dossier');
    } finally {
      setLoadingDossier(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    loadDossier(selectedCode);
  }, [selectedCode, loadDossier]);

  // Debounced autocomplete query against SQLite
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          instrumentType: instrumentScope,
          activeOnly: activeOnly ? 'true' : 'false',
          limit: '14',
        });
        const res = await fetch(`/api/db/terminal/autocomplete?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(Array.isArray(data.items) ? data.items : []);
        setHighlightedIndex(-1);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        setLoadingSuggestions(false);
      }
    }, 140);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, instrumentScope, activeOnly]);

  // Close autocomplete listbox on click outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (comboboxContainerRef.current && !comboboxContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Fetch comparison matrix whenever compareCodes changes
  useEffect(() => {
    if (compareCodes.length === 0) {
      setCompareItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/db/terminal/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schemeCodes: compareCodes }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setCompareItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        // Ignore transient compare fetch failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compareCodes]);

  const handleSelectSuggestion = (item: TerminalFundSummary) => {
    setSelectedCode(item.scheme_code);
    setQuery(item.scheme_name);
    setDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setDropdownOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (suggestions.length === 0 ? -1 : (prev + 1) % suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        suggestions.length === 0 ? -1 : prev <= 0 ? suggestions.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      if (dropdownOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      } else if (dropdownOpen && suggestions.length > 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const toggleCompare = (schemeCode: string) => {
    setCompareCodes((prev) => {
      if (prev.includes(schemeCode)) {
        return prev.filter((c) => c !== schemeCode);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), schemeCode];
      }
      return [...prev, schemeCode];
    });
    setCompareExpanded(true);
  };

  const toggleWatchlist = (entry: WatchlistEntry) => {
    setWatchlist((prev) => {
      const exists = prev.some((w) => w.scheme_code === entry.scheme_code);
      const next = exists
        ? prev.filter((w) => w.scheme_code !== entry.scheme_code)
        : [entry, ...prev].slice(0, 12);
      saveWatchlist(next);
      return next;
    });
  };

  const handleReprocessFile = async () => {
    setReprocessing(true);
    try {
      const res = await fetch('/api/db/terminal/reprocess', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        await loadDossier(selectedCode);
        onDatabaseChanged?.();
      }
    } finally {
      setReprocessing(false);
    }
  };

  const shareClassChartData = useMemo(() => {
    if (!dossier) return [];
    return dossier.shareClasses
      .filter((sc) => sc.nav > 0)
      .slice(0, 8)
      .map((sc) => {
        const shortLabel = `${sc.plan_type === 'Unspecified' ? 'Std' : sc.plan_type} · ${
          sc.option_type === 'Unspecified' ? 'NAV' : sc.option_type
        }`;
        return {
          code: sc.scheme_code,
          label: sc.is_segregated ? `${shortLabel} (Seg)` : shortLabel,
          nav: Number(sc.nav.toFixed(4)),
          isSelected: sc.scheme_code === dossier.fund.scheme_code,
          isDirect: sc.plan_type === 'Direct',
        };
      });
  }, [dossier]);

  const compareChartData = useMemo(() => {
    return compareItems.map((item) => ({
      code: item.scheme_code,
      name: item.scheme_name.length > 26 ? `${item.scheme_name.slice(0, 26)}…` : item.scheme_name,
      nav: item.nav,
      aumCr: item.fund_aum_cr ?? 0,
      terDirect: item.ter_direct ?? 0,
    }));
  }, [compareItems]);

  const isSelectedWatched = dossier
    ? watchlist.some((w) => w.scheme_code === dossier.fund.scheme_code)
    : false;
  const isSelectedCompared = dossier ? compareCodes.includes(dossier.fund.scheme_code) : false;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#090e1a]">Fund Terminal</h1>
          <p className="text-xs text-slate-600 mt-1">
            Live SQLite-backed ETF &amp; Mutual Fund lookup, Direct vs Regular analytics, share-class structure, and institutional cross-joins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAudit((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Data Processing Audit</span>
            {showAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Top 4 KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Processed Schemes
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-[#090e1a] tabular-nums">
            {loadingStats ? '—' : formatNumber(stats?.totalSchemes)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
            {stats ? `${formatNumber(stats.activeSchemes)} active · as of ${stats.latestNavDate || '—'}` : 'Loading catalog…'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            ETFs &amp; Passive Funds
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-[#090e1a] tabular-nums">
            {loadingStats ? '—' : formatNumber(stats?.etfCount)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
            {stats
              ? `${formatNumber(stats.indexFundCount)} Index · ${formatNumber(stats.fofCount)} FoFs`
              : 'Classifying instruments…'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Fund Families &amp; AMCs
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-[#090e1a] tabular-nums">
            {loadingStats ? '—' : formatNumber(stats?.uniqueFundFamilies)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
            {stats
              ? `${formatNumber(stats.uniqueAmcs)} AMCs · ${formatNumber(stats.uniqueSubCategories)} SEBI categories`
              : 'Grouping share classes…'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Enriched w/ AUM &amp; TER
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-[#059669] tabular-nums">
            {loadingStats ? '—' : formatNumber(stats?.enrichedWithDetailsCount)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
            {stats
              ? `${formatNumber(stats.segregatedCount)} segregated · ${formatNumber(stats.zeroNavCount)} zero-NAV`
              : 'Joining scheme_details…'}
          </div>
        </div>
      </div>

      {/* Collapsible Single-File Data Processing Audit Panel */}
      {showAudit && stats?.latestAudit && (
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#090e1a]">
                Single-File ETL &amp; Anomaly Cleansing Report
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                Source: {stats.latestAudit.source_file} · Processed {formatShortTimestamp(stats.latestAudit.processed_at)} in {stats.latestAudit.duration_ms}ms
              </p>
            </div>
            <button
              type="button"
              disabled={reprocessing}
              onClick={handleReprocessFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reprocessing ? 'animate-spin' : ''}`} />
              <span>{reprocessing ? 'Re-processing…' : 'Re-process Source File'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <div className="text-slate-500">Raw Lines Scanned</div>
              <div className="font-mono font-semibold text-[#090e1a] mt-0.5 tabular-nums">
                {formatNumber(stats.latestAudit.total_lines)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Valid Records Loaded</div>
              <div className="font-mono font-semibold text-[#059669] mt-0.5 tabular-nums">
                {formatNumber(stats.latestAudit.parsed_count)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Mojibake Repaired</div>
              <div className="font-mono font-semibold text-[#2563eb] mt-0.5 tabular-nums">
                {formatNumber(stats.latestAudit.mojibake_fixed)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Invalid ISINs Quarantined</div>
              <div className="font-mono font-semibold text-[#b45309] mt-0.5 tabular-nums">
                {formatNumber(stats.latestAudit.invalid_isin_fixed)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Missing AMCs Inferred</div>
              <div className="font-mono font-semibold text-[#2563eb] mt-0.5 tabular-nums">
                {formatNumber(stats.latestAudit.inferred_amc_count)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Noise / Skipped Lines</div>
              <div className="font-mono font-semibold text-slate-700 mt-0.5 tabular-nums">
                {formatNumber(stats.latestAudit.ignored_noise_count)} / {formatNumber(stats.latestAudit.skipped_count)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Flagship Autocomplete Search & Scope Bar */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Scope Filter */}
          <div className="inline-flex flex-wrap items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
            {INSTRUMENT_TABS.map((tab) => {
              const active = instrumentScope === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setInstrumentScope(tab.id);
                    setDropdownOpen(true);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                    active
                      ? 'bg-white text-[#090e1a] shadow-xs'
                      : 'text-slate-600 hover:text-[#090e1a]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
            />
            <span>Active Nov-2026 funds only</span>
          </label>
        </div>

        {/* Accessible Autocomplete Combobox */}
        <div ref={comboboxContainerRef} className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              role="combobox"
              aria-label="Search ETFs and mutual funds"
              aria-expanded={dropdownOpen}
              aria-autocomplete="list"
              aria-controls="fund-terminal-listbox"
              aria-activedescendant={
                highlightedIndex >= 0 && suggestions[highlightedIndex]
                  ? `terminal-opt-${suggestions[highlightedIndex].scheme_code}`
                  : undefined
              }
              value={query}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search 14,481 ETFs & Mutual Funds by name, AMFI code (e.g. 122639), ISIN (INF...), or AMC…"
              className="w-full pl-10 pr-24 py-2.5 text-sm bg-white border border-slate-300 rounded-md text-[#090e1a] placeholder:text-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {loadingSuggestions && (
                <span className="text-[11px] font-mono text-slate-400">Searching…</span>
              )}
              {query && (
                <button
                  type="button"
                  aria-label="Clear search query"
                  onClick={() => {
                    setQuery('');
                    setDropdownOpen(true);
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Results Listbox */}
          {dropdownOpen && (
            <div
              id="fund-terminal-listbox"
              role="listbox"
              className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[380px] overflow-y-auto divide-y divide-slate-100"
            >
              {suggestions.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-500">
                  {loadingSuggestions
                    ? 'Querying SQLite fund catalog…'
                    : 'No matching ETFs or mutual funds found. Try unchecking "Active Nov-2026 funds only" or switching scope to All Instruments.'}
                </div>
              ) : (
                suggestions.map((item, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const isCurrent = item.scheme_code === selectedCode;
                  return (
                    <button
                      key={item.scheme_code}
                      id={`terminal-opt-${item.scheme_code}`}
                      type="button"
                      role="option"
                      aria-selected={isHighlighted || isCurrent}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelectSuggestion(item)}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-4 transition-colors ${
                        isHighlighted
                          ? 'bg-slate-100'
                          : isCurrent
                            ? 'bg-blue-50/50'
                            : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#090e1a] truncate">
                            {item.scheme_name}
                          </span>
                          {item.is_segregated === 1 && (
                            <span className="text-[10px] font-mono uppercase tracking-wide text-[#b45309] shrink-0">
                              Segregated
                            </span>
                          )}
                          {item.is_active === 0 && (
                            <span className="text-[10px] font-mono uppercase tracking-wide text-slate-400 shrink-0">
                              Historical
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          <span className="font-mono text-slate-700">{item.scheme_code}</span>
                          {item.isin ? ` · ${item.isin}` : ''}
                          {` · ${instrumentLabel(item.instrument_type)} · ${item.sub_category} · ${item.amc}`}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-semibold text-[#090e1a] tabular-nums">
                          {formatNav(item.nav)}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {item.fund_aum_cr ? formatCr(item.fund_aum_cr) : item.nav_date}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Curated Quick-Load Shortcuts & Pinned Watchlist */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Quick Inspect:
            </span>
            {QUICK_PICKS.map((pick) => {
              const active = selectedCode === pick.code;
              return (
                <button
                  key={pick.code}
                  type="button"
                  onClick={() => {
                    setSelectedCode(pick.code);
                    setQuery(pick.label);
                    setDropdownOpen(false);
                  }}
                  className={`text-xs transition-colors ${
                    active
                      ? 'font-semibold text-[#2563eb] underline underline-offset-4'
                      : 'text-slate-600 hover:text-[#090e1a] hover:underline underline-offset-4'
                  }`}
                >
                  {pick.label}
                  <span className="text-[10px] text-slate-400 ml-1">({pick.kind})</span>
                </button>
              );
            })}
          </div>
        </div>

        {watchlist.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
              <Bookmark className="w-3 h-3" />
              Watchlist:
            </span>
            {watchlist.map((w) => (
              <div
                key={w.scheme_code}
                className="inline-flex items-center gap-1.5 border border-slate-200 rounded-md px-2 py-1 bg-slate-50"
              >
                <button
                  type="button"
                  onClick={() => setSelectedCode(w.scheme_code)}
                  className="text-xs font-medium text-slate-700 hover:text-[#2563eb] max-w-[190px] truncate"
                >
                  {w.scheme_name}
                </button>
                <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                  {formatNav(w.nav)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${w.scheme_name} from watchlist`}
                  onClick={() => toggleWatchlist(w)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Multi-Fund Side-by-Side Comparison Panel */}
      {compareCodes.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#2563eb]" />
              <h2 className="text-sm font-semibold text-[#090e1a]">
                Side-by-Side Fund Comparison ({compareItems.length}/4)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCompareExpanded((v) => !v)}
                className="text-xs text-slate-600 hover:text-[#090e1a] inline-flex items-center gap-1"
              >
                <span>{compareExpanded ? 'Collapse' : 'Expand'}</span>
                {compareExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setCompareCodes([])}
                className="text-xs text-red-600 hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>

          {compareExpanded && compareItems.length > 0 && (
            <div className="p-5 space-y-5">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2 pr-4 font-medium w-44">Metric</th>
                      {compareItems.map((item) => (
                        <th key={item.scheme_code} className="py-2 px-3 font-semibold text-[#090e1a] min-w-[200px]">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCode(item.scheme_code)}
                              className="text-left hover:text-[#2563eb] line-clamp-2"
                            >
                              {item.scheme_name}
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${item.scheme_name} from compare`}
                              onClick={() => toggleCompare(item.scheme_code)}
                              className="text-slate-400 hover:text-red-600 shrink-0 mt-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="font-mono text-[11px] font-normal text-slate-500 mt-0.5">
                            {item.scheme_code} · {item.amc}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Instrument &amp; Category</td>
                      {compareItems.map((item) => (
                        <td key={item.scheme_code} className="py-2 px-3 text-slate-800">
                          {instrumentLabel(item.instrument_type)} · {item.sub_category}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Asset Class · Plan</td>
                      {compareItems.map((item) => (
                        <td key={item.scheme_code} className="py-2 px-3 text-slate-800">
                          {item.asset_class} · {item.plan_type} ({item.option_type})
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Latest NAV &amp; Date</td>
                      {compareItems.map((item) => (
                        <td key={item.scheme_code} className="py-2 px-3 font-mono font-semibold text-[#090e1a] tabular-nums">
                          {formatNav(item.nav)}{' '}
                          <span className="font-normal text-slate-500">({item.nav_date})</span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Fund AUM (All Plans)</td>
                      {compareItems.map((item) => (
                        <td key={item.scheme_code} className="py-2 px-3 font-mono text-[#090e1a] tabular-nums">
                          {formatCr(item.fund_aum_cr)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Direct / Regular TER</td>
                      {compareItems.map((item) => (
                        <td key={item.scheme_code} className="py-2 px-3 font-mono tabular-nums">
                          {item.ter_direct !== null ? `${item.ter_direct.toFixed(2)}%` : '—'}
                          {' / '}
                          {item.ter_regular !== null ? `${item.ter_regular.toFixed(2)}%` : '—'}
                          {item.ter_spread_bps !== null && (
                            <span className="text-[#059669] ml-1.5">(-{item.ter_spread_bps} bps)</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Direct vs Regular NAV Edge</td>
                      {compareItems.map((item) => (
                        <td key={item.scheme_code} className="py-2 px-3 font-mono tabular-nums">
                          {item.nav_advantage_pct !== null ? (
                            <span className="text-[#059669] font-medium">+{item.nav_advantage_pct.toFixed(2)}%</span>
                          ) : (
                            '—'
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Riskometer &amp; Share Classes</td>
                      {compareItems.map((item) => (
                        <td key={item.scheme_code} className="py-2 px-3 text-slate-700">
                          {item.riskometer || 'Not disclosed'} · {item.share_class_count} classes
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {compareChartData.length >= 2 && compareChartData.some((d) => d.aumCr > 0) && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                    Fund AUM Comparison (₹ Crore)
                  </div>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={compareChartData} margin={{ top: 8, right: 20, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                        <YAxis
                          width={78}
                          tick={{ fontSize: 11, fill: '#475569' }}
                          tickFormatter={(v) => `₹${formatNumber(v)}`}
                        />
                        <Tooltip
                          formatter={(value: unknown) => [formatCr(Number(value)), 'Fund AUM']}
                          contentStyle={{ fontSize: '12px', borderRadius: '6px', borderColor: '#cbd5e1' }}
                        />
                        <Bar
                          dataKey="aumCr"
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={56}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Selected Fund Dossier Workspace */}
      {dossierError ? (
        <div className="bg-white border border-red-200 rounded-lg p-6 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{dossierError}</span>
        </div>
      ) : loadingDossier && !dossier ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-xs text-slate-500">
          Loading fund dossier from SQLite…
        </div>
      ) : dossier ? (
        <div className="space-y-6">
          {/* Primary Fund Header & Cross-Joined Institutional Strip */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-200">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  <span className="text-[#2563eb] font-semibold">
                    {instrumentLabel(dossier.fund.instrument_type)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{dossier.fund.structure}</span>
                  <span aria-hidden="true">·</span>
                  <span>{dossier.fund.asset_class}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-700">{dossier.fund.sub_category}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      dossier.fund.is_active === 1
                        ? 'text-[#059669] font-semibold'
                        : 'text-[#b45309] font-semibold'
                    }
                  >
                    {dossier.fund.is_active === 1 ? 'Active' : 'Historical / Matured'}
                  </span>
                </div>

                <h2 className="text-lg font-semibold text-[#090e1a] tracking-tight leading-snug">
                  {dossier.fund.scheme_name}
                </h2>

                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-slate-800">{dossier.fund.amc}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">AMFI {dossier.fund.scheme_code}</span>
                  {dossier.fund.isin && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">ISIN {dossier.fund.isin}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>
                    {dossier.fund.plan_type} Plan ({dossier.fund.option_type})
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center lg:items-end lg:flex-col gap-3 shrink-0">
                <div className="lg:text-right">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Latest NAV ({dossier.fund.nav_date})
                  </div>
                  <div className="text-2xl font-mono font-semibold text-[#090e1a] tabular-nums">
                    {formatNav(dossier.fund.nav)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCompare(dossier.fund.scheme_code)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      isSelectedCompared
                        ? 'bg-[#2563eb] text-white border-[#2563eb]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isSelectedCompared ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isSelectedCompared ? 'In Compare' : 'Compare'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleWatchlist({
                        scheme_code: dossier.fund.scheme_code,
                        scheme_name: dossier.fund.scheme_name,
                        instrument_type: dossier.fund.instrument_type,
                        nav: dossier.fund.nav,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      isSelectedWatched
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isSelectedWatched ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                    <span>{isSelectedWatched ? 'Pinned' : 'Pin'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Data Quality / Risk Alert Banner (Only when relevant flags exist) */}
            {(dossier.fund.is_segregated === 1 ||
              dossier.fund.is_zero_nav === 1 ||
              dossier.fund.invalid_isin_note ||
              dossier.qualityFlags.length > 0) && (
              <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-semibold inline-flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#b45309] shrink-0" />
                  <span>Instrument Governance &amp; Data Quality Flags</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {dossier.fund.is_segregated === 1 && (
                    <li>
                      Segregated Side-Pocket Portfolio: represents ring-fenced distressed debt assets separated from the main scheme.
                    </li>
                  )}
                  {dossier.fund.is_zero_nav === 1 && (
                    <li>
                      Zero NAV recorded ({dossier.fund.nav_date}): scheme units may be fully redeemed, matured, or wound up.
                    </li>
                  )}
                  {dossier.fund.invalid_isin_note && (
                    <li>
                      AMFI feed contained non-standard ISIN token ({dossier.fund.invalid_isin_note}); quarantined during ETL cleansing.
                    </li>
                  )}
                  {dossier.qualityFlags.slice(0, 3).map((flag) => (
                    <li key={flag.id}>
                      [{flag.issue_code || 'AUDIT'}] {flag.issue || flag.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cross-Joined Institutional Strip (4 Equal Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-xs">
              <div className="p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Daily Fund AUM (All Plans)
                </div>
                <div className="mt-1 text-base font-mono font-semibold text-[#090e1a] tabular-nums">
                  {formatCr(dossier.fund.fund_aum_cr ?? dossier.fund.aaum_cr_quarterly_avg)}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {dossier.fund.aum_date
                    ? `AMFI Daily · ${dossier.fund.aum_date}`
                    : `${formatNumber(dossier.amcStats.active_schemes)} active schemes at AMC`}
                </div>
              </div>

              <div className="p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Expense Ratio (TER)
                </div>
                <div className="mt-1 text-base font-mono font-semibold text-[#090e1a] tabular-nums">
                  {dossier.directVsRegular.terDirect !== null
                    ? `${dossier.directVsRegular.terDirect.toFixed(2)}% Direct`
                    : 'Not linked'}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                  {dossier.directVsRegular.terRegular !== null
                    ? `Regular ${dossier.directVsRegular.terRegular.toFixed(2)}% · Saves ${
                        dossier.directVsRegular.terSpreadBps ?? 0
                      } bps/yr`
                    : dossier.fund.ter_date
                      ? `TER as of ${dossier.fund.ter_date}`
                      : 'ETF / unlinked TER'}
                </div>
              </div>

              <div className="p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Riskometer &amp; Allotment
                </div>
                <div className="mt-1 text-sm font-semibold text-[#090e1a]">
                  {dossier.fund.riskometer || 'Not disclosed'}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 font-mono">
                  {dossier.fund.allotment_date
                    ? `Allotted ${dossier.fund.allotment_date}`
                    : dossier.fund.first_date
                      ? `NAV since ${dossier.fund.first_date}`
                      : `Raw AMFI header`}
                </div>
              </div>

              <div className="p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Benchmark &amp; Managers
                </div>
                <div className="mt-1 text-xs font-semibold text-[#090e1a] truncate" title={dossier.fund.benchmark || ''}>
                  {dossier.fund.benchmark || '—'}
                </div>
                <div
                  className="mt-0.5 text-[11px] text-slate-500 truncate"
                  title={dossier.fund.fund_managers || ''}
                >
                  {dossier.fund.fund_managers || 'Manager metadata not in SSD'}
                </div>
              </div>
            </div>
          </section>

          {/* Direct vs Regular Analytics + Share-Class Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#090e1a]">
                    Share-Class &amp; Plan Matrix ({dossier.shareClasses.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click any sibling share class to inspect its AMFI code, ISIN, and NAV.
                  </p>
                </div>
                {dossier.directVsRegular.navAdvantagePct !== null && (
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">
                      Direct NAV Premium
                    </div>
                    <div className="text-sm font-mono font-semibold text-[#059669] tabular-nums">
                      +{dossier.directVsRegular.navAdvantagePct.toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] text-slate-500">
                      <th className="py-2.5 px-4 font-medium">Scheme / Share Class</th>
                      <th className="py-2.5 px-3 font-medium">Plan · Option</th>
                      <th className="py-2.5 px-3 font-medium text-right">NAV</th>
                      <th className="py-2.5 px-4 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dossier.shareClasses.map((sc) => {
                      const active = sc.scheme_code === dossier.fund.scheme_code;
                      return (
                        <tr
                          key={sc.scheme_code}
                          onClick={() => setSelectedCode(sc.scheme_code)}
                          className={`cursor-pointer transition-colors ${
                            active ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-[#090e1a] leading-snug">
                              {sc.scheme_name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {sc.scheme_code}
                              {sc.isin ? ` · ${sc.isin}` : ''}
                              {sc.is_segregated === 1 ? ' · SEGREGATED' : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                            <span
                              className={
                                sc.plan_type === 'Direct'
                                  ? 'font-semibold text-[#2563eb]'
                                  : 'text-slate-700'
                              }
                            >
                              {sc.plan_type}
                            </span>
                            {' · '}
                            {sc.option_type}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#090e1a] tabular-nums whitespace-nowrap">
                            {formatNav(sc.nav)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                            {sc.nav_date}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Right Column: Share-Class NAV Bar Chart & Direct vs Regular Impact */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#090e1a]">
                  NAV Distribution Across Share Classes
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Comparing latest AMFI NAVs across Direct, Regular, and IDCW share classes.
                </p>

                {shareClassChartData.length > 0 ? (
                  <div className="h-[210px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={shareClassChartData}
                        layout="vertical"
                        margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          tickFormatter={(v) => `₹${v}`}
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={124}
                          tick={{ fontSize: 10, fill: '#334155' }}
                        />
                        <Tooltip
                          formatter={(value: unknown) => [formatNav(Number(value)), 'NAV']}
                          contentStyle={{ fontSize: '12px', borderRadius: '6px', borderColor: '#cbd5e1' }}
                        />
                        <Bar dataKey="nav" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                          {shareClassChartData.map((entry) => (
                            <Cell
                              key={entry.code}
                              fill={
                                entry.isSelected
                                  ? '#2563eb'
                                  : entry.isDirect
                                    ? '#059669'
                                    : '#94a3b8'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-slate-500">
                    No positive NAV values available for chart visualization.
                  </div>
                )}
              </div>

              {/* Direct vs Regular Cost Compounding Summary */}
              <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Direct vs Regular Plan Analytics
                </div>
                {dossier.directVsRegular.directNav !== null &&
                dossier.directVsRegular.regularNav !== null ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-slate-500">Direct Growth NAV</div>
                      <div className="font-mono font-semibold text-[#090e1a] tabular-nums">
                        {formatNav(dossier.directVsRegular.directNav)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Regular Growth NAV</div>
                      <div className="font-mono font-semibold text-slate-700 tabular-nums">
                        {formatNav(dossier.directVsRegular.regularNav)}
                      </div>
                    </div>
                    {dossier.directVsRegular.illustrative10YrSavingsInr !== null && (
                      <div className="col-span-2 pt-2 border-t border-slate-100">
                        <div className="text-slate-500">
                          Illustrative 10-Yr TER Savings on ₹10 Lakh
                        </div>
                        <div className="font-mono font-semibold text-[#059669] tabular-nums mt-0.5">
                          +{formatInrCompact(dossier.directVsRegular.illustrative10YrSavingsInr)}{' '}
                          <span className="font-sans font-normal text-slate-500">
                            ({dossier.directVsRegular.terSpreadBps} bps annual fee spread)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    {dossier.fund.instrument_type === 'ETF'
                      ? 'Exchange Traded Funds trade as a single listed share class on NSE/BSE with no Direct/Regular distributor commission split.'
                      : 'Only one active plan tier is present in the processed AMFI file for this fund family.'}
                  </p>
                )}

                {dossier.fund.exit_load && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <span className="font-medium text-slate-800">Exit Load:</span> {dossier.fund.exit_load}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Top 10 Portfolio Holdings (when cross-joined via amfi_ssd_fund_id) */}
          {dossier.holdings.items.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#2563eb]" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#090e1a]">
                      Top 10 Disclosed Portfolio Holdings
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cross-joined from SQLite <span className="font-mono">v_portfolio_enriched</span> · Fund Code{' '}
                      <span className="font-mono text-slate-700">{dossier.holdings.fundCode}</span> · Month-End{' '}
                      <span className="font-mono text-slate-700">{dossier.holdings.monthEnd}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] text-slate-500">
                      <th className="py-2.5 px-4 font-medium">Security</th>
                      <th className="py-2.5 px-3 font-medium">NSE / ISIN</th>
                      <th className="py-2.5 px-3 font-medium">Asset Group</th>
                      <th className="py-2.5 px-3 font-medium text-right">Market Value</th>
                      <th className="py-2.5 px-4 font-medium text-right w-40">% of Net Assets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dossier.holdings.items.map((h) => (
                      <tr key={h.isin} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium text-[#090e1a]">{h.security_name}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {h.nse_symbol ? `${h.nse_symbol} · ` : ''}
                          {h.isin}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{h.asset_group || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800 tabular-nums">
                          ₹{formatNumber(h.market_value_lakh, 1)} L
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#2563eb]"
                                style={{ width: `${Math.min(100, Math.max(2, h.pct_of_fund * 8))}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-[#090e1a] tabular-nums w-12">
                              {h.pct_of_fund.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Category Peer Screener */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#090e1a]">
                  Category Peers — {dossier.fund.sub_category} ({instrumentLabel(dossier.fund.instrument_type)})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Active sibling funds ranked by AUM &amp; NAV across distinct fund families.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {dossier.categoryPeers.length} peers shown
              </div>
            </div>

            {dossier.categoryPeers.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">
                No other active peers found in this exact category &amp; instrument group.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] text-slate-500">
                      <th className="py-2.5 px-4 font-medium">Fund Name &amp; AMC</th>
                      <th className="py-2.5 px-3 font-medium">Plan</th>
                      <th className="py-2.5 px-3 font-medium text-right">Fund AUM</th>
                      <th className="py-2.5 px-3 font-medium text-right">Direct TER</th>
                      <th className="py-2.5 px-3 font-medium text-right">Latest NAV</th>
                      <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dossier.categoryPeers.map((peer) => {
                      const inCompare = compareCodes.includes(peer.scheme_code);
                      return (
                        <tr key={peer.scheme_code} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4">
                            <button
                              type="button"
                              onClick={() => setSelectedCode(peer.scheme_code)}
                              className="text-left font-medium text-[#090e1a] hover:text-[#2563eb] leading-snug"
                            >
                              {peer.scheme_name}
                            </button>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono">{peer.scheme_code}</span> · {peer.amc}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {peer.plan_type} · {peer.option_type}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800 tabular-nums whitespace-nowrap">
                            {formatCr(peer.fund_aum_cr)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                            {peer.ter_direct !== null ? `${peer.ter_direct.toFixed(2)}%` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#090e1a] tabular-nums whitespace-nowrap">
                            {formatNav(peer.nav)}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleCompare(peer.scheme_code)}
                                className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors ${
                                  inCompare
                                    ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {inCompare ? 'Added' : '+ Compare'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedCode(peer.scheme_code)}
                                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#2563eb] hover:underline"
                              >
                                <span>Inspect</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
};
