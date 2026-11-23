import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Scale,
  Search,
  ShieldAlert,
  Sunrise,
  Terminal,
  Users,
} from 'lucide-react';
import {
  computeRangeMarkerPct,
  computeTechnicalGauge,
  filterAndSortScreenerFunds,
  mergeLiveAmfiIntoScreenerFund,
  SCREENER_FUNDS,
  ScreenerFundRecord,
  ScreenerInstrumentType,
} from '../utils/screenerEngine';
import {
  evaluateRiskAdjustedRatios,
  getFundIntelligence,
} from '../utils/fundIntelligenceEngine';
import {
  buildScreenerRiskTableCsv,
  computeInstrumentRiskProfile,
  computeUniverseRiskSummary,
  filterByRiskTier,
  InstrumentRiskProfile,
  RiskTierFilter,
  ScreenerRiskSortKey,
  SortDirection,
  sortScreenerFundsWithRisk,
  VarMetricBasis,
} from '../utils/riskAnalyticsEngine';
import {
  ExposureDonutChart,
  OptionsExpirationBarChart,
  SeasonalsOverlayChart,
  TechnicalsGauge,
} from './FundDossierCharts';
import { FundDeepAnalyticsPanels } from './FundDeepAnalyticsPanels';
import { FundComparisonMatrix } from './FundComparisonMatrix';
import { CompareFundsModal } from './CompareFundsModal';
import { ScreenerInteractiveTerminal } from './ScreenerInteractiveTerminal';
import { TerminalTabId } from './LiveStockTerminal';

interface MutualFundEtfScreenerSectionProps {
  externalSelectedSymbol?: string;
  onJumpToAnalysis?: (
    ticker: string,
    peers?: string[],
    initialTab?: TerminalTabId
  ) => void;
  onJumpToCommunity?: () => void;
}

