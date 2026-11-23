import React, { useMemo } from 'react';
import { Activity, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { SCREENER_FUNDS, ScreenerFundRecord } from '../utils/screenerEngine';
import { getFundIntelligence } from '../utils/fundIntelligenceEngine';
import {
  buildStressTestScenarios,
  computeInstrumentRiskProfile,
} from '../utils/riskAnalyticsEngine';

interface TerminalRiskStressPanelProps {
  primarySymbol: string;
  comparisonTickers: string[];
  analysisMode: 'single' | 'multi';
  onSelectInstrument?: (symbol: string) => void;
}

export const TerminalRiskStressPanel: React.FC<TerminalRiskStressPanelProps> = ({
  primarySymbol,
  comparisonTickers,
  analysisMode,
  onSelectInstrument,
}) => {
  const primaryFund: ScreenerFundRecord = useMemo(() => {
    const up = primarySymbol.trim().toUpperCase();
    return (
      SCREENER_FUNDS.find((f) => f.symbol.toUpperCase() === up || f.id.toUpperCase() === up) ||
      SCREENER_FUNDS[0]
    );
  }, [primarySymbol]);

  const primaryIntel = useMemo(() => getFundIntelligence(primaryFund), [primaryFund]);
  const primaryRisk = useMemo(
    () => computeInstrumentRiskProfile(primaryFund, primaryIntel),
    [primaryFund, primaryIntel]
  );
  const stressScenarios = useMemo(
    () => buildStressTestScenarios(primaryFund, primaryIntel),
    [primaryFund, primaryIntel]
  );

  const basketRiskRows = useMemo(() => {
    if (analysisMode !== 'multi') return [];
    const seen = new Set<string>([primaryFund.symbol]);
    const list: ScreenerFundRecord[] = [primaryFund];
    for (const raw of comparisonTickers) {
      const up = raw.trim().toUpperCase();
      if (seen.has(up)) continue;
      const found = SCREENER_FUNDS.find((f) => f.symbol.toUpperCase() === up);
      if (found) {
        list.push(found);
        seen.add(found.symbol);
      }
    }
    return list.map((f) => ({
      fund: f,
      risk: computeInstrumentRiskProfile(f),
    }));
  }, [analysisMode, primaryFund, comparisonTickers]);

  const currencyPrefix = primaryFund.currency === 'INR' ? '₹' : '$';

  const tierStyle = (tier: string) => {
    if (tier === 'Low Tail Risk') return 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]';
    if (tier === 'Moderate') return 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]';
    if (tier === 'Elevated') return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]';
    return 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]';
  };

  const resilienceStyle = (rating: string) => {
    if (rating === 'Defensive') return 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]';
    if (rating === 'Resilient') return 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]';
    if (rating === 'Moderate Impact') return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]';
    return 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]';
  };

  return (
    <div
      data-testid="terminal-risk-panel"
      className="rounded-[14px] bg-white border border-[#e2e8f0] overflow-hidden shadow-xs"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold">
            Institutional Tail-Risk &amp; Macro Stress Engine
          </div>
          <h3 className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
            Value-at-Risk (VaR), Drawdown &amp; Stress Tests — {primaryFund.symbol}
          </h3>
          <p className="text-xs text-[#64748b] mt-0.5">
            Blended parametric + empirical historical tail risk calibrated on {primaryFund.name} ({primaryFund.category})
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-[8px] border text-xs font-mono font-semibold ${tierStyle(
            primaryRisk.riskTier
          )}`}
        >
          {primaryRisk.riskTier}
        </span>
      </div>

      <div className="p-5 md:p-6 space-y-6">
        {/* 5-Metric Tail-Risk Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2]/60 p-4">
            <div className="text-[10.5px] font-mono uppercase text-[#991b1b]">1M VaR (95%)</div>
            <div
              data-testid="risk-tab-var95"
              className="text-2xl font-mono font-bold text-[#dc2626] tabular-nums mt-1"
            >
              {primaryRisk.var95MonthlyPct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-[#64748b] mt-1 font-mono tabular-nums">
              Loss on 100k: -{currencyPrefix}
              {primaryRisk.worstMonthLossOn100k.toLocaleString('en-US')}
            </div>
          </div>

          <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">
              1M CVaR (Expected Shortfall)
            </div>
            <div
              data-testid="risk-tab-cvar95"
              className="text-2xl font-mono font-bold text-[#b91c1c] tabular-nums mt-1"
            >
              {primaryRisk.cvar95MonthlyPct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-[#64748b] mt-1">
              Avg loss in worst 5% tail
            </div>
          </div>

          <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">1M VaR (99%)</div>
            <div className="text-2xl font-mono font-bold text-[#991b1b] tabular-nums mt-1">
              {primaryRisk.var99MonthlyPct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-[#64748b] mt-1 font-mono tabular-nums">
              Annual 95% VaR: {primaryRisk.var95AnnualPct.toFixed(1)}%
            </div>
          </div>

          <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">
              3Y Max Drawdown
            </div>
            <div
              data-testid="risk-tab-maxdd"
              className="text-2xl font-mono font-bold text-[#dc2626] tabular-nums mt-1"
            >
              {primaryRisk.maxDrawdown3YPct.toFixed(1)}%
            </div>
            <div className="text-[11px] text-[#64748b] mt-1 font-mono tabular-nums">
              Worst obs. month: {primaryRisk.worstObservedMonthPct.toFixed(1)}%
            </div>
          </div>

          <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-4 col-span-2 lg:col-span-1">
            <div className="text-[10.5px] font-mono uppercase text-[#1d4ed8]">Calmar Ratio</div>
            <div
              data-testid="risk-tab-calmar"
              className="text-2xl font-mono font-bold text-[#1d4ed8] tabular-nums mt-1"
            >
              {primaryRisk.calmarRatio.toFixed(2)}
            </div>
            <div className="text-[11px] text-[#475569] mt-1 font-mono tabular-nums">
              Vol {primaryRisk.volatility3YPct.toFixed(1)}% · Beta {primaryFund.keyStats.beta3Y.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Basket VaR & Drawdown Side-by-Side Comparison when in Multi-Instrument Mode */}
        {basketRiskRows.length > 1 && (
          <div className="rounded-[10px] border border-[#e2e8f0] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
              <span className="text-xs font-display font-bold text-[#0f172a] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#2563eb]" />
                Active Comparison Basket Tail-Risk Benchmark
              </span>
              <span className="text-[11px] font-mono text-[#64748b]">
                Click any symbol to stress-test it
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#f1f5f9] text-[10.5px] font-mono uppercase text-[#64748b]">
                    <th className="py-2 px-4">Instrument</th>
                    <th className="py-2 px-3 text-right">1M VaR (95%)</th>
                    <th className="py-2 px-3 text-right">1M CVaR (95%)</th>
                    <th className="py-2 px-3 text-right">3Y Max DD</th>
                    <th className="py-2 px-3 text-right">Calmar</th>
                    <th className="py-2 px-4 text-right">Risk Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] font-mono tabular-nums">
                  {basketRiskRows.map(({ fund, risk }) => (
                    <tr
                      key={fund.symbol}
                      className={
                        fund.symbol === primaryFund.symbol ? 'bg-[#eff6ff]/70' : 'hover:bg-[#f8fafc]'
                      }
                    >
                      <td className="py-2.5 px-4 font-sans">
                        <button
                          type="button"
                          onClick={() => onSelectInstrument?.(fund.symbol)}
                          className="font-mono font-bold text-[#0f172a] hover:text-[#2563eb] cursor-pointer"
                        >
                          {fund.symbol}
                        </button>
                        <span className="text-[#64748b] text-[11px] ml-2">{fund.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#dc2626]">
                        {risk.var95MonthlyPct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#991b1b]">
                        {risk.cvar95MonthlyPct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#dc2626]">
                        {risk.maxDrawdown3YPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#1d4ed8]">
                        {risk.calmarRatio.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-sans">
                        <span
                          className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold ${tierStyle(
                            risk.riskTier
                          )}`}
                        >
                          {risk.riskTier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4 Calibrated Macro Stress Test Scenarios */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-display font-bold text-[#0f172a] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#2563eb]" />
              <span>Calibrated Macro Stress Test Scenarios ({primaryFund.symbol})</span>
            </h4>
            <span className="text-[11px] font-mono text-[#64748b]">
              Estimated impact on {currencyPrefix}100,000 invested
            </span>
          </div>

          <div
            data-testid="stress-test-grid"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5"
          >
            {stressScenarios.map((sc) => {
              const positive = sc.estimatedImpactPct >= 0;
              return (
                <div
                  key={sc.id}
                  data-testid={`stress-card-${sc.id}`}
                  className="rounded-[11px] border border-[#e2e8f0] bg-[#f8fafc] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10.5px] font-mono font-semibold text-[#64748b] uppercase">
                        {sc.regime}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${resilienceStyle(
                          sc.resilienceRating
                        )}`}
                      >
                        {sc.resilienceRating}
                      </span>
                    </div>
                    <div className="text-sm font-display font-bold text-[#0f172a]">{sc.name}</div>
                    <p className="text-[11.5px] text-[#475569] leading-relaxed mt-1.5">
                      {sc.shockDescription}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#e2e8f0] flex items-end justify-between font-mono tabular-nums">
                    <div>
                      <div className="text-[10px] uppercase text-[#64748b]">Est. Shock</div>
                      <div
                        className={`text-xl font-bold ${
                          positive ? 'text-[#059669]' : 'text-[#dc2626]'
                        }`}
                      >
                        {positive ? '+' : ''}
                        {sc.estimatedImpactPct.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xs font-semibold ${
                          positive ? 'text-[#059669]' : 'text-[#b91c1c]'
                        }`}
                      >
                        {positive ? '+' : '-'}
                        {currencyPrefix}
                        {Math.abs(sc.estimatedLossOn100k).toLocaleString('en-US')}
                      </div>
                      <div className="text-[10.5px] text-[#64748b]">
                        {sc.recoveryMonthsEst === 0
                          ? 'Hedge gain'
                          : `~${sc.recoveryMonthsEst}m recovery`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Institutional Methodology Footnote */}
        <div className="rounded-[9px] bg-[#f8fafc] border border-[#e2e8f0] px-4 py-2.5 flex items-center gap-2 text-[11.5px] text-[#475569]">
          {primaryRisk.calmarRatio >= 1.2 ? (
            <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0" />
          )}
          <span>
            <strong>Risk Verdict:</strong> {primaryFund.symbol} posts a Calmar Ratio of{' '}
            <strong className="font-mono">{primaryRisk.calmarRatio.toFixed(2)}</strong> with 1M 95% VaR of{' '}
            <strong className="font-mono">{primaryRisk.var95MonthlyPct.toFixed(2)}%</strong> and 3Y Maximum Drawdown of{' '}
            <strong className="font-mono">{primaryRisk.maxDrawdown3YPct.toFixed(1)}%</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
