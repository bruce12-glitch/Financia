import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Globe2,
  MessageSquare,
  Newspaper,
  PieChart,
  ShieldAlert,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
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
  ExposureDonutChart,
  SeasonalsOverlayChart,
  TechnicalsGauge,
} from './FundDossierCharts';
import { FundDeepAnalyticsPanels } from './FundDeepAnalyticsPanels';

export interface TerminalIndividualAnalysisPanelProps {
  activeStock: StockQuote;
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
> = ({ activeStock, onSelectInstrument, onCompareWithFund }) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | ScreenerInstrumentType>('ALL');
  const [returnsMode, setReturnsMode] = useState<'total' | 'price'>('total');
  const [showAllNews, setShowAllNews] = useState<boolean>(true);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});

  const filteredPickerFunds = useMemo(() => {
    if (typeFilter === 'ALL') return SCREENER_FUNDS;
    return SCREENER_FUNDS.filter((f) => f.instrumentType === typeFilter);
  }, [typeFilter]);

  // Guaranteed complete ScreenerFundRecord for every single MF, ETF, Gold, Debt, or custom ticker
  const activeFund: ScreenerFundRecord = useMemo(() => {
    const match = SCREENER_FUNDS.find(
      (f) => f.symbol.toUpperCase() === activeStock.ticker.toUpperCase()
    );
    if (match) return match;
    return synthesizeScreenerFundFromQuote(activeStock);
  }, [activeStock]);

  const intel = useMemo(() => getFundIntelligence(activeFund), [activeFund]);
  const risk = useMemo(() => computeInstrumentRiskProfile(activeFund, intel), [activeFund, intel]);
  const riskSummary = useMemo(
    () => evaluateRiskAdjustedRatios(activeFund, intel),
    [activeFund, intel]
  );
  const communityPosts = useMemo(
    () => buildInstrumentCommunityPosts(activeFund),
    [activeFund]
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

  const jumpSections = [
    { id: 'ind-news', label: 'News' },
    { id: 'ind-keystats', label: 'Key Stats' },
    { id: 'ind-risk', label: 'Risk Ratios' },
    { id: 'ind-returns', label: 'Returns' },
    { id: 'ind-exposure', label: 'Exposure & Regions' },
    { id: 'ind-technicals', label: 'Technicals' },
    { id: 'ind-community', label: 'Community' },
    { id: 'ind-sectors', label: 'Sector Dist.' },
    { id: 'ind-deep', label: 'Manager · Heatmap · Bull/Bear' },
  ];

  return (
    <div
      data-testid="terminal-individual-analysis"
      className="space-y-6"
    >
      {/* Top Instrument Selector Bar (All 20 Mutual Funds, ETFs, Gold, Debt) */}
      <div className="rounded-[14px] bg-white border border-[#e2e8f0] p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold">
              Section 1 · Full Individual Instrument Analysis (All 13 Modules Guaranteed)
            </div>
            <h2 className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
              {activeFund.name}{' '}
              <span className="font-mono text-sm font-semibold text-[#2563eb]">
                ({activeFund.symbol})
              </span>
            </h2>
            <div className="text-xs text-[#64748b] mt-0.5">
              {activeFund.exchange} · {activeFund.instrumentType} · {activeFund.category} ·{' '}
              {activeFund.subCategory}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label="Filter instrument picker by type"
              className="inline-flex items-center p-0.5 rounded-[8px] bg-[#f1f5f9] border border-[#e2e8f0]"
            >
              {(['ALL', 'Mutual Fund', 'ETF'] as const).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setTypeFilter(tp)}
                  className={`px-2.5 py-1 rounded-[6px] text-xs font-semibold cursor-pointer ${
                    typeFilter === tp
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {tp === 'ALL' ? `All (${SCREENER_FUNDS.length})` : tp === 'Mutual Fund' ? 'MFs' : 'ETFs'}
                </button>
              ))}
            </div>

            {onCompareWithFund && (
              <button
                type="button"
                data-testid="individual-compare-cta"
                onClick={() => onCompareWithFund(activeFund.symbol)}
                className="h-8 px-3 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare {activeFund.symbol} vs Any Fund</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Quick Instrument Strip across all 20 instruments */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {filteredPickerFunds.map((f) => {
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

        {/* Price Snapshot + Section Quick Jump Bar */}
        <div className="pt-3 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span
              data-testid="individual-active-price"
              className="text-3xl font-display font-bold text-[#0f172a] tabular-nums"
            >
              {currencyPrefix}
              {activeFund.price.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-[#64748b]">{activeFund.currency}</span>
            <span
              className={`inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums ${
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
            </span>
            <span className="text-[11px] font-mono text-[#64748b]">
              · Day {currencyPrefix}
              {activeFund.dayLow.toFixed(1)}–{activeFund.dayHigh.toFixed(1)} · 52W{' '}
              {currencyPrefix}
              {activeFund.week52Low.toFixed(1)}–{activeFund.week52High.toFixed(1)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {jumpSections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="px-2 py-1 rounded-[6px] bg-[#f8fafc] hover:bg-[#eff6ff] border border-[#e2e8f0] text-[11px] font-medium text-[#475569] hover:text-[#1d4ed8] transition-colors"
              >
                {sec.label}
              </a>
            ))}
          </div>
        </div>
      </div>

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
              <div className="flex justify-between text-[11px] font-mono text-[#64748b] mb-1">
                <span>Day Range: {currencyPrefix}{activeFund.dayLow.toFixed(2)}</span>
                <span>{currencyPrefix}{activeFund.dayHigh.toFixed(2)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#e2e8f0] relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#2563eb] border-2 border-white shadow-xs"
                  style={{ left: `calc(${dayMarkerPct}% - 5px)` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#64748b] mb-1">
                <span>52W Range: {currencyPrefix}{activeFund.week52Low.toFixed(2)}</span>
                <span>{currencyPrefix}{activeFund.week52High.toFixed(2)}</span>
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
              { label: 'Assets Under Management', value: activeFund.keyStats.aumLabel, sub: activeFund.about.issuer },
              { label: 'Expense Ratio (TER)', value: `${activeFund.about.expenseRatioPct.toFixed(2)}%`, sub: 'Annual net fee' },
              { label: 'Dividend / YTM Yield', value: `${activeFund.keyStats.dividendYieldPct.toFixed(2)}%`, sub: 'Trailing distribution' },
              { label: 'Discount / Premium to NAV', value: `${activeFund.keyStats.discountPremiumPct >= 0 ? '+' : ''}${activeFund.keyStats.discountPremiumPct.toFixed(2)}%`, sub: activeFund.instrumentType },
              { label: 'Total Holdings', value: String(activeFund.keyStats.totalHoldings), sub: `Turnover ${activeFund.keyStats.turnoverPct.toFixed(0)}%` },
              { label: 'Volume / 30D Avg', value: activeFund.volumeLabel, sub: `Avg ${activeFund.avgVolume30dLabel}` },
              { label: 'Tracking Error (3Y)', value: `${activeFund.keyStats.trackingErrorPct.toFixed(2)}%`, sub: activeFund.about.indexTracked },
              { label: 'Beta (3Y vs Index)', value: activeFund.keyStats.beta3Y.toFixed(2), sub: `R² ${intel.ratios.rSquared.toFixed(2)}` },
              { label: 'Inception Date', value: activeFund.about.inceptionDate, sub: `${activeFund.about.cusipLabel}: ${activeFund.about.cusipOrAmfi}` },
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

      {/* ROW 2: 3. RISK-ADJUSTED VALIDATION RATIOS (Sharpe, Sortino, Treynor, VaR 95%, CVaR, Max DD, Calmar) */}
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
            { label: 'Sharpe (3Y)', val: activeFund.keyStats.sharpe3Y.toFixed(2), tone: 'text-[#059669]', hint: 'Total risk efficiency' },
            { label: 'Sortino (3Y)', val: intel.ratios.sortino3Y.toFixed(2), tone: 'text-[#059669]', hint: 'Downside efficiency' },
            { label: 'Treynor Ratio', val: intel.ratios.treynorRatio.toFixed(2), tone: 'text-[#1d4ed8]', hint: 'Per unit beta' },
            { label: '1M VaR (95%)', val: `${risk.var95MonthlyPct.toFixed(2)}%`, tone: 'text-[#dc2626]', hint: 'Monthly tail loss' },
            { label: '1M CVaR (95%)', val: `${risk.cvar95MonthlyPct.toFixed(2)}%`, tone: 'text-[#b91c1c]', hint: 'Expected shortfall' },
            { label: '3Y Max Drawdown', val: `${risk.maxDrawdown3YPct.toFixed(1)}%`, tone: 'text-[#dc2626]', hint: 'Peak-to-trough drop' },
            { label: 'Calmar Ratio', val: risk.calmarRatio.toFixed(2), tone: 'text-[#0f172a]', hint: 'Return / Max DD' },
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

      {/* ROW 3: 4. RETURNS (Price/Total + Seasonals) + 5. EXPOSURE TYPE + 6. REGION BREAKDOWN + 7. TECHNICALS */}
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
          {/* 5. Exposure Type */}
          <section
            id="ind-exposure"
            data-testid="individual-section-exposure"
            className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
          >
            <ExposureDonutChart slices={activeFund.exposure} />
          </section>

          {/* 7. Technicals */}
          <section
            id="ind-technicals"
            data-testid="individual-section-technicals"
            className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
          >
            <TechnicalsGauge technicals={activeFund.technicals} />
          </section>

          {/* 6. Stock Breakdown by Region */}
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

      {/* ROW 4: 8. COMMUNITY POSTS + 11. SECTOR DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 8. Community Posts */}
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

        {/* 11. Sector Distribution */}
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

            {/* Stacked Ribbon */}
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

            {/* Explicit Sector List */}
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

      {/* ROW 5: 9. FUND MANAGER + 10. VALIDATION RATIOS & RETURN ON AVERAGE + 12. HEAT MAP + 13. BULL & BEAR CASE */}
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
