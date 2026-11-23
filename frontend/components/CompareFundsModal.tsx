import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Award, Scale, X } from 'lucide-react';
import { ScreenerFundRecord } from '../utils/screenerEngine';
import {
  buildMultiFundComparison,
  ComparisonPriorityMode,
} from '../utils/fundIntelligenceEngine';
import { buildBullBearSectorTreemapData } from '../utils/sectorHeatmapEngine';

interface CompareFundsModalProps {
  open: boolean;
  allFunds: ScreenerFundRecord[];
  selectedSymbols: string[];
  onChangeSymbols: (symbols: string[]) => void;
  onClose: () => void;
  onInspectFund?: (symbol: string) => void;
  onOpenFullMatrix?: () => void;
}

const MODAL_PRESETS: Array<{ label: string; ids: string[] }> = [
  { label: 'Small & Mid Cap', ids: ['QUANTSC', 'NIPSMALL', 'HDFCMID'] },
  { label: 'India ETFs', ids: ['BANKBEES', 'JUNIORBEES', 'NIFTYBEES'] },
  { label: 'Debt & Gilt', ids: ['HDFCCORP', 'ICICIGILT', 'SBIGILT'] },
  { label: 'US Core ETFs', ids: ['QQQ', 'VTI', 'SPY'] },
];

const PRIORITY_OPTIONS: Array<{ id: ComparisonPriorityMode; label: string }> = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'max_return', label: 'Max Return' },
  { id: 'lowest_risk', label: 'Lowest Risk' },
  { id: 'lowest_cost', label: 'Lowest Cost' },
];

