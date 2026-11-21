import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Award, Layers, Plus, RefreshCw, X } from 'lucide-react';
import { ScreenerFundRecord } from '../utils/screenerEngine';
import {
  buildMultiFundComparison,
  ComparisonPriorityMode,
  MultiFundComparisonResult,
} from '../utils/fundIntelligenceEngine';

interface FundComparisonMatrixProps {
  allFunds: ScreenerFundRecord[];
  compareIds: string[];
  onSetCompareIds: (ids: string[]) => void;
  onInspectFund: (symbol: string) => void;
}

const PRESET_BASKETS: Array<{ label: string; ids: string[] }> = [
  { label: 'Small & Mid Cap (QUANTSC · NIPSMALL · HDFCMID)', ids: ['QUANTSC', 'NIPSMALL', 'HDFCMID'] },
  { label: 'Debt & Gilt (HDFCCORP · ICICIGILT · SBIGILT · LIQUIDBEES)', ids: ['HDFCCORP', 'ICICIGILT', 'SBIGILT', 'LIQUIDBEES'] },
  { label: 'India ETFs (BANKBEES · JUNIORBEES · NIFTYBEES · SILVERBEES)', ids: ['BANKBEES', 'JUNIORBEES', 'NIFTYBEES', 'SILVERBEES'] },
  { label: 'US Core ETFs (QQQ · VTI · SPY · GLD)', ids: ['QQQ', 'VTI', 'SPY', 'GLD'] },
];

function getOverlapHeatBg(weight: number): { bg: string; text: string } {
  if (weight <= 0) return { bg: '#f8fafc', text: '#cbd5e1' };
  if (weight >= 40) return { bg: '#1d4ed8', text: '#ffffff' };
  if (weight >= 25) return { bg: '#3b82f6', text: '#ffffff' };
  if (weight >= 12) return { bg: '#bfdbfe', text: '#1e3a8a' };
  return { bg: '#eff6ff', text: '#1e40af' };
}

