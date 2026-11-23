import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Download,
  GitCompare,
  Layers,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { SCREENER_FUNDS, ScreenerFundRecord } from '../utils/screenerEngine';
import {
  buildMultiFundComparison,
  ComparisonPriorityMode,
  computeFundValidationScore,
  computeTenYearFeeDrag,
  computeTenYearNetWealth,
  evaluateRiskAdjustedRatios,
  getFundIntelligence,
  selectPeerComparisonSymbols,
} from '../utils/fundIntelligenceEngine';
import {
  buildComparisonCsv,
  computeInstrumentRiskProfile,
  InstrumentRiskProfile,
} from '../utils/riskAnalyticsEngine';
import {
  CorrelationAndBlendView,
  FrontierAndCompoundingView,
} from './TerminalAdvancedComparePanels';

export interface TerminalComparisonWorkbenchProps {
  primarySymbol: string;
  comparisonTickers: string[];
  extraFunds?: ScreenerFundRecord[];
  analysisMode: 'single' | 'multi';
  embeddedInTab?: boolean;
  onSwitchAnalysisMode: (mode: 'single' | 'multi') => void;
  onSelectPrimary: (symbol: string) => void;
  onChangeComparisonTickers: (nextTickers: string[]) => void;
}

const PRIORITY_MODES: Array<{ id: ComparisonPriorityMode; label: string; hint: string }> = [
  { id: 'balanced', label: 'Balanced', hint: 'Composite institutional score across risk, cost, drawdown & alpha' },
  { id: 'max_return', label: 'Max Return', hint: 'Prioritizes 3Y annualized returns and active alpha generation' },
  { id: 'lowest_risk', label: 'Lowest Risk', hint: 'Prioritizes shallowest 3Y drawdown and lowest return volatility' },
  { id: 'lowest_cost', label: 'Lowest Cost', hint: 'Prioritizes lowest TER fee drag and tightest tracking error' },
];

const WORKBENCH_PRESETS: Array<{ label: string; primary: string; peers: string[] }> = [
  { label: 'Small & Mid Cap', primary: 'QUANTSC', peers: ['NIPSMALL', 'HDFCMID'] },
  { label: 'Debt & Gilt', primary: 'HDFCCORP', peers: ['ICICIGILT', 'SBIGILT', 'LIQUIDBEES'] },
  { label: 'Bullion & Metals', primary: 'GOLDBEES', peers: ['SILVERBEES', 'GLD'] },
  { label: 'India ETFs', primary: 'BANKBEES', peers: ['JUNIORBEES', 'NIFTYBEES'] },
  { label: 'US Core ETFs', primary: 'QQQ', peers: ['VTI', 'SPY', 'TLT'] },
];

function formatMoney(value: number, currency: 'INR' | 'USD'): string {
  const prefix = currency === 'INR' ? '₹' : '$';
  return `${prefix}${Math.round(value).toLocaleString('en-US')}`;
}

