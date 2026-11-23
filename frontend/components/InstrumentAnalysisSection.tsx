import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Download,
  GitCompare,
  Search,
  ShieldAlert,
  Sliders,
  X,
} from 'lucide-react';
import {
  amfiSchemesToHeatmapTiles,
  HEATMAP_STOCKS,
  HeatmapStockTile,
  NavMasterSchemeRow,
} from '../utils/heatmapEngine';
import {
  AnalysisChartMode,
  AnalysisTimeframe,
  buildAnalysisCsvExport,
  computeStressScenarioImpact,
  computeVolatilityPositionSize,
  HistoricalNavInput,
  resolveDefaultBenchmarkForInstrument,
  runInstrumentAnalysis,
} from '../utils/instrumentAnalysisEngine';
import { formatSignedPercent } from '../utils/marketCalculations';
import {
  InstrumentAnalysisChart,
  SubOscillatorMode,
} from './InstrumentAnalysisChart';

interface InstrumentAnalysisSectionProps {
  selectedSymbol?: string | null;
  onSelectInstrumentSymbol?: (symbol: string) => void;
  onJumpToTerminal?: (ticker: string, peers?: string[]) => void;
}

type AnalysisMethodTab = 'technical' | 'risk' | 'distribution' | 'stress';

const QUICK_BENCHMARK_SYMBOLS = ['UTI50', 'SBINIFTY', 'SBIGILT', 'VOO', 'SPY', 'QQQ', 'BND', 'GLD'];

const QUICK_UNIVERSE_SYMBOLS = ['PPFAS', 'HDFCMID', 'QUANTSC', 'UTI50', 'SBIGILT', 'VOO', 'QQQ', 'BND'];

const STRESS_PRESETS = [
  { name: 'Rate Cut Rally', shockPct: 12 },
  { name: 'Mild Pullback', shockPct: -8 },
  { name: 'Equity Correction', shockPct: -15 },
  { name: 'Liquidity Shock', shockPct: -28 },
];

