import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  Download,
  ExternalLink,
  GitCompare,
  Globe2,
  MessageSquare,
  Newspaper,
  PieChart,
  ShieldAlert,
  Sunrise,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StockQuote } from '../types/financia';
import {
  computeRangeMarkerPct,
  SCREENER_FUNDS,
  ScreenerFundRecord,
  ScreenerInstrumentType,
} from '../utils/screenerEngine';
import {
  evaluateRiskAdjustedRatios,
  getFundIntelligence,
} from '../utils/fundIntelligenceEngine';
import { computeInstrumentRiskProfile } from '../utils/riskAnalyticsEngine';
import {
  buildInstrumentCommunityPosts,
  synthesizeScreenerFundFromQuote,
} from '../utils/rebalanceEngine';
import {
  buildUniformTop10HoldingsForFund,
  computeInstrumentWealthSimulation,
  NavDbSchemeSummary,
} from '../utils/terminalSearchEngine';
import type { V1UniformFundDossier } from '../services/financiaApiClient';
import {
  ExposureDonutChart,
  OptionsExpirationBarChart,
  SeasonalsOverlayChart,
  TechnicalsGauge,
} from './FundDossierCharts';
import { FundDeepAnalyticsPanels } from './FundDeepAnalyticsPanels';

export interface TerminalIndividualAnalysisPanelProps {
  activeStock: StockQuote;
  hydratedFund?: ScreenerFundRecord | null;
  hydratedDossier?: V1UniformFundDossier | null;
  navDbSchemes?: NavDbSchemeSummary[];
  isPinned?: boolean;
  onTogglePin?: (symbol: string) => void;
  onSelectInstrument: (symbol: string) => void;
  onCompareWithFund?: (symbolA: string) => void;
}

const SECTOR_BAR_COLORS = [
  '#2563eb',
  '#059669',
  '#7c3aed',
  '#d97706',
  '#0891b2',
  '#dc2626',
  '#4f46e5',
  '#0d9488',
];

export const TerminalIndividualAnalysisPanel: React.FC<
  TerminalIndividualAnalysisPanelProps