export const FundComparisonMatrix: React.FC<FundComparisonMatrixProps> = ({
  allFunds,
  compareIds,
  onSetCompareIds,
  onInspectFund,
}) => {
  const [serverComparison, setServerComparison] = useState<MultiFundComparisonResult | null>(null);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [addChoice, setAddChoice] = useState<string>('');
  const [priorityMode, setPriorityMode] = useState<ComparisonPriorityMode>('balanced');

  const selectedFunds = useMemo(() => {
    return compareIds
      .map((id) => allFunds.find((f) => f.symbol === id || f.id === id))
      .filter((f): f is ScreenerFundRecord => Boolean(f));
  }, [allFunds, compareIds]);

  const localComparison = useMemo(
    () => buildMultiFundComparison(selectedFunds, priorityMode),
    [selectedFunds, priorityMode]
  );

  // Verify and hydrate comparison matrix from backend POST /api/screener/compare
  useEffect(() => {
    if (compareIds.length < 2) {
      setServerComparison(null);
      return;
    }
    let cancelled = false;
    setSyncing(true);
    fetch('/api/screener/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'FinanciaWorkspace',
      },
      body: JSON.stringify({ ids: compareIds }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { computedAt?: string; comparison?: MultiFundComparisonResult } | null) => {
        if (cancelled) return;
        if (data?.comparison && data.comparison.items.length >= 2) {
          setServerComparison(data.comparison);
          setComputedAt(data.computedAt || null);
        }
      })
      .catch(() => {
        // Gracefully use deterministic local computation
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [compareIds]);

  const comparison =
    priorityMode === 'balanced' &&
    serverComparison &&
    serverComparison.items.length === selectedFunds.length &&
    serverComparison.items.every((item, idx) => item.fund.symbol === selectedFunds[idx]?.symbol)
      ? serverComparison
      : localComparison;

  const availableToAdd = useMemo(
    () => allFunds.filter((f) => !compareIds.includes(f.symbol)),
    [allFunds, compareIds]
  );

  const handleAddSymbol = (sym: string) => {
    if (!sym || compareIds.includes(sym) || compareIds.length >= 4) return;
    onSetCompareIds([...compareIds, sym]);
    setAddChoice('');
  };

  const handleRemoveSymbol = (sym: string) => {
    if (compareIds.length <= 2) return;
    onSetCompareIds(compareIds.filter((id) => id !== sym));
  };

  const isMulti = comparison.items.length > 1;
  const WinnerTag = () => (
    <span className="ml-1.5 inline-flex items-center text-[10px] font-sans font-semibold text-[#047857]">
      Best
    </span>
  );
  const LoserTag = () => (
    <span className="ml-1.5 inline-flex items-center text-[10px] font-sans font-semibold text-[#b91c1c]">
      Worst
    </span>
  );

  return (
    <div className="space-y-6" data-testid="fund-comparison-matrix">
      {/* Basket Controls & Presets */}
      <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e5e9f0]">
          <div>
            <h3 className="text-[18px] font-display font-bold text-[#0f172a] tracking-tight">
              Side-by-Side Mutual Fund &amp; ETF Comparison
            </h3>
            <p className="text-[12.5px] text-[#64748b] mt-0.5">
              Compare up to 4 instruments across fund managers, expense drag, validation ratios, return on average, sector overlap, and bull/bear scenarios.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] font-mono text-[#64748b]">
            {syncing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563eb]" />}
            <span>
              {computedAt ? 'Server-verified matrix' : 'Live matrix'} · {comparison.items.length}/4 instruments
            </span>
          </div>
        </div>

        {/* Preset Switchers + Active Basket Chips */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {comparison.items.map(({ fund }) => (
              <div
                key={fund.symbol}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[#dbe2ec] bg-[#f8fafc] text-[12.5px]"
              >
                <button
                  type="button"
                  onClick={() => onInspectFund(fund.symbol)}
                  className="font-mono font-bold text-[#0f172a] hover:text-[#2563eb] cursor-pointer"
                >
                  {fund.symbol}
                </button>
                <span className="text-[11px] text-[#64748b]">{fund.instrumentType}</span>
                {comparison.items.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSymbol(fund.symbol)}
                    aria-label={`Remove ${fund.symbol} from comparison`}
                    className="text-[#94a3b8] hover:text-[#dc2626] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {comparison.items.length < 4 && availableToAdd.length > 0 && (
              <div className="inline-flex items-center gap-1.5">
                <select
                  aria-label="Add fund or ETF to comparison"
                  value={addChoice}
                  onChange={(e) => handleAddSymbol(e.target.value)}
                  className="rounded-[8px] border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                >
                  <option value="">+ Add Fund / ETF...</option>
                  {availableToAdd.map((f) => (
                    <option key={f.symbol} value={f.symbol}>
                      {f.symbol} — {f.name} ({f.instrumentType})
                    </option>
                  ))}
                </select>
                {addChoice && (
                  <button
                    type="button"
                    onClick={() => handleAddSymbol(addChoice)}
                    className="p-1.5 rounded-[8px] bg-[#2563eb] text-white cursor-pointer"
                    aria-label="Confirm add to comparison"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_BASKETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onSetCompareIds(preset.ids)}
                className="px-2.5 py-1.5 rounded-[7px] border border-[#e2e8f0] bg-white hover:bg-[#f1f5f9] text-[11.5px] font-medium text-[#334155] cursor-pointer transition-colors whitespace-nowrap"
              >
                {preset.label.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Ranking Priority Goal Bar */}
        <div className="mt-4 pt-3.5 border-t border-[#eef2f6] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#475569]">Ranking Goal:</span>
          <div className="inline-flex items-center p-0.5 rounded-[8px] bg-[#f8fafc] border border-[#cbd5e1]">
            {(
              [
                { id: 'balanced', label: 'Balanced' },
                { id: 'max_return', label: 'Max Return' },
                { id: 'lowest_risk', label: 'Lowest Risk' },
                { id: 'lowest_cost', label: 'Lowest Cost' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPriorityMode(opt.id)}
                className={`px-2.5 py-1 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
                  priorityMode === opt.id
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Best Pick (#1) vs Weakest Pick (#N) Verdict Banner */}
      {comparison.bestPick && comparison.worstPick && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[12px] border border-[#a7f3d0] bg-[#f0fdf4] p-4">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-[#047857]">
              <span className="inline-flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                BEST PICK (#1) · {comparison.bestPick.symbol}
              </span>
              <span>{comparison.bestPick.priorityScore}/100</span>
            </div>
            <div className="text-sm font-display font-bold text-[#0f172a] mt-1">
              {comparison.bestPick.name}
            </div>
            <div className="text-xs text-[#334155] mt-1">{comparison.bestPick.strengths.join(' · ')}</div>
          </div>
          <div className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] p-4">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-[#b91c1c]">
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                WEAKEST PICK (#{comparison.rankings.length}) · {comparison.worstPick.symbol}
              </span>
              <span>{comparison.worstPick.priorityScore}/100</span>
            </div>
            <div className="text-sm font-display font-bold text-[#0f172a] mt-1">
              {comparison.worstPick.name}
            </div>
            <div className="text-xs text-[#334155] mt-1">{comparison.worstPick.weaknesses.join(' · ')}</div>
          </div>
        </div>
      )}

      {/* Main Comparison Matrix Table */}
      <div className="rounded-[12px] border border-[#e5e9f0] bg-white overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[#e5e9f0] bg-[#f8fafc]">
              <th className="text-left py-3.5 px-4 font-semibold text-[#475569] w-[220px]">
                Validation Factor
              </th>
              {comparison.items.map(({ fund, validation }) => (
                <th key={fund.symbol} className="text-left py-3.5 px-4 border-l border-[#eef2f6]">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onInspectFund(fund.symbol)}
                      className="text-[14px] font-mono font-bold text-[#0f172a] hover:text-[#2563eb] cursor-pointer"
                    >
                      {fund.symbol}
                    </button>
                    <span className="text-[11px] font-mono font-semibold text-[#1d4ed8] tabular-nums">
                      Score {validation.overall}/100
                    </span>
                  </div>
                  <div className="text-[11.5px] font-normal text-[#64748b] truncate max-w-[220px] mt-0.5">
                    {fund.name}
                  </div>
                  <div className="text-[11px] font-normal text-[#94a3b8] mt-0.5">
                    {fund.instrumentType} · {fund.exchange} · {fund.category}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#f1f5f9]">
            {/* Group 1: Governance & Cost */}
            <tr className="bg-[#f8fafc]/70">
              <td colSpan={comparison.items.length + 1} className="py-2 px-4 text-[11px] font-semibold text-[#475569]">
                Fund Manager, Governance &amp; Cost Efficiency
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Lead Fund Manager</td>
              {comparison.items.map(({ fund, intel }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-semibold text-[#0f172a]">
                  {intel.manager.leadManager}
                  <div className="text-[11px] font-normal text-[#64748b]">
                    {intel.manager.tenureYears.toFixed(1)} yrs tenure · {intel.manager.experienceYears} yrs exp.
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">AUM / Scheme Scale</td>
              {comparison.items.map(({ fund }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-semibold text-[#0f172a] tabular-nums">
                  {fund.keyStats.aumLabel}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Expense Ratio (TER)</td>
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
                    {win && <WinnerTag />}
                    {lose && <LoserTag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">10Y Net Wealth (100k base)</td>
              {comparison.items.map(({ fund, tenYearNetWealthOn100k, tenYearFeeDragOn100k }) => {
                const win = isMulti && comparison.winners.highestNetWealth10Y === fund.symbol;
                const lose = isMulti && comparison.losers.lowestNetWealth10Y === fund.symbol && !win;
                const prefix = fund.currency === 'INR' ? '₹' : '$';
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857] font-bold' : lose ? 'bg-[#fef2f2] text-[#b91c1c] font-bold' : 'text-[#0f172a] font-semibold'
                    }`}
                  >
                    {prefix}{tenYearNetWealthOn100k.toLocaleString('en-US')}
                    {win && <WinnerTag />}
                    {lose && <LoserTag />}
                    <div className="text-[10.5px] font-normal text-[#b91c1c]">
                      Fee drag -{prefix}{tenYearFeeDragOn100k.toLocaleString('en-US')}
                    </div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Exit Load &amp; Min Entry</td>
              {comparison.items.map(({ fund, intel }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] text-[#334155]">
                  <div>{intel.manager.exitLoad}</div>
                  <div className="text-[11px] text-[#64748b] font-mono">{intel.manager.minInvestment}</div>
                </td>
              ))}
            </tr>

            {/* Group 2: Returns & Return on Average */}
            <tr className="bg-[#f8fafc]/70">
              <td colSpan={comparison.items.length + 1} className="py-2 px-4 text-[11px] font-semibold text-[#475569]">
                Returns &amp; Return on Average (Rolling Mean vs Category Peer)
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">1Y Total Return</td>
              {comparison.items.map(({ fund }) => {
                const v = fund.returnsTotal['1Y'];
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-semibold tabular-nums ${
                      (v ?? 0) >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                    }`}
                  >
                    {v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">3Y Cumulative Return</td>
              {comparison.items.map(({ fund }) => {
                const v = fund.returnsTotal['3Y'];
                const win = comparison.winners.highestReturn3Y === fund.symbol;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : (v ?? 0) >= 0 ? 'text-[#0f172a]' : 'text-[#dc2626]'
                    }`}
                  >
                    {v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'}
                    {win && <WinnerTag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">3Y Return on Average (Annualized)</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = comparison.winners.highestAvgReturn3Y === fund.symbol;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : 'text-[#0f172a]'
                    }`}
                  >
                    {intel.returnOnAverage.avgAnnualReturn3Y >= 0 ? '+' : ''}
                    {intel.returnOnAverage.avgAnnualReturn3Y.toFixed(2)}% / yr
                    {win && <WinnerTag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">5Y Return on Average &amp; Peer Spread</td>
              {comparison.items.map(({ fund, intel }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-mono tabular-nums text-[#0f172a]">
                  <span className="font-semibold">
                    {intel.returnOnAverage.avgAnnualReturn5Y >= 0 ? '+' : ''}
                    {intel.returnOnAverage.avgAnnualReturn5Y.toFixed(2)}%
                  </span>
                  <span
                    className={`ml-2 text-[11px] ${
                      intel.returnOnAverage.excessOverPeerBps >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                    }`}
                  >
                    ({intel.returnOnAverage.excessOverPeerBps >= 0 ? '+' : ''}
                    {intel.returnOnAverage.excessOverPeerBps} bps vs peer)
                  </span>
                </td>
              ))}
            </tr>

            {/* Group 3: Major Institutional Validation Ratios */}
            <tr className="bg-[#f8fafc]/70">
              <td colSpan={comparison.items.length + 1} className="py-2 px-4 text-[11px] font-semibold text-[#475569]">
                Institutional Validation Ratios &amp; Portfolio Quality
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Sharpe Ratio (3Y)</td>
              {comparison.items.map(({ fund }) => {
                const win = comparison.winners.highestSharpe === fund.symbol;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : 'text-[#0f172a]'
                    }`}
                  >
                    {fund.keyStats.sharpe3Y.toFixed(2)}
                    {win && <WinnerTag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Sortino Ratio (3Y)</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = comparison.winners.highestSortino === fund.symbol;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : 'text-[#0f172a]'
                    }`}
                  >
                    {intel.ratios.sortino3Y.toFixed(2)}
                    {win && <WinnerTag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Jensen&apos;s Alpha (3Y)</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = comparison.winners.highestAlpha === fund.symbol;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857]' : intel.ratios.alpha3Y >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                    }`}
                  >
                    {intel.ratios.alpha3Y >= 0 ? '+' : ''}
                    {intel.ratios.alpha3Y.toFixed(2)}%
                    {win && <WinnerTag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Beta · Volatility · R²</td>
              {comparison.items.map(({ fund, intel }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-mono tabular-nums text-[#0f172a]">
                  {fund.keyStats.beta3Y.toFixed(2)} · {intel.ratios.stdDev3Y.toFixed(1)}% · R² {intel.ratios.rSquared.toFixed(2)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Treynor Ratio (3Y)</td>
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
                    <span className="text-[11px] font-normal text-[#64748b] ml-1.5">
                      · IR {intel.ratios.informationRatio.toFixed(2)}
                    </span>
                    {win && <WinnerTag />}
                    {lose && <LoserTag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Max Drawdown (3Y)</td>
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
                    {win && <WinnerTag />}
                    {lose && <LoserTag />}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Upside / Downside Capture</td>
              {comparison.items.map(({ fund, intel }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-mono tabular-nums text-[#0f172a]">
                  {intel.ratios.upsideCapturePct.toFixed(1)}% / {intel.ratios.downsideCapturePct.toFixed(1)}%
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Portfolio ROAE / Carry &amp; P/E</td>
              {comparison.items.map(({ fund, intel }) => {
                const win = comparison.winners.highestRoae === fund.symbol;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono tabular-nums ${
                      win ? 'bg-[#f0fdf4] text-[#047857] font-bold' : 'text-[#0f172a]'
                    }`}
                  >
                    {intel.ratios.roaePct.toFixed(1)}%
                    <span className="text-[#64748b] font-normal ml-1.5 text-[11px]">
                      {intel.ratios.portfolioPE !== null ? `· ${intel.ratios.portfolioPE.toFixed(1)}x P/E` : `· ${intel.ratios.roaeLabel}`}
                    </span>
                    {win && <WinnerTag />}
                  </td>
                );
              })}
            </tr>

            {/* Group 4: Bull vs Bear Case Summary */}
            <tr className="bg-[#f8fafc]/70">
              <td colSpan={comparison.items.length + 1} className="py-2 px-4 text-[11px] font-semibold text-[#475569]">
                Scenario Outlook — Bull Target vs Bear Stress Floor
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-[#475569] font-medium">Bull Target / Base / Bear Floor</td>
              {comparison.items.map(({ fund, intel }) => (
                <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9]">
                  <div className="flex items-center gap-2 font-mono text-[12px] font-bold tabular-nums">
                    <span className="text-[#059669]">{intel.bullCase.headlineMetricValue}</span>
                    <span className="text-[#94a3b8]">/</span>
                    <span className="text-[#0f172a]">+{intel.baseCaseReturnPct.toFixed(1)}%</span>
                    <span className="text-[#94a3b8]">/</span>
                    <span className="text-[#dc2626]">{intel.bearCase.headlineMetricValue}</span>
                  </div>
                  <div className="text-[11px] text-[#475569] mt-1 leading-snug line-clamp-2">
                    {intel.bullCase.summary}
                  </div>
                </td>
              ))}
            </tr>

            {/* Composite Score Verdict Row */}
            <tr className="bg-[#f8fbff]">
              <td className="py-3 px-4 font-semibold text-[#0f172a] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#2563eb]" />
                Overall Validation Score
              </td>
              {comparison.items.map(({ fund, validation }) => {
                const win = comparison.winners.bestValidationScore === fund.symbol;
                return (
                  <td
                    key={fund.symbol}
                    className={`py-3 px-4 border-l border-[#e2e8f0] font-mono tabular-nums ${
                      win ? 'text-[#1d4ed8] font-bold' : 'text-[#0f172a] font-semibold'
                    }`}
                  >
                    <span className="text-[15px]">{validation.overall}/100</span>
                    <span className="ml-2 text-[11.5px] font-sans font-medium text-[#475569]">
                      · {validation.grade}
                    </span>
                    {win && <WinnerTag />}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cross-Fund Sector Overlap Heatmap Matrix */}
      <div className="rounded-[12px] border border-[#e5e9f0] bg-white overflow-x-auto" data-testid="sector-overlap-heatmap">
        <div className="px-4 py-3 border-b border-[#e5e9f0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2563eb]" />
            <span className="text-[14px] font-display font-bold text-[#0f172a]">
              Cross-Fund Sector Exposure &amp; Overlap Heatmap
            </span>
          </div>
          {comparison.items.length >= 2 && (
            <span className="text-[12px] font-mono text-[#475569] tabular-nums">
              {comparison.items[0].fund.symbol} vs {comparison.items[1].fund.symbol} Sector Overlap:{' '}
              <strong className="text-[#0f172a]">{comparison.pairwiseOverlapPct.toFixed(1)}%</strong>
            </span>
          )}
        </div>
        <table className="w-full min-w-[640px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-[#eef2f6] bg-[#f8fafc] text-[#64748b]">
              <th className="text-left py-2.5 px-4 font-semibold">Sector / Sleeves</th>
              {comparison.items.map(({ fund }) => (
                <th key={fund.symbol} className="text-center py-2.5 px-3 font-mono font-bold text-[#0f172a]">
                  {fund.symbol}
                </th>
              ))}
              <th className="text-right py-2.5 px-4 font-semibold">Overlap</th>
            </tr>
          </thead>
          <tbody>
            {comparison.sectorOverlapMatrix.slice(0, 12).map((row) => (
              <tr key={row.sector} className="border-b last:border-b-0 border-[#f1f5f9]">
                <td className="py-2 px-4 font-medium text-[#0f172a]">{row.sector}</td>
                {comparison.items.map(({ fund }) => {
                  const w = row.weightsBySymbol[fund.symbol] || 0;
                  const cellStyle = getOverlapHeatBg(w);
                  return (
                    <td key={fund.symbol} className="p-1.5 text-center font-mono tabular-nums">
                      <div
                        className="rounded-[5px] py-1 px-2 font-semibold"
                        style={{ backgroundColor: cellStyle.bg, color: cellStyle.text }}
                      >
                        {w > 0 ? `${w.toFixed(1)}%` : '—'}
                      </div>
                    </td>
                  );
                })}
                <td className="py-2 px-4 text-right font-mono text-[11px] text-[#64748b] tabular-nums">
                  {row.overlapCount}/{comparison.items.length} funds
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
