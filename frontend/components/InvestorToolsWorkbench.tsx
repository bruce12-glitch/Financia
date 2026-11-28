import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calculator,
  LayoutGrid,
  PieChart,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  AllocationBucket,
  computePortfolioAllocationPlan,
  computeSipProjection,
} from '../utils/sparkline24h';
import {
  buildAllSipInstrumentOptions,
  filterSipInstruments,
  formatSipCurrency,
  SipCurrency,
  SipInstrumentOption,
  SipInstrumentTypeFilter,
} from '../utils/sipCalculatorEngine';
import { HoldingsStructureVisualizer } from './HoldingsStructureVisualizer';

interface InvestorToolsWorkbenchProps {
  onJumpToAnalysis?: (ticker: string) => void;
}

const CUSTOM_RETURN_QUICK_PICKS = [8, 10, 12, 15, 18, 22];

const ALLOCATION_PRESETS: Record<
  'core_growth' | 'all_weather' | 'capital_preservation',
  {
    label: string;
    subtitle: string;
    weights: Record<AllocationBucket['id'], number>;
  }
> = {
  core_growth: {
    label: 'Core Growth',
    subtitle: 'Long-horizon wealth compounding with gold hedge',
    weights: { equity_mf: 60, gold: 15, debt: 15, sif: 10 },
  },
  all_weather: {
    label: 'All-Weather',
    subtitle: 'Balanced equity, physical gold, and sovereign gilt carry',
    weights: { equity_mf: 40, gold: 25, debt: 25, sif: 10 },
  },
  capital_preservation: {
    label: 'Capital Preservation',
    subtitle: 'Low-drawdown sovereign debt, bullion, and hedged carry',
    weights: { equity_mf: 20, gold: 20, debt: 50, sif: 10 },
  },
};

const BASE_BUCKETS: Omit<AllocationBucket, 'weightPct'>[] = [
  {
    id: 'equity_mf',
    label: 'Direct Equity Mutual Funds',
    expectedReturnPct: 13.8,
    volatilityPct: 14.5,
    colorHex: '#2563EB',
  },
  {
    id: 'gold',
    label: 'Physical Gold ETF / Bullion',
    expectedReturnPct: 11.4,
    volatilityPct: 11.2,
    colorHex: '#D97706',
  },
  {
    id: 'debt',
    label: 'Sovereign Gilt & Corporate Debt',
    expectedReturnPct: 7.4,
    volatilityPct: 4.2,
    colorHex: '#059669',
  },
  {
    id: 'sif',
    label: 'SEBI SIF Long-Short / Hybrid',
    expectedReturnPct: 10.6,
    volatilityPct: 7.8,
    colorHex: '#0F172A',
  },
];

function formatInrCompact(value: number): string {
  return formatSipCurrency(value, 'INR');
}