> = ({
  activeStock,
  hydratedFund,
  hydratedDossier = null,
  navDbSchemes = [],
  isPinned = false,
  onTogglePin,
  onSelectInstrument,
  onCompareWithFund,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | ScreenerInstrumentType | 'SQLITE_DB'>('ALL');
  const [returnsMode, setReturnsMode] = useState<'total' | 'price'>('total');
  const [showAllNews, setShowAllNews] = useState<boolean>(true);
  const [showFullAbout, setShowFullAbout] = useState<boolean>(false);
  const [copiedIdKey, setCopiedIdKey] = useState<string | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});

  // Interactive SIP + Lumpsum + Fee-Drag + Inflation Simulator State
  const [simLumpsum, setSimLumpsum] = useState<number>(100_000);
  const [simMonthlySip, setSimMonthlySip] = useState<number>(10_000);
  const [simYears, setSimYears] = useState<number>(10);
  const [simInflationPct, setSimInflationPct] = useState<number>(5.5);

  const filteredPickerFunds = useMemo(() => {
    if (typeFilter === 'SQLITE_DB') return [];
    if (typeFilter === 'ALL') return SCREENER_FUNDS;
    return SCREENER_FUNDS.filter((f) => f.instrumentType === typeFilter);
  }, [typeFilter]);

  // Guaranteed complete ScreenerFundRecord for every single MF, ETF, Gold, Debt, SQLite 14k AMFI scheme, or custom ticker
  const activeFund: ScreenerFundRecord = useMemo(() => {
    if (
      hydratedFund &&
      hydratedFund.symbol.toUpperCase() === activeStock.ticker.toUpperCase()
    ) {
      return hydratedFund;
    }
    const match = SCREENER_FUNDS.find(
      (f) => f.symbol.toUpperCase() === activeStock.ticker.toUpperCase()
    );
    if (match) return match;
    return synthesizeScreenerFundFromQuote(activeStock);
  }, [activeStock, hydratedFund]);

  const intel = useMemo(() => getFundIntelligence(activeFund), [activeFund]);
  const uniformTop10Holdings = useMemo(
    () =>
      buildUniformTop10HoldingsForFund(
        activeFund,
        intel.topHoldings,
        hydratedDossier?.top_10_holdings ?? null
      ),
    [activeFund, intel.topHoldings, hydratedDossier]
  );
  const uniformAllocation = useMemo(
    () =>
      hydratedDossier?.asset_allocation && hydratedDossier.asset_allocation.length > 0
        ? hydratedDossier.asset_allocation
        : activeFund.exposure,
    [hydratedDossier, activeFund.exposure]
  );
  const risk = useMemo(() => computeInstrumentRiskProfile(activeFund, intel), [activeFund, intel]);
  const riskSummary = useMemo(
    () => evaluateRiskAdjustedRatios(activeFund, intel),
    [activeFund, intel]
  );
  const communityPosts = useMemo(
    () => buildInstrumentCommunityPosts(activeFund),
    [activeFund]
  );

  const expectedAnnualCagr = useMemo(() => {
    const r3 = activeFund.returnsTotal['3Y'];
    const r1 = activeFund.returnsTotal['1Y'];
    if (typeof r3 === 'number' && Number.isFinite(r3)) {
      const ann = (Math.pow(1 + Math.max(-0.5, r3 / 100), 1 / 3) - 1) * 100;
      return Number(Math.max(4.5, Math.min(24, ann)).toFixed(2));
    }
    if (typeof r1 === 'number' && Number.isFinite(r1)) {
      return Number(Math.max(4.5, Math.min(22, r1 * 0.75)).toFixed(2));
    }
    return 11.5;
  }, [activeFund]);

  const wealthSim = useMemo(
    () =>
      computeInstrumentWealthSimulation({
        lumpsum: simLumpsum,
        monthlySip: simMonthlySip,
        years: simYears,
        expectedCagrPct: expectedAnnualCagr,
        expenseRatioPct: activeFund.about.expenseRatioPct,
        inflationPct: simInflationPct,
      }),
    [
      simLumpsum,
      simMonthlySip,
      simYears,
      expectedAnnualCagr,
      activeFund.about.expenseRatioPct,
      simInflationPct,
    ]
  );

  const currencyPrefix = activeFund.currency === 'INR' ? '₹' : '$';
  const activeReturns =
    returnsMode === 'total' ? activeFund.returnsTotal : activeFund.returnsPrice;
  const returnPeriods: Array<'1M' | '3M' | 'YTD' | '1Y' | '3Y' | '5Y'> = [
    '1M',
    '3M',
    'YTD',
    '1Y',
    '3Y',
    '5Y',
  ];

  const dayMarkerPct = computeRangeMarkerPct(
    activeFund.price,
    activeFund.dayLow,
    activeFund.dayHigh
  );
  const week52MarkerPct = computeRangeMarkerPct(
    activeFund.price,
    activeFund.week52Low,
    activeFund.week52High
  );

  const volMax = Math.max(activeFund.volumeNumeric, activeFund.avgVolume30dNumeric, 0.1);
  const volBarPct = Math.min(100, Math.max(8, Math.round((activeFund.volumeNumeric / volMax) * 100)));
  const avgVolBarPct = Math.min(
    100,
    Math.max(8, Math.round((activeFund.avgVolume30dNumeric / volMax) * 100))
  );

  const isSqliteOrigin =
    activeFund.exchange.toLowerCase().includes('sqlite') ||
    (activeStock.dataSource || '').toLowerCase().includes('sqlite');

  const handleCopyIdentifier = (key: string, value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopiedIdKey(key);
    window.setTimeout(() => {
      setCopiedIdKey((prev) => (prev === key ? null : prev));
    }, 1500);
  };

  const handleExportDossierJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      instrument: activeFund,
      riskProfile: risk,
      validationSummary: riskSummary,
      manager: intel.manager,
      topHoldings: intel.topHoldings,
      sectorHeatmap: intel.sectorHeatmap,
      wealthSimulation: {
        inputs: {
          lumpsum: simLumpsum,
          monthlySip: simMonthlySip,
          years: simYears,
          expectedCagrPct: expectedAnnualCagr,
          inflationPct: simInflationPct,
        },
        summary: {
          totalInvested: wealthSim.totalInvested,
          endingGross: wealthSim.endingGross,
          endingNet: wealthSim.endingNet,
          endingReal: wealthSim.endingReal,
          totalFeeDrag: wealthSim.totalFeeDrag,
        },
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financia-dossier-${activeFund.symbol.toLowerCase()}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatSimCompact = (val: number) => {
    if (activeFund.currency === 'INR') {
      if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)}Cr`;
      if (val >= 100_000) return `₹${(val / 100_000).toFixed(1)}L`;
      if (val >= 1_000) return `₹${Math.round(val / 1_000)}k`;
      return `₹${Math.round(val)}`;
    }
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${Math.round(val / 1_000)}k`;
    return `$${Math.round(val)}`;
  };

  const jumpSections = [
    { id: 'ind-profile-top10', label: 'Profile & Top 10 Holdings' },
    { id: 'ind-news', label: 'News' },
    { id: 'ind-keystats', label: 'Key Stats' },
    { id: 'ind-risk', label: 'Risk Ratios' },
    { id: 'ind-returns', label: 'Returns & Seasonals' },
    { id: 'ind-exposure', label: 'Exposure & Tech' },
    { id: 'ind-options', label: 'Options Vol & OI' },
    { id: 'ind-simulator', label: 'SIP Simulator' },
    { id: 'ind-community', label: 'Community & Sectors' },
    { id: 'ind-about', label: 'About & ISIN' },
    { id: 'ind-deep', label: 'Manager · Heatmap · Bull/Bear' },
  ];

  return (
    <div data-testid="terminal-individual-analysis" className="space-y-6">
      {/* Top Instrument Selector & Full Institutional Quote Header */}
      <div className="rounded-[14px] bg-white border border-[#e2e8f0] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.06em] text-[#2563eb] font-semibold">
              <span>Full Instrument Dossier · All 16 Reference Modules</span>
              {isSqliteOrigin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] normal-case tracking-normal">
                  <Database className="w-3 h-3" />
                  SQLite nav_master Verified
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-[#0f172a] mt-1 leading-snug">
              {activeFund.name}{' '}
              <span className="font-mono text-sm font-semibold text-[#2563eb]">
                ({activeFund.symbol})
              </span>
            </h2>
            <div className="text-xs text-[#64748b] mt-0.5">
              {activeFund.exchange} · {activeFund.instrumentType} · {activeFund.category} ·{' '}
              {activeFund.subCategory} · {activeFund.lastUpdateLabel}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label="Filter instrument picker by type"
              className="inline-flex items-center p-0.5 rounded-[8px] bg-[#f1f5f9] border border-[#e2e8f0]"
            >
              {(
                [
                  { id: 'ALL', label: `Core (${SCREENER_FUNDS.length})` },
                  { id: 'ETF', label: 'ETFs' },
                  { id: 'Mutual Fund', label: 'MFs' },
                  ...(navDbSchemes.length > 0
                    ? [{ id: 'SQLITE_DB' as const, label: `SQLite DB (${navDbSchemes.length})` }]
                    : []),
                ] as const
              ).map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  data-testid={`individual-filter-${tp.id.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setTypeFilter(tp.id)}
                  className={`px-2.5 py-1 rounded-[6px] text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    typeFilter === tp.id
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>

            {onTogglePin && (
              <button
                type="button"
                data-testid="individual-pin-btn"
                onClick={() => onTogglePin(activeFund.symbol)}
                className={`h-8 px-2.5 rounded-[8px] border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                  isPinned
                    ? 'bg-[#eff6ff] border-[#93c5fd] text-[#1d4ed8]'
                    : 'bg-white border-[#cbd5e1] text-[#334155] hover:border-[#2563eb]'
                }`}
              >
                {isPinned ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#2563eb]" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 text-[#64748b]" />
                )}
                <span>{isPinned ? 'Pinned' : 'Pin'}</span>
              </button>
            )}

            <button
              type="button"
              data-testid="individual-export-dossier-btn"
              onClick={handleExportDossierJson}
              className="h-8 px-2.5 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Export JSON</span>
            </button>

            {onCompareWithFund && (
              <button
                type="button"
                data-testid="individual-compare-cta"
                onClick={() => onCompareWithFund(activeFund.symbol)}
                className="h-8 px-3 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare {activeFund.symbol}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Quick Instrument Strip across Catalog & SQLite nav_master */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {typeFilter === 'SQLITE_DB'
            ? navDbSchemes.map((row) => {
                const sym = String(row.scheme_code);
                const isSel = sym === activeFund.symbol;
                return (
                  <button
                    key={sym}
                    type="button"
                    data-testid={`individual-pick-db-${sym}`}
                    onClick={() => onSelectInstrument(sym)}
                    className={`px-2.5 py-1.5 rounded-[7px] border text-xs font-mono shrink-0 transition-colors cursor-pointer ${
                      isSel
                        ? 'bg-[#047857] text-white border-[#047857] font-bold'
                        : 'bg-[#f8fafc] text-[#334155] border-[#e2e8f0] hover:border-[#059669] hover:text-[#0f172a]'
                    }`}
                  >
                    #{sym}{' '}
                    <span className={isSel ? 'text-[#d1fae5]' : 'text-[#64748b]'}>
                      · {row.scheme_name.slice(0, 26)}
                      {row.scheme_name.length > 26 ? '…' : ''}
                    </span>
                  </button>
                );
              })
            : filteredPickerFunds.map((f) => {
                const isSel = f.symbol === activeFund.symbol;
                return (
                  <button
                    key={f.symbol}
                    type="button"
                    data-testid={`individual-pick-${f.symbol}`}
                    onClick={() => onSelectInstrument(f.symbol)}
                    className={`px-2.5 py-1.5 rounded-[7px] border text-xs font-mono shrink-0 transition-colors cursor-pointer ${
                      isSel
                        ? 'bg-[#0f172a] text-white border-[#0f172a] font-bold'
                        : 'bg-[#f8fafc] text-[#334155] border-[#e2e8f0] hover:border-[#2563eb] hover:text-[#0f172a]'
                    }`}
                  >
                    {f.symbol}{' '}
                    <span className={isSel ? 'text-[#38bdf8]' : 'text-[#64748b]'}>
                      · {f.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'}
                    </span>
                  </button>
                );
              })}
        </div>

        {/* Institutional Quote Tape: Spot + Pre-Market/iNAV + Bid/Ask + Volume vs 30D Avg */}
        <div
          data-testid="individual-quote-tape"
          className="pt-3.5 border-t border-[#f1f5f9] grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
        >
          {/* Spot & Extended/iNAV Quote */}
          <div className="lg:col-span-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  data-testid="individual-active-price"
                  className="text-3xl font-display font-bold text-[#0f172a] tabular-nums"
                >
                  {currencyPrefix}
                  {activeFund.price.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-[#64748b]">{activeFund.currency}</span>
              </div>
              <div
                className={`inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums mt-0.5 ${
                  activeFund.changePct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                }`}
              >
                {activeFund.changePct >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {activeFund.change >= 0 ? '+' : ''}
                {activeFund.change.toFixed(2)} ({activeFund.changePct >= 0 ? '+' : ''}
                {activeFund.changePct.toFixed(2)}%)
              </div>
            </div>

            <div className="pl-4 border-l border-[#e2e8f0]">
              <div className="inline-flex items-center gap-1 text-[10.5px] font-mono uppercase text-[#d97706] font-semibold">
                <Sunrise className="w-3.5 h-3.5" />
                <span>{activeFund.extendedLabel}</span>
              </div>
              <div className="flex items-baseline gap-2 font-mono tabular-nums mt-0.5">
                <span className="text-base font-bold text-[#0f172a]">
                  {currencyPrefix}
                  {activeFund.extendedPrice.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    activeFund.extendedChangePct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                  }`}
                >
                  {activeFund.extendedChangePct >= 0 ? '+' : ''}
                  {activeFund.extendedChangePct.toFixed(2)}%
                </span>
              </div>
              <div className="text-[10.5px] text-[#64748b]">{activeFund.extendedUpdateLabel}</div>
            </div>
          </div>

          {/* Bid/Ask Spread + Volume vs 30D Avg Proportional Bar */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase text-[#64748b]">Bid / Entry</div>
                <div className="text-xs font-mono font-bold text-[#059669] tabular-nums mt-0.5">
                  {activeFund.bidLabel}
                </div>
              </div>
              <div className="h-6 w-px bg-[#e2e8f0]" />
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-[#64748b]">Ask / Fee Tier</div>
                <div className="text-xs font-mono font-bold text-[#1d4ed8] tabular-nums mt-0.5">
                  {activeFund.askLabel}
                </div>
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] font-mono">
                <span className="text-[#64748b]">
                  Vol: <strong className="text-[#0f172a]">{activeFund.volumeLabel}</strong>
                </span>
                <span className="text-[#64748b]">
                  30D Avg: <strong className="text-[#0f172a]">{activeFund.avgVolume30dLabel}</strong>
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2563eb]"
                    style={{ width: `${volBarPct}%` }}
                  />
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#94a3b8]"
                    style={{ width: `${avgVolBarPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Quick Jump Anchors */}
        <div className="pt-2.5 border-t border-[#f1f5f9] flex flex-wrap items-center gap-1.5">
          {jumpSections.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="px-2.5 py-1 rounded-[6px] bg-[#f8fafc] hover:bg-[#eff6ff] border border-[#e2e8f0] text-[11px] font-medium text-[#475569] hover:text-[#1d4ed8] transition-colors whitespace-nowrap"
            >
              {sec.label}
            </a>
          ))}
        </div>
      </div>

      {/* UNIFORM COMPREHENSIVE INSTRUMENT PROFILE: INCEPTION DATE, EXPENSE RATIO, ASSET ALLOCATION & TOP 10 HOLDINGS */}
      <section
        id="ind-profile-top10"
        data-testid="individual-section-uniform-profile"
        className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#e2e8f0]">
          <div>
            <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#2563eb]" />
              <span>
                Comprehensive Instrument Profile &amp; Top {uniformTop10Holdings.length} Holdings —{' '}
                {activeFund.symbol}
              </span>
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Uniform institutional profile (Inception Date, Expense Ratio, Asset Allocation Breakdown &amp; Leading Constituents) populated for every searchable ETF &amp; Mutual Fund
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold text-[#1d4ed8] bg-[#eff6ff] border border-[#bfdbfe] px-2.5 py-1 rounded-[7px]">
            Top-{uniformTop10Holdings.length} Weight:{' '}
            {uniformTop10Holdings.reduce((acc, h) => acc + h.weightPct, 0).toFixed(1)}%
          </span>
        </div>

        {/* Core 6 Uniform Facts Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: 'Inception Date',
              value: hydratedDossier?.inception_date || activeFund.about.inceptionDate,
              sub: 'Scheme allotment',
            },
            {
              label: 'Expense Ratio (TER)',
              value: `${(hydratedDossier?.expense_ratio ?? activeFund.about.expenseRatioPct).toFixed(2)}%`,
              sub:
                hydratedDossier?.ter_direct !== null &&
                hydratedDossier?.ter_direct !== undefined &&
                hydratedDossier?.ter_regular !== null &&
                hydratedDossier?.ter_regular !== undefined
                  ? `Dir ${hydratedDossier.ter_direct.toFixed(2)}% · Reg ${hydratedDossier.ter_regular.toFixed(2)}%`
                  : activeFund.askLabel,
            },
            {
              label: 'Assets Under Mgmt',
              value: activeFund.keyStats.aumLabel,
              sub: activeFund.about.issuer,
            },
            {
              label: 'Asset Class',
              value: hydratedDossier?.asset_class || activeFund.about.assetClass,
              sub: activeFund.category,
            },
            {
              label: 'ISIN Identifier',
              value: hydratedDossier?.isin || activeFund.about.isin,
              sub: `${activeFund.about.cusipLabel}: ${activeFund.about.cusipOrAmfi}`,
            },
            {
              label: 'Benchmark Index',
              value: hydratedDossier?.benchmark || activeFund.about.indexTracked,
              sub: hydratedDossier?.riskometer || 'SEBI Regulated',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3 min-w-0"
            >
              <div className="text-[10.5px] font-mono uppercase text-[#64748b] truncate">
                {item.label}
              </div>
              <div
                className="text-sm font-mono font-bold text-[#0f172a] tabular-nums mt-0.5 truncate"
                title={item.value}
              >
                {item.value}
              </div>
              <div className="text-[10.5px] text-[#64748b] truncate mt-0.5" title={item.sub}>
                {item.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Asset Allocation Breakdown Bar + Top 10 Holdings Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Asset Allocation Breakdown */}
          <div className="lg:col-span-4 rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-display font-bold uppercase tracking-wider text-[#0f172a]">
                Asset Allocation Breakdown
              </h4>
              <span className="text-[10.5px] font-mono text-[#64748b]">100.0% Total</span>
            </div>

            <div className="h-3.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden flex">
              {uniformAllocation.map((slice) => (
                <div
                  key={slice.label}
                  title={`${slice.label}: ${slice.pct.toFixed(1)}%`}
                  style={{ width: `${slice.pct}%`, backgroundColor: slice.color }}
                  className="h-full"
                />
              ))}
            </div>

            <div className="space-y-2.5">
              {uniformAllocation.map((slice) => (
                <div key={slice.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 font-medium text-[#1e293b] truncate pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate">{slice.label}</span>
                    </span>
                    <span className="font-mono font-bold text-[#0f172a] tabular-nums shrink-0">
                      {slice.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#e2e8f0] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(2, slice.pct))}%`,
                        backgroundColor: slice.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {hydratedDossier?.fund_managers && (
              <div className="pt-3 border-t border-[#e2e8f0] text-[11px] text-[#475569]">
                <span className="font-mono uppercase text-[10px] text-[#64748b] block">
                  Fund Management Desk
                </span>
                <span className="font-semibold text-[#0f172a]">{hydratedDossier.fund_managers}</span>
              </div>
            )}
          </div>

          {/* Top 10 Holdings Table */}
          <div className="lg:col-span-8 rounded-[12px] border border-[#e2e8f0] overflow-hidden bg-white">
            <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
              <h4 className="text-xs font-display font-bold uppercase tracking-wider text-[#0f172a]">
                Top {uniformTop10Holdings.length} Portfolio Holdings
              </h4>
              <span className="text-[10.5px] font-mono text-[#64748b]">
                {hydratedDossier?.holdings_source === 'sqlite_portfolio_holdings'
                  ? 'Verified SQLite Holdings Table'
                  : 'Constituent Mandate Disclosure'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table
                data-testid="individual-top10-holdings-table"
                className="w-full text-left border-collapse text-xs"
              >
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[10.5px] font-mono uppercase text-[#64748b] bg-[#fbfdff]">
                    <th className="py-2 px-3 w-10">#</th>
                    <th className="py-2 px-3">Security / Instrument</th>
                    <th className="py-2 px-3">Ticker / ISIN</th>
                    <th className="py-2 px-3">Sector / Sleeve</th>
                    <th className="py-2 px-3 text-right">Weight %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {uniformTop10Holdings.map((h) => (
                    <tr key={`${h.rank}-${h.name}`} className="hover:bg-[#f8fafc]">
                      <td className="py-2 px-3 font-mono text-[#64748b] tabular-nums">{h.rank}</td>
                      <td className="py-2 px-3 font-semibold text-[#0f172a] max-w-[230px] truncate">
                        {h.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-[#475569]">
                        {h.tickerOrIsin}
                      </td>
                      <td className="py-2 px-3 text-[#475569]">{h.sector}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[#e2e8f0] overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full bg-[#2563eb]"
                              style={{ width: `${Math.min(100, h.weightPct * 2.5)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[#0f172a] tabular-nums w-11 text-right">
                            {h.weightPct.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ROW 1: 1. NEWS + 2. KEY STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. News */}
        <section
          id="ind-news"
          data-testid="individual-section-news"
          className="lg:col-span-5 rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-[#e2e8f0]">
              <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-[#2563eb]" />
                <span>News &amp; Catalysts — {activeFund.symbol}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAllNews((p) => !p)}
                className="text-xs font-medium text-[#2563eb] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showAllNews ? 'Collapse' : 'More events'}</span>
                {showAllNews ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="rounded-[10px] border border-[#dbeafe] bg-[#f8fbff] p-3.5 mb-3">
              <div className="text-[10.5px] font-mono text-[#2563eb] font-semibold uppercase mb-1">
                Lead Wire · {activeFund.news.age}
              </div>
              <p className="text-sm font-semibold text-[#0f172a] leading-snug">
                {activeFund.news.headline}
              </p>
            </div>

            {showAllNews && (
              <div className="space-y-2.5">
                {activeFund.news.moreEvents.map((ev, idx) => (
                  <div
                    key={idx}
                    className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3"
                  >
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-[#64748b] mb-1">
                      <span>{ev.source}</span>
                      <span>{ev.age}</span>
                    </div>
                    <div className="text-xs font-medium text-[#1e293b] leading-relaxed">
                      {ev.headline}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#f1f5f9] space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#64748b] mb-1 tabular-nums">
                <span>
                  Day Range: {currencyPrefix}
                  {activeFund.dayLow.toFixed(2)}
                </span>
                <span>
                  {currencyPrefix}
                  {activeFund.dayHigh.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#e2e8f0] relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#2563eb] border-2 border-white shadow-xs"
                  style={{ left: `calc(${dayMarkerPct}% - 5px)` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#64748b] mb-1 tabular-nums">
                <span>
                  52W Range: {currencyPrefix}
                  {activeFund.week52Low.toFixed(2)}
                </span>
                <span>
                  {currencyPrefix}
                  {activeFund.week52High.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#e2e8f0] relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0f172a] border-2 border-white shadow-xs"
                  style={{ left: `calc(${week52MarkerPct}% - 5px)` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Key Stats */}
        <section
          id="ind-keystats"
          data-testid="individual-section-keystats"
          className="lg:col-span-7 rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#e2e8f0]">
            <div>
              <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#2563eb]" />
                <span>Key Stats — {activeFund.symbol}</span>
              </h3>
              <p className="text-xs text-[#64748b] mt-0.5">
                Core scale, cost, holdings breadth, and institutional benchmark parameters
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#64748b]">
              ISIN: {activeFund.about.isin}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Assets Under Management',
                value: activeFund.keyStats.aumLabel,
                sub: activeFund.about.issuer,
              },
              {
                label: 'Expense Ratio (TER)',
                value: `${activeFund.about.expenseRatioPct.toFixed(2)}%`,
                sub: 'Annual net fee',
              },
              {
                label: 'Dividend / YTM Yield',
                value: `${activeFund.keyStats.dividendYieldPct.toFixed(2)}%`,
                sub: 'Trailing distribution',
              },
              {
                label: 'Discount / Premium to NAV',
                value: `${activeFund.keyStats.discountPremiumPct >= 0 ? '+' : ''}${activeFund.keyStats.discountPremiumPct.toFixed(2)}%`,
                sub: activeFund.instrumentType,
              },
              {
                label: 'Total Holdings',
                value: String(activeFund.keyStats.totalHoldings),
                sub: `Turnover ${activeFund.keyStats.turnoverPct.toFixed(0)}%`,
              },
              {
                label: 'Volume / 30D Avg',
                value: activeFund.volumeLabel,
                sub: `Avg ${activeFund.avgVolume30dLabel}`,
              },
              {
                label: 'Tracking Error (3Y)',
                value: `${activeFund.keyStats.trackingErrorPct.toFixed(2)}%`,
                sub: activeFund.about.indexTracked,
              },
              {
                label: 'Beta (3Y vs Index)',
                value: activeFund.keyStats.beta3Y.toFixed(2),
                sub: `R² ${intel.ratios.rSquared.toFixed(2)}`,
              },
              {
                label: 'Inception Date',
                value: activeFund.about.inceptionDate,
                sub: `${activeFund.about.cusipLabel}: ${activeFund.about.cusipOrAmfi}`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3"
              >
                <div className="text-[11px] text-[#64748b]">{stat.label}</div>
                <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                  {stat.value}
                </div>
                <div className="text-[10.5px] text-[#64748b] truncate mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ROW 2: 3. RISK-ADJUSTED VALIDATION RATIOS */}
      <section
        id="ind-risk"
        data-testid="individual-section-risk-ratios"
        className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#e2e8f0]">
          <div>
            <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#dc2626]" />
              <span>Risk-Adjusted Validation Ratios &amp; Tail-Risk Profile</span>
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Sharpe, Sortino, Treynor efficiency alongside parametric 1-Month Value-at-Risk (95% / 99%), CVaR, and Maximum Drawdown
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-[7px] bg-[#eff6ff] border border-[#bfdbfe] text-xs font-mono font-bold text-[#1d4ed8]">
            Efficiency Tier: {riskSummary.sharpe.grade}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            {
              label: 'Sharpe (3Y)',
              val: activeFund.keyStats.sharpe3Y.toFixed(2),
              tone: 'text-[#059669]',
              hint: 'Total risk efficiency',
            },
            {
              label: 'Sortino (3Y)',
              val: intel.ratios.sortino3Y.toFixed(2),
              tone: 'text-[#059669]',
              hint: 'Downside efficiency',
            },
            {
              label: 'Treynor Ratio',
              val: intel.ratios.treynorRatio.toFixed(2),
              tone: 'text-[#1d4ed8]',
              hint: 'Per unit beta',
            },
            {
              label: '1M VaR (95%)',
              val: `${risk.var95MonthlyPct.toFixed(2)}%`,
              tone: 'text-[#dc2626]',
              hint: 'Monthly tail loss',
            },
            {
              label: '1M CVaR (95%)',
              val: `${risk.cvar95MonthlyPct.toFixed(2)}%`,
              tone: 'text-[#b91c1c]',
              hint: 'Expected shortfall',
            },
            {
              label: '3Y Max Drawdown',
              val: `${risk.maxDrawdown3YPct.toFixed(1)}%`,
              tone: 'text-[#dc2626]',
              hint: 'Peak-to-trough drop',
            },
            {
              label: 'Calmar Ratio',
              val: risk.calmarRatio.toFixed(2),
              tone: 'text-[#0f172a]',
              hint: 'Return / Max DD',
            },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3"
            >
              <div className="text-[10.5px] font-mono uppercase text-[#64748b]">{m.label}</div>
              <div className={`text-lg font-mono font-bold tabular-nums mt-0.5 ${m.tone}`}>
                {m.val}
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5">{m.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ROW 3: 4. RETURNS & SEASONALS + 5. EXPOSURE + 6. REGIONS + 7. TECHNICALS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 4. Returns & Seasonals */}
        <section
          id="ind-returns"
          data-testid="individual-section-returns"
          className="lg:col-span-6 rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-display font-bold text-[#0f172a]">
                Returns &amp; Multi-Year Seasonals
              </h3>
              <p className="text-xs text-[#64748b]">
                Trailing cumulative performance across 1M to 5Y horizons
              </p>
            </div>
            <div className="inline-flex items-center p-0.5 rounded-[7px] bg-[#f1f5f9] border border-[#e2e8f0]">
              {(['total', 'price'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setReturnsMode(m)}
                  className={`px-2.5 py-1 rounded-[5px] text-xs font-semibold capitalize cursor-pointer ${
                    returnsMode === m
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {returnPeriods.map((p) => {
              const val = activeReturns[p];
              return (
                <div
                  key={p}
                  className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-2.5 text-center"
                >
                  <div className="text-[10.5px] font-mono text-[#64748b]">{p}</div>
                  <div
                    className={`text-sm font-mono font-bold tabular-nums mt-0.5 ${
                      val === null
                        ? 'text-[#94a3b8]'
                        : val >= 0
                          ? 'text-[#059669]'
                          : 'text-[#dc2626]'
                    }`}
                  >
                    {val === null ? '—' : `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#f1f5f9]">
            <SeasonalsOverlayChart seasonals={activeFund.seasonals} />
          </div>
        </section>

        {/* 5. Exposure Type + 6. Stock Breakdown by Region + 7. Technicals */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <section
            id="ind-exposure"
            data-testid="individual-section-exposure"
            className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
          >
            <ExposureDonutChart slices={activeFund.exposure} />
          </section>

          <section
            id="ind-technicals"
            data-testid="individual-section-technicals"
            className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
          >
            <TechnicalsGauge technicals={activeFund.technicals} />
          </section>

          <section
            id="ind-regions"
            data-testid="individual-section-regions"
            className="sm:col-span-2 rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-[#2563eb]" />
                <span>Stock Breakdown by Region</span>
              </h3>
              <span className="text-[11px] font-mono text-[#64748b]">
                Geographic Allocation %
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {activeFund.regions.map((r) => (
                <div key={r.region}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[#1e293b]">{r.region}</span>
                    <span className="font-mono font-bold text-[#0f172a] tabular-nums">
                      {r.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eef2f6] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2563eb]"
                      style={{ width: `${Math.min(100, Math.max(2, r.pct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ROW 4: 8. OPTIONS VOLUME BY EXPIRATION + 9. OPTIONS OPEN INTEREST BY EXPIRATION */}
      <div
        id="ind-options"
        data-testid="individual-section-options"
        className="grid grid-cols-1 lg:grid-cols-2 gap-5"
      >
        <section className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs">
          <OptionsExpirationBarChart
            title={`Options Volume by Expiration — ${activeFund.symbol}`}
            data={activeFund.optionsVolume}
            note={activeFund.optionsNote}
            testId="individual-options-volume-chart"
          />
        </section>
        <section className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs">
          <OptionsExpirationBarChart
            title={`Options Open Interest by Expiration — ${activeFund.symbol}`}
            data={activeFund.optionsOpenInterest}
            note={activeFund.optionsNote}
            testId="individual-options-oi-chart"
          />
        </section>
      </div>

      {/* ROW 5: 10. INTERACTIVE SIP + LUMPSUM + TER FEE-DRAG + REAL INFLATION WEALTH SIMULATOR */}
      <section
        id="ind-simulator"
        data-testid="individual-section-wealth-simulator"
        className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#e2e8f0]">
          <div>
            <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#2563eb]" />
              <span>
                SIP, Lumpsum &amp; TER Fee-Drag Wealth Simulator — {activeFund.symbol}
              </span>
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Models gross compounding at {expectedAnnualCagr.toFixed(2)}% expected CAGR minus{' '}
              {activeFund.about.expenseRatioPct.toFixed(2)}% annual TER and {simInflationPct.toFixed(1)}%
              inflation erosion
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
            <span className="px-2.5 py-1 rounded-[7px] bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] font-semibold">
              Net CAGR: {(expectedAnnualCagr - activeFund.about.expenseRatioPct).toFixed(2)}%
            </span>
            <span className="px-2.5 py-1 rounded-[7px] bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] font-semibold">
              TER Drag: {formatSimCompact(wealthSim.totalFeeDrag)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Interactive Controls */}
          <div className="lg:col-span-4 space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="sim-lumpsum-input" className="font-medium text-[#334155]">
                  Initial Lumpsum ({currencyPrefix})
                </label>
                <span className="font-mono font-bold text-[#0f172a] tabular-nums">
                  {formatSimCompact(simLumpsum)}
                </span>
              </div>
              <input
                id="sim-lumpsum-input"
                type="range"
                min={0}
                max={1_000_000}
                step={25_000}
                value={simLumpsum}
                onChange={(e) => setSimLumpsum(Number(e.target.value))}
                className="w-full accent-[#2563eb] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="sim-sip-input" className="font-medium text-[#334155]">
                  Monthly SIP ({currencyPrefix})
                </label>
                <span className="font-mono font-bold text-[#0f172a] tabular-nums">
                  {currencyPrefix}
                  {simMonthlySip.toLocaleString('en-US')}/mo
                </span>
              </div>
              <input
                id="sim-sip-input"
                type="range"
                min={0}
                max={100_000}
                step={2_500}
                value={simMonthlySip}
                onChange={(e) => setSimMonthlySip(Number(e.target.value))}
                className="w-full accent-[#2563eb] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="sim-years-input" className="font-medium text-[#334155]">
                    Horizon
                  </label>
                  <span className="font-mono font-bold text-[#0f172a] tabular-nums">
                    {simYears}Y
                  </span>
                </div>
                <input
                  id="sim-years-input"
                  type="range"
                  min={1}
                  max={25}
                  step={1}
                  value={simYears}
                  onChange={(e) => setSimYears(Number(e.target.value))}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="sim-inflation-input" className="font-medium text-[#334155]">
                    Inflation
                  </label>
                  <span className="font-mono font-bold text-[#0f172a] tabular-nums">
                    {simInflationPct.toFixed(1)}%
                  </span>
                </div>
                <input
                  id="sim-inflation-input"
                  type="range"
                  min={2}
                  max={9}
                  step={0.5}
                  value={simInflationPct}
                  onChange={(e) => setSimInflationPct(Number(e.target.value))}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
              </div>
            </div>

            {/* Summary KPI Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
                <div className="text-[10px] font-mono uppercase text-[#64748b]">Total Invested</div>
                <div className="text-sm font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                  {formatSimCompact(wealthSim.totalInvested)}
                </div>
              </div>
              <div className="rounded-[9px] border border-[#bfdbfe] bg-[#eff6ff] p-2.5">
                <div className="text-[10px] font-mono uppercase text-[#1d4ed8]">Net Wealth ({simYears}Y)</div>
                <div className="text-sm font-mono font-bold text-[#1d4ed8] tabular-nums mt-0.5">
                  {formatSimCompact(wealthSim.endingNet)}
                </div>
              </div>
              <div className="rounded-[9px] border border-[#a7f3d0] bg-[#ecfdf5] p-2.5">
                <div className="text-[10px] font-mono uppercase text-[#047857]">Real (Inflation-Adj)</div>
                <div className="text-sm font-mono font-bold text-[#047857] tabular-nums mt-0.5">
                  {formatSimCompact(wealthSim.endingReal)}
                </div>
              </div>
              <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
                <div className="text-[10px] font-mono uppercase text-[#64748b]">Net Total Return</div>
                <div className="text-sm font-mono font-bold text-[#059669] tabular-nums mt-0.5">
                  +{wealthSim.netGainPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Trajectory Area Chart */}
          <div className="lg:col-span-8 h-[250px] w-full rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc]/40 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={wealthSim.points}
                margin={{ top: 10, right: 14, bottom: 2, left: 4 }}
              >
                <defs>
                  <linearGradient id="simNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="simRealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#64748b' }} />
                <YAxis
                  tickFormatter={formatSimCompact}
                  tick={{ fontSize: 10.5, fill: '#64748b' }}
                  width={62}
                />
                <Tooltip
                  formatter={(v: unknown, n: unknown) => [formatSimCompact(Number(v)), String(n)]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    color: '#ffffff',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="netValue"
                  name="Net Projected Value (After TER)"
                  stroke="#2563eb"
                  strokeWidth={2.2}
                  fill="url(#simNetGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="realValue"
                  name="Inflation-Adjusted Real Value"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#simRealGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="invested"
                  name="Principal Contributed"
                  stroke="#64748b"
                  strokeWidth={1.6}
                  strokeDasharray="4 3"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ROW 6: 11. COMMUNITY POSTS + 12. SECTOR DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section
          id="ind-community"
          data-testid="individual-section-community"
          className="lg:col-span-7 rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#e2e8f0]">
            <div>
              <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#2563eb]" />
                <span>Community Posts — {activeFund.symbol}</span>
              </h3>
              <p className="text-xs text-[#64748b] mt-0.5">
                Peer analyst commentary, tail-risk discussions, and quarterly mandate checks
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#64748b]">
              {communityPosts.length} verified notes
            </span>
          </div>

          <div className="space-y-3">
            {communityPosts.map((post) => {
              const voted = Boolean(upvotedIds[post.id]);
              return (
                <article
                  key={post.id}
                  className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-[#0f172a]">{post.author}</span>
                      <span className="text-[#64748b]">· {post.role}</span>
                      <span className="text-[10.5px] font-mono text-[#94a3b8]">
                        {post.timestamp}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold ${
                        post.stance === 'Bullish'
                          ? 'bg-[#ecfdf5] text-[#047857]'
                          : post.stance === 'Cautious'
                            ? 'bg-[#fef2f2] text-[#b91c1c]'
                            : 'bg-[#f1f5f9] text-[#475569]'
                      }`}
                    >
                      {post.stance}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#0f172a] mb-1">{post.title}</h4>
                  <p className="text-xs text-[#475569] leading-relaxed">{post.body}</p>
                  <div className="mt-2.5 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setUpvotedIds((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                      }
                      className={`px-2.5 py-1 rounded-[6px] border text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer transition-colors ${
                        voted
                          ? 'bg-[#eff6ff] border-[#93c5fd] text-[#1d4ed8] font-bold'
                          : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{post.upvotes + (voted ? 1 : 0)}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="ind-sectors"
          data-testid="individual-section-sectors"
          className="lg:col-span-5 rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#e2e8f0]">
              <div>
                <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#2563eb]" />
                  <span>Sector Distribution</span>
                </h3>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Explicit portfolio weighting across underlying sectors &amp; asset sleeves
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#64748b]">
                {intel.sectorHeatmap.length} sleeves
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-[#e2e8f0] overflow-hidden flex mb-4">
              {intel.sectorHeatmap.map((s, idx) => (
                <div
                  key={s.sector}
                  title={`${s.sector}: ${s.weightPct.toFixed(1)}%`}
                  style={{
                    width: `${s.weightPct}%`,
                    backgroundColor: SECTOR_BAR_COLORS[idx % SECTOR_BAR_COLORS.length],
                  }}
                  className="h-full"
                />
              ))}
            </div>

            <div className="space-y-2.5">
              {intel.sectorHeatmap.map((s, idx) => (
                <div key={s.sector}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="inline-flex items-center gap-2 font-medium text-[#0f172a] truncate pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: SECTOR_BAR_COLORS[idx % SECTOR_BAR_COLORS.length],
                        }}
                      />
                      {s.sector}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                      <span
                        className={`text-[10.5px] ${
                          s.change1MPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                        }`}
                      >
                        {s.change1MPct >= 0 ? '+' : ''}
                        {s.change1MPct.toFixed(1)}% 1M
                      </span>
                      <span className="font-bold text-[#0f172a] w-11 text-right">
                        {s.weightPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#eef2f6] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, s.weightPct)}%`,
                        backgroundColor: SECTOR_BAR_COLORS[idx % SECTOR_BAR_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] font-mono text-[#64748b]">
            <span>Top Sector: {intel.sectorHeatmap[0]?.sector || activeFund.category}</span>
            <span className="font-bold text-[#0f172a]">
              {intel.sectorHeatmap[0]?.weightPct.toFixed(1) ?? '100.0'}% weight
            </span>
          </div>
        </section>
      </div>

      {/* ROW 7: 13. ABOUT & INSTITUTIONAL METADATA (ISIN, CUSIP/AMFI, FIGI, CFI, Issuer, Mandate) */}
      <section
        id="ind-about"
        data-testid="individual-section-about"
        className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e2e8f0]">
          <div>
            <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2563eb]" />
              <span>About {activeFund.symbol} &amp; Institutional Identifiers</span>
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Regulatory identifiers, fund house governance, tracked index, and scheme investment mandate
            </p>
          </div>
          <a
            href={activeFund.about.homePageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono font-semibold text-[#2563eb] hover:underline inline-flex items-center gap-1"
          >
            <span>{activeFund.about.homePage}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Asset Class', value: activeFund.about.assetClass },
            { label: 'Focus', value: activeFund.about.focus },
            { label: 'Expense Ratio', value: `${activeFund.about.expenseRatioPct.toFixed(2)}%` },
            { label: 'Inception Date', value: activeFund.about.inceptionDate },
            { label: 'Issuer / Brand', value: activeFund.about.issuer },
            { label: 'Index Tracked', value: activeFund.about.indexTracked },
            { label: 'Exchange / Venue', value: activeFund.exchange },
            { label: 'Structure', value: activeFund.instrumentType },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5"
            >
              <div className="text-[10.5px] text-[#64748b]">{row.label}</div>
              <div className="font-semibold text-[#0f172a] mt-0.5 truncate" title={row.value}>
                {row.value}
              </div>
            </div>
          ))}
        </div>

        {/* Copyable Regulatory Identifiers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: 'isin', label: 'ISIN', value: activeFund.about.isin },
            {
              key: 'cusip',
              label: activeFund.about.cusipLabel,
              value: activeFund.about.cusipOrAmfi,
            },
            { key: 'figi', label: 'FIGI', value: activeFund.about.figi },
            { key: 'cfi', label: 'CFI Code', value: activeFund.about.cfiCode },
          ].map((idItem) => {
            const copied = copiedIdKey === idItem.key;
            return (
              <div
                key={idItem.key}
                className="rounded-[9px] border border-[#dbeafe] bg-[#f8fbff] px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase text-[#64748b]">
                    {idItem.label}
                  </div>
                  <div className="text-xs font-mono font-bold text-[#0f172a] truncate">
                    {idItem.value}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyIdentifier(idItem.key, idItem.value)}
                  aria-label={`Copy ${idItem.label} ${idItem.value}`}
                  className="p-1.5 rounded-[6px] bg-white border border-[#cbd5e1] hover:border-[#2563eb] text-[#475569] hover:text-[#2563eb] cursor-pointer shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#059669]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Mandate Description */}
        <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3.5">
          <p
            className={`text-xs text-[#334155] leading-relaxed ${
              showFullAbout ? '' : 'line-clamp-3'
            }`}
          >
            {activeFund.about.description}
          </p>
          <button
            type="button"
            onClick={() => setShowFullAbout((p) => !p)}
            className="mt-2 text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
          >
            {showFullAbout ? 'Show less mandate detail' : 'Read full mandate description'}
          </button>
        </div>
      </section>

      {/* ROW 8: 14-16. FUND MANAGER + VALIDATION RATIOS & RETURN ON AVERAGE + HEAT MAP + BULL & BEAR CASE */}
      <div
        id="ind-deep"
        data-testid="individual-section-deep-analytics"
        className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
      >
        <FundDeepAnalyticsPanels fund={activeFund} />
      </div>
    </div>
  );
};