export const CompareFundsModal: React.FC<CompareFundsModalProps> = ({
  open,
  allFunds,
  selectedSymbols,
  onChangeSymbols,
  onClose,
  onInspectFund,
  onOpenFullMatrix,
}) => {
  const [pickerValue, setPickerValue] = useState('');
  const [priorityMode, setPriorityMode] = useState<ComparisonPriorityMode>('balanced');

  // Enforce max 3 instruments inside the modal
  const activeSymbols = useMemo(() => selectedSymbols.slice(0, 3), [selectedSymbols]);

  const selectedFunds = useMemo(() => {
    return activeSymbols
      .map((sym) => allFunds.find((f) => f.symbol === sym || f.id === sym))
      .filter((f): f is ScreenerFundRecord => Boolean(f));
  }, [allFunds, activeSymbols]);

  const comparison = useMemo(
    () => buildMultiFundComparison(selectedFunds, priorityMode),
    [selectedFunds, priorityMode]
  );

  const availableToAdd = useMemo(
    () => allFunds.filter((f) => !activeSymbols.includes(f.symbol)),
    [allFunds, activeSymbols]
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleAdd = (sym: string) => {
    if (!sym || activeSymbols.includes(sym) || activeSymbols.length >= 3) return;
    onChangeSymbols([...activeSymbols, sym]);
    setPickerValue('');
  };

  const handleRemove = (sym: string) => {
    if (activeSymbols.length <= 1) return;
    onChangeSymbols(activeSymbols.filter((s) => s !== sym));
  };

  const isMulti = comparison.items.length > 1;
  const BestBadge = () => (
    <span className="ml-1.5 text-[10.5px] font-sans font-semibold text-[#047857]">Best</span>
  );
  const WorstBadge = () => (
    <span className="ml-1.5 text-[10.5px] font-sans font-semibold text-[#b91c1c]">Worst</span>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compare Mutual Funds and ETFs"
      data-testid="compare-funds-modal"
      className="fixed inset-0 z-50 bg-[#040711]/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[1000px] max-h-[90vh] rounded-[14px] bg-white border border-[#e2e8f0] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[8px] bg-[#eff6ff] text-[#2563eb] flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-[17px] font-display font-bold text-[#0f172a] leading-tight">
                Compare Funds &amp; ETFs — Best vs. Worst Ranking
              </h3>
              <p className="text-[12px] text-[#64748b] mt-0.5">
                Compare up to 3 instruments from all {allFunds.length} Mutual Funds &amp; ETFs across TER, managers, Sharpe/Sortino/Treynor, drawdown, and 10Y net wealth.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Compare Funds dialog"
            data-testid="close-compare-funds-modal"
            className="p-1.5 rounded-[8px] text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fund Picker Bar + Priority Switcher (Max 3) */}
        <div className="px-5 py-3.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-col gap-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {selectedFunds.map((f) => (
                <span
                  key={f.symbol}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-white border border-[#cbd5e1] text-[12.5px]"
                >
                  <span className="font-mono font-bold text-[#0f172a]">{f.symbol}</span>
                  <span className="text-[11px] text-[#64748b]">
                    {f.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'}
                  </span>
                  {selectedFunds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemove(f.symbol)}
                      aria-label={`Remove ${f.symbol}`}
                      className="text-[#94a3b8] hover:text-[#dc2626] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))}

              {activeSymbols.length < 3 ? (
                <select
                  aria-label="Add mutual fund or ETF to comparison"
                  data-testid="compare-modal-add-select"
                  value={pickerValue}
                  onChange={(e) => handleAdd(e.target.value)}
                  className="h-8 rounded-[8px] border border-[#cbd5e1] bg-white px-2.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer"
                >
                  <option value="">+ Add fund ({activeSymbols.length}/3)</option>
                  {availableToAdd.map((f) => (
                    <option key={f.symbol} value={f.symbol}>
                      {f.symbol} — {f.name} ({f.instrumentType})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11.5px] font-mono text-[#64748b] px-1">
                  3/3 selected (remove one to swap)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {MODAL_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChangeSymbols(preset.ids)}
                  className="px-2.5 py-1 rounded-[7px] border border-[#dbe2ec] bg-white hover:bg-[#eff6ff] hover:border-[#bfdbfe] text-[11.5px] font-medium text-[#334155] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e2e8f0]">
            <span className="text-[11.5px] font-semibold text-[#475569]">Ranking Goal:</span>
            <div className="inline-flex items-center p-0.5 rounded-[8px] bg-white border border-[#cbd5e1]">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPriorityMode(opt.id)}
                  className={`px-2.5 py-1 rounded-[6px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
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

        {/* Scrollable Comparative Content */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Best Pick (#1) vs Worst Pick (#N) Summary */}
          {comparison.bestPick && comparison.worstPick && (
            <div
              data-testid="compare-modal-best-worst"
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              <div className="rounded-[10px] border border-[#a7f3d0] bg-[#f0fdf4] p-3.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[#047857]">
                  <span className="inline-flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    BEST PICK (#1) · {comparison.bestPick.symbol}
                  </span>
                  <span>{comparison.bestPick.priorityScore}/100</span>
                </div>
                <div className="text-xs font-semibold text-[#0f172a] mt-1">
                  {comparison.bestPick.name}
                </div>
                <div className="text-[11.5px] text-[#334155] mt-1">
                  {comparison.bestPick.strengths[0]}
                </div>
              </div>
              <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] p-3.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[#b91c1c]">
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    WEAKEST PICK (#{comparison.rankings.length}) · {comparison.worstPick.symbol}
                  </span>
                  <span>{comparison.worstPick.priorityScore}/100</span>
                </div>
                <div className="text-xs font-semibold text-[#0f172a] mt-1">
                  {comparison.worstPick.name}
                </div>
                <div className="text-[11.5px] text-[#334155] mt-1">
                  {comparison.worstPick.weaknesses[0]}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[10px] border border-[#e2e8f0] overflow-x-auto">
            <table className="w-full min-w-[660px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                  <th className="text-left py-3 px-4 font-semibold text-[#475569] w-[200px]">
                    Metric
                  </th>
                  {comparison.items.map(({ fund, priorityScore }) => {
                    const r = comparison.rankings.find((x) => x.symbol === fund.symbol);
                    return (
                      <th key={fund.symbol} className="text-left py-3 px-4 border-l border-[#eef2f6]">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onInspectFund?.(fund.symbol);
                              onClose();
                            }}
                            className="font-mono font-bold text-[14px] text-[#0f172a] hover:text-[#2563eb] cursor-pointer"
                          >
                            {fund.symbol}
                          </button>
                          <span className="font-mono text-[11px] font-semibold text-[#1d4ed8] tabular-nums">
                            #{r?.rank} · {priorityScore}/100
                          </span>
                        </div>
                        <div className="text-[11.5px] font-normal text-[#475569] truncate max-w-[210px] mt-0.5">
                          {fund.name}
                        </div>
                        <div className="text-[10.5px] font-normal text-[#94a3b8] mt-0.5">
                          {fund.instrumentType} · {fund.category}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
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
                        {win && <BestBadge />}
                        {lose && <WorstBadge />}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#475569]">10Y Net Wealth (100k base)</td>
                  {comparison.items.map(({ fund, tenYearNetWealthOn100k }) => {
                    const win = isMulti && comparison.winners.highestNetWealth10Y === fund.symbol;
                    const lose = isMulti && comparison.losers.lowestNetWealth10Y === fund.symbol && !win;
                    return (
                      <td
                        key={fund.symbol}
                        className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-bold tabular-nums ${
                          win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                        }`}
                      >
                        {fund.currency === 'INR' ? '₹' : '$'}
                        {tenYearNetWealthOn100k.toLocaleString('en-US')}
                        {win && <BestBadge />}
                        {lose && <WorstBadge />}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#475569]">Fund Manager</td>
                  {comparison.items.map(({ fund, intel }) => (
                    <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9]">
                      <div className="font-semibold text-[#0f172a]">{intel.manager.leadManager}</div>
                      <div className="text-[11px] text-[#64748b]">
                        {intel.manager.tenureYears.toFixed(1)} yrs tenure · {intel.manager.experienceYears} yrs exp.
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#475569]">AUM</td>
                  {comparison.items.map(({ fund }) => (
                    <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-semibold text-[#0f172a] tabular-nums">
                      {fund.keyStats.aumLabel}
                    </td>
                  ))}
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
                          win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : (v ?? 0) >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                        }`}
                      >
                        {v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'}
                        {win && <BestBadge />}
                        {lose && <WorstBadge />}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#475569]">3Y Return on Average</td>
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
                        {win && <BestBadge />}
                        {lose && <WorstBadge />}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#475569]">Sharpe · Sortino (3Y)</td>
                  {comparison.items.map(({ fund, intel }) => {
                    const win = isMulti && comparison.winners.highestSharpe === fund.symbol;
                    const lose = isMulti && comparison.losers.lowestSharpe === fund.symbol && !win;
                    return (
                      <td
                        key={fund.symbol}
                        className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono tabular-nums ${
                          win ? 'bg-[#f0fdf4] text-[#047857] font-bold' : lose ? 'bg-[#fef2f2] text-[#b91c1c] font-bold' : 'text-[#0f172a]'
                        }`}
                      >
                        {fund.keyStats.sharpe3Y.toFixed(2)} · {intel.ratios.sortino3Y.toFixed(2)}
                        {win && <BestBadge />}
                        {lose && <WorstBadge />}
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
                        className={`py-2.5 px-4 border-l border-[#f1f5f9] font-mono font-semibold tabular-nums ${
                          win ? 'bg-[#f0fdf4] text-[#047857]' : lose ? 'bg-[#fef2f2] text-[#b91c1c]' : 'text-[#0f172a]'
                        }`}
                      >
                        {intel.ratios.treynorRatio.toFixed(2)}
                        {win && <BestBadge />}
                        {lose && <WorstBadge />}
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
                        {win && <BestBadge />}
                        {lose && <WorstBadge />}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#475569]">Sector Bull / Bear Tilt</td>
                  {comparison.items.map(({ fund, intel }) => {
                    const tilt = buildBullBearSectorTreemapData(intel.sectorHeatmap);
                    return (
                      <td key={fund.symbol} className="py-2.5 px-4 border-l border-[#f1f5f9] font-mono text-[12px] tabular-nums">
                        <span className="text-[#059669] font-semibold">{tilt.bullWeightPct.toFixed(1)}% Bull</span>
                        <span className="text-[#94a3b8] mx-1.5">/</span>
                        <span className="text-[#dc2626] font-semibold">{tilt.bearWeightPct.toFixed(1)}% Bear</span>
                      </td>
                    );
                  })}
                </tr>
                <tr className="bg-[#f8fbff]">
                  <td className="py-3 px-4 font-semibold text-[#0f172a] flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#2563eb]" />
                    Validation Score
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
                        <span className="font-sans text-[11px] font-medium text-[#475569]">
                          · {validation.grade}
                        </span>
                        {win && <BestBadge />}
                        {lose && <WorstBadge />}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e2e8f0] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-[11.5px] text-[#64748b]">
            Click any ticker header to inspect its full dossier, heatmaps, and options flow.
          </span>
          <div className="flex items-center gap-2">
            {onOpenFullMatrix && (
              <button
                type="button"
                onClick={() => {
                  onOpenFullMatrix();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] text-[12px] font-semibold text-[#0f172a] cursor-pointer"
              >
                Open Full Sector Overlap Matrix
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-[8px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-[12px] font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