export const TerminalComparisonWorkbench: React.FC<TerminalComparisonWorkbenchProps> = ({
  primarySymbol,
  comparisonTickers,
  extraFunds = [],
  analysisMode,
  embeddedInTab = false,
  onSwitchAnalysisMode,
  onSelectPrimary,
  onChangeComparisonTickers,
}) => {
  const [priorityMode, setPriorityMode] = useState<ComparisonPriorityMode>('balanced');
  const [pickerSymbol, setPickerSymbol] = useState<string>('');
  const [compareSubTab, setCompareSubTab] = useState<'matrix' | 'charts' | 'blend'>('matrix');

  const allAvailableFunds: ScreenerFundRecord[] = useMemo(() => {
    const seen = new Set(SCREENER_FUNDS.map((f) => f.symbol.toUpperCase()));
    const extras = extraFunds.filter((f) => !seen.has(f.symbol.toUpperCase()));
    return [...extras, ...SCREENER_FUNDS];
  }, [extraFunds]);

  const primaryFund: ScreenerFundRecord = useMemo(() => {
    const up = primarySymbol.trim().toUpperCase();
    return (
      allAvailableFunds.find((f) => f.symbol.toUpperCase() === up || f.id.toUpperCase() === up) ||
      allAvailableFunds[0]
    );
  }, [primarySymbol, allAvailableFunds]);

  const primaryIntel = useMemo(() => getFundIntelligence(primaryFund), [primaryFund]);
  const primaryValidation = useMemo(
    () => computeFundValidationScore(primaryFund, primaryIntel),
    [primaryFund, primaryIntel]
  );
  const primaryRiskRatios = useMemo(
    () => evaluateRiskAdjustedRatios(primaryFund, primaryIntel),
    [primaryFund, primaryIntel]
  );
  const primaryTenYearWealth = useMemo(
    () =>
      computeTenYearNetWealth(
        primaryIntel.returnOnAverage.avgAnnualReturn3Y,
        primaryFund.about.expenseRatioPct
      ),
    [primaryIntel, primaryFund]
  );
  const primaryTenYearFeeDrag = useMemo(
    () => computeTenYearFeeDrag(primaryFund.about.expenseRatioPct),
    [primaryFund]
  );

  // Resolve up to 4 instruments for Multi-Instrument Comparison (Primary + up to 3 peers)
  const activeBasketFunds = useMemo(() => {
    const list: ScreenerFundRecord[] = [primaryFund];
    const seen = new Set<string>([primaryFund.symbol.toUpperCase()]);

    for (const raw of comparisonTickers) {
      const up = raw.trim().toUpperCase();
      if (seen.has(up)) continue;
      const match = allAvailableFunds.find(
        (f) => f.symbol.toUpperCase() === up || f.id.toUpperCase() === up
      );
      if (match) {
        list.push(match);
        seen.add(match.symbol.toUpperCase());
      }
      if (list.length >= 4) break;
    }

    // In multi mode, if only primary is present, auto-attach 2 category peers so Best vs Worst always works
    if (list.length < 2) {
      const autoPeers = selectPeerComparisonSymbols(primaryFund.symbol, allAvailableFunds, 2);
      for (const peerSym of autoPeers) {
        if (seen.has(peerSym)) continue;
        const match = allAvailableFunds.find((f) => f.symbol.toUpperCase() === peerSym);
        if (match) {
          list.push(match);
          seen.add(match.symbol.toUpperCase());
        }
      }
    }

    return list;
  }, [primaryFund, comparisonTickers, allAvailableFunds]);

  const comparison = useMemo(
    () => buildMultiFundComparison(activeBasketFunds, priorityMode),
    [activeBasketFunds, priorityMode]
  );

  const primaryRisk = useMemo(
    () => computeInstrumentRiskProfile(primaryFund, primaryIntel),
    [primaryFund, primaryIntel]
  );

  const basketRiskBySymbol = useMemo(() => {
    const map: Record<string, InstrumentRiskProfile> = {};
    for (const item of comparison.items) {
      map[item.fund.symbol] = computeInstrumentRiskProfile(item.fund, item.intel);
    }
    return map;
  }, [comparison.items]);

  const tailRiskExtremes = useMemo(() => {
    const entries = comparison.items.map((i) => ({
      symbol: i.fund.symbol,
      risk: basketRiskBySymbol[i.fund.symbol],
    }));
    const byVarAsc = [...entries].sort(
      (a, b) => Math.abs(a.risk.var95MonthlyPct) - Math.abs(b.risk.var95MonthlyPct)
    );
    const byCvarAsc = [...entries].sort(
      (a, b) => Math.abs(a.risk.cvar95MonthlyPct) - Math.abs(b.risk.cvar95MonthlyPct)
    );
    const byCalmarDesc = [...entries].sort((a, b) => b.risk.calmarRatio - a.risk.calmarRatio);
    return {
      bestVar: byVarAsc[0]?.symbol || '',
      worstVar: byVarAsc[byVarAsc.length - 1]?.symbol || '',
      bestCvar: byCvarAsc[0]?.symbol || '',
      worstCvar: byCvarAsc[byCvarAsc.length - 1]?.symbol || '',
      bestCalmar: byCalmarDesc[0]?.symbol || '',
      worstCalmar: byCalmarDesc[byCalmarDesc.length - 1]?.symbol || '',
    };
  }, [comparison.items, basketRiskBySymbol]);

  const handleExportComparisonCsv = () => {
    const csv = buildComparisonCsv(comparison, basketRiskBySymbol);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financia-comparison-${comparison.items.map((i) => i.fund.symbol).join('-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableToAdd = useMemo(() => {
    const taken = new Set(activeBasketFunds.map((f) => f.symbol.toUpperCase()));
    return allAvailableFunds.filter((f) => !taken.has(f.symbol.toUpperCase()));
  }, [activeBasketFunds, allAvailableFunds]);

  const handleAddPeer = (sym: string) => {
    if (!sym) return;
    const up = sym.toUpperCase();
    if (up === primaryFund.symbol.toUpperCase()) return;
    const nextPeers = Array.from(
      new Set([
        ...comparisonTickers.map((t) => t.toUpperCase()).filter((t) => t !== primaryFund.symbol.toUpperCase()),
        up,
      ])
    ).slice(0, 3);
    onChangeComparisonTickers(nextPeers);
    setPickerSymbol('');
  };

  const handleRemovePeer = (sym: string) => {
    const up = sym.toUpperCase();
    const nextPeers = comparisonTickers
      .map((t) => t.toUpperCase())
      .filter((t) => t !== up && t !== primaryFund.symbol.toUpperCase());
    onChangeComparisonTickers(nextPeers);
  };

  const handleAutoPeers = () => {
    const peers = selectPeerComparisonSymbols(primaryFund.symbol, allAvailableFunds, 2);
    onChangeComparisonTickers(peers);
  };

  const handleCompareThisSingleInstrument = () => {
    if (comparisonTickers.length === 0) {
      const peers = selectPeerComparisonSymbols(primaryFund.symbol, allAvailableFunds, 2);
      onChangeComparisonTickers(peers);
    }
    onSwitchAnalysisMode('multi');
  };

  const gradeBadgeStyle = (grade: string) => {
    if (grade === 'Institutional') return 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]';
    if (grade === 'Strong') return 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]';
    if (grade === 'Moderate') return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]';
    return 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]';
  };

  // ============================================================================
  // SINGLE-INSTRUMENT INSTITUTIONAL DEEP DOSSIER MODE
  // ============================================================================
  if (analysisMode === 'single') {
    const curr = primaryFund.currency;
    return (
      <div
        data-testid="terminal-single-dossier"
        className={`${embeddedInTab ? 'mt-0' : 'mt-8'} rounded-[14px] bg-white border border-[#e2e8f0] overflow-hidden shadow-xs`}
      >
        <div className="px-5 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold">
              Single-Instrument Institutional Deep Dossier
            </div>
            <h3 className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
              {primaryFund.name} ({primaryFund.symbol})
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              {primaryFund.instrumentType} · {primaryFund.exchange} · {primaryFund.category} · ISIN {primaryFund.about.isin}
            </p>
          </div>
          <button
            type="button"
            data-testid="single-to-multi-cta"
            onClick={handleCompareThisSingleInstrument}
            className="h-9 px-4 rounded-[8px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Compare {primaryFund.symbol} Against Multiple Instruments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 md:p-6 space-y-6">
          {/* Core 4-Metric KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div className="text-[11px] font-mono uppercase text-[#64748b]">Validation Score</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold text-[#0f172a] tabular-nums">
                  {primaryValidation.overall}
                </span>
                <span className="text-xs font-mono text-[#64748b]">/ 100</span>
              </div>
              <div className="text-xs font-semibold text-[#2563eb] mt-1">{primaryValidation.grade}</div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div className="text-[11px] font-mono uppercase text-[#64748b]">3Y Avg Return / 5Y Avg</div>
              <div className="mt-1 text-2xl font-display font-bold text-[#059669] tabular-nums">
                {primaryIntel.returnOnAverage.avgAnnualReturn3Y >= 0 ? '+' : ''}
                {primaryIntel.returnOnAverage.avgAnnualReturn3Y.toFixed(1)}%
              </div>
              <div className="text-xs text-[#475569] font-mono tabular-nums mt-1">
                5Y: {primaryIntel.returnOnAverage.avgAnnualReturn5Y >= 0 ? '+' : ''}
                {primaryIntel.returnOnAverage.avgAnnualReturn5Y.toFixed(1)}% · Peer {primaryIntel.returnOnAverage.excessOverPeerBps >= 0 ? '+' : ''}
                {primaryIntel.returnOnAverage.excessOverPeerBps} bps
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div className="text-[11px] font-mono uppercase text-[#64748b]">Expense Ratio &amp; 10Y Net Wealth</div>
              <div className="mt-1 text-2xl font-display font-bold text-[#0f172a] tabular-nums">
                {primaryFund.about.expenseRatioPct.toFixed(2)}%
              </div>
              <div className="text-xs text-[#475569] font-mono tabular-nums mt-1">
                100k → {formatMoney(primaryTenYearWealth, curr)} (Fee drag -{formatMoney(primaryTenYearFeeDrag, curr)})
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div className="text-[11px] font-mono uppercase text-[#64748b]">Lead Fund Manager &amp; Scale</div>
              <div className="mt-1 text-base font-display font-bold text-[#0f172a] truncate">
                {primaryIntel.manager.leadManager}
              </div>
              <div className="text-xs text-[#475569] font-mono tabular-nums mt-1">
                {primaryIntel.manager.tenureYears.toFixed(1)}Y tenure · AUM {primaryFund.keyStats.aumLabel}
              </div>
            </div>
          </div>

          {/* Dedicated Risk-Adjusted Validation Ratios (Sharpe, Sortino, Treynor) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-display font-bold text-[#0f172a] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2563eb]" />
                <span>Institutional Risk-Adjusted Ratios (3Y)</span>
              </h4>
              <span className="text-xs font-mono text-[#64748b] tabular-nums">
                Alpha {primaryIntel.ratios.alpha3Y >= 0 ? '+' : ''}{primaryIntel.ratios.alpha3Y.toFixed(2)}% · Max DD {primaryFund.keyStats.maxDrawdown3YPct.toFixed(1)}% · Vol {primaryIntel.ratios.stdDev3Y.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(
                [
                  { label: 'Sharpe Ratio (3Y)', data: primaryRiskRatios.sharpe },
                  { label: 'Sortino Ratio (3Y)', data: primaryRiskRatios.sortino },
                  { label: 'Treynor Ratio (3Y)', data: primaryRiskRatios.treynor },
                ] as const
              ).map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[10px] border border-[#e2e8f0] p-4 bg-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#334155]">{metric.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10.5px] font-semibold ${gradeBadgeStyle(
                        metric.data.grade
                      )}`}
                    >
                      {metric.data.grade}
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#0f172a] tabular-nums mt-1.5">
                    {metric.data.value.toFixed(2)}
                  </div>
                  <p className="text-[11.5px] text-[#64748b] mt-1">{metric.data.note}</p>
                </div>
              ))}
            </div>

            {/* Tail-Risk Strip (VaR 95%, CVaR 95%, 3Y Max DD, Calmar) */}
            <div className="mt-3.5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-[9px] border border-[#fecaca] bg-[#fef2f2]/60 p-3">
                <div className="text-[10.5px] font-mono uppercase text-[#991b1b]">1M VaR (95%)</div>
                <div className="text-lg font-mono font-bold text-[#dc2626] tabular-nums mt-0.5">
                  {primaryRisk.var95MonthlyPct.toFixed(2)}%
                </div>
                <div className="text-[10.5px] font-mono text-[#64748b]">
                  99% VaR {primaryRisk.var99MonthlyPct.toFixed(2)}%
                </div>
              </div>
              <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <div className="text-[10.5px] font-mono uppercase text-[#64748b]">1M CVaR (95%)</div>
                <div className="text-lg font-mono font-bold text-[#b91c1c] tabular-nums mt-0.5">
                  {primaryRisk.cvar95MonthlyPct.toFixed(2)}%
                </div>
                <div className="text-[10.5px] font-mono text-[#64748b]">Expected shortfall</div>
              </div>
              <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <div className="text-[10.5px] font-mono uppercase text-[#64748b]">3Y Max Drawdown</div>
                <div className="text-lg font-mono font-bold text-[#dc2626] tabular-nums mt-0.5">
                  {primaryRisk.maxDrawdown3YPct.toFixed(1)}%
                </div>
                <div className="text-[10.5px] font-mono text-[#64748b]">{primaryRisk.riskTier}</div>
              </div>
              <div className="rounded-[9px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-3">
                <div className="text-[10.5px] font-mono uppercase text-[#1d4ed8]">Calmar Ratio</div>
                <div className="text-lg font-mono font-bold text-[#1d4ed8] tabular-nums mt-0.5">
                  {primaryRisk.calmarRatio.toFixed(2)}
                </div>
                <div className="text-[10.5px] font-mono text-[#475569]">Return / Max DD</div>
              </div>
            </div>
          </div>

          {/* Top Holdings + Bull/Bear Targets */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 rounded-[10px] border border-[#e2e8f0] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-display font-bold text-[#0f172a]">
                  Top Holdings ({primaryFund.keyStats.totalHoldings} total)
                </h4>
                <span className="text-[11px] font-mono text-[#64748b]">
                  {primaryIntel.ratios.roaeLabel}: {primaryIntel.ratios.roaePct.toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2.5">
                {primaryIntel.topHoldings.slice(0, 5).map((holding) => (
                  <div key={holding.ticker} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#0f172a] truncate pr-2">
                        {holding.name}{' '}
                        <span className="font-mono text-[#64748b]">({holding.ticker})</span>
                      </span>
                      <span className="font-mono font-semibold text-[#0f172a] tabular-nums shrink-0">
                        {holding.weightPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.min(100, holding.weightPct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4]/70 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#047857]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{primaryIntel.bullCase.headlineMetricLabel}</span>
                </div>
                <div className="text-2xl font-mono font-bold text-[#059669] tabular-nums mt-1">
                  {primaryIntel.bullCase.headlineMetricValue}
                </div>
                <p className="text-xs text-[#334155] leading-relaxed mt-2">
                  {primaryIntel.bullCase.summary}
                </p>
              </div>
              <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2]/70 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#b91c1c]">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{primaryIntel.bearCase.headlineMetricLabel}</span>
                </div>
                <div className="text-2xl font-mono font-bold text-[#dc2626] tabular-nums mt-1">
                  {primaryIntel.bearCase.headlineMetricValue}
                </div>
                <p className="text-xs text-[#334155] leading-relaxed mt-2">
                  {primaryIntel.bearCase.summary}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MULTI-INSTRUMENT BEST VS WORST COMPARISON WORKBENCH MODE
  // ============================================================================
  const maxWealth = Math.max(...comparison.items.map((i) => i.tenYearNetWealthOn100k), 1);

  const BestFlag = () => (
    <span className="ml-1.5 text-[10px] font-sans font-semibold text-[#047857]">Best</span>
  );
  const WorstFlag = () => (
    <span className="ml-1.5 text-[10px] font-sans font-semibold text-[#b91c1c]">Worst</span>
  );

  const isMulti = comparison.items.length > 1;

  return (
    <div
      data-testid="terminal-comparison-workbench"
      className={`${embeddedInTab ? 'mt-0' : 'mt-8'} rounded-[14px] bg-white border border-[#e2e8f0] overflow-hidden shadow-xs`}
    >
      {/* Header & Ranking Priority Mode Selector */}
      <div className="px-5 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold">
            Live Multi-Instrument Decision Engine · {allAvailableFunds.length} Loaded + 14,481 AMFI Schemes
          </div>
          <h3 className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
            Head-to-Head Best vs. Worst Comparison Studio
          </h3>
          <p className="text-xs text-[#64748b] mt-0.5">
            {PRIORITY_MODES.find((m) => m.id === priorityMode)?.hint}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Ranking goal priority"
            className="inline-flex items-center p-1 rounded-[9px] bg-white border border-[#cbd5e1]"
          >
            {PRIORITY_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                data-testid={`workbench-priority-${mode.id}`}
                onClick={() => setPriorityMode(mode.id)}
                className={`px-2.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  priorityMode === mode.id
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="workbench-export-csv"
            onClick={handleExportComparisonCsv}
            className="h-[34px] px-3 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] text-xs font-semibold text-[#334155] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Basket Selector, 20-Fund Dropdown Adder, Auto Peers & Diverse Category Presets */}
      <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-white flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {comparison.items.map(({ fund, priorityScore }, idx) => {
              const isPrimary = idx === 0;
              return (
                <div
                  key={fund.symbol}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border text-xs ${
                    isPrimary
                      ? 'bg-[#eff6ff] border-[#93c5fd] text-[#0f172a]'
                      : 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a]'
                  }`}
                >
                  <span className="font-mono font-bold">{fund.symbol}</span>
                  <span className="text-[10.5px] font-mono text-[#64748b] tabular-nums">
                    {priorityScore} pts
                  </span>
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleRemovePeer(fund.symbol)}
                      aria-label={`Remove ${fund.symbol} from workbench`}
                      className="text-[#94a3b8] hover:text-[#dc2626] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {comparison.items.length < 4 && (
              <select
                aria-label="Add any loaded fund or ETF to compare"
                data-testid="workbench-add-fund-select"
                value={pickerSymbol}
                onChange={(e) => handleAddPeer(e.target.value)}
                className="h-8 rounded-[8px] border border-[#cbd5e1] bg-white px-2.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value="">+ Add from {allAvailableFunds.length} loaded funds ({comparison.items.length}/4)</option>
                {availableToAdd.map((f) => (
                  <option key={f.symbol} value={f.symbol}>
                    {f.symbol} — {f.name} ({f.instrumentType})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleAutoPeers}
              className="h-8 px-2.5 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-xs font-medium text-[#334155] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Auto Peers</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#64748b] mr-0.5">Presets:</span>
            {WORKBENCH_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onSelectPrimary(preset.primary);
                  onChangeComparisonTickers(preset.peers);
                }}
                className="px-2.5 py-1 rounded-[7px] border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff] hover:border-[#bfdbfe] text-[11.5px] font-medium text-[#334155] transition-colors cursor-pointer whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Comparison View Switcher */}
        <div className="pt-2.5 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Comparison analytics view"
            className="inline-flex items-center p-1 rounded-[9px] bg-[#f1f5f9] border border-[#e2e8f0]"
          >
            {(
              [
                { id: 'matrix', label: 'Verdict & 21-Metric Matrix' },
                { id: 'charts', label: 'Frontier & Compounding' },
                { id: 'blend', label: 'Correlation & Blend Simulator' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={compareSubTab === tab.id}
                data-testid={`compare-subtab-${tab.id}`}
                onClick={() => setCompareSubTab(tab.id)}
                className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  compareSubTab === tab.id
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono text-[#64748b]">
            Comparing {activeBasketFunds.map((f) => f.symbol).join(' · ')}
          </span>
        </div>
      </div>

      {compareSubTab === 'charts' ? (
        <FrontierAndCompoundingView basketFunds={activeBasketFunds} />
      ) : compareSubTab === 'blend' ? (
        <CorrelationAndBlendView basketFunds={activeBasketFunds} />
      ) : (
        <>
      {/* Best Pick (#1) vs Worst Pick (#N) Verdict Banner */}
      {comparison.bestPick && comparison.worstPick && (
        <div
          data-testid="workbench-best-worst-banner"
          className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-[#f8fafc]/60 border-b border-[#e2e8f0]"
        >
          {/* BEST PICK */}
          <div
            data-testid="workbench-best-pick"
            className="rounded-[12px] border border-[#a7f3d0] bg-[#f0fdf4] p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#047857]">
                <Award className="w-4 h-4" />
                Best Pick (#1) · {comparison.bestPick.symbol}
              </span>
              <span className="font-mono text-sm font-bold text-[#047857] tabular-nums">
                {comparison.bestPick.priorityScore}/100
              </span>
            </div>
            <div className="text-sm font-display font-bold text-[#0f172a]">
              {comparison.bestPick.name}
            </div>
            <ul className="mt-2.5 space-y-1">
              {comparison.bestPick.strengths.map((pt, i) => (
                <li key={i} className="text-xs text-[#1e293b] flex items-start gap-1.5">
                  <span className="text-[#059669] font-bold">✓</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* WORST PICK */}
          <div
            data-testid="workbench-worst-pick"
            className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#b91c1c]">
                <AlertTriangle className="w-4 h-4" />
                Weakest Pick (#{comparison.rankings.length}) · {comparison.worstPick.symbol}
              </span>
              <span className="font-mono text-sm font-bold text-[#b91c1c] tabular-nums">
                {comparison.worstPick.priorityScore}/100
              </span>
            </div>
            <div className="text-sm font-display font-bold text-[#0f172a]">
              {comparison.worstPick.name}
            </div>
            <ul className="mt-2.5 space-y-1">
              {comparison.worstPick.weaknesses.map((pt, i) => (
                <li key={i} className="text-xs text-[#1e293b] flex items-start gap-1.5">
                  <span className="text-[#dc2626] font-bold">!</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Best vs Worst Spread Strip + 10Y Net Wealth Compounding Bars */}
      <div className="p-5 border-b border-[#e2e8f0] space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">3Y Return Spread</div>
            <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
              {comparison.spreadSummary.return3YSpreadPct.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Annual Avg Spread</div>
            <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
              {comparison.spreadSummary.avgAnnualReturn3YSpreadPct.toFixed(2)}% / yr
            </div>
          </div>
          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">TER Fee Spread</div>
            <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
              {comparison.spreadSummary.expenseRatioSpreadPct.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Sharpe Spread</div>
            <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
              {comparison.spreadSummary.sharpeSpread.toFixed(2)}
            </div>
          </div>
          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3 col-span-2 md:col-span-1">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">10Y Wealth Gap (100k)</div>
            <div className="text-base font-mono font-bold text-[#2563eb] tabular-nums mt-0.5">
              {comparison.spreadSummary.tenYearWealthGapOn100k.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        {/* 10-Year Net Wealth Compounding Visual Bars */}
        <div className="rounded-[10px] border border-[#e2e8f0] p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-display font-bold text-[#0f172a]">
              <BarChart3 className="w-4 h-4 text-[#2563eb]" />
              <span>10-Year Net Compounded Wealth (100,000 Base · Net of Expense Ratio)</span>
            </div>
            <span className="text-[11px] font-mono text-[#64748b]">
              Based on 3Y annualized average return minus TER
            </span>
          </div>
          <div className="space-y-2.5">
            {comparison.items.map(({ fund, tenYearNetWealthOn100k, tenYearFeeDragOn100k }) => {
              const widthPct = Math.max(12, Math.round((tenYearNetWealthOn100k / maxWealth) * 100));
              const isBest = isMulti && comparison.winners.highestNetWealth10Y === fund.symbol;
              const isWorst = isMulti && comparison.losers.lowestNetWealth10Y === fund.symbol;
              return (
                <div key={fund.symbol} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="font-bold text-[#0f172a]">
                      {fund.symbol}{' '}
                      <span className="font-sans font-normal text-[#64748b]">
                        ({fund.about.expenseRatioPct.toFixed(2)}% TER · 10Y fee drag -{formatMoney(tenYearFeeDragOn100k, fund.currency)})
                      </span>
                    </span>
                    <span className="font-bold text-[#0f172a]">
                      {formatMoney(tenYearNetWealthOn100k, fund.currency)}
                      {isBest && <BestFlag />}
                      {isWorst && <WorstFlag />}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: isBest ? '#059669' : isWorst ? '#dc2626' : '#2563eb',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 18-Metric Side-by-Side Best vs Worst Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              <th className="text-left py-3 px-4 font-semibold text-[#475569] w-[220px]">
                Data Factor (Best vs. Worst)
              </th>
              {comparison.items.map(({ fund, validation, priorityScore }) => {
                const rankObj = comparison.rankings.find((r) => r.symbol === fund.symbol);
                return (
                  <th key={fund.symbol} className="text-left py-3 px-4 border-l border-[#eef2f6]">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectPrimary(fund.symbol)}
                        className="font-mono font-bold text-sm text-[#0f172a] hover:text-[#2563eb] cursor-pointer"
                      >
                        {fund.symbol}
                      </button>
                      <span
                        className={`text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          rankObj?.rank === 1
                            ? 'bg-[#ecfdf5] text-[#047857]'
                            : rankObj?.rank === comparison.rankings.length && isMulti
                            ? 'bg-[#fef2f2] text-[#b91c1c]'
                            : 'bg-[#eff6ff] text-[#1d4ed8]'
                        }`}
                      >
                        #{rankObj?.rank} · {priorityScore}/100
                      </span>
                    </div>
                    <div className="text-[11px] font-normal text-[#64748b] truncate max-w-[200px] mt-0.5">
                      {fund.name}
                    </div>
                    <div className="text-[10.5px] font-normal text-[#94a3b8]">
                      {fund.instrumentType} · {validation.grade}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Lead Fund Manager</td>
              {comparison.items.map(({ fund, intel }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9]">
                  <div className="font-semibold text-[#0f172a]">{intel.manager.leadManager}</div>
                  <div className="text-[11px] text-[#64748b]">
                    {intel.manager.tenureYears.toFixed(1)}Y tenure · {intel.manager.experienceYears}Y exp.
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">AUM &amp; Holdings</td>
              {comparison.items.map(({ fund }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-mono tabular-nums text-[#0f172a]">
                  <span className="font-semibold">{fund.keyStats.aumLabel}</span>
                  <span className="text-[#64748b] text-[11px] ml-1.5">· {fund.keyStats.totalHoldings} holdings</span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Expense Ratio (TER)</td>
              {comparison.items.map(({ fund }) => {
                const win = isMulti && comparison.winners.lowestExpense === fund.symbol;
                const lose = isMulti && comparison.losers.highestExpense === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {fund.about.expenseRatioPct.toFixed(2)}%
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">1Y Total Return</td>
              {comparison.items.map(({ fund }) => {
                const v = fund.returnsTotal['1Y'];
                const win = isMulti && comparison.winners.highestReturn1Y === fund.symbol;
                const lose = isMulti && comparison.losers.lowestReturn1Y === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-semibold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'}
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">3Y Cumulative Return</td>
              {comparison.items.map(({ fund }) => {
                const v = fund.returnsTotal['3Y'];
                const win = isMulti && comparison.winners.highestReturn3Y === fund.symbol;
                const lose = isMulti && comparison.losers.lowestReturn3Y === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'}
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">3Y Annualized Return on Avg</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = isMulti && comparison.winners.highestAvgReturn3Y === fund.symbol;
                const lose = isMulti && comparison.losers.lowestAvgReturn3Y === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {intel.returnOnAverage.avgAnnualReturn3Y >= 0 ? '+' : ''}
                    {intel.returnOnAverage.avgAnnualReturn3Y.toFixed(2)}% / yr
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Sharpe Ratio (3Y)</td>
              {comparison.items.map(({ fund }) => {
                const win = isMulti && comparison.winners.highestSharpe === fund.symbol;
                const lose = isMulti && comparison.losers.lowestSharpe === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {fund.keyStats.sharpe3Y.toFixed(2)}
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Sortino Ratio (3Y)</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = isMulti && comparison.winners.highestSortino === fund.symbol;
                const lose = isMulti && comparison.losers.lowestSortino === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {intel.ratios.sortino3Y.toFixed(2)}
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Treynor Ratio (3Y)</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = isMulti && comparison.winners.highestTreynor === fund.symbol;
                const lose = isMulti && comparison.losers.lowestTreynor === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {intel.ratios.treynorRatio.toFixed(2)}
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Jensen&apos;s Alpha (3Y)</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = isMulti && comparison.winners.highestAlpha === fund.symbol;
                const lose = isMulti && comparison.losers.lowestAlpha === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {intel.ratios.alpha3Y >= 0 ? '+' : ''}
                    {intel.ratios.alpha3Y.toFixed(2)}%
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">1M Value-at-Risk (95% VaR)</td>
              {comparison.items.map(({ fund }) => {
                const risk = basketRiskBySymbol[fund.symbol];
                const win = isMulti && tailRiskExtremes.bestVar === fund.symbol;
                const lose = isMulti && tailRiskExtremes.worstVar === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#dc2626]'
                    }`}
                  >
                    {risk.var95MonthlyPct.toFixed(2)}%
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">1M CVaR (Expected Shortfall)</td>
              {comparison.items.map(({ fund }) => {
                const risk = basketRiskBySymbol[fund.symbol];
                const win = isMulti && tailRiskExtremes.bestCvar === fund.symbol;
                const lose = isMulti && tailRiskExtremes.worstCvar === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-semibold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#991b1b]'
                    }`}
                  >
                    {risk.cvar95MonthlyPct.toFixed(2)}%
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Max Drawdown (3Y)</td>
              {comparison.items.map(({ fund }) => {
                const win = isMulti && comparison.winners.lowestDrawdown === fund.symbol;
                const lose = isMulti && comparison.losers.worstDrawdown === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#dc2626]'
                    }`}
                  >
                    {fund.keyStats.maxDrawdown3YPct.toFixed(1)}%
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Calmar Ratio (Return / Max DD)</td>
              {comparison.items.map(({ fund }) => {
                const risk = basketRiskBySymbol[fund.symbol];
                const win = isMulti && tailRiskExtremes.bestCalmar === fund.symbol;
                const lose = isMulti && tailRiskExtremes.worstCalmar === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {risk.calmarRatio.toFixed(2)}
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">3Y Volatility (Std Dev)</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = isMulti && comparison.winners.lowestVolatility === fund.symbol;
                const lose = isMulti && comparison.losers.highestVolatility === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-semibold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {intel.ratios.stdDev3Y.toFixed(1)}%
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Upside / Downside Capture</td>
              {comparison.items.map(({ fund, intel }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-mono tabular-nums text-[#0f172a]">
                  {intel.ratios.upsideCapturePct.toFixed(1)}% / {intel.ratios.downsideCapturePct.toFixed(1)}%
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Portfolio ROAE / Yield</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = isMulti && comparison.winners.highestRoae === fund.symbol;
                const lose = isMulti && comparison.losers.lowestRoae === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857] font-bold' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                    }`}
                  >
                    {intel.ratios.roaePct.toFixed(1)}%
                    <span className="text-[10.5px] font-sans text-[#64748b] ml-1">
                      ({intel.ratios.roaeLabel})
                    </span>
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium text-[#475569]">Bull 12M Target / Bear Floor</td>
              {comparison.items.map(({ fund, intel }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-mono text-xs tabular-nums">
                  <span className="text-[#059669] font-bold">{intel.bullCase.headlineMetricValue}</span>
                  <span className="text-[#94a3b8] mx-1.5">/</span>
                  <span className="text-[#dc2626] font-bold">{intel.bearCase.headlineMetricValue}</span>
                </td>
              ))}
            </tr>
            <tr className="bg-[#f8fbff]">
              <td className="py-3 px-4 font-semibold text-[#0f172a] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#2563eb]" />
                Overall Validation Score
              </td>
              {comparison.items.map(({ fund, validation }) => {
                const win = isMulti && comparison.winners.bestValidationScore === fund.symbol;
                const lose = isMulti && comparison.losers.worstValidationScore === fund.symbol && !win;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-3 px-4 border-l border-[#e2e8f0] font-mono tabular-nums ${
                      win ? 'text-[#047857] font-bold' : lose ? 'text-[#b91c1c] font-bold' : 'text-[#0f172a] font-semibold'
                    }`}
                  >
                    {validation.overall}/100{' '}
                    <span className="text-[11px] font-sans font-medium text-[#475569]">
                      · {validation.grade}
                    </span>
                    {win && <BestFlag />}
                    {lose && <WorstFlag />}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
};
