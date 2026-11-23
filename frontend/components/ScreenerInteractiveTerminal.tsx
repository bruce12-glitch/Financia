import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowUpRight,
  GitCompare,
  PieChart,
  Plus,
  Table2,
  X,
} from 'lucide-react';
import { ScreenerFundRecord } from '../utils/screenerEngine';
import {
  buildHistoricalPortfolioReplay,
  computeAggregatedBasketSummary,
} from '../utils/portfolioAllocatorEngine';
import { TerminalComparisonWorkbench } from './TerminalComparisonWorkbench';
import { TerminalPortfolioAllocator } from './TerminalPortfolioAllocator';
import { TerminalBulkDataPanel } from './TerminalBulkDataPanel';

const LINE_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626'];

export interface ScreenerInteractiveTerminalProps {
  allFunds: ScreenerFundRecord[];
  selectedSymbols: string[];
  primarySymbol: string;
  onChangeSelectedSymbols: (nextSymbols: string[]) => void;
  onSelectPrimarySymbol: (symbol: string) => void;
  onInspectDossier: (symbol: string) => void;
  onSyncToFullTerminal?: (primary: string, peers: string[]) => void;
}

export const ScreenerInteractiveTerminal: React.FC<ScreenerInteractiveTerminalProps> = ({
  allFunds,
  selectedSymbols,
  primarySymbol,
  onChangeSelectedSymbols,
  onSelectPrimarySymbol,
  onInspectDossier,
  onSyncToFullTerminal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'compare' | 'bulk' | 'allocator'>('compare');
  const [addSymbol, setAddSymbol] = useState<string>('');

  const activeBasketFunds = useMemo(() => {
    const ordered = [primarySymbol, ...selectedSymbols.filter((s) => s !== primarySymbol)];
    const unique = Array.from(new Set(ordered));
    const matched = unique
      .map((sym) => allFunds.find((f) => f.symbol === sym))
      .filter((f): f is ScreenerFundRecord => Boolean(f));
    if (matched.length > 0) return matched;
    return allFunds.slice(0, 3);
  }, [allFunds, selectedSymbols, primarySymbol]);

  const basketSymbols = useMemo(() => activeBasketFunds.map((f) => f.symbol), [activeBasketFunds]);

  const aggregated = useMemo(
    () => computeAggregatedBasketSummary(activeBasketFunds),
    [activeBasketFunds]
  );

  // Multi-Instrument Normalized Historical Performance Chart (Base = 100)
  const normalizedReplay = useMemo(
    () => buildHistoricalPortfolioReplay(activeBasketFunds, {}, 100_000),
    [activeBasketFunds]
  );

  const availableToAdd = useMemo(() => {
    const taken = new Set(basketSymbols);
    return allFunds.filter((f) => !taken.has(f.symbol));
  }, [allFunds, basketSymbols]);

  const handleToggleBasketSymbol = (symbol: string) => {
    if (basketSymbols.includes(symbol)) {
      if (basketSymbols.length <= 2) return;
      const next = basketSymbols.filter((s) => s !== symbol);
      if (symbol === primarySymbol) {
        onSelectPrimarySymbol(next[0]);
      }
      onChangeSelectedSymbols(next);
    } else {
      const next = [...basketSymbols, symbol].slice(0, 6);
      onChangeSelectedSymbols(next);
    }
  };

  const handleAddBasketSymbol = (symbol: string) => {
    if (!symbol) return;
    if (!basketSymbols.includes(symbol)) {
      onChangeSelectedSymbols([...basketSymbols, symbol].slice(0, 6));
    }
    setAddSymbol('');
  };

  return (
    <div
      data-testid="screener-interactive-terminal"
      className="space-y-5"
    >
      {/* Interactive Multi-Instrument Header & Basket Aggregation Control Bar */}
      <div className="rounded-[14px] bg-white border border-[#e2e8f0] overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold">
              Interactive Screener Terminal · Multi-Instrument Aggregation &amp; Bulk Data
            </div>
            <h3 className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
              Live Multi-Asset Terminal Workspace ({activeBasketFunds.length} Selected · {allFunds.length} Universe)
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Aggregate real-time risk/return stats across selected ETFs &amp; Mutual Funds, compare head-to-head, inspect bulk datasets, or model custom % allocations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onSyncToFullTerminal && (
              <button
                type="button"
                data-testid="screener-sync-full-terminal"
                onClick={() =>
                  onSyncToFullTerminal(
                    activeBasketFunds[0].symbol,
                    activeBasketFunds.slice(1, 4).map((f) => f.symbol)
                  )
                }
                className="h-9 px-3.5 rounded-[8px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Basket in Top Chart Terminal</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#38bdf8]" />
              </button>
            )}
          </div>
        </div>

        {/* Active Basket Chips + Add Instrument Dropdown */}
        <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {activeBasketFunds.map((fund, idx) => (
              <div
                key={fund.symbol}
                data-testid={`screener-terminal-chip-${fund.symbol}`}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border text-xs ${
                  idx === 0
                    ? 'bg-[#eff6ff] border-[#93c5fd] text-[#0f172a]'
                    : 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
                />
                <button
                  type="button"
                  onClick={() => onInspectDossier(fund.symbol)}
                  className="font-mono font-bold hover:text-[#2563eb] cursor-pointer"
                  title={`Inspect ${fund.name} full dossier`}
                >
                  {fund.symbol}
                </button>
                <span className="text-[10.5px] font-mono text-[#64748b]">
                  {fund.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'}
                </span>
                {activeBasketFunds.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleToggleBasketSymbol(fund.symbol)}
                    aria-label={`Remove ${fund.symbol} from terminal basket`}
                    className="text-[#94a3b8] hover:text-[#dc2626] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {activeBasketFunds.length < 6 && (
              <div className="inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-[#2563eb]" />
                <select
                  aria-label="Add instrument to screener terminal basket"
                  data-testid="screener-terminal-add-select"
                  value={addSymbol}
                  onChange={(e) => handleAddBasketSymbol(e.target.value)}
                  className="h-8 rounded-[8px] border border-[#cbd5e1] bg-white px-2.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer"
                >
                  <option value="">Add instrument ({activeBasketFunds.length}/6)...</option>
                  {availableToAdd.map((f) => (
                    <option key={f.symbol} value={f.symbol}>
                      {f.symbol} — {f.name} ({f.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3-Tab Sub-Navigation inside Screener Interactive Terminal */}
          <div
            role="tablist"
            aria-label="Screener terminal views"
            className="inline-flex items-center p-1 rounded-[9px] bg-[#f1f5f9] border border-[#e2e8f0]"
          >
            {(
              [
                { id: 'compare', label: 'Aggregated Compare & Chart', icon: GitCompare },
                { id: 'bulk', label: `Bulk Data View (${allFunds.length})`, icon: Table2 },
                { id: 'allocator', label: 'Custom Allocation', icon: PieChart },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`screener-terminal-tab-${tab.id}`}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#2563eb] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Multi-Instrument Aggregated KPI Strip */}
        <div
          data-testid="screener-terminal-aggregation-strip"
          className="px-5 py-4 bg-[#f8fafc]/70 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
            <div className="text-[10px] font-mono uppercase text-[#64748b]">Combined Scale</div>
            <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
              ${aggregated.combinedAumUsdB.toFixed(1)}B
            </div>
            <div className="text-[10.5px] font-mono text-[#64748b]">
              {aggregated.etfCount} ETF · {aggregated.mfCount} MF
            </div>
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
            <div className="text-[10px] font-mono uppercase text-[#64748b]">Avg 1Y / 3Y Return</div>
            <div className="text-base font-mono font-bold text-[#059669] tabular-nums mt-0.5">
              +{aggregated.avgReturn1YPct.toFixed(1)}%
            </div>
            <div className="text-[10.5px] font-mono text-[#64748b]">
              3Y Avg +{aggregated.avgAnnualReturn3YPct.toFixed(1)}%/yr
            </div>
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
            <div className="text-[10px] font-mono uppercase text-[#64748b]">Avg Risk Ratios</div>
            <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
              {aggregated.avgSharpe3Y.toFixed(2)} Sharpe
            </div>
            <div className="text-[10.5px] font-mono text-[#64748b]">
              Sort {aggregated.avgSortino3Y.toFixed(2)} · Trey {aggregated.avgTreynor3Y.toFixed(1)}
            </div>
          </div>

          <div className="rounded-[9px] border border-[#fecaca] bg-[#fef2f2]/50 p-3">
            <div className="text-[10px] font-mono uppercase text-[#991b1b]">Avg 1M VaR (95%)</div>
            <div className="text-base font-mono font-bold text-[#dc2626] tabular-nums mt-0.5">
              {aggregated.avgVar95MonthlyPct.toFixed(2)}%
            </div>
            <div className="text-[10.5px] font-mono text-[#64748b]">
              Basket tail exposure
            </div>
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
            <div className="text-[10px] font-mono uppercase text-[#64748b]">Avg 3Y Max DD</div>
            <div className="text-base font-mono font-bold text-[#dc2626] tabular-nums mt-0.5">
              {aggregated.avgMaxDrawdown3YPct.toFixed(1)}%
            </div>
            <div className="text-[10.5px] font-mono text-[#64748b]">
              Calmar {aggregated.avgCalmarRatio.toFixed(2)}
            </div>
          </div>

          <div className="rounded-[9px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-3">
            <div className="text-[10px] font-mono uppercase text-[#1d4ed8]">Avg TER &amp; Score</div>
            <div className="text-base font-mono font-bold text-[#1d4ed8] tabular-nums mt-0.5">
              {aggregated.avgExpenseRatioPct.toFixed(2)}% TER
            </div>
            <div className="text-[10.5px] font-mono text-[#475569]">
              Validation {aggregated.avgValidationScore}/100
            </div>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: AGGREGATED MULTI-INSTRUMENT HISTORICAL CHART + HEAD-TO-HEAD COMPARISON STUDIO */}
      {activeSubTab === 'compare' && (
        <div className="space-y-5">
          {/* Interactive Normalized Multi-Asset Historical Chart */}
          <div className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-display font-bold text-[#0f172a]">
                  <Activity className="w-4 h-4 text-[#2563eb]" />
                  <span>
                    Aggregated Multi-Instrument Performance Comparison (Base = 100 · {normalizedReplay.monthsCount}M History)
                  </span>
                </div>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Rebased historical monthly curves for every selected fund alongside the aggregated equal-weight basket composite
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-[#047857] bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-1 rounded-[7px] tabular-nums">
                Composite Realized: {normalizedReplay.realizedTotalReturnPct >= 0 ? '+' : ''}
                {normalizedReplay.realizedTotalReturnPct.toFixed(1)}%
              </span>
            </div>

            <div
              data-testid="screener-terminal-multi-chart"
              className="h-[290px] w-full bg-[#f8fafc]/40 rounded-[10px] border border-[#e2e8f0] p-2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={normalizedReplay.points}
                  margin={{ top: 10, right: 18, bottom: 4, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} minTickGap={22} />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      `${Number(value).toFixed(2)}`,
                      String(name),
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#ffffff',
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11.5px', paddingTop: '4px' }} />
                  {activeBasketFunds.map((fund, idx) => (
                    <Line
                      key={fund.symbol}
                      type="monotone"
                      dataKey={`idx_${fund.symbol}`}
                      name={fund.symbol}
                      stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                      strokeWidth={2.2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="equalWeightIndex"
                    name="Aggregated Basket Avg"
                    stroke="#0f172a"
                    strokeWidth={2.2}
                    strokeDasharray="5 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Embedded Best vs. Worst Decision Engine, Frontier & Correlation Studio */}
          <TerminalComparisonWorkbench
            primarySymbol={activeBasketFunds[0].symbol}
            comparisonTickers={activeBasketFunds.slice(1, 4).map((f) => f.symbol)}
            analysisMode="multi"
            embeddedInTab
            onSwitchAnalysisMode={() => {}}
            onSelectPrimary={(sym) => onSelectPrimarySymbol(sym)}
            onChangeComparisonTickers={(nextPeers) =>
              onChangeSelectedSymbols([activeBasketFunds[0].symbol, ...nextPeers])
            }
          />
        </div>
      )}

      {/* SUB-VIEW 2: BULK MULTI-INSTRUMENT DATA VIEW (Reusing shared TerminalBulkDataPanel) */}
      {activeSubTab === 'bulk' && (
        <TerminalBulkDataPanel
          primarySymbol={activeBasketFunds[0].symbol}
          comparisonTickers={activeBasketFunds.slice(1).map((f) => f.symbol)}
          onSelectPrimary={(sym) => onInspectDossier(sym)}
          onChangeComparisonTickers={(nextPeers) =>
            onChangeSelectedSymbols([activeBasketFunds[0].symbol, ...nextPeers])
          }
          onJumpToCompare={() => setActiveSubTab('compare')}
          onJumpToAllocator={() => setActiveSubTab('allocator')}
        />
      )}

      {/* SUB-VIEW 3: CUSTOM ALLOCATION & HISTORICAL PROJECTION INSIDE SCREENER TERMINAL */}
      {activeSubTab === 'allocator' && (
        <TerminalPortfolioAllocator
          initialSymbols={basketSymbols}
          embedded
        />
      )}
    </div>
  );
};