export const InstrumentAnalysisSection: React.FC<InstrumentAnalysisSectionProps> = ({
  selectedSymbol,
  onSelectInstrumentSymbol,
  onJumpToTerminal,
}) => {
  const [activeInstrument, setActiveInstrument] = useState<HeatmapStockTile>(() => {
    const initial = selectedSymbol
      ? HEATMAP_STOCKS.find((t) => t.symbol.toUpperCase() === selectedSymbol.toUpperCase())
      : null;
    return initial || HEATMAP_STOCKS[0];
  });

  const [benchmarkSymbol, setBenchmarkSymbol] = useState<string>(() => {
    const initial = selectedSymbol
      ? HEATMAP_STOCKS.find((t) => t.symbol.toUpperCase() === selectedSymbol.toUpperCase())
      : null;
    const def = resolveDefaultBenchmarkForInstrument(initial || HEATMAP_STOCKS[0]);
    return def ? def.symbol : 'UTI50';
  });

  const [timeframe, setTimeframe] = useState<AnalysisTimeframe>('1Y');
  const [chartMode, setChartMode] = useState<AnalysisChartMode>('price');
  const [showSma20, setShowSma20] = useState<boolean>(true);
  const [showEma50, setShowEma50] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(false);
  const [oscillatorMode, setOscillatorMode] = useState<SubOscillatorMode>('rsi');
  const [activeMethodTab, setActiveMethodTab] = useState<AnalysisMethodTab>('technical');

  // Search picker state (76 curated + live AMFI SQLite schemes)
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [amfiResults, setAmfiResults] = useState<NavMasterSchemeRow[]>([]);
  const [searchingAmfi, setSearchingAmfi] = useState<boolean>(false);

  // Live SQLite NAV history hydration when an AMFI scheme code is chosen
  const [realNavHistory, setRealNavHistory] = useState<HistoricalNavInput[] | null>(null);
  const [historySourceNote, setHistorySourceNote] = useState<string>('Calibrated multi-factor model');

  // What-If Stress & Position Sizing state
  const [stressShockPct, setStressShockPct] = useState<number>(-15);
  const [stressLabel, setStressLabel] = useState<string>('Equity Correction');
  const [portfolioCapital, setPortfolioCapital] = useState<number>(500_000);
  const [riskBudgetPct, setRiskBudgetPct] = useState<number>(2.0);

  // Sync external selection (e.g., clicking a tile in Asset Class Performance Map or Watchboard)
  useEffect(() => {
    if (!selectedSymbol) return;
    const upper = selectedSymbol.trim().toUpperCase();
    if (!upper || upper === activeInstrument.symbol.toUpperCase()) return;

    const curated = HEATMAP_STOCKS.find((t) => t.symbol.toUpperCase() === upper);
    if (curated) {
      setActiveInstrument(curated);
      setRealNavHistory(null);
      setHistorySourceNote('Calibrated multi-factor model');
      const defBench = resolveDefaultBenchmarkForInstrument(curated);
      if (defBench) setBenchmarkSymbol(defBench.symbol);
      return;
    }

    // Attempt live AMFI lookup if numeric scheme code
    if (/^\d{4,8}$/.test(upper)) {
      fetch(`/api/nav-master/fund/${encodeURIComponent(upper)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const p = data?.payload;
          if (!p) return;
          const tile = amfiSchemesToHeatmapTiles([
            {
              scheme_code: p.scheme_code,
              scheme_name: p.scheme_name,
              category: p.source,
              latest_nav: p.latest_nav,
              nav_count: p.nav_count,
            },
          ])[0];
          if (tile) {
            setActiveInstrument(tile);
            setBenchmarkSymbol('UTI50');
          }
        })
        .catch(() => {
          // Non-fatal
        });
    }
  }, [selectedSymbol, activeInstrument.symbol]);

  // Fetch real SQLite NAV history whenever activeInstrument is an AMFI DB scheme
  useEffect(() => {
    if (activeInstrument.source !== 'amfi-db' || !activeInstrument.amfiCode) {
      setRealNavHistory(null);
      setHistorySourceNote('Calibrated multi-factor model');
      return;
    }
    let cancelled = false;
    fetch(`/api/nav-master/nav/${encodeURIComponent(activeInstrument.amfiCode)}?page_size=260`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const rows = data?.payload?.history || data?.payload?.rows || data?.payload?.navs;
        if (Array.isArray(rows) && rows.length >= 12) {
          const mapped: HistoricalNavInput[] = rows
            .map((r: { nav_date?: string; date?: string; nav?: number | string }) => ({
              date: String(r.nav_date || r.date || ''),
              nav: Number(r.nav),
            }))
            .filter((r) => r.date && Number.isFinite(r.nav) && r.nav > 0);
          if (mapped.length >= 12) {
            setRealNavHistory(mapped);
            setHistorySourceNote(`SQLite nav_master (${mapped.length} real NAV points)`);
            return;
          }
        }
        setRealNavHistory(null);
        setHistorySourceNote('SQLite latest NAV + calibrated series');
      })
      .catch(() => {
        if (!cancelled) {
          setRealNavHistory(null);
          setHistorySourceNote('SQLite latest NAV + calibrated series');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeInstrument]);

  // Debounced live AMFI SQLite search inside universal picker
  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setAmfiResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearchingAmfi(true);
      fetch(`/api/nav-master/search?q=${encodeURIComponent(q)}&limit=10`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.results)) {
            setAmfiResults(data.results);
          }
        })
        .catch(() => setAmfiResults([]))
        .finally(() => setSearchingAmfi(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchQuery, searchOpen]);

  const benchmarkTile = useMemo(() => {
    if (!benchmarkSymbol || benchmarkSymbol === 'NONE') return null;
    if (benchmarkSymbol.toUpperCase() === activeInstrument.symbol.toUpperCase()) return null;
    return (
      HEATMAP_STOCKS.find((t) => t.symbol.toUpperCase() === benchmarkSymbol.toUpperCase()) || null
    );
  }, [benchmarkSymbol, activeInstrument.symbol]);

  const analysis = useMemo(
    () => runInstrumentAnalysis(activeInstrument, timeframe, benchmarkTile, realNavHistory),
    [activeInstrument, timeframe, benchmarkTile, realNavHistory]
  );

  const latestClose = analysis.series[analysis.series.length - 1]?.close ?? 100;
  const currencyPrefix = activeInstrument.unit === 'INR' ? '₹' : '$';

  const stressImpact = useMemo(
    () =>
      computeStressScenarioImpact(
        latestClose,
        analysis.risk.beta ?? 0.95,
        Math.max(6, analysis.risk.cagrPct),
        stressLabel,
        stressShockPct
      ),
    [latestClose, analysis.risk.beta, analysis.risk.cagrPct, stressLabel, stressShockPct]
  );

  const positionSize = useMemo(
    () =>
      computeVolatilityPositionSize(
        latestClose,
        analysis.risk.annualizedVolPct,
        analysis.risk.var95DailyPct,
        portfolioCapital,
        riskBudgetPct
      ),
    [latestClose, analysis.risk.annualizedVolPct, analysis.risk.var95DailyPct, portfolioCapital, riskBudgetPct]
  );

  const curatedSearchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return HEATMAP_STOCKS.slice(0, 14);
    return HEATMAP_STOCKS.filter(
      (f) =>
        f.symbol.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.sector.toLowerCase().includes(q)
    ).slice(0, 14);
  }, [searchQuery]);

  const handleChooseCurated = (tile: HeatmapStockTile) => {
    setActiveInstrument(tile);
    setSearchOpen(false);
    setSearchQuery('');
    const defBench = resolveDefaultBenchmarkForInstrument(tile);
    if (defBench && benchmarkSymbol !== 'NONE') {
      setBenchmarkSymbol(defBench.symbol);
    }
    onSelectInstrumentSymbol?.(tile.symbol);
  };

  const handleChooseAmfi = (row: NavMasterSchemeRow) => {
    const tile = amfiSchemesToHeatmapTiles([row])[0];
    if (!tile) return;
    setActiveInstrument(tile);
    setSearchOpen(false);
    setSearchQuery('');
    setBenchmarkSymbol('UTI50');
    onSelectInstrumentSymbol?.(tile.symbol);
  };

  const handleExportCsv = () => {
    const csv = buildAnalysisCsvExport(analysis);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeInstrument.symbol}_${timeframe}_quant_analysis.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxHistShare = Math.max(1, ...analysis.histogram.map((b) => b.sharePct));

  return (
    <section
      id="instrument-analysis"
      data-testid="instrument-analysis-section"
      aria-label="Dedicated Instrument Analysis Workbench"
      className="scroll-mt-20 bg-white text-[#0f172a] py-10 md:py-12 border-b border-[#e2e8f0]"
    >
      <div className="max-w-[1320px] mx-auto px-4 md:px-6 space-y-5">
        {/* Top Architectural Header + Universal Instrument Picker */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748b] font-medium">
              <span className="font-mono text-[#2563eb] font-semibold">
                {activeInstrument.symbol}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeInstrument.sector}</span>
              <span aria-hidden="true">·</span>
              <span>{activeInstrument.market === 'india' ? 'India AMFI / NSE' : 'Global ETF'}</span>
              <span aria-hidden="true">·</span>
              <span>{historySourceNote}</span>
            </div>
            <h2 className="text-[22px] md:text-[26px] font-display font-bold tracking-[-0.02em] text-[#0f172a] mt-1">
              Instrument Analysis — {activeInstrument.name}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Universal Search Selector */}
            <div className="relative">
              <button
                type="button"
                data-testid="analysis-instrument-picker-btn"
                onClick={() => setSearchOpen((prev) => !prev)}
                className="h-9 px-3 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] hover:bg-white text-xs font-semibold text-[#0f172a] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>Switch Instrument</span>
              </button>

              {searchOpen && (
                <div
                  data-testid="analysis-instrument-picker-popover"
                  className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-[12px] bg-white border border-[#cbd5e1] shadow-2xl p-3 z-30 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        autoFocus
                        data-testid="analysis-instrument-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search 76 funds, ETFs, or AMFI schemes..."
                        className="w-full h-8.5 pl-8 pr-3 rounded-[7px] border border-[#cbd5e1] bg-[#f8fafc] focus:bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Close instrument picker"
                      onClick={() => setSearchOpen(false)}
                      className="p-1.5 text-[#64748b] hover:text-[#0f172a] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-[#f1f5f9]">
                    {curatedSearchMatches.map((tile) => (
                      <button
                        key={tile.symbol}
                        type="button"
                        data-testid={`analysis-pick-${tile.symbol}`}
                        onClick={() => handleChooseCurated(tile)}
                        className="w-full flex items-center justify-between gap-2 py-2 px-2 hover:bg-[#f8fafc] rounded text-left text-xs cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[#0f172a] truncate">{tile.name}</div>
                          <div className="text-[11px] text-[#64748b] truncate">
                            <span className="font-mono font-semibold">{tile.symbol}</span> · {tile.sector}
                          </div>
                        </div>
                        <span className="font-mono tabular-nums text-[11px] text-[#334155] shrink-0">
                          {tile.unit === 'INR' ? '₹' : '$'}
                          {tile.price}
                        </span>
                      </button>
                    ))}
                    {amfiResults.length > 0 && (
                      <div className="pt-2">
                        <div className="px-2 pb-1 text-[10.5px] font-mono uppercase tracking-wider text-[#2563eb] font-semibold">
                          SQLite AMFI Database Matches
                        </div>
                        {amfiResults.map((row) => (
                          <button
                            key={row.scheme_code}
                            type="button"
                            onClick={() => handleChooseAmfi(row)}
                            className="w-full flex items-center justify-between gap-2 py-2 px-2 hover:bg-[#f8fafc] rounded text-left text-xs cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-[#0f172a] truncate">{row.scheme_name}</div>
                              <div className="text-[11px] font-mono text-[#64748b]">#{row.scheme_code}</div>
                            </div>
                            <span className="font-mono tabular-nums text-[11px] text-[#059669] shrink-0">
                              ₹{Number(row.latest_nav).toFixed(2)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchingAmfi && (
                      <div className="py-2 px-2 text-xs text-[#64748b]">Searching AMFI database...</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Benchmark / Peer Overlay Selector */}
            <div className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] text-xs">
              <GitCompare className="w-3.5 h-3.5 text-[#64748b]" />
              <label htmlFor="analysis-benchmark-select" className="text-[#64748b] whitespace-nowrap">
                Benchmark:
              </label>
              <select
                id="analysis-benchmark-select"
                data-testid="analysis-benchmark-select"
                value={benchmarkSymbol}
                onChange={(e) => setBenchmarkSymbol(e.target.value)}
                className="bg-transparent font-mono font-semibold text-[#0f172a] focus:outline-none cursor-pointer"
              >
                <option value="NONE">None</option>
                {QUICK_BENCHMARK_SYMBOLS.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              data-testid="analysis-export-csv-btn"
              onClick={handleExportCsv}
              className="h-9 px-3 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {onJumpToTerminal && (
              <button
                type="button"
                data-testid="analysis-open-terminal-btn"
                onClick={() =>
                  onJumpToTerminal(
                    activeInstrument.symbol,
                    benchmarkTile ? [benchmarkTile.symbol] : undefined
                  )
                }
                className="h-9 px-3.5 rounded-[8px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Deep Terminal</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Neutral Multi-Category Quick Switcher Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] text-[#64748b] mr-1">Quick jump:</span>
          {QUICK_UNIVERSE_SYMBOLS.map((sym) => {
            const tile = HEATMAP_STOCKS.find((t) => t.symbol === sym);
            if (!tile) return null;
            const isActive = tile.symbol === activeInstrument.symbol;
            return (
              <button
                key={sym}
                type="button"
                data-testid={`analysis-quick-${sym}`}
                onClick={() => handleChooseCurated(tile)}
                className={`px-2.5 py-1 rounded-[7px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-[#0f172a] text-white border-[#0f172a] font-semibold'
                    : 'bg-[#f8fafc] text-[#334155] border-[#e2e8f0] hover:bg-[#f1f5f9]'
                }`}
              >
                <span className="font-mono">{tile.symbol}</span>
                <span className={`ml-1.5 text-[11px] ${isActive ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}>
                  {tile.sector.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary Obsidian Quantitative Chart Panel */}
        <div className="rounded-[14px] bg-[#070d1c] border border-white/[0.1] text-white p-5 space-y-4">
          {/* Price Header + Timeframe / Mode / Overlay Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3.5 border-b border-white/[0.08]">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono tabular-nums">
              <span
                data-testid="analysis-live-price"
                className="text-[28px] md:text-[32px] font-bold tracking-tight text-white"
              >
                {currencyPrefix}
                {latestClose.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs text-[#94a3b8]">{activeInstrument.unit}</span>
              <span
                className={`text-sm font-semibold ${
                  analysis.risk.cumulativeReturnPct >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'
                }`}
              >
                {formatSignedPercent(analysis.risk.cumulativeReturnPct)} ({timeframe})
              </span>
              {benchmarkTile && analysis.risk.excessReturnPct !== null && (
                <span className="text-xs text-[#38bdf8]">
                  Spread vs {benchmarkTile.symbol}:{' '}
                  {formatSignedPercent(analysis.risk.excessReturnPct)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Timeframe Selector */}
              <div
                role="group"
                aria-label="Analysis timeframe"
                className="inline-flex items-center p-0.5 rounded-[8px] bg-[#0e172a] border border-white/[0.08] gap-0.5"
              >
                {(['1M', '3M', '6M', '1Y', '3Y', '5Y'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    data-testid={`analysis-tf-${tf}`}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      timeframe === tf
                        ? 'bg-[#2563eb] text-white'
                        : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Chart Mode Selector */}
              <div
                role="group"
                aria-label="Chart plot mode"
                className="inline-flex items-center p-0.5 rounded-[8px] bg-[#0e172a] border border-white/[0.08] gap-0.5"
              >
                {(
                  [
                    { id: 'price', label: 'Price / NAV' },
                    { id: 'normalized', label: 'Normalized %' },
                    { id: 'drawdown', label: 'Drawdown' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`analysis-mode-${m.id}`}
                    onClick={() => setChartMode(m.id)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      chartMode === m.id
                        ? 'bg-white text-[#040711]'
                        : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Technical Overlay Toggles (visible in Price mode) */}
              {chartMode === 'price' && (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="overlay-sma20"
                    onClick={() => setShowSma20((v) => !v)}
                    className={`px-2 py-1 rounded-[6px] text-[11px] font-mono border cursor-pointer whitespace-nowrap ${
                      showSma20
                        ? 'border-[#fbbf24]/50 bg-[#fbbf24]/15 text-[#fbbf24]'
                        : 'border-white/[0.1] text-[#64748b] hover:text-white'
                    }`}
                  >
                    SMA 20
                  </button>
                  <button
                    type="button"
                    data-testid="overlay-ema50"
                    onClick={() => setShowEma50((v) => !v)}
                    className={`px-2 py-1 rounded-[6px] text-[11px] font-mono border cursor-pointer whitespace-nowrap ${
                      showEma50
                        ? 'border-[#a78bfa]/50 bg-[#a78bfa]/15 text-[#a78bfa]'
                        : 'border-white/[0.1] text-[#64748b] hover:text-white'
                    }`}
                  >
                    EMA 50
                  </button>
                  <button
                    type="button"
                    data-testid="overlay-bollinger"
                    onClick={() => setShowBollinger((v) => !v)}
                    className={`px-2 py-1 rounded-[6px] text-[11px] font-mono border cursor-pointer whitespace-nowrap ${
                      showBollinger
                        ? 'border-[#38bdf8]/50 bg-[#38bdf8]/15 text-[#38bdf8]'
                        : 'border-white/[0.1] text-[#64748b] hover:text-white'
                    }`}
                  >
                    Bollinger (20,2σ)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interactive SVG Chart + Synchronized Oscillator */}
          <InstrumentAnalysisChart
            symbol={activeInstrument.symbol}
            benchmarkSymbol={benchmarkTile?.symbol || null}
            unit={activeInstrument.unit}
            series={analysis.series}
            pivots={analysis.technical.pivots}
            chartMode={chartMode}
            showSma20={showSma20}
            showEma50={showEma50}
            showBollinger={showBollinger}
            oscillatorMode={oscillatorMode}
            onChangeOscillator={setOscillatorMode}
          />

          {/* Compact 6-Column Key Quantitative Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-3 border-t border-white/[0.08] font-mono tabular-nums">
            <div>
              <div className="text-[10.5px] text-[#94a3b8] font-sans">Annualized CAGR</div>
              <div
                className={`text-sm font-bold mt-0.5 ${
                  analysis.risk.cagrPct >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'
                }`}
              >
                {formatSignedPercent(analysis.risk.cagrPct)}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] text-[#94a3b8] font-sans">Annualized Volatility σ</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {analysis.risk.annualizedVolPct.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[10.5px] text-[#94a3b8] font-sans">Sharpe / Sortino</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {analysis.risk.sharpeRatio.toFixed(2)} / {analysis.risk.sortinoRatio.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] text-[#94a3b8] font-sans">Max Drawdown</div>
              <div className="text-sm font-bold text-[#fb7185] mt-0.5">
                {analysis.risk.maxDrawdownPct.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[10.5px] text-[#94a3b8] font-sans">RSI (14) · Trend</div>
              <div className="text-sm font-bold text-[#38bdf8] mt-0.5">
                {analysis.technical.rsi14.toFixed(1)}{' '}
                <span className="text-[11px] font-sans font-normal text-[#cbd5e1]">
                  {analysis.technical.rsiRegime}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10.5px] text-[#94a3b8] font-sans">
                {benchmarkTile ? `Beta vs ${benchmarkTile.symbol}` : 'Daily VaR (95%)'}
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {benchmarkTile && analysis.risk.beta !== null
                  ? `${analysis.risk.beta.toFixed(2)}x (r ${analysis.risk.correlation?.toFixed(2)})`
                  : `${analysis.risk.var95DailyPct.toFixed(2)}%`}
              </div>
            </div>
          </div>
        </div>

        {/* 4-Tab Advanced Analysis Methods Workbench */}
        <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] overflow-hidden">
          <div
            role="tablist"
            aria-label="Instrument analysis methods"
            className="flex flex-wrap items-center gap-1 p-2 bg-white border-b border-[#e2e8f0]"
          >
            {(
              [
                { id: 'technical', label: 'Technical & Regime Signals', icon: Activity },
                { id: 'risk', label: 'Risk, Return & Capture Matrix', icon: ShieldAlert },
                { id: 'distribution', label: 'Return Distribution', icon: BarChart3 },
                { id: 'stress', label: 'What-If Stress & Position Sizing', icon: Sliders },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeMethodTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  data-testid={`analysis-tab-${tab.id}`}
                  aria-selected={active}
                  onClick={() => setActiveMethodTab(tab.id)}
                  className={`px-3.5 py-2 rounded-[8px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5 bg-white">
            {/* TAB 1: TECHNICAL & REGIME SIGNALS */}
            {activeMethodTab === 'technical' && (
              <div
                data-testid="analysis-panel-technical"
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#f1f5f9]">
                    <div>
                      <div className="text-sm font-semibold text-[#0f172a]">
                        Momentum, Moving Averages &amp; Volatility Envelope
                      </div>
                      <div className="text-xs text-[#64748b] mt-0.5">
                        Trend classification: <strong className="text-[#0f172a]">{analysis.technical.trendRegime}</strong> · MACD: <strong className="text-[#0f172a]">{analysis.technical.macdCross}</strong>
                      </div>
                    </div>
                  </div>

                  {/* RSI-14 Gauge */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="font-sans font-medium text-[#334155]">RSI (14) Momentum Oscillator</span>
                      <span className="font-bold text-[#0f172a]">
                        {analysis.technical.rsi14.toFixed(1)} · {analysis.technical.rsiRegime}
                      </span>
                    </div>
                    <div className="relative h-2.5 rounded-full bg-[#e2e8f0] overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-[30%] bg-[#10b981]/25" />
                      <div className="absolute inset-y-0 right-0 w-[30%] bg-[#f43f5e]/25" />
                      <div
                        className="absolute top-0 bottom-0 w-2 rounded-full bg-[#0f172a]"
                        style={{
                          left: `calc(${Math.max(2, Math.min(98, analysis.technical.rsi14))}% - 4px)`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10.5px] font-mono text-[#64748b]">
                      <span>0 Oversold (30)</span>
                      <span>50 Neutral</span>
                      <span>Overbought (70) 100</span>
                    </div>
                  </div>

                  {/* Structured Indicator Table */}
                  <div className="divide-y divide-[#f1f5f9] text-xs font-mono tabular-nums">
                    <div className="flex items-center justify-between py-2">
                      <span className="font-sans text-[#475569]">Price vs SMA-20</span>
                      <span
                        className={`font-semibold ${
                          analysis.technical.sma20DeltaPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                        }`}
                      >
                        {formatSignedPercent(analysis.technical.sma20DeltaPct)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-sans text-[#475569]">Price vs EMA-50</span>
                      <span
                        className={`font-semibold ${
                          analysis.technical.ema50DeltaPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                        }`}
                      >
                        {formatSignedPercent(analysis.technical.ema50DeltaPct)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-sans text-[#475569]">MACD (12, 26) / Signal (9) / Histogram</span>
                      <span className="font-semibold text-[#0f172a]">
                        {analysis.technical.macd.toFixed(2)} / {analysis.technical.macdSignal.toFixed(2)} /{' '}
                        <span
                          className={
                            analysis.technical.macdHist >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                          }
                        >
                          {analysis.technical.macdHist >= 0 ? '+' : ''}
                          {analysis.technical.macdHist.toFixed(2)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-sans text-[#475569]">Bollinger %B Position &amp; Bandwidth</span>
                      <span className="font-semibold text-[#0f172a]">
                        {analysis.technical.bollingerPercentB.toFixed(1)}% · BW{' '}
                        {analysis.technical.bollingerBandwidthPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Support / Resistance Pivot Ladder & Period Channel */}
                <div className="lg:col-span-5 lg:border-l lg:border-[#e2e8f0] lg:pl-6 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-[#0f172a]">
                      Support &amp; Resistance Pivot Ladder ({timeframe})
                    </div>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Classic floor-trader pivot levels computed from timeframe high, low, and close
                    </p>
                  </div>

                  <div className="divide-y divide-[#f1f5f9] text-xs font-mono tabular-nums">
                    {[
                      { label: 'Resistance R2', val: analysis.technical.pivots.r2, tone: 'text-[#dc2626]' },
                      { label: 'Resistance R1', val: analysis.technical.pivots.r1, tone: 'text-[#ea580c]' },
                      { label: 'Central Pivot', val: analysis.technical.pivots.pivot, tone: 'text-[#2563eb] font-bold' },
                      { label: 'Support S1', val: analysis.technical.pivots.s1, tone: 'text-[#059669]' },
                      { label: 'Support S2', val: analysis.technical.pivots.s2, tone: 'text-[#047857]' },
                    ].map((lvl) => {
                      const distPct = ((lvl.val - latestClose) / Math.max(0.01, latestClose)) * 100;
                      return (
                        <div key={lvl.label} className="flex items-center justify-between py-2">
                          <span className="font-sans text-[#475569]">{lvl.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#64748b]">
                              {distPct >= 0 ? '+' : ''}
                              {distPct.toFixed(1)}%
                            </span>
                            <span className={`font-semibold ${lvl.tone}`}>
                              {currencyPrefix}
                              {lvl.val.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Period Range Bar */}
                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono tabular-nums">
                      <span className="text-[#64748b]">
                        Low {currencyPrefix}
                        {analysis.technical.pivots.periodLow.toFixed(2)}
                      </span>
                      <span className="font-sans font-semibold text-[#0f172a]">
                        {analysis.technical.pivots.rangePositionPct.toFixed(0)}% of {timeframe} range
                      </span>
                      <span className="text-[#64748b]">
                        High {currencyPrefix}
                        {analysis.technical.pivots.periodHigh.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#e2e8f0] overflow-hidden">
                      <div
                        className="h-full bg-[#2563eb] rounded-full"
                        style={{
                          width: `${Math.max(3, Math.min(100, analysis.technical.pivots.rangePositionPct))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RISK, RETURN & CAPTURE MATRIX */}
            {activeMethodTab === 'risk' && (
              <div
                data-testid="analysis-panel-risk"
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-[#0f172a] pb-2 border-b border-[#f1f5f9]">
                    Standalone Risk-Adjusted &amp; Tail Metrics ({timeframe})
                  </div>
                  <div className="divide-y divide-[#f1f5f9] text-xs font-mono tabular-nums">
                    {[
                      { label: 'Cumulative Return', val: formatSignedPercent(analysis.risk.cumulativeReturnPct), highlight: analysis.risk.cumulativeReturnPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]' },
                      { label: 'Annualized CAGR', val: formatSignedPercent(analysis.risk.cagrPct), highlight: analysis.risk.cagrPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]' },
                      { label: 'Annualized Volatility (σ)', val: `${analysis.risk.annualizedVolPct.toFixed(2)}%` },
                      { label: 'Sharpe Ratio (Rf adjusted)', val: analysis.risk.sharpeRatio.toFixed(2) },
                      { label: 'Sortino Ratio (Downside σ)', val: analysis.risk.sortinoRatio.toFixed(2) },
                      { label: 'Calmar Ratio (CAGR / |Max DD|)', val: analysis.risk.calmarRatio.toFixed(2) },
                      { label: 'Max Peak-to-Trough Drawdown', val: `${analysis.risk.maxDrawdownPct.toFixed(2)}% (${analysis.risk.maxDrawdownDurationDays}d)`, highlight: 'text-[#dc2626]' },
                      { label: 'Historical Value at Risk (VaR 95%)', val: `${analysis.risk.var95DailyPct.toFixed(2)}%` },
                      { label: 'Conditional VaR / Expected Shortfall (95%)', val: `${analysis.risk.cvar95DailyPct.toFixed(2)}%`, highlight: 'text-[#dc2626]' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-2">
                        <span className="font-sans text-[#475569]">{row.label}</span>
                        <span className={`font-semibold ${row.highlight || 'text-[#0f172a]'}`}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:border-l lg:border-[#e2e8f0] lg:pl-6 space-y-3">
                  <div className="text-sm font-semibold text-[#0f172a] pb-2 border-b border-[#f1f5f9]">
                    Benchmark Relative &amp; Market Capture{' '}
                    {benchmarkTile ? `vs ${benchmarkTile.symbol}` : '(Select a Benchmark above)'}
                  </div>
                  {benchmarkTile && analysis.risk.beta !== null ? (
                    <>
                      <div className="divide-y divide-[#f1f5f9] text-xs font-mono tabular-nums">
                        <div className="flex items-center justify-between py-2">
                          <span className="font-sans text-[#475569]">Beta (β)</span>
                          <span className="font-semibold text-[#0f172a]">{analysis.risk.beta.toFixed(2)}x</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-sans text-[#475569]">Pearson Correlation (r)</span>
                          <span className="font-semibold text-[#0f172a]">{analysis.risk.correlation?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-sans text-[#475569]">Annualized CAPM Alpha (α)</span>
                          <span
                            className={`font-semibold ${
                              (analysis.risk.annualizedAlphaPct ?? 0) >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                            }`}
                          >
                            {formatSignedPercent(analysis.risk.annualizedAlphaPct ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-sans text-[#475569]">Information Ratio</span>
                          <span className="font-semibold text-[#0f172a]">{analysis.risk.informationRatio?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-sans text-[#475569]">Active Excess Return ({timeframe})</span>
                          <span
                            className={`font-semibold ${
                              (analysis.risk.excessReturnPct ?? 0) >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                            }`}
                          >
                            {formatSignedPercent(analysis.risk.excessReturnPct ?? 0)}
                          </span>
                        </div>
                      </div>

                      {/* Visual Upside vs Downside Capture Bars */}
                      <div className="pt-2 space-y-2.5">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono tabular-nums">
                            <span className="font-sans text-[#334155]">Upside Capture Ratio</span>
                            <span className="font-semibold text-[#059669]">
                              {analysis.risk.upsideCapturePct?.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                            <div
                              className="h-full bg-[#10b981] rounded-full"
                              style={{
                                width: `${Math.max(8, Math.min(100, ((analysis.risk.upsideCapturePct ?? 100) / 160) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono tabular-nums">
                            <span className="font-sans text-[#334155]">Downside Capture Ratio (lower is better)</span>
                            <span className="font-semibold text-[#dc2626]">
                              {analysis.risk.downsideCapturePct?.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                            <div
                              className="h-full bg-[#f43f5e] rounded-full"
                              style={{
                                width: `${Math.max(8, Math.min(100, ((analysis.risk.downsideCapturePct ?? 100) / 160) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center text-xs text-[#64748b]">
                      Choose a benchmark from the top-right dropdown to compute Beta, CAPM Alpha, Correlation, and Upside/Downside Capture.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: RETURN DISTRIBUTION */}
            {activeMethodTab === 'distribution' && (
              <div
                data-testid="analysis-panel-distribution"
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <div className="lg:col-span-8 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-[#0f172a]">
                      Periodic Return Frequency Histogram ({analysis.series.length - 1} sessions)
                    </div>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Distribution of single-session moves across negative and positive return buckets
                    </p>
                  </div>

                  <div className="grid grid-cols-8 gap-2 items-end h-44 pt-4 pb-2 border-b border-[#e2e8f0]">
                    {analysis.histogram.map((bucket) => {
                      const heightPct = Math.max(4, (bucket.sharePct / maxHistShare) * 100);
                      return (
                        <div key={bucket.label} className="flex flex-col items-center h-full justify-end gap-1">
                          <span className="text-[10.5px] font-mono tabular-nums text-[#475569]">
                            {bucket.sharePct.toFixed(0)}%
                          </span>
                          <div className="w-full flex-1 flex items-end">
                            <div
                              className={`w-full rounded-t-[5px] transition-all ${
                                bucket.isPositive ? 'bg-[#059669]' : 'bg-[#e11d48]'
                              }`}
                              style={{ height: `${heightPct}%` }}
                              title={`${bucket.label}: ${bucket.count} sessions (${bucket.sharePct}%)`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-8 gap-2 text-center">
                    {analysis.histogram.map((bucket) => (
                      <div key={bucket.label} className="text-[10px] font-mono text-[#64748b] leading-tight">
                        {bucket.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 lg:border-l lg:border-[#e2e8f0] lg:pl-6 space-y-2">
                  <div className="text-sm font-semibold text-[#0f172a] pb-2 border-b border-[#f1f5f9]">
                    Distribution Diagnostics
                  </div>
                  <div className="divide-y divide-[#f1f5f9] text-xs font-mono tabular-nums">
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Positive Session Win Rate</span>
                      <span className="font-semibold text-[#059669]">{analysis.risk.winRatePct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Profit Factor (Gross Gain / Loss)</span>
                      <span className="font-semibold text-[#0f172a]">{analysis.risk.profitFactor.toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Best Single Session</span>
                      <span className="font-semibold text-[#059669]">+{analysis.risk.bestSessionPct.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Worst Single Session</span>
                      <span className="font-semibold text-[#dc2626]">{analysis.risk.worstSessionPct.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Return Skewness</span>
                      <span className="font-semibold text-[#0f172a]">{analysis.risk.skewness.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Expected Shortfall (CVaR 95%)</span>
                      <span className="font-semibold text-[#dc2626]">{analysis.risk.cvar95DailyPct.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: WHAT-IF STRESS & VOLATILITY POSITION SIZING */}
            {activeMethodTab === 'stress' && (
              <div
                data-testid="analysis-panel-stress"
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Macro Stress Shock Simulator */}
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-[#0f172a]">
                      Beta-Scaled Macro Shock Simulator
                    </div>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Estimates instrument drawdown &amp; recovery time using effective Beta ({stressImpact.effectiveBeta.toFixed(2)}x)
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {STRESS_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        data-testid={`stress-preset-${preset.shockPct}`}
                        onClick={() => {
                          setStressLabel(preset.name);
                          setStressShockPct(preset.shockPct);
                        }}
                        className={`px-2.5 py-1.5 rounded-[7px] text-xs font-medium border cursor-pointer whitespace-nowrap ${
                          stressShockPct === preset.shockPct
                            ? 'bg-[#0f172a] text-white border-[#0f172a]'
                            : 'bg-[#f8fafc] text-[#334155] border-[#e2e8f0] hover:bg-[#f1f5f9]'
                        }`}
                      >
                        {preset.name} ({preset.shockPct > 0 ? '+' : ''}
                        {preset.shockPct}%)
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono tabular-nums">
                      <span className="font-sans text-[#475569]">Custom Benchmark Shock</span>
                      <span className="font-bold text-[#0f172a]">
                        {stressShockPct > 0 ? '+' : ''}
                        {stressShockPct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-35}
                      max={35}
                      step={1}
                      aria-label="Custom benchmark shock percentage"
                      data-testid="stress-shock-slider"
                      value={stressShockPct}
                      onChange={(e) => {
                        setStressLabel('Custom Market Shock');
                        setStressShockPct(Number(e.target.value));
                      }}
                      className="w-full accent-[#2563eb] cursor-pointer"
                    />
                  </div>

                  <div className="divide-y divide-[#f1f5f9] text-xs font-mono tabular-nums pt-1">
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Projected Instrument Move</span>
                      <span
                        data-testid="stress-projected-move"
                        className={`font-bold ${
                          stressImpact.projectedMovePct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                        }`}
                      >
                        {formatSignedPercent(stressImpact.projectedMovePct)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Projected NAV / Price</span>
                      <span className="font-bold text-[#0f172a]">
                        {currencyPrefix}
                        {stressImpact.projectedPrice.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Impact per {currencyPrefix}1,00,000 Allocated</span>
                      <span
                        className={`font-semibold ${
                          stressImpact.projectedDollarImpactPerLakh >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                        }`}
                      >
                        {stressImpact.projectedDollarImpactPerLakh >= 0 ? '+' : '-'}
                        {currencyPrefix}
                        {Math.abs(stressImpact.projectedDollarImpactPerLakh).toLocaleString('en-US')}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Estimated Recovery Horizon</span>
                      <span className="font-semibold text-[#0f172a]">
                        {stressImpact.estimatedRecoveryMonths === 0
                          ? 'No drawdown'
                          : `~${stressImpact.estimatedRecoveryMonths} months at current CAGR`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Volatility-Calibrated Position Sizing Calculator */}
                <div className="lg:border-l lg:border-[#e2e8f0] lg:pl-6 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-[#0f172a]">
                      Volatility-Calibrated Position Sizing
                    </div>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Sizes position using 1-month 95% volatility stop distance ({positionSize.stopDistancePct}%) so tail risk stays within budget
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="pos-capital-input" className="block text-xs text-[#475569] mb-1">
                        Portfolio Capital ({activeInstrument.unit})
                      </label>
                      <input
                        id="pos-capital-input"
                        data-testid="pos-capital-input"
                        type="number"
                        min={1000}
                        step={10000}
                        value={portfolioCapital}
                        onChange={(e) => setPortfolioCapital(Math.max(1000, Number(e.target.value) || 0))}
                        className="w-full h-9 px-3 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] focus:bg-white font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                    <div>
                      <label htmlFor="pos-risk-input" className="block text-xs text-[#475569] mb-1">
                        Max Risk Budget (%)
                      </label>
                      <input
                        id="pos-risk-input"
                        data-testid="pos-risk-input"
                        type="number"
                        min={0.5}
                        max={20}
                        step={0.5}
                        value={riskBudgetPct}
                        onChange={(e) =>
                          setRiskBudgetPct(Math.max(0.5, Math.min(20, Number(e.target.value) || 1)))
                        }
                        className="w-full h-9 px-3 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] focus:bg-white font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-[#f1f5f9] text-xs font-mono tabular-nums">
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Recommended Allocation</span>
                      <span data-testid="pos-recommended-amount" className="font-bold text-[#2563eb]">
                        {currencyPrefix}
                        {positionSize.recommendedAllocationAmount.toLocaleString('en-US')} (
                        {positionSize.recommendedWeightPct}%)
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Estimated Units / Shares</span>
                      <span className="font-semibold text-[#0f172a]">
                        {positionSize.estimatedUnits.toLocaleString('en-US')} units
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Volatility Stop Envelope (1M 95%)</span>
                      <span className="font-semibold text-[#0f172a]">
                        −{positionSize.stopDistancePct}% ({currencyPrefix}
                        {positionSize.maxLossAmount.toLocaleString('en-US')} max risk)
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-sans text-[#475569]">Estimated Daily 95% VaR on Position</span>
                      <span className="font-semibold text-[#dc2626]">
                        −{currencyPrefix}
                        {positionSize.dailyVar95Amount.toLocaleString('en-US')} / session
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