export const InvestorToolsWorkbench: React.FC<InvestorToolsWorkbenchProps> = ({
  onJumpToAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<'sip' | 'allocation' | 'holdings'>('sip');

  // Dual-Mode SIP Calculator State:
  // 'custom' = None / Custom Return % (user chooses exact percentage, no particular fund locked)
  // 'instrument' = Choose ANY Mutual Fund or ETF from all 20 indexed instruments
  const [sipMode, setSipMode] = useState<'custom' | 'instrument'>('custom');
  const [allInstruments, setAllInstruments] = useState<SipInstrumentOption[]>(() =>
    buildAllSipInstrumentOptions()
  );
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [instrumentSearch, setInstrumentSearch] = useState<string>('');
  const [instrumentTypeFilter, setInstrumentTypeFilter] = useState<SipInstrumentTypeFilter>('ALL');
  const [loadingRates, setLoadingRates] = useState<boolean>(false);

  const [sipCurrency, setSipCurrency] = useState<SipCurrency>('INR');
  const [monthlySipInr, setMonthlySipInr] = useState<number>(25000);
  const [annualStepUpPct, setAnnualStepUpPct] = useState<number>(10);
  const [years, setYears] = useState<number>(12);
  const [initialLumpsumInr, setInitialLumpsumInr] = useState<number>(200000);
  const [expectedAnnualReturnPct, setExpectedAnnualReturnPct] = useState<number>(12.0);
  const [includeExpenseRatio, setIncludeExpenseRatio] = useState<boolean>(false);
  const [directTerPct, setDirectTerPct] = useState<number>(0);
  const [regularTerPct, setRegularTerPct] = useState<number>(0);

  // Asset Allocation Planner state
  const [totalCapitalInr, setTotalCapitalInr] = useState<number>(2500000);
  const [activeAllocPreset, setActiveAllocPreset] = useState<
    'core_growth' | 'all_weather' | 'capital_preservation' | 'custom'
  >('core_growth');
  const [bucketWeights, setBucketWeights] = useState<Record<AllocationBucket['id'], number>>(
    ALLOCATION_PRESETS.core_growth.weights
  );

  // Hydrate live 3Y CAGR from AMFI backend for all AMFI-coded Mutual Funds in the 20-instrument catalog
  useEffect(() => {
    let cancelled = false;
    const amfiTargets = buildAllSipInstrumentOptions().filter((opt) => Boolean(opt.amfiCode));
    if (amfiTargets.length === 0) return;
    setLoadingRates(true);

    Promise.allSettled(
      amfiTargets.map(async (opt) => {
        const res = await fetch(`/api/mfnav/fund/${encodeURIComponent(opt.amfiCode!)}`);
        if (!res.ok) return { symbol: opt.symbol, cagrPct: null };
        const payload = (await res.json()) as {
          daily_metrics?: { cagr_3y?: number | null };
        };
        const rawCagr = payload.daily_metrics?.cagr_3y;
        const cagrPct =
          typeof rawCagr === 'number' && Number.isFinite(rawCagr) && rawCagr > 0
            ? Number((rawCagr * 100).toFixed(2))
            : null;
        return { symbol: opt.symbol, cagrPct };
      })
    )
      .then((results) => {
        if (cancelled) return;
        const liveMap = new Map<string, number>();
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.cagrPct !== null) {
            liveMap.set(r.value.symbol, r.value.cagrPct);
          }
        }
        if (liveMap.size > 0) {
          setAllInstruments((prev) =>
            prev.map((item) => {
              const live = liveMap.get(item.symbol);
              return live !== undefined
                ? { ...item, annualReturn3YPct: Number(Math.min(35, Math.max(1, live)).toFixed(2)) }
                : item;
            })
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRates(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredInstruments = useMemo(
    () => filterSipInstruments(allInstruments, instrumentSearch, instrumentTypeFilter),
    [allInstruments, instrumentSearch, instrumentTypeFilter]
  );

  const selectedInstrument = useMemo(
    () => (selectedSymbol ? allInstruments.find((f) => f.symbol === selectedSymbol) || null : null),
    [allInstruments, selectedSymbol]
  );

  const mfCount = useMemo(
    () => allInstruments.filter((o) => o.instrumentType === 'Mutual Fund').length,
    [allInstruments]
  );
  const etfCount = useMemo(
    () => allInstruments.filter((o) => o.instrumentType === 'ETF').length,
    [allInstruments]
  );

  const handleSwitchToCustomMode = () => {
    setSipMode('custom');
    setSelectedSymbol(null);
    if (!includeExpenseRatio) {
      setDirectTerPct(0);
      setRegularTerPct(0);
    }
  };

  const handleSelectInstrument = (opt: SipInstrumentOption) => {
    setSipMode('instrument');
    setSelectedSymbol(opt.symbol);
    setExpectedAnnualReturnPct(Number(Math.min(35, Math.max(1, opt.annualReturn3YPct)).toFixed(1)));
    setIncludeExpenseRatio(true);
    setDirectTerPct(opt.directTerPct);
    setRegularTerPct(opt.estimatedRegularTerPct);
    if (opt.currency !== sipCurrency) {
      setSipCurrency(opt.currency);
      if (opt.currency === 'USD') {
        setMonthlySipInr(500);
        setInitialLumpsumInr(5000);
      } else {
        setMonthlySipInr(25000);
        setInitialLumpsumInr(200000);
      }
    }
  };

  const handleToggleCurrency = (next: SipCurrency) => {
    if (next === sipCurrency) return;
    setSipCurrency(next);
    if (next === 'USD') {
      setMonthlySipInr(500);
      setInitialLumpsumInr(5000);
    } else {
      setMonthlySipInr(25000);
      setInitialLumpsumInr(200000);
    }
  };

  const effectiveDirectTer = includeExpenseRatio ? directTerPct : 0;
  const effectiveRegularTer = includeExpenseRatio ? Math.max(directTerPct, regularTerPct) : 0;

  const sipResult = useMemo(
    () =>
      computeSipProjection({
        monthlySipInr,
        annualStepUpPct,
        years,
        expectedAnnualReturnPct,
        initialLumpsumInr,
        directTerPct: effectiveDirectTer,
        regularTerPct: effectiveRegularTer,
      }),
    [
      monthlySipInr,
      annualStepUpPct,
      years,
      expectedAnnualReturnPct,
      initialLumpsumInr,
      effectiveDirectTer,
      effectiveRegularTer,
    ]
  );

  const chartMilestones = useMemo(() => {
    const snaps = sipResult.yearlySnapshots;
    if (snaps.length <= 8) return snaps;
    const step = (snaps.length - 1) / 7;
    const picked: typeof snaps = [];
    const seen = new Set<number>();
    for (let i = 0; i < 8; i++) {
      const idx = Math.min(snaps.length - 1, Math.round(i * step));
      if (!seen.has(idx)) {
        seen.add(idx);
        picked.push(snaps[idx]);
      }
    }
    return picked;
  }, [sipResult.yearlySnapshots]);

  const maxMilestoneVal = Math.max(1, sipResult.directCorpusInr);

  const allocationBuckets: AllocationBucket[] = useMemo(
    () =>
      BASE_BUCKETS.map((b) => ({
        ...b,
        weightPct: bucketWeights[b.id],
      })),
    [bucketWeights]
  );

  const allocationPlan = useMemo(
    () => computePortfolioAllocationPlan(totalCapitalInr, allocationBuckets, 6.5),
    [totalCapitalInr, allocationBuckets]
  );

  const monthlyMin = sipCurrency === 'USD' ? 100 : 2000;
  const monthlyMax = sipCurrency === 'USD' ? 10000 : 250000;
  const monthlyStep = sipCurrency === 'USD' ? 50 : 1000;
  const lumpsumMax = sipCurrency === 'USD' ? 100000 : 2500000;
  const lumpsumStep = sipCurrency === 'USD' ? 1000 : 50000;
  const currencyPrefix = sipCurrency === 'USD' ? '$' : '₹';

  return (
    <section
      id="sip-tools-workbench"
      data-testid="investor-tools-workbench"
      aria-label="Investment Calculators and Portfolio Allocation Planner"
      className="w-full bg-white text-[#0f172a] py-10 border-b border-[#e2e8f0]"
    >
      <div className="max-w-[1240px] mx-auto px-6">
        {/* Clean Institutional Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 mb-5 border-b border-[#e2e8f0]">
          <div className="min-w-0">
            <div className="text-xs font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold mb-1">
              Investor Planning Workbench
            </div>
            <h2
              className="font-display font-semibold text-[#0f172a] tracking-tight"
              style={{ fontSize: 'clamp(1.35rem, 2.0vw, 1.75rem)' }}
            >
              SIP Calculator, Asset Planner &amp; Holdings Structure
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Model Step-Up SIP compounding, balance multi-asset portfolios, or inspect disclosed fund holdings with D3 treemap and sunburst charts.
            </p>
          </div>

          {/* Segmented Workbench Mode Switcher */}
          <div
            role="tablist"
            aria-label="Investor planning tools"
            className="inline-flex flex-wrap items-center p-1 rounded-[10px] bg-[#f1f5f9] border border-[#e2e8f0] shrink-0 self-start lg:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sip'}
              data-testid="workbench-tab-sip"
              onClick={() => setActiveTab('sip')}
              className={`px-3.5 py-2 rounded-[7px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'sip'
                  ? 'bg-[#0f172a] text-white'
                  : 'text-[#475569] hover:text-[#0f172a]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>SIP Calculator</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'allocation'}
              data-testid="workbench-tab-allocation"
              onClick={() => setActiveTab('allocation')}
              className={`px-3.5 py-2 rounded-[7px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'allocation'
                  ? 'bg-[#0f172a] text-white'
                  : 'text-[#475569] hover:text-[#0f172a]'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Asset Allocation Planner</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'holdings'}
              data-testid="workbench-tab-holdings"
              onClick={() => setActiveTab('holdings')}
              className={`px-3.5 py-2 rounded-[7px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'holdings'
                  ? 'bg-[#0f172a] text-white'
                  : 'text-[#475569] hover:text-[#0f172a]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Holdings Treemap &amp; Sunburst</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DUAL-MODE STEP-UP SIP CALCULATOR (CUSTOM % OR ALL 20 MFs & ETFs) */}
        {activeTab === 'sip' ? (
          <div data-testid="sip-calculator-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Columns: Mode Choice (Custom % vs All 20 MFs & ETFs) & Inputs */}
            <div className="lg:col-span-5 rounded-[12px] bg-[#f8fafc] border border-[#e2e8f0] p-5 flex flex-col justify-between gap-5">
              <div>
                {/* Explicit Dual-Choice Mode Switcher */}
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-[#0f172a]">
                      Return Basis
                    </span>
                    <div className="inline-flex items-center p-0.5 rounded-[7px] bg-white border border-[#cbd5e1]">
                      <button
                        type="button"
                        onClick={() => handleToggleCurrency('INR')}
                        className={`px-2 py-0.5 rounded-[5px] text-[11px] font-mono font-semibold cursor-pointer ${
                          sipCurrency === 'INR'
                            ? 'bg-[#0f172a] text-white'
                            : 'text-[#475569] hover:text-[#0f172a]'
                        }`}
                      >
                        ₹ INR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCurrency('USD')}
                        className={`px-2 py-0.5 rounded-[5px] text-[11px] font-mono font-semibold cursor-pointer ${
                          sipCurrency === 'USD'
                            ? 'bg-[#0f172a] text-white'
                            : 'text-[#475569] hover:text-[#0f172a]'
                        }`}
                      >
                        $ USD
                      </button>
                    </div>
                  </div>

                  <div
                    role="group"
                    aria-label="Choose SIP return source"
                    className="grid grid-cols-2 gap-1.5 p-1 rounded-[9px] bg-[#e2e8f0]/75 border border-[#cbd5e1]"
                  >
                    <button
                      type="button"
                      data-testid="sip-mode-custom"
                      aria-pressed={sipMode === 'custom'}
                      onClick={handleSwitchToCustomMode}
                      className={`py-2 px-2.5 rounded-[7px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        sipMode === 'custom'
                          ? 'bg-[#0f172a] text-white shadow-xs'
                          : 'text-[#334155] hover:text-[#0f172a]'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Custom % (No Fund)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="sip-mode-instrument"
                      aria-pressed={sipMode === 'instrument'}
                      onClick={() => setSipMode('instrument')}
                      className={`py-2 px-2.5 rounded-[7px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        sipMode === 'instrument'
                          ? 'bg-[#0f172a] text-white shadow-xs'
                          : 'text-[#334155] hover:text-[#0f172a]'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Choose MF / ETF ({allInstruments.length})</span>
                    </button>
                  </div>
                </div>

                {/* MODE A: CUSTOM PERCENTAGE (NO FUND SELECTED) */}
                {sipMode === 'custom' ? (
                  <div
                    data-testid="sip-custom-panel"
                    className="mb-5 rounded-[10px] bg-white border border-[#dbe2ec] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label
                        htmlFor="sip-custom-return-number"
                        className="text-xs font-semibold text-[#0f172a]"
                      >
                        Enter Expected Annual Return (%)
                      </label>
                      <span className="text-[11px] font-mono text-[#64748b]">No fund locked</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="relative flex-1">
                        <input
                          id="sip-custom-return-number"
                          data-testid="sip-custom-return-input"
                          type="number"
                          min={1}
                          max={35}
                          step={0.1}
                          value={expectedAnnualReturnPct}
                          onChange={(e) => {
                            const parsed = Number(e.target.value);
                            if (Number.isFinite(parsed)) {
                              setExpectedAnnualReturnPct(Math.min(35, Math.max(1, parsed)));
                            }
                          }}
                          className="w-full px-3 py-2 pr-8 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] font-mono text-sm font-bold text-[#0f172a] tabular-nums focus:outline-none focus:border-[#2563eb] focus:bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-[#64748b]">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIncludeExpenseRatio((prev) => {
                            const next = !prev;
                            if (next && directTerPct === 0 && regularTerPct === 0) {
                              setDirectTerPct(0.5);
                              setRegularTerPct(1.35);
                            }
                            return next;
                          });
                        }}
                        className={`px-2.5 py-2 rounded-[8px] border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          includeExpenseRatio
                            ? 'bg-[#eff6ff] border-[#93c5fd] text-[#1d4ed8]'
                            : 'bg-[#f8fafc] border-[#cbd5e1] text-[#475569] hover:text-[#0f172a]'
                        }`}
                      >
                        {includeExpenseRatio ? 'TER Active' : 'Pure % (0% TER)'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {CUSTOM_RETURN_QUICK_PICKS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setExpectedAnnualReturnPct(pct)}
                          className={`px-2.5 py-1 rounded-[6px] font-mono text-[11px] font-semibold border transition-colors cursor-pointer ${
                            Math.abs(expectedAnnualReturnPct - pct) < 0.05
                              ? 'bg-[#0f172a] text-white border-[#0f172a]'
                              : 'bg-[#f8fafc] text-[#334155] border-[#e2e8f0] hover:border-[#94a3b8]'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* MODE B: ALL 20 MUTUAL FUNDS & ETFs PICKER */
                  <div
                    data-testid="sip-instrument-picker"
                    className="mb-5 rounded-[10px] bg-white border border-[#dbe2ec] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-xs font-semibold text-[#0f172a]">
                        Select Any Mutual Fund or ETF ({filteredInstruments.length}/{allInstruments.length})
                      </span>
                      <div className="flex items-center gap-2">
                        {loadingRates && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-[#64748b]">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            AMFI
                          </span>
                        )}
                        {selectedInstrument && (
                          <button
                            type="button"
                            data-testid="sip-clear-instrument"
                            onClick={handleSwitchToCustomMode}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b91c1c] hover:underline cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            Clear (Custom %)
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search + Type Filter */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-2.5">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <label htmlFor="sip-instrument-search" className="sr-only">
                          Search all 20 mutual funds and ETFs
                        </label>
                        <input
                          id="sip-instrument-search"
                          data-testid="sip-instrument-search"
                          type="text"
                          value={instrumentSearch}
                          onChange={(e) => setInstrumentSearch(e.target.value)}
                          placeholder="Search ticker, fund name, or category..."
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-[7px] border border-[#cbd5e1] bg-[#f8fafc] text-xs text-[#0f172a] placeholder:text-[#64748b] focus:outline-none focus:border-[#2563eb] focus:bg-white"
                        />
                      </div>
                      <div
                        role="group"
                        aria-label="Filter SIP instruments by type"
                        className="inline-flex items-center p-0.5 rounded-[7px] bg-[#f1f5f9] border border-[#e2e8f0] shrink-0"
                      >
                        {(
                          [
                            { id: 'ALL', label: `All (${allInstruments.length})` },
                            { id: 'Mutual Fund', label: `MF (${mfCount})` },
                            { id: 'ETF', label: `ETF (${etfCount})` },
                          ] as const
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            data-testid={`sip-filter-${f.id.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => setInstrumentTypeFilter(f.id)}
                            className={`px-2 py-1 rounded-[5px] text-[10.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              instrumentTypeFilter === f.id
                                ? 'bg-[#0f172a] text-white'
                                : 'text-[#475569] hover:text-[#0f172a]'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scrollable All-20 Mutual Fund & ETF List */}
                    <div
                      data-testid="sip-instrument-list"
                      className="max-h-[212px] overflow-y-auto pr-1 space-y-1.5"
                    >
                      {filteredInstruments.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[#64748b]">
                          No instruments match &ldquo;{instrumentSearch}&rdquo;.
                        </div>
                      ) : (
                        filteredInstruments.map((opt) => {
                          const active = selectedSymbol === opt.symbol;
                          return (
                            <button
                              key={opt.symbol}
                              type="button"
                              data-testid={`sip-option-${opt.symbol}`}
                              onClick={() => handleSelectInstrument(opt)}
                              className={`w-full px-2.5 py-2 rounded-[8px] border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                                active
                                  ? 'bg-[#eff6ff] border-[#2563eb] ring-1 ring-[#2563eb]/20'
                                  : 'bg-[#f8fafc] border-[#e2e8f0] hover:border-[#94a3b8] hover:bg-white'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold text-[#0f172a]">
                                    {opt.symbol}
                                  </span>
                                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white border border-[#dbe2ec] text-[#475569]">
                                    {opt.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'}
                                  </span>
                                  <span className="text-[10.5px] text-[#64748b] truncate">
                                    {opt.category}
                                  </span>
                                </div>
                                <div className="text-[11.5px] text-[#334155] truncate mt-0.5">
                                  {opt.name}
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono tabular-nums">
                                <div className="text-xs font-bold text-[#059669]">
                                  {opt.annualReturn3YPct.toFixed(1)}%
                                </div>
                                <div className="text-[10px] text-[#64748b]">
                                  TER {opt.directTerPct.toFixed(2)}%
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Sliders & Numeric Controls */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <label htmlFor="sip-monthly-input" className="font-medium text-[#334155]">
                        Monthly SIP Contribution
                      </label>
                      <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                        {currencyPrefix}
                        {monthlySipInr.toLocaleString(sipCurrency === 'USD' ? 'en-US' : 'en-IN')}/mo
                      </span>
                    </div>
                    <input
                      id="sip-monthly-input"
                      type="range"
                      min={monthlyMin}
                      max={monthlyMax}
                      step={monthlyStep}
                      value={monthlySipInr}
                      onChange={(e) => setMonthlySipInr(Number(e.target.value))}
                      className="w-full accent-[#2563eb] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <label htmlFor="sip-stepup-input" className="font-medium text-[#334155]">
                          Annual Step-Up
                        </label>
                        <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                          +{annualStepUpPct}%/yr
                        </span>
                      </div>
                      <input
                        id="sip-stepup-input"
                        type="range"
                        min={0}
                        max={25}
                        step={1}
                        value={annualStepUpPct}
                        onChange={(e) => setAnnualStepUpPct(Number(e.target.value))}
                        className="w-full accent-[#2563eb] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <label htmlFor="sip-years-input" className="font-medium text-[#334155]">
                          Horizon
                        </label>
                        <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                          {years} Years
                        </span>
                      </div>
                      <input
                        id="sip-years-input"
                        type="range"
                        min={1}
                        max={35}
                        step={1}
                        value={years}
                        onChange={(e) => setYears(Number(e.target.value))}
                        className="w-full accent-[#2563eb] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <label htmlFor="sip-return-input" className="font-medium text-[#334155]">
                          Expected Return
                        </label>
                        <span className="font-mono font-semibold text-[#059669] tabular-nums">
                          {expectedAnnualReturnPct.toFixed(1)}%
                        </span>
                      </div>
                      <input
                        id="sip-return-input"
                        type="range"
                        min={1}
                        max={35}
                        step={0.5}
                        value={expectedAnnualReturnPct}
                        onChange={(e) => setExpectedAnnualReturnPct(Number(e.target.value))}
                        className="w-full accent-[#059669] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <label htmlFor="sip-lumpsum-input" className="font-medium text-[#334155]">
                          Initial Lumpsum
                        </label>
                        <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                          {formatSipCurrency(initialLumpsumInr, sipCurrency)}
                        </span>
                      </div>
                      <input
                        id="sip-lumpsum-input"
                        type="range"
                        min={0}
                        max={lumpsumMax}
                        step={lumpsumStep}
                        value={initialLumpsumInr}
                        onChange={(e) => setInitialLumpsumInr(Number(e.target.value))}
                        className="w-full accent-[#2563eb] cursor-pointer"
                      />
                    </div>
                  </div>

                  {includeExpenseRatio && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#e2e8f0]">
                      <div>
                        <label
                          htmlFor="sip-direct-ter"
                          className="block text-[11px] font-medium text-[#475569] mb-1"
                        >
                          Direct / ETF TER (%)
                        </label>
                        <input
                          id="sip-direct-ter"
                          type="number"
                          step="0.05"
                          min="0"
                          max="2.5"
                          value={directTerPct}
                          onChange={(e) => setDirectTerPct(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full px-2.5 py-1.5 rounded-[7px] bg-white border border-[#cbd5e1] font-mono text-xs text-[#0f172a] tabular-nums focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="sip-regular-ter"
                          className="block text-[11px] font-medium text-[#475569] mb-1"
                        >
                          Regular / Wrap TER (%)
                        </label>
                        <input
                          id="sip-regular-ter"
                          type="number"
                          step="0.05"
                          min="0"
                          max="3.0"
                          value={regularTerPct}
                          onChange={(e) =>
                            setRegularTerPct(Math.max(directTerPct, Number(e.target.value) || 0))
                          }
                          className="w-full px-2.5 py-1.5 rounded-[7px] bg-white border border-[#cbd5e1] font-mono text-xs text-[#0f172a] tabular-nums focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {onJumpToAnalysis && selectedInstrument && (
                <button
                  type="button"
                  data-testid="sip-analyze-selected-btn"
                  onClick={() => onJumpToAnalysis(selectedInstrument.symbol)}
                  className="w-full py-2.5 px-3 rounded-[8px] bg-white hover:bg-[#eff6ff] border border-[#93c5fd] text-xs font-semibold text-[#1d4ed8] inline-flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Analyze {selectedInstrument.symbol} ({selectedInstrument.name}) in Terminal</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                </button>
              )}
            </div>

            {/* Right 7 Columns: Projection Readout & Compounding Milestone Chart */}
            <div className="lg:col-span-7 rounded-[12px] bg-[#070d1c] text-white border border-white/[0.1] p-6 flex flex-col justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
                  <div>
                    <div
                      data-testid="sip-active-basis-label"
                      className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#38bdf8]"
                    >
                      {selectedInstrument
                        ? `${selectedInstrument.symbol} · ${selectedInstrument.instrumentType} (${years}Y Projection)`
                        : `Custom ${expectedAnnualReturnPct.toFixed(1)}% SIP Projection (${years}Y)`}
                    </div>
                    <div
                      data-testid="sip-projected-corpus"
                      className="font-display font-bold text-3xl sm:text-4xl text-white tabular-nums mt-1"
                    >
                      {formatSipCurrency(sipResult.directCorpusInr, sipCurrency)}
                    </div>
                  </div>

                  {includeExpenseRatio && sipResult.directFeeSavingsInr > 0 ? (
                    <div className="rounded-[10px] bg-[#059669]/15 border border-[#34d399]/30 px-4 py-2.5 text-right">
                      <div className="text-[11px] font-mono text-[#6ee7b7] inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Direct Plan Fee Savings
                      </div>
                      <div
                        data-testid="sip-fee-savings"
                        className="font-mono font-bold text-lg text-[#34d399] tabular-nums mt-0.5"
                      >
                        +{formatSipCurrency(sipResult.directFeeSavingsInr, sipCurrency)}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[10px] bg-white/[0.05] border border-white/[0.12] px-4 py-2.5 text-right">
                      <div className="text-[11px] font-mono text-[#cbd5e1]">
                        Wealth Multiplier
                      </div>
                      <div
                        data-testid="sip-fee-savings"
                        className="font-mono font-bold text-lg text-[#38bdf8] tabular-nums mt-0.5"
                      >
                        {sipResult.totalInvestedInr > 0
                          ? `${(sipResult.directCorpusInr / sipResult.totalInvestedInr).toFixed(2)}x`
                          : '1.00x'}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3 Key Summary Figures */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-[9px] bg-white/[0.04] border border-white/[0.08] p-3">
                    <div className="text-[11px] text-[#94a3b8]">Total Invested</div>
                    <div className="font-mono font-semibold text-base text-white tabular-nums mt-1">
                      {formatSipCurrency(sipResult.totalInvestedInr, sipCurrency)}
                    </div>
                  </div>
                  <div className="rounded-[9px] bg-white/[0.04] border border-white/[0.08] p-3">
                    <div className="text-[11px] text-[#94a3b8]">Estimated Wealth Gain</div>
                    <div className="font-mono font-semibold text-base text-[#34d399] tabular-nums mt-1">
                      +{formatSipCurrency(sipResult.directGainInr, sipCurrency)}
                    </div>
                  </div>
                  <div className="rounded-[9px] bg-white/[0.04] border border-white/[0.08] p-3">
                    <div className="text-[11px] text-[#94a3b8]">Net Effective Rate</div>
                    <div className="font-mono font-semibold text-base text-[#38bdf8] tabular-nums mt-1">
                      {sipResult.effectiveDirectRatePct.toFixed(2)}%
                    </div>
                    <div className="text-[10px] font-mono text-[#64748b] tabular-nums">
                      {includeExpenseRatio
                        ? `TER ${effectiveDirectTer.toFixed(2)}% vs ${effectiveRegularTer.toFixed(2)}%`
                        : 'Pure custom rate (0% TER)'}
                    </div>
                  </div>
                </div>

                {/* Stacked Compounding Milestone Chart */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-medium text-[#cbd5e1]">
                      Compounding Trajectory by Milestone Year
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#94a3b8]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#3b82f6]" />
                        Principal
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#10b981]" />
                        Net Gains
                      </span>
                    </div>
                  </div>

                  <div className="h-44 flex items-end gap-2.5 pt-4 px-2 rounded-[10px] bg-[#040711] border border-white/[0.08]">
                    {chartMilestones.map((snap) => {
                      const totalPct = Math.max(
                        8,
                        Math.round((snap.directValueInr / maxMilestoneVal) * 100)
                      );
                      const principalRatio =
                        snap.directValueInr > 0
                          ? Math.min(100, Math.round((snap.investedInr / snap.directValueInr) * 100))
                          : 100;
                      const gainRatio = Math.max(0, 100 - principalRatio);
                      return (
                        <div
                          key={snap.year}
                          className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 group"
                        >
                          <div className="text-[10px] font-mono text-[#cbd5e1] tabular-nums opacity-85">
                            {formatSipCurrency(snap.directValueInr, sipCurrency).replace(/[₹$]/g, '')}
                          </div>
                          <div
                            className="w-full max-w-[44px] rounded-t-[5px] overflow-hidden flex flex-col justify-end bg-white/[0.06]"
                            style={{ height: `${totalPct}%` }}
                            title={`Year ${snap.year}: ${formatSipCurrency(
                              snap.directValueInr,
                              sipCurrency
                            )} (Invested ${formatSipCurrency(snap.investedInr, sipCurrency)})`}
                          >
                            <div
                              className="w-full bg-[#10b981]"
                              style={{ height: `${gainRatio}%` }}
                            />
                            <div
                              className="w-full bg-[#3b82f6]"
                              style={{ height: `${principalRatio}%` }}
                            />
                          </div>
                          <div className="text-[10.5px] font-mono text-[#94a3b8] pb-1">
                            Y{snap.year}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.08] text-[11px] text-[#94a3b8] font-mono">
                <span>
                  {includeExpenseRatio
                    ? `Regular / Wrap Corpus: ${formatSipCurrency(sipResult.regularCorpusInr, sipCurrency)} · TER Gap: ${(effectiveRegularTer - effectiveDirectTer).toFixed(2)}%`
                    : `Custom Mode · Step-Up +${annualStepUpPct}%/yr · ${expectedAnnualReturnPct.toFixed(1)}% Annualized`}
                </span>
                <span className="inline-flex items-center gap-1 text-[#38bdf8]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Monthly compounding model
                </span>
              </div>
            </div>
          </div>
        ) : activeTab === 'holdings' ? (
          /* TAB 3: D3 PORTFOLIO HOLDINGS TREEMAP & SUNBURST (/api/db/holdings) */
          <HoldingsStructureVisualizer onJumpToAnalysis={onJumpToAnalysis} />
        ) : (
          /* TAB 2: MULTI-ASSET PORTFOLIO ALLOCATOR & RISK REBALANCER */
          <div
            data-testid="allocation-planner-panel"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left 6 Columns: Presets & Allocation Sliders */}
            <div className="lg:col-span-6 rounded-[12px] bg-[#f8fafc] border border-[#e2e8f0] p-5 space-y-5">
              <div>
                <div className="text-xs font-semibold text-[#0f172a] mb-2.5">
                  Model Portfolio Presets
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    Object.entries(ALLOCATION_PRESETS) as Array<
                      [
                        'core_growth' | 'all_weather' | 'capital_preservation',
                        (typeof ALLOCATION_PRESETS)['core_growth'],
                      ]
                    >
                  ).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveAllocPreset(key);
                        setBucketWeights(preset.weights);
                      }}
                      className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                        activeAllocPreset === key
                          ? 'bg-white border-[#2563eb] ring-1 ring-[#2563eb]/20'
                          : 'bg-white/75 border-[#e2e8f0] hover:border-[#94a3b8]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#0f172a]">{preset.label}</div>
                      <div className="text-[11px] text-[#64748b] mt-0.5 leading-snug">
                        {preset.subtitle}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="alloc-capital-input" className="font-medium text-[#334155]">
                    Total Portfolio Capital
                  </label>
                  <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                    {formatInrCompact(totalCapitalInr)}
                  </span>
                </div>
                <input
                  id="alloc-capital-input"
                  type="range"
                  min={100000}
                  max={50000000}
                  step={100000}
                  value={totalCapitalInr}
                  onChange={(e) => setTotalCapitalInr(Number(e.target.value))}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
              </div>

              <div className="space-y-3.5 pt-2 border-t border-[#e2e8f0]">
                {allocationPlan.normalizedBuckets.map((bucket) => (
                  <div key={bucket.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="inline-flex items-center gap-2 font-medium text-[#1e293b]">
                        <span
                          className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                          style={{ backgroundColor: bucket.colorHex }}
                        />
                        {bucket.label}
                      </span>
                      <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                        {bucket.normalizedWeightPct.toFixed(1)}% · {formatInrCompact(bucket.amountInr)}
                      </span>
                    </div>
                    <input
                      aria-label={`${bucket.label} allocation weight`}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={bucketWeights[bucket.id]}
                      onChange={(e) => {
                        setActiveAllocPreset('custom');
                        setBucketWeights((prev) => ({
                          ...prev,
                          [bucket.id]: Number(e.target.value),
                        }));
                      }}
                      className="w-full cursor-pointer"
                      style={{ accentColor: bucket.colorHex }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right 6 Columns: Risk-Adjusted Summary & Normalized Allocation Bar */}
            <div className="lg:col-span-6 rounded-[12px] bg-[#070d1c] text-white border border-white/[0.1] p-6 flex flex-col justify-between gap-5">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#38bdf8]">
                      5-Year Projected Portfolio Value
                    </div>
                    <div
                      data-testid="allocation-projected-5y"
                      className="font-display font-bold text-3xl text-white tabular-nums mt-1"
                    >
                      {formatInrCompact(allocationPlan.projected5YCorpusInr)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-[#94a3b8]">Est. Sharpe Ratio</div>
                    <div className="font-mono font-bold text-2xl text-[#34d399] tabular-nums">
                      {allocationPlan.estimatedSharpe.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Normalized Stacked Bar */}
                <div className="mt-5">
                  <div className="text-xs text-[#cbd5e1] mb-2">Normalized Capital Split (100%)</div>
                  <div className="h-4 w-full rounded-[6px] overflow-hidden flex bg-white/[0.06]">
                    {allocationPlan.normalizedBuckets.map((b) => (
                      <div
                        key={b.id}
                        style={{
                          width: `${b.normalizedWeightPct}%`,
                          backgroundColor: b.colorHex,
                        }}
                        title={`${b.label}: ${b.normalizedWeightPct}%`}
                      />
                    ))}
                  </div>
                </div>

                {/* Blended Risk / Return Metrics */}
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="rounded-[9px] bg-white/[0.04] border border-white/[0.08] p-3.5">
                    <div className="text-[11px] text-[#94a3b8]">Blended Expected Return</div>
                    <div className="font-mono font-semibold text-xl text-[#34d399] tabular-nums mt-1">
                      {allocationPlan.weightedReturnPct.toFixed(2)}% p.a.
                    </div>
                  </div>
                  <div className="rounded-[9px] bg-white/[0.04] border border-white/[0.08] p-3.5">
                    <div className="text-[11px] text-[#94a3b8]">Diversified Volatility (σ)</div>
                    <div className="font-mono font-semibold text-xl text-[#fbbf24] tabular-nums mt-1">
                      {allocationPlan.weightedVolatilityPct.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Bucket Breakdown Table */}
                <div className="mt-5 rounded-[9px] bg-[#040711] border border-white/[0.08] divide-y divide-white/[0.06]">
                  {allocationPlan.normalizedBuckets.map((b) => (
                    <div
                      key={b.id}
                      className="px-3.5 py-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: b.colorHex }}
                        />
                        <span className="text-[#e2e8f0] truncate">{b.label}</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono tabular-nums shrink-0">
                        <span className="text-[#94a3b8]">{b.expectedReturnPct.toFixed(1)}% est.</span>
                        <span className="text-white font-semibold w-24 text-right">
                          {formatInrCompact(b.amountInr)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[11px] font-mono text-[#94a3b8] pt-3 border-t border-white/[0.08]">
                Risk-free benchmark: 6.50% India 10Y G-Sec · Cross-asset correlation adjusted for bullion hedge
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