export const MutualFundEtfScreenerSection: React.FC<MutualFundEtfScreenerSectionProps> = ({
  externalSelectedSymbol,
  onJumpToAnalysis,
  onJumpToCommunity,
}) => {
  const [funds, setFunds] = useState<ScreenerFundRecord[]>(SCREENER_FUNDS);
  const [selectedId, setSelectedId] = useState<string>('QQQ');

  // Screener Filters
  const [query, setQuery] = useState<string>('');
  const [instrumentType, setInstrumentType] = useState<'ALL' | ScreenerInstrumentType>('ALL');
  const [category, setCategory] = useState<string>('All');
  const [riskTierFilter, setRiskTierFilter] = useState<RiskTierFilter>('ALL');
  const [varBasis, setVarBasis] = useState<VarMetricBasis>('var95');
  const [sortBy, setSortBy] = useState<ScreenerRiskSortKey>('aum');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Dossier interactive sub-states
  const [viewMode, setViewMode] = useState<'dossier' | 'compare' | 'terminal'>('dossier');
  const [compareIds, setCompareIds] = useState<string[]>(['QQQ', 'QUANTSC', 'BANKBEES']);
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);
  const [returnsMode, setReturnsMode] = useState<'price' | 'total'>('price');
  const [showMoreStats, setShowMoreStats] = useState<boolean>(false);
  const [showMoreEvents, setShowMoreEvents] = useState<boolean>(false);
  const [showFullDescription, setShowFullDescription] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!externalSelectedSymbol) return;
    const up = externalSelectedSymbol.trim().toUpperCase();
    const match = funds.find((f) => f.symbol.toUpperCase() === up || f.id.toUpperCase() === up);
    if (match) {
      setSelectedId(match.id);
    }
  }, [externalSelectedSymbol, funds]);

  const handleToggleCompare = (symbol: string) => {
    setCompareIds((prev) => {
      if (prev.includes(symbol)) {
        return prev.length > 2 ? prev.filter((id) => id !== symbol) : prev;
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), symbol];
      }
      return [...prev, symbol];
    });
  };

  const handleSelectSortPreset = (nextKey: ScreenerRiskSortKey) => {
    setSortBy(nextKey);
    if (nextKey === 'var95' || nextKey === 'var99' || nextKey === 'cvar95') {
      setVarBasis(nextKey);
    }
    if (
      nextKey === 'expense' ||
      nextKey === 'var95' ||
      nextKey === 'var99' ||
      nextKey === 'cvar95' ||
      nextKey === 'maxDrawdown'
    ) {
      setSortDir('asc');
    } else {
      setSortDir('desc');
    }
  };

  const handleSelectVarBasis = (nextBasis: VarMetricBasis) => {
    setVarBasis(nextBasis);
    if (sortBy === 'var95' || sortBy === 'var99' || sortBy === 'cvar95') {
      setSortBy(nextBasis);
    }
  };

  const handleColumnSort = (col: ScreenerRiskSortKey) => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      handleSelectSortPreset(col);
    }
  };

  const categories = useMemo(() => {
    const set = new Set(funds.map((f) => f.category));
    return ['All', ...Array.from(set)];
  }, [funds]);

  const riskBySymbol = useMemo(() => {
    const map: Record<string, InstrumentRiskProfile> = {};
    for (const f of funds) {
      map[f.symbol] = computeInstrumentRiskProfile(f);
    }
    return map;
  }, [funds]);

  const filteredFunds = useMemo(() => {
    const baseFiltered = filterAndSortScreenerFunds(funds, {
      query,
      instrumentType,
      category,
      sortBy: 'aum',
    });
    const tierFiltered = filterByRiskTier(baseFiltered, riskTierFilter, riskBySymbol);
    return sortScreenerFundsWithRisk(tierFiltered, sortBy, sortDir, riskBySymbol);
  }, [funds, query, instrumentType, category, riskTierFilter, sortBy, sortDir, riskBySymbol]);

  const universeRiskSummary = useMemo(
    () => computeUniverseRiskSummary(filteredFunds, riskBySymbol),
    [filteredFunds, riskBySymbol]
  );

  const handleExportRiskCsv = () => {
    const csv = buildScreenerRiskTableCsv(filteredFunds, riskBySymbol);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financia-screener-risk-${varBasis}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeFund = useMemo(() => {
    return funds.find((f) => f.id === selectedId) || filteredFunds[0] || funds[0];
  }, [funds, selectedId, filteredFunds]);

  const activeFundRisk = useMemo(
    () => riskBySymbol[activeFund.symbol] || computeInstrumentRiskProfile(activeFund),
    [riskBySymbol, activeFund]
  );

  // Hydrate live AMFI NAV & returns whenever an Indian Mutual Fund with amfiCode is selected
  useEffect(() => {
    if (!activeFund.amfiCode) return;
    let cancelled = false;
    fetch(`/api/mfnav/fund/${encodeURIComponent(activeFund.amfiCode)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled || !payload) return;
        setFunds((prev) =>
          prev.map((item) =>
            item.id === activeFund.id ? mergeLiveAmfiIntoScreenerFund(item, payload) : item
          )
        );
      })
      .catch(() => {
        // Keep seeded data cleanly
      });
    return () => {
      cancelled = true;
    };
  }, [activeFund.id, activeFund.amfiCode]);

  const handleCopyIdentifier = (label: string, value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopiedKey(label);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === label ? null : prev));
    }, 1500);
  };

  const currencyPrefix = activeFund.currency === 'INR' ? '₹' : '';
  const currencyCode = activeFund.currency;
  const volRatioPct = Math.min(
    100,
    Math.max(
      14,
      Math.round(
        (activeFund.volumeNumeric /
          Math.max(1, activeFund.volumeNumeric + activeFund.avgVolume30dNumeric)) *
          100
      )
    )
  );
  const dayMarkerPct = computeRangeMarkerPct(activeFund.price, activeFund.dayLow, activeFund.dayHigh);
  const week52MarkerPct = computeRangeMarkerPct(
    activeFund.price,
    activeFund.week52Low,
    activeFund.week52High
  );

  const activeReturns = returnsMode === 'price' ? activeFund.returnsPrice : activeFund.returnsTotal;
  const returnPeriods: Array<'1M' | '3M' | 'YTD' | '1Y' | '3Y' | '5Y'> = [
    '1M',
    '3M',
    'YTD',
    '1Y',
    '3Y',
    '5Y',
  ];

  return (
    <section
      id="mf-etf-screener"
      data-testid="mf-etf-screener-section"
      aria-label="Mutual Fund and ETF Screener"
      className="w-full bg-[#f8fafc] text-[#0f172a] py-14 border-b border-[#e2e8f0] scroll-mt-20"
    >
      <div className="max-w-[1320px] mx-auto px-4 md:px-6">
        {/* Clean Institutional Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 mb-6 border-b border-[#e2e8f0]">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold mb-1.5">
              Screener &amp; Fund Dossier
            </div>
            <h2
              className="font-display font-semibold text-[#0f172a] tracking-tight"
              style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.15rem)' }}
            >
              Mutual Fund &amp; ETF Screener
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Screen mutual funds and ETFs with consistent stats, manager profiles, bull/bear sector heatmaps, and side-by-side comparisons across every instrument.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
            <button
              type="button"
              data-testid="open-compare-funds-modal"
              onClick={() => setCompareModalOpen(true)}
              className="h-[38px] px-3.5 rounded-[10px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Scale className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Compare Funds ({Math.min(3, compareIds.length)}/3)</span>
            </button>

            {/* Primary Workspace Mode Switch: Dossier vs Full Overlap Matrix */}
            <div
              role="tablist"
              aria-label="Screener view mode"
              className="inline-flex items-center p-1 rounded-[10px] bg-white border border-[#cbd5e1]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'dossier'}
                data-testid="screener-mode-dossier"
                onClick={() => setViewMode('dossier')}
                className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'dossier'
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                Screener &amp; Dossier
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'compare'}
                data-testid="screener-mode-compare"
                onClick={() => setViewMode('compare')}
                className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'compare'
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                Overlap Matrix ({compareIds.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'terminal'}
                data-testid="screener-mode-terminal"
                onClick={() => setViewMode('terminal')}
                className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'terminal'
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Analyze with Terminal</span>
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'compare' ? (
          <FundComparisonMatrix
            allFunds={funds}
            compareIds={compareIds}
            onSetCompareIds={setCompareIds}
            onInspectFund={(sym) => {
              setSelectedId(sym);
              setViewMode('dossier');
            }}
          />
        ) : viewMode === 'terminal' ? (
          <ScreenerInteractiveTerminal
            allFunds={funds}
            selectedSymbols={compareIds}
            primarySymbol={activeFund.symbol}
            onChangeSelectedSymbols={setCompareIds}
            onSelectPrimarySymbol={(sym) => {
              const found = funds.find((f) => f.symbol === sym);
              if (found) setSelectedId(found.id);
            }}
            onInspectDossier={(sym) => {
              const found = funds.find((f) => f.symbol === sym);
              if (found) setSelectedId(found.id);
              setViewMode('dossier');
            }}
            onSyncToFullTerminal={
              onJumpToAnalysis
                ? (primary, peers) => onJumpToAnalysis(primary, peers, 'compare')
                : undefined
            }
          />
        ) : (
          <>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <div
              role="tablist"
              aria-label="Filter screener universe"
              className="inline-flex items-center p-0.5 rounded-[8px] bg-white border border-[#cbd5e1] shrink-0"
            >
              {(
                [
                  { id: 'ALL', label: `All (${funds.length})` },
                  {
                    id: 'ETF',
                    label: `ETFs (${funds.filter((f) => f.instrumentType === 'ETF').length})`,
                  },
                  {
                    id: 'Mutual Fund',
                    label: `MFs (${funds.filter((f) => f.instrumentType === 'Mutual Fund').length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={instrumentType === tab.id}
                  data-testid={`screener-type-${tab.id.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setInstrumentType(tab.id)}
                  className={`px-2.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    instrumentType === tab.id
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs min-w-[190px]">
              <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
              <label htmlFor="screener-search-input" className="sr-only">
                Search mutual funds and ETFs by symbol, name, ISIN, or AMFI code
              </label>
              <input
                id="screener-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search symbol, name, ISIN, AMFI code..."
                className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-white border border-[#cbd5e1] text-xs text-[#0f172a] placeholder:text-[#64748b] focus:outline-none focus:border-[#2563eb]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`h-8 px-2.5 rounded-[7px] text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                    category === cat
                      ? 'bg-[#0f172a] text-white border-[#0f172a]'
                      : 'bg-white text-[#475569] border-[#cbd5e1] hover:border-[#94a3b8] hover:text-[#0f172a]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="screener-sort-select" className="text-xs text-[#64748b]">
              Sort by
            </label>
            <select
              id="screener-sort-select"
              data-testid="screener-sort-select"
              value={sortBy}
              onChange={(e) => handleSelectSortPreset(e.target.value as ScreenerRiskSortKey)}
              className="h-9 px-2.5 rounded-[8px] bg-white border border-[#cbd5e1] text-xs font-medium text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer"
            >
              <option value="aum">AUM (High → Low)</option>
              <option value="return1y">1Y Return (High → Low)</option>
              <option value="return3y">3Y Return (High → Low)</option>
              <option value="var95">VaR 95% (Safest → Riskiest)</option>
              <option value="var99">VaR 99% Tail (Safest → Riskiest)</option>
              <option value="cvar95">CVaR 95% Shortfall (Safest → Riskiest)</option>
              <option value="maxDrawdown">Max Drawdown (Shallowest → Deepest)</option>
              <option value="expense">Expense Ratio (Low → High)</option>
              <option value="change">Day Change %</option>
            </select>
            <button
              type="button"
              data-testid="screener-sort-dir-toggle"
              onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              aria-label={`Toggle sort direction (currently ${sortDir === 'asc' ? 'ascending' : 'descending'})`}
              title={sortDir === 'asc' ? 'Ascending order — click to reverse' : 'Descending order — click to reverse'}
              className="h-9 px-2.5 rounded-[8px] bg-white border border-[#cbd5e1] hover:border-[#2563eb] text-xs font-mono font-semibold text-[#334155] inline-flex items-center gap-1 cursor-pointer"
            >
              {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#2563eb]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#2563eb]" />}
              <span>{sortDir === 'asc' ? 'ASC' : 'DESC'}</span>
            </button>
          </div>
        </div>

        {/* Main Split Layout: Left High-Density Risk-Enabled Screener Table (6 cols) + Right 9-Panel Deep Dossier (6 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT 6 COLUMNS: STICKY HIGH-DENSITY SCREENER LIST WITH SORTABLE VaR & MAX DRAWDOWN */}
          <div className="xl:col-span-6 xl:sticky xl:top-20 xl:self-start rounded-[12px] bg-white border border-[#e2e8f0] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span className="text-xs font-semibold text-[#0f172a]">
                    Matching Instruments ({filteredFunds.length})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* VaR Basis Switcher: 1M 95% VaR vs 99% Tail VaR vs 95% CVaR Expected Shortfall */}
                  <div
                    role="tablist"
                    aria-label="Select Value-at-Risk basis"
                    className="inline-flex items-center p-0.5 rounded-[7px] bg-white border border-[#cbd5e1]"
                  >
                    {(
                      [
                        { id: 'var95', label: 'VaR 95%' },
                        { id: 'var99', label: 'VaR 99%' },
                        { id: 'cvar95', label: 'CVaR 95%' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="tab"
                        aria-selected={varBasis === opt.id}
                        data-testid={`screener-var-basis-${opt.id}`}
                        onClick={() => handleSelectVarBasis(opt.id)}
                        className={`px-2 py-0.5 rounded-[5px] text-[10.5px] font-mono font-semibold transition-colors cursor-pointer ${
                          varBasis === opt.id
                            ? 'bg-[#0f172a] text-white'
                            : 'text-[#475569] hover:text-[#0f172a]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    data-testid="screener-export-risk-csv"
                    onClick={handleExportRiskCsv}
                    title="Export filtered screener with VaR, CVaR & Max Drawdown to CSV"
                    className="h-6 px-2 rounded-[6px] border border-[#cbd5e1] bg-white hover:border-[#2563eb] hover:text-[#2563eb] text-[10.5px] font-mono font-semibold text-[#334155] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Tail Risk Tier Quick Filters + Institutional Universe Summary Telemetry */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#e2e8f0]/80">
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by tail risk tier">
                  {(
                    [
                      { id: 'ALL', label: 'All Risk' },
                      { id: 'Low Tail Risk', label: 'Low Tail' },
                      { id: 'Moderate', label: 'Moderate' },
                      { id: 'Elevated+', label: 'Elevated+' },
                    ] as const
                  ).map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      data-testid={`screener-risk-tier-${tier.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      onClick={() => setRiskTierFilter(tier.id)}
                      className={`px-2 py-0.5 rounded-[5px] text-[10.5px] font-medium border transition-colors cursor-pointer ${
                        riskTierFilter === tier.id
                          ? 'bg-[#2563eb] text-white border-[#2563eb]'
                          : 'bg-white text-[#475569] border-[#cbd5e1] hover:border-[#94a3b8] hover:text-[#0f172a]'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>

                {universeRiskSummary.count > 0 && (
                  <div
                    data-testid="screener-universe-risk-summary"
                    className="flex flex-wrap items-center gap-2.5 text-[10.5px] font-mono text-[#475569] tabular-nums"
                  >
                    <span>
                      Med VaR:{' '}
                      <strong className="text-[#0f172a]">
                        {universeRiskSummary.medianVar95MonthlyPct.toFixed(2)}%
                      </strong>
                    </span>
                    <span>
                      Med DD:{' '}
                      <strong className="text-[#0f172a]">
                        {universeRiskSummary.medianMaxDrawdown3YPct.toFixed(1)}%
                      </strong>
                    </span>
                    {universeRiskSummary.safestVarFund && (
                      <span className="hidden sm:inline">
                        Safest:{' '}
                        <strong className="text-[#047857]">
                          {universeRiskSummary.safestVarFund.symbol}{' '}
                          {universeRiskSummary.safestVarFund.var95MonthlyPct.toFixed(2)}%
                        </strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {filteredFunds.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748b]">
                No mutual funds or ETFs match the active filters.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCategory('All');
                    setInstrumentType('ALL');
                    setRiskTierFilter('ALL');
                  }}
                  className="text-[#2563eb] underline font-medium cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto xl:max-h-[calc(100vh-175px)] xl:overflow-y-auto">
                <table
                  data-testid="screener-table"
                  className="w-full text-left border-collapse"
                >
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[10.5px] font-mono uppercase tracking-wider text-[#64748b] bg-white sticky top-0 z-10">
                      <th className="py-2.5 pl-4 pr-2 font-semibold">Fund / ETF</th>
                      <th
                        className="py-2.5 px-2 font-semibold text-right"
                        aria-sort={
                          sortBy === 'price'
                            ? sortDir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <button
                          type="button"
                          data-testid="screener-sort-price"
                          onClick={() => handleColumnSort('price')}
                          className={`inline-flex items-center gap-0.5 uppercase hover:text-[#0f172a] cursor-pointer ${
                            sortBy === 'price' ? 'text-[#2563eb] font-bold' : ''
                          }`}
                        >
                          <span>NAV</span>
                          {sortBy === 'price' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                          )}
                        </button>
                      </th>
                      <th
                        className="py-2.5 px-2 font-semibold text-right"
                        aria-sort={
                          sortBy === 'return1y'
                            ? sortDir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <button
                          type="button"
                          data-testid="screener-sort-return1y"
                          onClick={() => handleColumnSort('return1y')}
                          className={`inline-flex items-center gap-0.5 uppercase hover:text-[#0f172a] cursor-pointer ${
                            sortBy === 'return1y' ? 'text-[#2563eb] font-bold' : ''
                          }`}
                        >
                          <span>1Y</span>
                          {sortBy === 'return1y' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                          )}
                        </button>
                      </th>
                      <th
                        className="py-2.5 px-2 font-semibold text-right"
                        aria-sort={
                          sortBy === varBasis
                            ? sortDir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <button
                          type="button"
                          data-testid="screener-sort-var95"
                          onClick={() => handleColumnSort(varBasis)}
                          title={
                            varBasis === 'var95'
                              ? 'Sort by 1-Month 95% Value-at-Risk (VaR)'
                              : varBasis === 'var99'
                              ? 'Sort by 1-Month 99% Tail Value-at-Risk (VaR)'
                              : 'Sort by 1-Month 95% Conditional VaR (Expected Shortfall)'
                          }
                          className={`inline-flex items-center gap-0.5 uppercase hover:text-[#0f172a] cursor-pointer whitespace-nowrap ${
                            sortBy === varBasis ? 'text-[#2563eb] font-bold' : ''
                          }`}
                        >
                          <span>
                            {varBasis === 'var95'
                              ? 'VaR 95%'
                              : varBasis === 'var99'
                              ? 'VaR 99%'
                              : 'CVaR 95%'}
                          </span>
                          {sortBy === varBasis ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                          )}
                        </button>
                      </th>
                      <th
                        className="py-2.5 px-2 font-semibold text-right"
                        aria-sort={
                          sortBy === 'maxDrawdown'
                            ? sortDir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <button
                          type="button"
                          data-testid="screener-sort-maxdd"
                          onClick={() => handleColumnSort('maxDrawdown')}
                          title="Sort by 3-Year Maximum Drawdown (Peak-to-Trough)"
                          className={`inline-flex items-center gap-0.5 uppercase hover:text-[#0f172a] cursor-pointer whitespace-nowrap ${
                            sortBy === 'maxDrawdown' ? 'text-[#2563eb] font-bold' : ''
                          }`}
                        >
                          <span>Max DD</span>
                          {sortBy === 'maxDrawdown' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 pl-2 pr-4 font-semibold text-right">Signal</th>
                    </tr>
                  </thead>
                  <tbody data-testid="screener-table-body" className="divide-y divide-[#f1f5f9]">
                    {filteredFunds.map((item) => {
                      const selected = item.id === activeFund.id;
                      const tech = computeTechnicalGauge(item.technicals.score);
                      const r1y = item.returnsTotal['1Y'];
                      const posDay = item.changePct >= 0;
                      const inCompare = compareIds.includes(item.symbol);
                      const rowIntel = getFundIntelligence(item);
                      const rowRisk = riskBySymbol[item.symbol] || computeInstrumentRiskProfile(item, rowIntel);

                      const activeVarVal =
                        varBasis === 'var95'
                          ? rowRisk.var95MonthlyPct
                          : varBasis === 'var99'
                          ? rowRisk.var99MonthlyPct
                          : rowRisk.cvar95MonthlyPct;
                      const absVar = Math.abs(activeVarVal);
                      const varColor =
                        absVar < 2.8
                          ? 'text-[#047857]'
                          : absVar < 8.0
                          ? 'text-[#b45309]'
                          : 'text-[#dc2626]';
                      const varBarColor =
                        absVar < 2.8
                          ? '#059669'
                          : absVar < 8.0
                          ? '#d97706'
                          : '#dc2626';
                      const varBarPct = Math.min(100, Math.max(6, (absVar / 16) * 100));

                      const absDd = Math.abs(rowRisk.maxDrawdown3YPct);
                      const ddColor =
                        absDd < 6
                          ? 'text-[#047857]'
                          : absDd < 18
                          ? 'text-[#b45309]'
                          : 'text-[#dc2626]';
                      const ddBarColor =
                        absDd < 6
                          ? '#059669'
                          : absDd < 18
                          ? '#d97706'
                          : '#dc2626';
                      const ddBarPct = Math.min(100, Math.max(5, (absDd / 32) * 100));

                      return (
                        <tr
                          key={item.id}
                          data-testid={`screener-row-${item.symbol}`}
                          onClick={() => {
                            setSelectedId(item.id);
                            setShowMoreEvents(false);
                            setShowMoreStats(false);
                            setShowFullDescription(false);
                          }}
                          className={`cursor-pointer transition-colors ${
                            selected ? 'bg-[#eff6ff]' : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <td className="py-3 pl-4 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-[#0f172a]">
                                {item.symbol}
                              </span>
                              <span className="text-[10.5px] font-mono text-[#64748b]">
                                · {item.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleCompare(item.symbol);
                                }}
                                aria-label={
                                  inCompare
                                    ? `Remove ${item.symbol} from compare basket`
                                    : `Add ${item.symbol} to compare basket`
                                }
                                className={`ml-auto px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold border transition-colors cursor-pointer ${
                                  inCompare
                                    ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                    : 'bg-white text-[#475569] border-[#cbd5e1] hover:border-[#2563eb] hover:text-[#2563eb]'
                                }`}
                              >
                                {inCompare ? 'Compared ✓' : '+ Compare'}
                              </button>
                            </div>
                            <div className="text-xs text-[#475569] truncate max-w-[185px] mt-0.5">
                              {item.name}
                            </div>
                            <div className="text-[10.5px] font-mono text-[#64748b] mt-0.5 tabular-nums">
                              TER {item.about.expenseRatioPct.toFixed(2)}% · AUM{' '}
                              {item.keyStats.aumLabel}
                            </div>
                            <div
                              data-testid={`screener-ratios-${item.symbol}`}
                              className="text-[10px] font-mono text-[#334155] mt-0.5 tabular-nums"
                            >
                              Sharpe {item.keyStats.sharpe3Y.toFixed(2)} · Sortino{' '}
                              {rowIntel.ratios.sortino3Y.toFixed(2)} · Treynor{' '}
                              {rowIntel.ratios.treynorRatio.toFixed(1)}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                            <div className="text-xs font-semibold text-[#0f172a]">
                              {item.currency === 'INR' ? '₹' : '$'}
                              {item.price.toFixed(2)}
                            </div>
                            <div
                              className={`text-[10.5px] font-medium ${
                                posDay ? 'text-[#059669]' : 'text-[#dc2626]'
                              }`}
                            >
                              {posDay ? '+' : ''}
                              {item.changePct.toFixed(2)}%
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
                            <span
                              className={
                                (r1y ?? 0) >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                              }
                            >
                              {r1y !== null ? `${r1y >= 0 ? '+' : ''}${r1y.toFixed(1)}%` : '—'}
                            </span>
                          </td>
                          <td
                            data-testid={`screener-var-${item.symbol}`}
                            title={`1M 95% VaR: ${rowRisk.var95MonthlyPct.toFixed(2)}% | 1M 99% VaR: ${rowRisk.var99MonthlyPct.toFixed(2)}% | 95% CVaR: ${rowRisk.cvar95MonthlyPct.toFixed(2)}% | Annual 95% VaR: ${rowRisk.var95AnnualPct.toFixed(1)}% | Tier: ${rowRisk.riskTier}`}
                            className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap"
                          >
                            <div className={`text-xs font-semibold ${varColor}`}>
                              {activeVarVal.toFixed(2)}%
                            </div>
                            <div className="text-[9.5px] text-[#64748b]">
                              {varBasis === 'var95'
                                ? `CVaR ${rowRisk.cvar95MonthlyPct.toFixed(1)}%`
                                : `Ann ${rowRisk.var95AnnualPct.toFixed(0)}%`}
                            </div>
                            <div className="mt-1 ml-auto w-14 h-1 rounded-full bg-[#e2e8f0] overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${varBarPct}%`, backgroundColor: varBarColor }}
                              />
                            </div>
                          </td>
                          <td
                            data-testid={`screener-maxdd-${item.symbol}`}
                            title={`3Y Max Drawdown: ${rowRisk.maxDrawdown3YPct.toFixed(1)}% | Calmar Ratio: ${rowRisk.calmarRatio.toFixed(2)} | 3Y Vol: ${rowRisk.volatility3YPct.toFixed(1)}% | Worst Month: ${rowRisk.worstObservedMonthPct.toFixed(2)}%`}
                            className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap"
                          >
                            <div className={`text-xs font-semibold ${ddColor}`}>
                              {rowRisk.maxDrawdown3YPct.toFixed(1)}%
                            </div>
                            <div className="text-[9.5px] text-[#64748b]">
                              Calmar {rowRisk.calmarRatio.toFixed(1)}
                            </div>
                            <div className="mt-1 ml-auto w-14 h-1 rounded-full bg-[#e2e8f0] overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${ddBarPct}%`, backgroundColor: ddBarColor }}
                              />
                            </div>
                          </td>
                          <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                            <span
                              className="text-[11px] font-semibold"
                              style={{ color: tech.colorHex }}
                            >
                              {tech.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT 6 COLUMNS: COMPLETE 9-MODULE PER-FUND / PER-ETF DOSSIER */}
          <div
            data-testid="screener-fund-dossier"
            className="xl:col-span-6 rounded-[12px] bg-white border border-[#e2e8f0] divide-y divide-[#e2e8f0]"
          >
            {/* MODULE 1: HEADER, LIVE PRICE, PRE-MARKET / iNAV, BID/ASK, VOLUME & DAY/52WK RANGES (Reference 1) */}
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      data-testid="dossier-fund-title"
                      className="text-base font-display font-semibold text-[#0f172a] inline-flex items-center gap-1.5"
                    >
                      <span>{activeFund.name}</span>
                      <a
                        href={activeFund.about.homePageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${activeFund.name} issuer page`}
                        className="text-[#64748b] hover:text-[#2563eb]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </h3>
                    <span className="text-xs font-mono text-[#64748b]">· {activeFund.exchange}</span>
                  </div>
                  <div className="text-xs text-[#64748b] mt-0.5">
                    {activeFund.category} · {activeFund.subCategory}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid="dossier-analyze-terminal-btn"
                    onClick={() => {
                      if (!compareIds.includes(activeFund.symbol)) {
                        setCompareIds((prev) => [activeFund.symbol, ...prev.slice(0, 3)]);
                      }
                      setViewMode('terminal');
                    }}
                    className="h-8 px-3 rounded-[7px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Analyze with Terminal</span>
                  </button>
                  {onJumpToAnalysis && (
                    <button
                      type="button"
                      data-testid="dossier-open-dedicated-terminal"
                      onClick={() =>
                        onJumpToAnalysis(
                          activeFund.symbol,
                          compareIds.filter((s) => s !== activeFund.symbol).slice(0, 3),
                          'compare'
                        )
                      }
                      className="h-8 px-2.5 rounded-[7px] border border-[#cbd5e1] bg-white hover:border-[#2563eb] hover:text-[#2563eb] text-[#334155] text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <span>Full Terminal</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Primary Spot / NAV Quote */}
              <div className="mt-4">
                <div className="flex flex-wrap items-baseline gap-2.5 font-mono tabular-nums">
                  <span className="font-display font-bold text-3xl text-[#0f172a] tracking-tight">
                    {currencyPrefix}
                    {activeFund.price.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold text-[#475569]">{currencyCode}</span>
                  <span
                    className={`text-sm font-semibold ${
                      activeFund.changePct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                    }`}
                  >
                    {activeFund.change >= 0 ? '+' : ''}
                    {activeFund.change.toFixed(2)} {activeFund.changePct >= 0 ? '+' : ''}
                    {activeFund.changePct.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[11.5px] text-[#64748b] mt-0.5">{activeFund.lastUpdateLabel}</div>
              </div>

              {/* Pre-market / Indicative iNAV Quote */}
              <div className="mt-3">
                <div className="flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
                  <span className="font-display font-bold text-xl text-[#0f172a]">
                    {currencyPrefix}
                    {activeFund.extendedPrice.toFixed(2)}
                  </span>
                  <span className="text-[11px] font-semibold text-[#475569]">{currencyCode}</span>
                  <span
                    className={`text-xs font-semibold ${
                      activeFund.extendedChangePct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                    }`}
                  >
                    {activeFund.extendedChange >= 0 ? '+' : ''}
                    {activeFund.extendedChange.toFixed(2)}{' '}
                    {activeFund.extendedChangePct >= 0 ? '+' : ''}
                    {activeFund.extendedChangePct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] mt-0.5">
                  <span className="inline-flex items-center gap-1 font-medium text-[#d97706]">
                    <Sunrise className="w-3.5 h-3.5" />
                    {activeFund.extendedLabel}
                  </span>
                  <span className="text-[#64748b]">{activeFund.extendedUpdateLabel}</span>
                </div>
              </div>

              {/* Bid / Ask Depth Chips (or Direct Plan TER / Min SIP for MFs) */}
              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
                <span className="px-2.5 py-1 rounded-[7px] bg-[#dbeafe] text-[#1d4ed8] font-semibold">
                  {activeFund.bidLabel}
                </span>
                <span className="px-2.5 py-1 rounded-[7px] bg-[#fee2e2] text-[#b91c1c] font-semibold">
                  {activeFund.askLabel}
                </span>
              </div>

              {/* Volume vs Avg Volume (30D) Proportional Bar */}
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-end justify-between text-xs mb-1.5">
                    <div>
                      <div className="text-[11px] text-[#64748b]">
                        {activeFund.instrumentType === 'Mutual Fund'
                          ? '30D Net Flow / Activity'
                          : 'Volume'}
                      </div>
                      <div className="font-mono font-semibold text-[#0f172a] tabular-nums">
                        {activeFund.volumeLabel}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-[#64748b]">Avg. volume (30D)</div>
                      <div className="font-mono font-semibold text-[#0f172a] tabular-nums">
                        {activeFund.avgVolume30dLabel}
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden flex gap-0.5 bg-[#e2e8f0]">
                    <div
                      className="h-full bg-[#2563eb] rounded-l-full"
                      style={{ width: `${volRatioPct}%` }}
                    />
                    <div
                      className="h-full bg-[#06b6d4] rounded-r-full"
                      style={{ width: `${100 - volRatioPct}%` }}
                    />
                  </div>
                </div>

                {/* Day's Range Bar with Pointer Triangle */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono tabular-nums">
                    <span className="font-medium text-[#0f172a]">{activeFund.dayLow.toFixed(2)}</span>
                    <span className="font-sans text-[11px] text-[#64748b]">Day&apos;s range</span>
                    <span className="font-medium text-[#0f172a]">{activeFund.dayHigh.toFixed(2)}</span>
                  </div>
                  <div className="relative pt-0.5 pb-2">
                    <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(6, dayMarkerPct)}%`,
                          backgroundColor: activeFund.changePct >= 0 ? '#059669' : '#f43f5e',
                        }}
                      />
                    </div>
                    <div
                      className="absolute top-2.5 -translate-x-1/2 text-[9px] text-[#0f172a] leading-none"
                      style={{ left: `${dayMarkerPct}%` }}
                      aria-hidden="true"
                    >
                      ▲
                    </div>
                  </div>
                </div>

                {/* 52wk Range Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono tabular-nums">
                    <span className="font-medium text-[#0f172a]">
                      {activeFund.week52Low.toFixed(2)}
                    </span>
                    <span className="font-sans text-[11px] text-[#64748b]">52wk range</span>
                    <span className="font-medium text-[#0f172a]">
                      {activeFund.week52High.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative pt-0.5 pb-2">
                    <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(6, week52MarkerPct)}%`,
                          backgroundColor: activeFund.changePct >= 0 ? '#059669' : '#f43f5e',
                        }}
                      />
                    </div>
                    <div
                      className="absolute top-2.5 -translate-x-1/2 text-[9px] text-[#0f172a] leading-none"
                      style={{ left: `${week52MarkerPct}%` }}
                      aria-hidden="true"
                    >
                      ▲
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MODULE 2: NEWS CALLOUT + KEY STATS (Reference 2) */}
            <div className="p-5 md:p-6 space-y-5">
              {/* Lavender-tinted News Box */}
              <div className="rounded-[10px] bg-[#f3f0ff] border border-[#e9e3ff] p-4">
                <div className="text-xs font-semibold text-[#5b21b6]">
                  News <span className="font-normal text-[#64748b]">· {activeFund.news.age}</span>
                </div>
                <p className="text-sm font-medium text-[#0f172a] mt-1 leading-snug">
                  {activeFund.news.headline}
                </p>
                <button
                  type="button"
                  onClick={() => setShowMoreEvents((prev) => !prev)}
                  className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-[#475569] hover:text-[#0f172a] cursor-pointer"
                >
                  <span>{showMoreEvents ? 'Hide events' : 'More events'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {showMoreEvents && (
                  <div className="mt-3 pt-3 border-t border-[#ddd6fe] space-y-2.5">
                    {activeFund.news.moreEvents.map((ev, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="text-[#0f172a] font-medium">{ev.headline}</div>
                        <div className="text-[11px] text-[#64748b] mt-0.5">
                          {ev.source} · {ev.age}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Key Stats Structured Key-Value Rows */}
              <div>
                <h4 className="text-[15px] font-display font-semibold text-[#0f172a] mb-3">
                  Key stats
                </h4>
                <div className="divide-y divide-[#f1f5f9] text-sm">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-[#334155]">AUM</span>
                    <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                      {activeFund.keyStats.aumLabel}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-[#334155]">
                      {activeFund.instrumentType === 'Mutual Fund' &&
                      activeFund.category === 'Debt & Gilt'
                        ? 'Portfolio YTM / Yield'
                        : 'Dividend yield (indicated)'}
                    </span>
                    <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                      {activeFund.keyStats.dividendYieldPct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-[#334155]">Discount/Premium to NAV</span>
                    <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                      {activeFund.keyStats.discountPremiumPct > 0 ? '+' : ''}
                      {activeFund.keyStats.discountPremiumPct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-[#334155]">Total holdings</span>
                    <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                      {activeFund.keyStats.totalHoldings}
                    </span>
                  </div>

                  {showMoreStats && (
                    <>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#334155]">3Y Sharpe ratio</span>
                        <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                          {activeFund.keyStats.sharpe3Y.toFixed(2)}
                        </span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#334155]">3Y Beta vs Benchmark</span>
                        <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                          {activeFund.keyStats.beta3Y.toFixed(2)}
                        </span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#334155]">Tracking error</span>
                        <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                          {activeFund.keyStats.trackingErrorPct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#334155]">3Y Max drawdown</span>
                        <span className="font-mono font-semibold text-[#dc2626] tabular-nums">
                          {activeFund.keyStats.maxDrawdown3YPct.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>

                  <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowMoreStats((prev) => !prev)}
                    aria-label={showMoreStats ? 'Collapse additional key stats' : 'Expand additional key stats'}
                    className="w-10 h-6 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showMoreStats ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {/* Dedicated Institutional Risk-Adjusted Ratio Validation (Sharpe, Sortino, Treynor) */}
              {(() => {
                const riskSummary = evaluateRiskAdjustedRatios(activeFund);
                const gradeCls = (grade: string) => {
                  if (grade === 'Institutional') return 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]';
                  if (grade === 'Strong') return 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]';
                  if (grade === 'Moderate') return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]';
                  return 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]';
                };
                return (
                  <div
                    data-testid="dossier-risk-ratios"
                    className="pt-4 border-t border-[#f1f5f9]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[15px] font-display font-semibold text-[#0f172a]">
                        Risk-Adjusted Validation Ratios (3Y)
                      </h4>
                      <span className="text-[11px] font-mono text-[#64748b]">
                        Sharpe · Sortino · Treynor
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(
                        [
                          { key: 'sharpe', label: 'Sharpe Ratio', item: riskSummary.sharpe },
                          { key: 'sortino', label: 'Sortino Ratio', item: riskSummary.sortino },
                          { key: 'treynor', label: 'Treynor Ratio', item: riskSummary.treynor },
                        ] as const
                      ).map((entry) => (
                        <div
                          key={entry.key}
                          data-testid={`dossier-ratio-${entry.key}`}
                          className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#334155]">
                              {entry.label}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${gradeCls(
                                entry.item.grade
                              )}`}
                            >
                              {entry.item.grade}
                            </span>
                          </div>
                          <div className="text-xl font-mono font-bold text-[#0f172a] tabular-nums mt-1.5">
                            {entry.item.value.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-[#64748b] mt-1 leading-snug">
                            {entry.item.note}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tail-Risk, Value-at-Risk (VaR) & Drawdown Analytics Strip */}
                    <div
                      data-testid="dossier-tail-risk"
                      className="mt-4 pt-4 border-t border-[#f1f5f9]"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-[14px] font-display font-semibold text-[#0f172a]">
                          Value-at-Risk (VaR) &amp; Drawdown Profile
                        </h4>
                        <span className="text-[11px] font-mono text-[#64748b]">
                          {activeFundRisk.riskTier}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="rounded-[9px] border border-[#fecaca] bg-[#fef2f2]/60 p-3">
                          <div className="text-[10px] font-mono uppercase text-[#991b1b]">
                            1M VaR (95%)
                          </div>
                          <div className="text-base font-mono font-bold text-[#dc2626] tabular-nums mt-0.5">
                            {activeFundRisk.var95MonthlyPct.toFixed(2)}%
                          </div>
                          <div className="text-[10.5px] font-mono text-[#64748b] mt-0.5">
                            -{currencyPrefix || '$'}
                            {activeFundRisk.worstMonthLossOn100k.toLocaleString('en-US')} / 100k
                          </div>
                        </div>

                        <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
                          <div className="text-[10px] font-mono uppercase text-[#64748b]">
                            1M CVaR / 99% VaR
                          </div>
                          <div className="text-base font-mono font-bold text-[#b91c1c] tabular-nums mt-0.5">
                            {activeFundRisk.cvar95MonthlyPct.toFixed(2)}%
                          </div>
                          <div className="text-[10.5px] font-mono text-[#64748b] mt-0.5">
                            99% VaR {activeFundRisk.var99MonthlyPct.toFixed(2)}%
                          </div>
                        </div>

                        <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
                          <div className="text-[10px] font-mono uppercase text-[#64748b]">
                            3Y Max Drawdown
                          </div>
                          <div className="text-base font-mono font-bold text-[#dc2626] tabular-nums mt-0.5">
                            {activeFundRisk.maxDrawdown3YPct.toFixed(1)}%
                          </div>
                          <div className="text-[10.5px] font-mono text-[#64748b] mt-0.5">
                            Worst mo {activeFundRisk.worstObservedMonthPct.toFixed(1)}%
                          </div>
                        </div>

                        <div className="rounded-[9px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-3">
                          <div className="text-[10px] font-mono uppercase text-[#1d4ed8]">
                            Calmar Ratio
                          </div>
                          <div className="text-base font-mono font-bold text-[#1d4ed8] tabular-nums mt-0.5">
                            {activeFundRisk.calmarRatio.toFixed(2)}
                          </div>
                          <div className="text-[10.5px] font-mono text-[#475569] mt-0.5">
                            Ann. VaR {activeFundRisk.var95AnnualPct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* MODULE 3: RETURNS HEATMAP GRID (Price | Total) + SEASONALS OVERLAY (Reference 3) */}
            <div className="p-5 md:p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[15px] font-display font-semibold text-[#0f172a]">Returns</h4>
                  <div
                    role="tablist"
                    aria-label="Returns basis"
                    className="inline-flex items-center gap-4 text-xs font-medium"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={returnsMode === 'price'}
                      data-testid="dossier-returns-price"
                      onClick={() => setReturnsMode('price')}
                      className={`pb-1 border-b-2 transition-colors cursor-pointer ${
                        returnsMode === 'price'
                          ? 'border-[#2563eb] text-[#2563eb] font-semibold'
                          : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                      }`}
                    >
                      Price
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={returnsMode === 'total'}
                      data-testid="dossier-returns-total"
                      onClick={() => setReturnsMode('total')}
                      className={`pb-1 border-b-2 transition-colors cursor-pointer ${
                        returnsMode === 'total'
                          ? 'border-[#2563eb] text-[#2563eb] font-semibold'
                          : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                      }`}
                    >
                      Total
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {returnPeriods.map((period) => {
                    const val = activeReturns[period];
                    const bgClass =
                      val === null
                        ? 'bg-[#f1f5f9] text-[#475569]'
                        : val >= 0
                          ? 'bg-[#e6f7f2] text-[#059669]'
                          : 'bg-[#fdebec] text-[#dc2626]';
                    return (
                      <div
                        key={period}
                        className={`rounded-[8px] py-3 px-2 text-center ${bgClass}`}
                      >
                        <div className="font-mono font-bold text-sm tabular-nums">
                          {val === null ? '—' : `${val >= 0 ? '' : ''}${val.toFixed(2)}%`}
                        </div>
                        <div className="text-[11px] font-medium text-[#334155] mt-0.5">
                          {period}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <SeasonalsOverlayChart seasonals={activeFund.seasonals} />
            </div>

            {/* MODULES 4 & 5: EXPOSURE TYPE DONUT + STOCK BREAKDOWN BY REGION (References 4 & 5) */}
            <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <ExposureDonutChart slices={activeFund.exposure} />

              <div>
                <h4 className="text-[15px] font-display font-semibold text-[#0f172a] mb-3">
                  Stock breakdown by region
                </h4>
                <div className="space-y-2 text-xs">
                  {activeFund.regions.map((row) => (
                    <div key={row.region} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#1e293b]">{row.region}</span>
                        <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                          {row.pct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-[#f1f5f9] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2563eb]"
                          style={{ width: `${Math.min(100, row.pct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      const aboutEl = document.getElementById('dossier-about-block');
                      aboutEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-xs font-medium text-[#1e293b] transition-colors cursor-pointer"
                  >
                    More about fund
                  </button>
                </div>
              </div>
            </div>

            {/* MODULE 6: TECHNICALS SPEEDOMETER GAUGE (Reference 6) */}
            <div className="p-5 md:p-6">
              <TechnicalsGauge technicals={activeFund.technicals} />
            </div>

            {/* MODULES 7 & 8: OPTIONS VOLUME & OPTIONS OPEN INTEREST BY EXPIRATION (References 7 & 8) */}
            <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <OptionsExpirationBarChart
                title="Options volume by expiration"
                data={activeFund.optionsVolume}
                note={activeFund.optionsNote}
                testId="dossier-options-volume-chart"
              />
              <OptionsExpirationBarChart
                title="Options open interest by expiration"
                data={activeFund.optionsOpenInterest}
                note={activeFund.optionsNote}
                testId="dossier-options-oi-chart"
              />
            </div>

            {/* MODULE 9: COMMUNITY POSTS BAR + ABOUT INSTITUTIONAL METADATA & MANDATE (Reference 9) */}
            <div id="dossier-about-block" className="p-5 md:p-6 space-y-5">
              <button
                type="button"
                onClick={() => {
                  if (onJumpToCommunity) {
                    onJumpToCommunity();
                  } else {
                    const el = document.getElementById('market-summary');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full px-4 py-2.5 rounded-[10px] bg-[#f1f5f9] hover:bg-[#e2e8f0] text-xs font-semibold text-[#0f172a] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#475569]" />
                  <span>Browse community posts</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#64748b]" />
              </button>

              <div>
                <h4 className="text-[15px] font-display font-semibold text-[#0f172a] mb-4">
                  About
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 text-xs">
                  <div>
                    <div className="font-semibold text-[#0f172a]">Asset Class</div>
                    <div className="text-[#475569] mt-0.5">{activeFund.about.assetClass}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f172a]">Focus</div>
                    <div className="text-[#475569] mt-0.5">{activeFund.about.focus}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f172a]">Expense ratio</div>
                    <div className="font-mono text-[#475569] mt-0.5 tabular-nums">
                      {activeFund.about.expenseRatioPct.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f172a]">Inception date</div>
                    <div className="text-[#475569] mt-0.5">{activeFund.about.inceptionDate}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-[#0f172a]">Issuer/Brand</div>
                    <div className="text-[#475569] mt-0.5">{activeFund.about.issuer}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f172a]">Home page</div>
                    <a
                      href={activeFund.about.homePageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2563eb] hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>{activeFund.about.homePage}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f172a]">Index tracked</div>
                    <div className="text-[#475569] mt-0.5">{activeFund.about.indexTracked}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f172a]">ISIN</div>
                    <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[#475569]">
                      <span className="truncate">{activeFund.about.isin}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyIdentifier('ISIN', activeFund.about.isin)}
                        aria-label={`Copy ISIN ${activeFund.about.isin}`}
                        className="text-[#64748b] hover:text-[#0f172a] cursor-pointer shrink-0"
                      >
                        {copiedKey === 'ISIN' ? (
                          <Check className="w-3.5 h-3.5 text-[#059669]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-[#0f172a]">{activeFund.about.cusipLabel}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[#475569]">
                      <span>{activeFund.about.cusipOrAmfi}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyIdentifier('CUSIP', activeFund.about.cusipOrAmfi)
                        }
                        aria-label={`Copy ${activeFund.about.cusipLabel} ${activeFund.about.cusipOrAmfi}`}
                        className="text-[#64748b] hover:text-[#0f172a] cursor-pointer shrink-0"
                      >
                        {copiedKey === 'CUSIP' ? (
                          <Check className="w-3.5 h-3.5 text-[#059669]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f172a]">FIGI</div>
                    <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[#475569]">
                      <span className="truncate">{activeFund.about.figi}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyIdentifier('FIGI', activeFund.about.figi)}
                        aria-label={`Copy FIGI ${activeFund.about.figi}`}
                        className="text-[#64748b] hover:text-[#0f172a] cursor-pointer shrink-0"
                      >
                        {copiedKey === 'FIGI' ? (
                          <Check className="w-3.5 h-3.5 text-[#059669]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f172a]">CFI code</div>
                    <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[#475569]">
                      <span className="border-b border-dotted border-[#94a3b8]">
                        {activeFund.about.cfiCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyIdentifier('CFI', activeFund.about.cfiCode)}
                        aria-label={`Copy CFI code ${activeFund.about.cfiCode}`}
                        className="text-[#64748b] hover:text-[#0f172a] cursor-pointer shrink-0"
                      >
                        {copiedKey === 'CFI' ? (
                          <Check className="w-3.5 h-3.5 text-[#059669]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mandate Description */}
                <p className="mt-4 text-xs sm:text-[13px] text-[#334155] leading-relaxed">
                  {showFullDescription || activeFund.about.description.length <= 280
                    ? activeFund.about.description
                    : `${activeFund.about.description.slice(0, 280)}...`}
                  {activeFund.about.description.length > 280 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription((prev) => !prev)}
                      className="ml-1.5 text-[#2563eb] font-medium hover:underline cursor-pointer"
                    >
                      {showFullDescription ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </p>

                {/* Deep Institutional Analytics: Manager, Validation Ratios, Return on Average, Sector & Monthly Heatmaps, Bull/Bear Thesis */}
                <FundDeepAnalyticsPanels
                  fund={activeFund}
                  onAddToCompare={handleToggleCompare}
                  isInCompare={compareIds.includes(activeFund.symbol)}
                />
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      <CompareFundsModal
        open={compareModalOpen}
        allFunds={funds}
        selectedSymbols={compareIds}
        onChangeSymbols={(next) => setCompareIds(next)}
        onClose={() => setCompareModalOpen(false)}
        onInspectFund={(sym) => {
          setSelectedId(sym);
          setViewMode('dossier');
        }}
        onOpenFullMatrix={() => setViewMode('compare')}
      />
    </section>
  );
};
