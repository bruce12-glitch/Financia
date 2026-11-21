import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BENCHMARK_INDEX_SCHEME_CODE,
  computePeerSpreadPct,
  FEATURED_AMFI_SCHEMES,
  formatAumCrores,
  formatDecimalPercent,
  formatDirectPercent,
  formatRatio,
  MfnavFundPayload,
  MfnavNavPoint,
  MfnavSearchItem,
  NavMasterSchemeDetailPayload,
  NavMasterSchemeItem,
  normalizeNavComparisonSeries,
  normalizeSingleNavSeries,
} from './liveLandingEngine';

interface LiveFundExplorerSectionProps {
  onOpenWorkspace: (sectionId: string) => void;
  onInspectSymbol?: (symbol: string) => void;
}

type UniverseMode = 'amfi' | 'sqlite-sif';

interface FeaturedSnapshot {
  schemeCode: number;
  latestNav: number;
  dayChangePct: number | null;
  latestDate: string;
  cagr3y: number | null;
  aumLakhs: number | null;
}

export const LiveFundExplorerSection: React.FC<LiveFundExplorerSectionProps> = ({
  onOpenWorkspace,
  onInspectSymbol,
}) => {
  const [universe, setUniverse] = useState<UniverseMode>('amfi');

  // AMFI live state
  const [selectedCode, setSelectedCode] = useState<number>(FEATURED_AMFI_SCHEMES[0].schemeCode);
  const [fund, setFund] = useState<MfnavFundPayload | null>(null);
  const [schemeNavs, setSchemeNavs] = useState<MfnavNavPoint[]>([]);
  const [benchmarkNavs, setBenchmarkNavs] = useState<MfnavNavPoint[]>([]);
  const [loadingFund, setLoadingFund] = useState<boolean>(true);
  const [fundError, setFundError] = useState<string>('');
  const [sourceTag, setSourceTag] = useState<string>('AMFI');
  const [featuredSnapshots, setFeaturedSnapshots] = useState<Record<number, FeaturedSnapshot>>({});

  // SQLite nav_master (SEBI SIF Long-Short) state
  const [sifSchemes, setSifSchemes] = useState<NavMasterSchemeItem[]>([]);
  const [selectedSifCode, setSelectedSifCode] = useState<number>(1);
  const [sifDetail, setSifDetail] = useState<NavMasterSchemeDetailPayload | null>(null);
  const [sifNavs, setSifNavs] = useState<MfnavNavPoint[]>([]);
  const [loadingSif, setLoadingSif] = useState<boolean>(false);
  const [sifError, setSifError] = useState<string>('');

  // Unified search box (live AMFI + local SQLite nav_master)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MfnavSearchItem[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  // Preload live snapshots for featured AMFI comparison matrix + SQLite SIF scheme list
  useEffect(() => {
    const controller = new AbortController();

    async function loadDirectorySnapshots() {
      const amfiPromises = FEATURED_AMFI_SCHEMES.map(async (item) => {
        try {
          const res = await fetch(`/api/mfnav/fund/${item.schemeCode}`, {
            signal: controller.signal,
          });
          if (!res.ok) return null;
          const json = (await res.json()) as { payload?: MfnavFundPayload };
          const p = json.payload;
          if (!p || typeof p.latest_nav !== 'number') return null;
          return {
            schemeCode: item.schemeCode,
            latestNav: p.latest_nav,
            dayChangePct: p.latest_day_change_pct ?? null,
            latestDate: p.latest_nav_date,
            cagr3y: p.daily_metrics?.cagr_3y ?? null,
            aumLakhs: p.average_aum_lakhs ?? null,
          } satisfies FeaturedSnapshot;
        } catch {
          return null;
        }
      });

      const sifListPromise = fetch('/api/nav-master/schemes?limit=30', {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { schemes?: NavMasterSchemeItem[] } | null) => {
          if (Array.isArray(data?.schemes) && data.schemes.length > 0) {
            setSifSchemes(data.schemes);
            setSelectedSifCode((prev) =>
              data.schemes!.some((s) => s.scheme_code === prev) ? prev : data.schemes![0].scheme_code
            );
          }
        })
        .catch(() => {
          // Non-fatal
        });

      const settled = await Promise.allSettled(amfiPromises);
      await sifListPromise;

      const map: Record<number, FeaturedSnapshot> = {};
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) {
          map[r.value.schemeCode] = r.value;
        }
      }
      if (Object.keys(map).length > 0) {
        setFeaturedSnapshots(map);
      }
    }

    void loadDirectorySnapshots();
    return () => controller.abort();
  }, []);

  const loadSchemeBundle = useCallback(
    async (schemeCode: number, signal?: AbortSignal) => {
      setLoadingFund(true);
      setFundError('');
      try {
        const requests: Promise<Response>[] = [
          fetch(`/api/mfnav/fund/${schemeCode}`, { signal }),
          fetch(`/api/mfnav/nav/${schemeCode}?page_size=90`, { signal }),
        ];

        const needBench = benchmarkNavs.length === 0;
        if (needBench) {
          requests.push(
            fetch(`/api/mfnav/nav/${BENCHMARK_INDEX_SCHEME_CODE}?page_size=90`, { signal })
          );
        }

        const responses = await Promise.all(requests);
        const fundJson = (await responses[0].json()) as {
          source?: string;
          payload?: MfnavFundPayload;
          error?: string;
        };
        const navJson = (await responses[1].json()) as {
          payload?: { data?: MfnavNavPoint[] };
        };

        if (!responses[0].ok || !fundJson.payload || typeof fundJson.payload.latest_nav !== 'number') {
          throw new Error(fundJson.error || 'Could not load live AMFI scheme record.');
        }

        setFund(fundJson.payload);
        setSourceTag(fundJson.payload.source || fundJson.source || 'AMFI');
        setSchemeNavs(Array.isArray(navJson.payload?.data) ? navJson.payload.data : []);

        if (needBench && responses[2]) {
          const benchJson = (await responses[2].json()) as {
            payload?: { data?: MfnavNavPoint[] };
          };
          if (Array.isArray(benchJson.payload?.data) && benchJson.payload.data.length > 0) {
            setBenchmarkNavs(benchJson.payload.data);
          }
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setFundError(
          err instanceof Error ? err.message : 'Unable to reach live AMFI NAV service.'
        );
      } finally {
        setLoadingFund(false);
      }
    },
    [benchmarkNavs.length]
  );

  const loadSifBundle = useCallback(async (schemeCode: number, signal?: AbortSignal) => {
    setLoadingSif(true);
    setSifError('');
    try {
      const [detailRes, navRes] = await Promise.all([
        fetch(`/api/nav-master/fund/${schemeCode}`, { signal }),
        fetch(`/api/nav-master/nav/${schemeCode}?page_size=180`, { signal }),
      ]);
      const detailJson = (await detailRes.json()) as {
        payload?: NavMasterSchemeDetailPayload;
        error?: string;
      };
      const navJson = (await navRes.json()) as {
        payload?: { data?: MfnavNavPoint[] };
      };
      if (!detailRes.ok || !detailJson.payload) {
        throw new Error(detailJson.error || 'Could not load scheme from SQLite nav_master.');
      }
      setSifDetail(detailJson.payload);
      setSifNavs(Array.isArray(navJson.payload?.data) ? navJson.payload.data : []);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setSifError(err instanceof Error ? err.message : 'SQLite nav_master unavailable.');
    } finally {
      setLoadingSif(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSchemeBundle(selectedCode, controller.signal);
    return () => controller.abort();
  }, [selectedCode, loadSchemeBundle]);

  useEffect(() => {
    if (universe !== 'sqlite-sif') return;
    const controller = new AbortController();
    void loadSifBundle(selectedSifCode, controller.signal);
    return () => controller.abort();
  }, [universe, selectedSifCode, loadSifBundle]);

  // Debounced unified search across AMFI + SQLite nav_master
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        if (universe === 'sqlite-sif') {
          const res = await fetch(
            `/api/nav-master/search?q=${encodeURIComponent(trimmed)}&limit=10`,
            { signal: controller.signal }
          );
          const data = (await res.json()) as { results?: NavMasterSchemeItem[] };
          const list = Array.isArray(data.results)
            ? data.results.map((item) => ({
                scheme_code: item.scheme_code,
                scheme_name: item.scheme_name,
                fund_house: `${item.source} (SQLite nav_master)`,
                plan_type: item.scheme_name.toLowerCase().includes('direct') ? 'Direct' : 'Regular',
                option_type: item.scheme_name.toLowerCase().includes('idcw') ? 'IDCW' : 'Growth',
                isin: item.isin,
                category: item.source,
                sub_category: `${item.observation_count} daily NAVs`,
              }))
            : [];
          setSearchResults(list);
        } else {
          const res = await fetch(
            `/api/mfnav/search?q=${encodeURIComponent(trimmed)}&page_size=8`,
            { signal: controller.signal }
          );
          const data = (await res.json()) as {
            results?: MfnavSearchItem[];
            payload?: { data?: MfnavSearchItem[]; results?: MfnavSearchItem[] };
          };
          const list = Array.isArray(data.results)
            ? data.results
            : Array.isArray(data.payload?.data)
              ? data.payload.data
              : Array.isArray(data.payload?.results)
                ? data.payload.results
                : [];
          setSearchResults(list);
        }
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          setSearchResults([]);
        }
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, universe]);

  const amfiComparison = useMemo(
    () => normalizeNavComparisonSeries(schemeNavs, benchmarkNavs) || normalizeSingleNavSeries(schemeNavs),
    [schemeNavs, benchmarkNavs]
  );

  const sifComparison = useMemo(() => normalizeSingleNavSeries(sifNavs), [sifNavs]);

  const activeComparison = universe === 'amfi' ? amfiComparison : sifComparison;
  const isAmfiWithBenchmark =
    universe === 'amfi' &&
    selectedCode !== BENCHMARK_INDEX_SCHEME_CODE &&
    Boolean(normalizeNavComparisonSeries(schemeNavs, benchmarkNavs));

  const selectedFeatured = useMemo(
    () => FEATURED_AMFI_SCHEMES.find((s) => s.schemeCode === selectedCode) ?? null,
    [selectedCode]
  );

  const amfiMetricsRows = useMemo(() => {
    const dm = fund?.daily_metrics;
    const cm = fund?.category_metrics?.metrics;
    return [
      {
        label: '1Y CAGR',
        scheme: formatDecimalPercent(dm?.cagr_1y),
        peerMedian: formatDecimalPercent(cm?.cagr_1y?.median),
        spread: computePeerSpreadPct(dm?.cagr_1y, cm?.cagr_1y?.median),
        positive: (dm?.cagr_1y ?? 0) >= 0,
      },
      {
        label: '3Y CAGR',
        scheme: formatDecimalPercent(dm?.cagr_3y),
        peerMedian: formatDecimalPercent(cm?.cagr_3y?.median),
        spread: computePeerSpreadPct(dm?.cagr_3y, cm?.cagr_3y?.median),
        positive: (dm?.cagr_3y ?? 0) >= 0,
      },
      {
        label: '5Y CAGR',
        scheme: formatDecimalPercent(dm?.cagr_5y),
        peerMedian: formatDecimalPercent(cm?.cagr_5y?.median),
        spread: computePeerSpreadPct(dm?.cagr_5y, cm?.cagr_5y?.median),
        positive: (dm?.cagr_5y ?? 0) >= 0,
      },
      {
        label: '3Y Volatility',
        scheme: formatDecimalPercent(dm?.vol_3y, 2, false),
        peerMedian: formatDecimalPercent(cm?.vol_3y?.median, 2, false),
        spread: null,
        positive: true,
      },
      {
        label: '3Y Max Drawdown',
        scheme: formatDecimalPercent(dm?.max_dd_3y),
        peerMedian: '—',
        spread: null,
        positive: false,
      },
      {
        label: '3Y Sharpe / Sortino',
        scheme: `${formatRatio(dm?.sharpe_3y)} / ${formatRatio(dm?.sortino_3y)}`,
        peerMedian: '—',
        spread: null,
        positive: true,
      },
    ];
  }, [fund]);

  const activeLoading = universe === 'amfi' ? loadingFund : loadingSif;
  const activeError = universe === 'amfi' ? fundError : sifError;

  const headlineNav = universe === 'amfi' ? fund?.latest_nav ?? null : sifDetail?.latest_nav ?? null;
  const headlineDate =
    universe === 'amfi' ? fund?.latest_nav_date ?? '' : sifDetail?.latest_date ?? '';
  const headlineDayChange =
    universe === 'amfi' ? fund?.latest_day_change_pct ?? null : sifDetail?.day_change_pct ?? null;
  const isDayPositive = (headlineDayChange ?? 0) >= 0;

  return (
    <section
      id="live-nav-explorer"
      aria-label="Mutual Fund Explorer and SIF Long-Short Funds"
      className="w-full bg-[#f8fafc] text-[#090e1a] border-b border-[#e2e8f0] py-20 px-4 sm:px-6 md:px-10"
    >
      <div className="max-w-[1240px] mx-auto">
        {/* Top Editorial Header + Universe Segmented Control + Live Search */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-8">
          <div className="lg:col-span-7">
            <div className="text-[12.5px] font-semibold text-[#2563eb] mb-2.5">
              01. Mutual Fund Explorer
            </div>
            <h2 className="type-display-xl text-[#090e1a] max-w-2xl">
              Compare mutual funds against peer medians and daily NAV history.
            </h2>
            <p className="text-[15.5px] font-normal leading-[1.6] text-[#475569] mt-3 max-w-2xl">
              Switch between Direct Mutual Fund plans and SEBI SIF Long-Short schemes to review NAV trends, drawdowns, volatility, and category averages in one view.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Functional Segmented Universe Switcher */}
            <div
              role="tablist"
              aria-label="Select fund universe"
              className="inline-flex p-1 rounded-[10px] bg-[#e2e8f0]/75 border border-[#cbd5e1]/60 self-start lg:self-end"
            >
              <button
                type="button"
                role="tab"
                aria-selected={universe === 'amfi'}
                onClick={() => {
                  setUniverse('amfi');
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                className={`px-3.5 py-2 rounded-[7px] text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  universe === 'amfi'
                    ? 'bg-white text-[#090e1a] shadow-sm'
                    : 'text-[#475569] hover:text-[#090e1a]'
                }`}
              >
                Direct Mutual Funds
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={universe === 'sqlite-sif'}
                onClick={() => {
                  setUniverse('sqlite-sif');
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                className={`px-3.5 py-2 rounded-[7px] text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  universe === 'sqlite-sif'
                    ? 'bg-white text-[#090e1a] shadow-sm'
                    : 'text-[#475569] hover:text-[#090e1a]'
                }`}
              >
                SIF Long-Short ({sifSchemes.length || 25})
              </button>
            </div>

            {/* Unified Live Search Box */}
            <div className="relative">
              <label htmlFor="landing-amfi-search" className="sr-only">
                Search mutual fund schemes by name, ISIN, or scheme code
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="landing-amfi-search"
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchOpen(false);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  placeholder={
                    universe === 'amfi'
                      ? 'Search any mutual fund, ISIN, or scheme code...'
                      : 'Filter SIF Long-Short schemes (e.g. qsif, Altiva, Magnum)...'
                  }
                  className="w-full h-11 pl-10 pr-4 rounded-[8px] border border-[#cbd5e1] bg-white text-[14px] text-[#090e1a] placeholder:text-[#64748b] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-colors"
                />
              </div>

              {searchOpen && searchQuery.trim().length >= 2 && (
                <div
                  role="listbox"
                  aria-label="Live scheme search results"
                  className="absolute left-0 right-0 mt-2 rounded-[10px] bg-white border border-[#cbd5e1] shadow-level-2 z-30 max-h-72 overflow-y-auto divide-y divide-[#e2e8f0]"
                >
                  {searching ? (
                    <div className="px-4 py-3 text-[13px] text-[#64748b]">
                      Querying {universe === 'amfi' ? 'live AMFI directory' : 'SQLite nav_master'}...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-[13px] text-[#64748b]">
                      No matching schemes found for &ldquo;{searchQuery.trim()}&rdquo;.
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        key={item.scheme_code}
                        type="button"
                        onClick={() => {
                          if (universe === 'sqlite-sif' || item.scheme_code < 1000) {
                            setUniverse('sqlite-sif');
                            setSelectedSifCode(item.scheme_code);
                          } else {
                            setUniverse('amfi');
                            setSelectedCode(item.scheme_code);
                          }
                          setSearchQuery('');
                          setSearchOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-[#f8fafc] transition-colors cursor-pointer"
                      >
                        <div className="text-[13px] font-semibold text-[#090e1a] truncate">
                          {item.scheme_name}
                        </div>
                        <div className="text-[11.5px] text-[#64748b] mt-0.5 font-mono tabular-nums">
                          {item.fund_house} · Code {item.scheme_code}
                          {item.isin ? ` · ${item.isin}` : ''} · {item.sub_category}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Scheme Quick-Selector Strip */}
        <div
          role="tablist"
          aria-label={
            universe === 'amfi'
              ? 'Featured live AMFI Direct schemes'
              : 'SQLite nav_master SEBI SIF schemes'
          }
          className="flex items-center gap-2 overflow-x-auto pb-2 mb-6"
        >
          {universe === 'amfi'
            ? FEATURED_AMFI_SCHEMES.map((item) => {
                const active = selectedCode === item.schemeCode;
                return (
                  <button
                    key={item.schemeCode}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSelectedCode(item.schemeCode);
                      setSearchOpen(false);
                    }}
                    className={`px-3.5 py-2 rounded-[8px] text-[13px] transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                      active
                        ? 'bg-[#090e1a] text-white border-[#090e1a]'
                        : 'bg-white text-[#334155] border-[#e2e8f0] hover:border-[#94a3b8] hover:text-[#090e1a]'
                    }`}
                  >
                    <span className="font-semibold">{item.shortLabel}</span>
                    <span
                      className={`ml-2 text-[11.5px] ${
                        active ? 'text-[#93c5fd]' : 'text-[#64748b]'
                      }`}
                    >
                      {item.pillar}
                    </span>
                  </button>
                );
              })
            : sifSchemes.slice(0, 8).map((item) => {
                const active = selectedSifCode === item.scheme_code;
                const shortName = item.scheme_name
                  .replace(/\s*-\s*Growth Option.*$/i, '')
                  .replace(/\s*Direct Plan.*$/i, '')
                  .replace(/\s*Regular Plan.*$/i, '')
                  .slice(0, 28);
                return (
                  <button
                    key={item.scheme_code}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSelectedSifCode(item.scheme_code);
                      setSearchOpen(false);
                    }}
                    className={`px-3.5 py-2 rounded-[8px] text-[13px] transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                      active
                        ? 'bg-[#090e1a] text-white border-[#090e1a]'
                        : 'bg-white text-[#334155] border-[#e2e8f0] hover:border-[#94a3b8] hover:text-[#090e1a]'
                    }`}
                  >
                    <span className="font-semibold">{shortName}</span>
                    <span
                      className={`ml-2 font-mono text-[11px] ${
                        active ? 'text-[#93c5fd]' : 'text-[#64748b]'
                      }`}
                    >
                      #{item.scheme_code}
                    </span>
                  </button>
                );
              })}
        </div>

        {/* High-Density 4-Column Institutional KPI Bar */}
        {!activeError && (
          <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[#e2e8f0] rounded-[12px] divide-y lg:divide-y-0 divide-x divide-[#e2e8f0] shadow-level-1 mb-6 overflow-hidden">
            <div className="p-5">
              <div className="text-[12px] font-medium text-[#64748b]">
                Latest NAV {headlineDate ? `(${headlineDate})` : ''}
              </div>
              <div className="mt-1.5 flex items-baseline gap-2.5 flex-wrap">
                <span className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-[#090e1a] tabular-nums">
                  {headlineNav !== null ? `₹${headlineNav.toFixed(4)}` : '—'}
                </span>
                {headlineDayChange !== null && (
                  <span
                    className={`font-mono text-[12px] font-semibold tabular-nums ${
                      isDayPositive ? 'text-[#059669]' : 'text-[#dc2626]'
                    }`}
                  >
                    {isDayPositive ? '▲' : '▼'} {formatDirectPercent(headlineDayChange)} 1D
                  </span>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="text-[12px] font-medium text-[#64748b]">
                {universe === 'amfi' ? 'Quarterly Average AUM' : 'SQLite Daily Observations'}
              </div>
              <div className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-[#090e1a] tabular-nums mt-1.5">
                {universe === 'amfi'
                  ? formatAumCrores(fund?.average_aum_lakhs)
                  : sifDetail
                    ? `${sifDetail.observation_count} days`
                    : '—'}
              </div>
              <div className="text-[11.5px] text-[#64748b] mt-0.5 truncate">
                {universe === 'amfi'
                  ? fund?.aum_period || 'AMFI Quarterly Filing'
                  : sifDetail
                    ? `${sifDetail.earliest_date} to ${sifDetail.latest_date}`
                    : 'nav_master table'}
              </div>
            </div>

            <div className="p-5">
              <div className="text-[12px] font-medium text-[#64748b]">
                {universe === 'amfi' ? '3Y Trailing CAGR' : 'Cumulative Window Return'}
              </div>
              <div className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-[#090e1a] tabular-nums mt-1.5">
                {universe === 'amfi'
                  ? formatDecimalPercent(fund?.daily_metrics?.cagr_3y)
                  : formatDirectPercent(sifDetail?.total_return_pct)}
              </div>
              <div className="text-[11.5px] text-[#64748b] mt-0.5 font-mono tabular-nums">
                {universe === 'amfi'
                  ? `Peer median: ${formatDecimalPercent(fund?.category_metrics?.metrics?.cagr_3y?.median)}`
                  : sifDetail
                    ? `Inception NAV: ₹${sifDetail.inception_nav.toFixed(4)}`
                    : '—'}
              </div>
            </div>

            <div className="p-5">
              <div className="text-[12px] font-medium text-[#64748b]">
                {universe === 'amfi' ? '3Y Max Drawdown' : 'Peak-to-Trough Drawdown'}
              </div>
              <div className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-[#dc2626] tabular-nums mt-1.5">
                {universe === 'amfi'
                  ? formatDecimalPercent(fund?.daily_metrics?.max_dd_3y)
                  : formatDirectPercent(sifDetail?.max_drawdown_pct)}
              </div>
              <div className="text-[11.5px] text-[#64748b] mt-0.5 font-mono tabular-nums">
                {universe === 'amfi'
                  ? `3Y Vol: ${formatDecimalPercent(fund?.daily_metrics?.vol_3y, 2, false)}`
                  : `Ann. Vol: ${formatDirectPercent(sifDetail?.annualized_volatility_pct, 2, false)}`}
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Precision Workbench */}
        {activeError ? (
          <div className="rounded-[12px] bg-white border border-[#e2e8f0] p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-[15px] font-semibold text-[#090e1a]">
                Scheme data temporarily unavailable
              </div>
              <p className="text-[13.5px] text-[#64748b] mt-1">{activeError}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (universe === 'amfi') void loadSchemeBundle(selectedCode);
                else void loadSifBundle(selectedSifCode);
              }}
              className="btn-secondary-pill text-[13px] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry fetch</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Panel (5 cols): Scheme Dossier & Peer Median Alpha Table */}
            <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#e2e8f0] shadow-level-1 p-6 flex flex-col justify-between">
              <div>
                {activeLoading || (universe === 'amfi' ? !fund : !sifDetail) ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 w-44 bg-[#e2e8f0] rounded" />
                    <div className="h-7 w-full bg-[#e2e8f0] rounded" />
                    <div className="h-4 w-64 bg-[#f1f5f9] rounded" />
                    <div className="h-48 w-full bg-[#f8fafc] rounded mt-4" />
                  </div>
                ) : universe === 'amfi' && fund ? (
                  <>
                    <div className="text-[12px] font-medium text-[#64748b]">
                      {fund.fund_house} · {fund.sub_category}
                    </div>
                    <h3 className="font-display text-[20px] font-semibold leading-[1.25] text-[#090e1a] mt-1.5">
                      {fund.scheme_name}
                    </h3>
                    <div className="text-[12px] text-[#64748b] mt-2 font-mono tabular-nums">
                      Code {fund.scheme_code}
                      {fund.isin ? ` · ${fund.isin}` : ''} · {fund.plan_type} {fund.option_type}
                    </div>

                    {/* Peer Median Matrix */}
                    <div className="mt-6">
                      <div className="grid grid-cols-12 text-[11.5px] font-semibold text-[#64748b] pb-2.5 border-b border-[#e2e8f0]">
                        <span className="col-span-5">Metric</span>
                        <span className="col-span-3 text-right">Scheme</span>
                        <span className="col-span-2 text-right">Peer</span>
                        <span className="col-span-2 text-right">Spread</span>
                      </div>
                      <div className="divide-y divide-[#e2e8f0]">
                        {amfiMetricsRows.map((row) => (
                          <div
                            key={row.label}
                            className="py-3 grid grid-cols-12 items-center text-[13px]"
                          >
                            <span className="col-span-5 text-[#475569] font-medium">
                              {row.label}
                            </span>
                            <span
                              className={`col-span-3 text-right font-mono font-semibold tabular-nums ${
                                row.scheme === '—'
                                  ? 'text-[#64748b]'
                                  : row.label === '3Y Max Drawdown'
                                    ? 'text-[#dc2626]'
                                    : row.positive
                                      ? 'text-[#090e1a]'
                                      : 'text-[#dc2626]'
                              }`}
                            >
                              {row.scheme}
                            </span>
                            <span className="col-span-2 text-right font-mono text-[#64748b] tabular-nums">
                              {row.peerMedian}
                            </span>
                            <span
                              className={`col-span-2 text-right font-mono text-[12px] font-semibold tabular-nums ${
                                row.spread === null
                                  ? 'text-[#94a3b8]'
                                  : row.spread >= 0
                                    ? 'text-[#059669]'
                                    : 'text-[#dc2626]'
                              }`}
                            >
                              {row.spread !== null
                                ? `${row.spread > 0 ? '+' : ''}${row.spread.toFixed(1)}%`
                                : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : sifDetail ? (
                  <>
                    <div className="text-[12px] font-medium text-[#2563eb]">
                      SQLite nav_master · Source {sifDetail.source}
                    </div>
                    <h3 className="font-display text-[20px] font-semibold leading-[1.25] text-[#090e1a] mt-1.5">
                      {sifDetail.scheme_name}
                    </h3>
                    <div className="text-[12px] text-[#64748b] mt-2 font-mono tabular-nums">
                      Code {sifDetail.scheme_code}
                      {sifDetail.isin ? ` · ISIN ${sifDetail.isin}` : ' · ISIN Pending'}
                    </div>

                    <div className="mt-6 divide-y divide-[#e2e8f0] border-t border-[#e2e8f0]">
                      {[
                        {
                          label: 'Previous Close NAV',
                          value:
                            sifDetail.previous_nav !== null
                              ? `₹${sifDetail.previous_nav.toFixed(4)} (${sifDetail.previous_date})`
                              : '—',
                        },
                        {
                          label: '1-Day Absolute Change',
                          value:
                            sifDetail.day_change !== null
                              ? `${sifDetail.day_change >= 0 ? '+' : ''}₹${sifDetail.day_change.toFixed(4)}`
                              : '—',
                        },
                        {
                          label: 'Inception NAV',
                          value: `₹${sifDetail.inception_nav.toFixed(4)} (${sifDetail.earliest_date})`,
                        },
                        {
                          label: 'Cumulative Return',
                          value: formatDirectPercent(sifDetail.total_return_pct),
                        },
                        {
                          label: '1Y Annualized CAGR',
                          value:
                            sifDetail.cagr_1y_pct !== null
                              ? formatDirectPercent(sifDetail.cagr_1y_pct)
                              : 'Window < 300d',
                        },
                        {
                          label: 'Annualized Volatility',
                          value: formatDirectPercent(sifDetail.annualized_volatility_pct, 2, false),
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="py-3 flex items-center justify-between text-[13px] gap-3"
                        >
                          <span className="text-[#475569] font-medium">{row.label}</span>
                          <span className="font-mono font-semibold text-[#090e1a] tabular-nums text-right">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              <div className="mt-6 pt-4 border-t border-[#e2e8f0] flex items-center justify-between gap-3">
                <span className="text-[11.5px] text-[#64748b] truncate">
                  {universe === 'amfi'
                    ? `Source: ${sourceTag === 'mfnav-in-live' ? 'AMFI Official (mfnav.in)' : 'AMFI Daily NAV'}`
                    : 'Source: Local SQLite nav_master (amfi_nav_dev.db)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (universe === 'amfi' && selectedFeatured && onInspectSymbol) {
                      onInspectSymbol(selectedFeatured.workspaceTicker);
                    } else {
                      onOpenWorkspace('live-terminal');
                    }
                  }}
                  className="text-[13px] font-semibold text-[#2563eb] hover:text-[#1d4ed8] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Open Terminal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Panel (7 cols): Rebased Area + Benchmark Curve */}
            <div className="lg:col-span-7 rounded-[12px] bg-white border border-[#e2e8f0] shadow-level-1 p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#e2e8f0]">
                  <div>
                    <div className="text-[12px] font-medium text-[#64748b]">
                      {isAmfiWithBenchmark
                        ? 'Rebased Daily NAV Performance (Base 100 vs Benchmark)'
                        : 'Rebased Daily NAV Curve (Base 100 from Earliest Observation)'}
                    </div>
                    <h3 className="font-display text-[19px] font-semibold text-[#090e1a] mt-1">
                      {universe === 'amfi'
                        ? `${selectedFeatured?.shortLabel || fund?.scheme_name || 'Selected Scheme'}${
                            isAmfiWithBenchmark ? ' vs UTI Nifty 50 Direct' : ''
                          }`
                        : sifDetail?.scheme_name || 'SQLite SIF Scheme'}
                    </h3>
                  </div>

                  {activeComparison && (
                    <div className="flex items-center gap-5 shrink-0 font-mono tabular-nums">
                      <div>
                        <div className="text-[11px] font-sans text-[#64748b]">Scheme</div>
                        <div
                          className={`text-[15.5px] font-semibold ${
                            activeComparison.schemeReturnPct >= 0
                              ? 'text-[#2563eb]'
                              : 'text-[#dc2626]'
                          }`}
                        >
                          {formatDirectPercent(activeComparison.schemeReturnPct)}
                        </div>
                      </div>
                      {isAmfiWithBenchmark && (
                        <>
                          <div>
                            <div className="text-[11px] font-sans text-[#64748b]">Nifty 50</div>
                            <div className="text-[15.5px] font-semibold text-[#334155]">
                              {formatDirectPercent(activeComparison.benchmarkReturnPct)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-sans text-[#64748b]">Alpha</div>
                            <div
                              className={`text-[15.5px] font-semibold ${
                                activeComparison.spreadPct >= 0
                                  ? 'text-[#059669]'
                                  : 'text-[#dc2626]'
                              }`}
                            >
                              {formatDirectPercent(activeComparison.spreadPct)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Live Recharts Composed Area + Benchmark Line */}
                <div className="h-[315px] w-full mt-5">
                  {activeLoading || !activeComparison ? (
                    <div className="w-full h-full rounded-[8px] bg-[#f8fafc] flex items-center justify-center text-[13px] text-[#64748b]">
                      Loading daily NAV time series...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={activeComparison.points}
                        margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient id="financiaCobaltArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#64748b', fontSize: 11, fontFamily: "sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif" }}
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickLine={false}
                          minTickGap={28}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          tick={{ fill: '#64748b', fontSize: 11, fontFamily: "sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif" }}
                          axisLine={false}
                          tickLine={false}
                          width={46}
                          tickFormatter={(v: number) => `${v.toFixed(0)}`}
                        />
                        <ReferenceLine
                          y={100}
                          stroke="#94a3b8"
                          strokeDasharray="2 4"
                          strokeWidth={1}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#090e1a',
                            border: '1px solid rgba(148,163,184,0.2)',
                            borderRadius: '10px',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontFamily: "sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif",
                            boxShadow: '0 14px 32px rgba(4,7,17,0.35)',
                          }}
                          formatter={(value, name) => [
                            typeof value === 'number' ? value.toFixed(2) : String(value ?? ''),
                            name === 'schemeIndex'
                              ? 'Selected Scheme (Base 100)'
                              : 'UTI Nifty 50 Direct',
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="schemeIndex"
                          stroke="#2563eb"
                          strokeWidth={2.25}
                          fill="url(#financiaCobaltArea)"
                          dot={false}
                          isAnimationActive={false}
                        />
                        {isAmfiWithBenchmark && (
                          <Line
                            type="monotone"
                            dataKey="benchmarkIndex"
                            stroke="#64748b"
                            strokeWidth={1.65}
                            strokeDasharray="4 4"
                            dot={false}
                            isAnimationActive={false}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#64748b]">
                <div className="flex items-center gap-5">
                  <span className="inline-flex items-center gap-2 text-[#090e1a] font-medium">
                    <span className="w-4 h-0.5 bg-[#2563eb] inline-block" />
                    <span>{universe === 'amfi' ? 'Selected AMFI Scheme' : 'SQLite SIF Scheme'}</span>
                  </span>
                  {isAmfiWithBenchmark && (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-0 border-t-2 border-dashed border-[#64748b] inline-block" />
                      <span>UTI Nifty 50 Direct (120716)</span>
                    </span>
                  )}
                </div>
                {activeComparison && (
                  <span className="font-mono tabular-nums text-[11.5px]">
                    {activeComparison.startDate} → {activeComparison.endDate} ({activeComparison.points.length}d)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compact Institutional Watchlist Table for Instant Side-by-Side Comparison */}
        <div className="mt-6 rounded-[12px] bg-white border border-[#e2e8f0] shadow-level-1 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-[15px] font-semibold text-[#090e1a]">
                {universe === 'amfi'
                  ? 'Live AMFI Direct Watchlist'
                  : 'SQLite nav_master — SEBI SIF Long-Short Ledger'}
              </h3>
              <p className="text-[12px] text-[#64748b]">
                Click any row to load its full NAV trajectory and risk profile above.
              </p>
            </div>
            <span className="font-mono text-[11.5px] text-[#64748b] tabular-nums">
              {universe === 'amfi'
                ? `${FEATURED_AMFI_SCHEMES.length} core funds`
                : `Showing top 8 of ${sifSchemes.length} SQLite schemes`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11.5px] font-semibold text-[#64748b]">
                  <th className="py-2.5 px-6">Scheme</th>
                  <th className="py-2.5 px-4">Category / Code</th>
                  <th className="py-2.5 px-4 text-right">Latest NAV</th>
                  <th className="py-2.5 px-4 text-right">
                    {universe === 'amfi' ? '1D Change' : 'Observations'}
                  </th>
                  <th className="py-2.5 px-6 text-right">
                    {universe === 'amfi' ? '3Y CAGR' : 'Latest Date'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] text-[13px]">
                {universe === 'amfi'
                  ? FEATURED_AMFI_SCHEMES.map((item) => {
                      const snap = featuredSnapshots[item.schemeCode];
                      const active = selectedCode === item.schemeCode;
                      const pos = (snap?.dayChangePct ?? 0) >= 0;
                      return (
                        <tr
                          key={item.schemeCode}
                          onClick={() => setSelectedCode(item.schemeCode)}
                          className={`cursor-pointer transition-colors ${
                            active ? 'bg-[#eff6ff]' : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <td className="py-3 px-6 font-semibold text-[#090e1a]">
                            {item.shortLabel}
                          </td>
                          <td className="py-3 px-4 text-[#64748b] font-mono text-[12px] tabular-nums">
                            {item.pillar} · {item.schemeCode}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-[#090e1a] tabular-nums">
                            {snap ? `₹${snap.latestNav.toFixed(4)}` : '—'}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-semibold tabular-nums ${
                              !snap || snap.dayChangePct === null
                                ? 'text-[#64748b]'
                                : pos
                                  ? 'text-[#059669]'
                                  : 'text-[#dc2626]'
                            }`}
                          >
                            {snap && snap.dayChangePct !== null
                              ? `${pos ? '▲' : '▼'} ${formatDirectPercent(snap.dayChangePct)}`
                              : '—'}
                          </td>
                          <td className="py-3 px-6 text-right font-mono font-semibold text-[#090e1a] tabular-nums">
                            {snap ? formatDecimalPercent(snap.cagr3y) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  : sifSchemes.slice(0, 8).map((item) => {
                      const active = selectedSifCode === item.scheme_code;
                      return (
                        <tr
                          key={item.scheme_code}
                          onClick={() => setSelectedSifCode(item.scheme_code)}
                          className={`cursor-pointer transition-colors ${
                            active ? 'bg-[#eff6ff]' : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <td className="py-3 px-6 font-semibold text-[#090e1a] max-w-[360px] truncate">
                            {item.scheme_name}
                          </td>
                          <td className="py-3 px-4 text-[#64748b] font-mono text-[12px] tabular-nums">
                            {item.source} · #{item.scheme_code}
                            {item.isin ? ` · ${item.isin}` : ''}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-[#090e1a] tabular-nums">
                            ₹{item.latest_nav.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#475569] tabular-nums">
                            {item.observation_count} trading days
                          </td>
                          <td className="py-3 px-6 text-right font-mono text-[#475569] tabular-nums">
                            {item.latest_date}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
