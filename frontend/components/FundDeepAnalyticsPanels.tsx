import React, { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { ScreenerFundRecord } from '../utils/screenerEngine';
import {
  computeFundValidationScore,
  computeTenYearFeeDrag,
  getFundIntelligence,
} from '../utils/fundIntelligenceEngine';
import { SectorBullBearHeatmap } from './SectorBullBearHeatmap';

interface FundDeepAnalyticsPanelsProps {
  fund: ScreenerFundRecord;
  onAddToCompare?: (symbol: string) => void;
  isInCompare?: boolean;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthlyHeatStyle(val: number | null): { bg: string; text: string } {
  if (val === null) return { bg: '#f8fafc', text: '#94a3b8' };
  if (val >= 4.0) return { bg: '#065f46', text: '#ffffff' };
  if (val >= 2.0) return { bg: '#059669', text: '#ffffff' };
  if (val >= 0.8) return { bg: '#d1fae5', text: '#065f46' };
  if (val > 0) return { bg: '#ecfdf5', text: '#047857' };
  if (val === 0) return { bg: '#f1f5f9', text: '#475569' };
  if (val > -1.5) return { bg: '#fff1f2', text: '#be123c' };
  if (val > -3.5) return { bg: '#ffe4e6', text: '#9f1239' };
  return { bg: '#be123c', text: '#ffffff' };
}

export const FundDeepAnalyticsPanels: React.FC<FundDeepAnalyticsPanelsProps> = ({
  fund,
  onAddToCompare,
  isInCompare = false,
}) => {
  const intel = useMemo(() => getFundIntelligence(fund), [fund]);
  const validation = useMemo(() => computeFundValidationScore(fund, intel), [fund, intel]);
  const tenYearDrag = useMemo(
    () => computeTenYearFeeDrag(fund.about.expenseRatioPct, fund.currency === 'INR' ? 1_000_000 : 100_000),
    [fund.about.expenseRatioPct, fund.currency]
  );

  const dragFormatted =
    fund.currency === 'INR'
      ? `₹${tenYearDrag.toLocaleString('en-IN')}`
      : `$${tenYearDrag.toLocaleString('en-US')}`;
  const dragBaseLabel = fund.currency === 'INR' ? '₹10L' : '$100k';

  return (
    <div className="space-y-7 pt-6 border-t border-[#e5e9f0]" data-testid="fund-deep-analytics-panels">
      {/* 1. Fund Manager & Governance Profile + Top Holdings */}
      <section data-testid="dossier-manager-section" className="scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div>
            <h4 className="text-[16px] font-display font-bold text-[#0f172a] tracking-tight flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#2563eb]" />
              Fund Manager &amp; Portfolio Governance
            </h4>
            <p className="text-[12px] text-[#64748b] mt-0.5">
              Stewardship tenure, mandate style, exit terms, and concentrated top holdings
            </p>
          </div>
          {onAddToCompare && (
            <button
              type="button"
              onClick={() => onAddToCompare(fund.symbol)}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isInCompare
                  ? 'bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]'
                  : 'bg-white border-[#dbe2ec] text-[#0f172a] hover:bg-[#f8fafc]'
              }`}
            >
              {isInCompare ? 'In Compare Basket ✓' : '+ Add to Compare'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Manager Details */}
          <div className="lg:col-span-7 rounded-[10px] border border-[#e5e9f0] bg-[#fbfcfe] p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#e5e9f0]">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-[#64748b]">Lead Fund Manager</div>
                <div className="text-[16px] font-display font-bold text-[#0f172a] mt-0.5">
                  {intel.manager.leadManager}
                </div>
                <div className="text-[12px] text-[#475569] mt-0.5 leading-snug">
                  Co-managed with {intel.manager.coManagers.join(', ')}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] font-medium text-[#64748b]">Scheme Tenure</div>
                <div className="text-[15px] font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                  {intel.manager.tenureYears.toFixed(1)} yrs
                </div>
                <div className="text-[11px] text-[#64748b] font-mono tabular-nums">
                  {intel.manager.experienceYears} yrs exp.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pt-3 text-[12.5px]">
              <div>
                <div className="text-[11px] text-[#64748b]">Investment Style</div>
                <div className="font-semibold text-[#0f172a] mt-0.5">{intel.manager.investmentStyle}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748b]">AMC / Sponsor AUM</div>
                <div className="font-mono font-semibold text-[#0f172a] tabular-nums mt-0.5">
                  {intel.manager.amcAumManaged}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748b]">Exit Load</div>
                <div className="font-semibold text-[#0f172a] mt-0.5">{intel.manager.exitLoad}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748b]">Minimum Entry</div>
                <div className="font-mono font-semibold text-[#0f172a] tabular-nums mt-0.5">
                  {intel.manager.minInvestment}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748b]">Lock-In Period</div>
                <div className="font-semibold text-[#0f172a] mt-0.5">{intel.manager.lockIn}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748b]">10Y Fee Drag ({dragBaseLabel})</div>
                <div className="font-mono font-semibold text-[#b91c1c] tabular-nums mt-0.5">
                  -{dragFormatted}
                </div>
              </div>
            </div>
          </div>

          {/* Top Holdings */}
          <div className="lg:col-span-5 rounded-[10px] border border-[#e5e9f0] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12.5px] font-semibold text-[#0f172a]">Top Constituents</span>
                <span className="text-[11px] font-mono text-[#64748b] tabular-nums">
                  {fund.keyStats.totalHoldings} total holdings
                </span>
              </div>
              <div className="space-y-2.5">
                {intel.topHoldings.map((h) => (
                  <div key={h.ticker + h.name}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="font-medium text-[#0f172a] truncate pr-2">
                        {h.name} <span className="text-[#64748b] font-normal">· {h.sector}</span>
                      </span>
                      <span className="font-mono font-semibold text-[#0f172a] tabular-nums shrink-0">
                        {h.weightPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#eef2f6] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.min(100, h.weightPct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] text-[#64748b] font-mono tabular-nums">
              <span>Top-{intel.topHoldings.length} Concentration</span>
              <span className="font-semibold text-[#0f172a]">
                {intel.topHoldings.reduce((acc, h) => acc + h.weightPct, 0).toFixed(1)}% weight
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Institutional Validation Ratios & Return on Average */}
      <section data-testid="dossier-validation-ratios-section" className="scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div>
            <h4 className="text-[16px] font-display font-bold text-[#0f172a] tracking-tight flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#2563eb]" />
              Validation Ratios &amp; Return on Average
            </h4>
            <p className="text-[12px] text-[#64748b] mt-0.5">
              Risk-adjusted efficiency ratios, rolling mean returns, peer spread, and 4-pillar instrument audit
            </p>
          </div>
          <div className="flex items-center gap-2.5 text-[12px]">
            <span className="text-[#64748b]">Composite Validation</span>
            <span className="font-mono font-bold text-[15px] text-[#0f172a] tabular-nums">
              {validation.overall}/100
            </span>
            <span className="text-[#475569] font-medium">· {validation.grade}</span>
          </div>
        </div>

        {/* 4-Pillar Validation Breakdown Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Risk-Adjusted', weight: '30% wt', score: validation.subScores.riskAdjusted },
            { label: 'Cost Efficiency', weight: '25% wt', score: validation.subScores.costEfficiency },
            { label: 'Drawdown Control', weight: '25% wt', score: validation.subScores.drawdownControl },
            { label: 'Alpha & Tracking', weight: '20% wt', score: validation.subScores.alphaQuality },
          ].map((pillar) => (
            <div key={pillar.label} className="rounded-[8px] border border-[#e5e9f0] bg-[#fbfcfe] p-3">
              <div className="flex items-center justify-between gap-1 text-[11.5px] text-[#334155] font-medium mb-1">
                <span>{pillar.label}</span>
                <span className="font-mono font-bold text-[#0f172a] tabular-nums shrink-0">{pillar.score}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#e2e8f0] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pillar.score}%`,
                    backgroundColor: pillar.score >= 78 ? '#059669' : pillar.score >= 58 ? '#2563eb' : '#d97706',
                  }}
                />
              </div>
              <div className="text-[10px] font-mono text-[#94a3b8] mt-1">{pillar.weight}</div>
            </div>
          ))}
        </div>

        {/* Return on Average Strip */}
        <div className="rounded-[10px] border border-[#dbeafe] bg-[#f8fbff] p-3.5 mb-4">
          <div className="text-[11.5px] font-semibold text-[#1e40af] mb-2.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Return on Average &amp; Peer Benchmark Spread
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <div className="text-[11px] text-[#64748b]">3Y Avg Annual</div>
              <div className="text-[14px] font-mono font-bold text-[#0f172a] tabular-nums">
                {intel.returnOnAverage.avgAnnualReturn3Y >= 0 ? '+' : ''}
                {intel.returnOnAverage.avgAnnualReturn3Y.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748b]">5Y Avg Annual</div>
              <div className="text-[14px] font-mono font-bold text-[#0f172a] tabular-nums">
                {intel.returnOnAverage.avgAnnualReturn5Y >= 0 ? '+' : ''}
                {intel.returnOnAverage.avgAnnualReturn5Y.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748b]">Rolling 3Y Mean</div>
              <div className="text-[14px] font-mono font-bold text-[#0f172a] tabular-nums">
                {intel.returnOnAverage.rolling3YMeanPct.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748b]">Category Peer Avg</div>
              <div className="text-[14px] font-mono font-semibold text-[#475569] tabular-nums">
                {intel.returnOnAverage.categoryPeerAvg3YPct.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748b]">Excess vs Peer</div>
              <div
                className={`text-[14px] font-mono font-bold tabular-nums ${
                  intel.returnOnAverage.excessOverPeerBps >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                }`}
              >
                {intel.returnOnAverage.excessOverPeerBps >= 0 ? '+' : ''}
                {intel.returnOnAverage.excessOverPeerBps} bps
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748b]">Positive Months</div>
              <div className="text-[14px] font-mono font-bold text-[#0f172a] tabular-nums">
                {intel.returnOnAverage.hitRatePositiveMonthsPct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* 12 Major Validation Ratios Table Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {[
            { label: 'Sharpe Ratio (3Y)', value: fund.keyStats.sharpe3Y.toFixed(2), hint: 'Return per unit total risk' },
            { label: 'Sortino Ratio (3Y)', value: intel.ratios.sortino3Y.toFixed(2), hint: 'Return per downside risk' },
            {
              label: "Jensen's Alpha (3Y)",
              value: `${intel.ratios.alpha3Y >= 0 ? '+' : ''}${intel.ratios.alpha3Y.toFixed(2)}%`,
              hint: 'Excess return vs beta',
              color: intel.ratios.alpha3Y >= 0 ? 'text-[#059669]' : 'text-[#dc2626]',
            },
            { label: 'Beta (3Y)', value: fund.keyStats.beta3Y.toFixed(2), hint: 'Benchmark sensitivity' },
            { label: 'Std Dev (3Y Vol)', value: `${intel.ratios.stdDev3Y.toFixed(1)}%`, hint: 'Annualized dispersion' },
            { label: 'Information Ratio', value: intel.ratios.informationRatio.toFixed(2), hint: 'Alpha consistency' },
            { label: 'Treynor Ratio', value: intel.ratios.treynorRatio.toFixed(1), hint: 'Excess return per beta' },
            { label: 'R-Squared (R²)', value: intel.ratios.rSquared.toFixed(2), hint: 'Benchmark correlation' },
            {
              label: 'Up / Down Capture',
              value: `${intel.ratios.upsideCapturePct.toFixed(0)}% / ${intel.ratios.downsideCapturePct.toFixed(0)}%`,
              hint: 'Asymmetric participation',
            },
            {
              label: 'Max Drawdown (3Y)',
              value: `${fund.keyStats.maxDrawdown3YPct.toFixed(1)}%`,
              hint: 'Peak-to-trough decline',
              color: 'text-[#dc2626]',
            },
            {
              label: intel.ratios.roaeLabel,
              value: `${intel.ratios.roaePct.toFixed(2)}%`,
              hint: intel.ratios.roaLabel + `: ${intel.ratios.roaPct.toFixed(2)}%`,
            },
            {
              label: 'Valuation (P/E · P/B)',
              value:
                intel.ratios.portfolioPE !== null && intel.ratios.portfolioPB !== null
                  ? `${intel.ratios.portfolioPE.toFixed(1)}x · ${intel.ratios.portfolioPB.toFixed(1)}x`
                  : 'N/A (Non-Equity)',
              hint: `Tracking Error: ${fund.keyStats.trackingErrorPct.toFixed(2)}%`,
            },
          ].map((ratio) => (
            <div key={ratio.label} className="rounded-[8px] border border-[#e5e9f0] bg-white px-3 py-2.5">
              <div className="text-[11px] text-[#64748b]">{ratio.label}</div>
              <div className={`text-[15px] font-mono font-bold tabular-nums mt-0.5 ${ratio.color || 'text-[#0f172a]'}`}>
                {ratio.value}
              </div>
              <div className="text-[10.5px] text-[#94a3b8] mt-0.5 truncate">{ratio.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Interactive Recharts Sector Bull/Bear Heatmap & Monthly Returns Calendar Heatmap */}
      <section data-testid="dossier-sector-heatmap-section" className="scroll-mt-20 space-y-5">
        <SectorBullBearHeatmap symbol={fund.symbol} sectors={intel.sectorHeatmap} />

        {/* Monthly Returns Calendar Heatmap (2024-2026) */}
        <div className="rounded-[10px] border border-[#e5e9f0] bg-white overflow-x-auto">
          <div className="px-4 py-2.5 border-b border-[#e5e9f0] flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-[#0f172a]">
              Monthly Returns Heatmap (%)
            </span>
            <span className="text-[11px] text-[#64748b]">
              Green = Positive Month · Rose = Drawdown Month · Right = Annual &amp; Monthly Avg
            </span>
          </div>
          <table className="w-full min-w-[640px] border-collapse text-[11.5px] font-mono tabular-nums">
            <thead>
              <tr className="border-b border-[#eef2f6] text-[#64748b] bg-[#f8fafc]">
                <th className="text-left py-2 px-3 font-sans font-semibold">Year</th>
                {MONTH_LABELS.map((m) => (
                  <th key={m} className="text-center py-2 px-1 font-sans font-medium">
                    {m}
                  </th>
                ))}
                <th className="text-right py-2 px-2.5 font-sans font-semibold text-[#0f172a]">Annual</th>
                <th className="text-right py-2 px-3 font-sans font-semibold text-[#0f172a]">Avg/Mo</th>
              </tr>
            </thead>
            <tbody>
              {intel.monthlyHeatmap.map((row) => (
                <tr key={row.year} className="border-b last:border-b-0 border-[#f1f5f9]">
                  <td className="py-2 px-3 font-bold text-[#0f172a]">{row.year}</td>
                  {row.months.map((val, idx) => {
                    const heat = getMonthlyHeatStyle(val);
                    return (
                      <td key={idx} className="p-1 text-center">
                        <div
                          className="rounded-[4px] py-1 px-0.5 font-medium"
                          style={{ backgroundColor: heat.bg, color: heat.text }}
                        >
                          {val === null ? '—' : `${val > 0 ? '+' : ''}${val.toFixed(1)}`}
                        </div>
                      </td>
                    );
                  })}
                  <td
                    className={`py-2 px-2.5 text-right font-bold ${
                      row.annualPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                    }`}
                  >
                    {row.annualPct >= 0 ? '+' : ''}
                    {row.annualPct.toFixed(1)}%
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-semibold ${
                      row.monthlyAvgPct >= 0 ? 'text-[#047857]' : 'text-[#b91c1c]'
                    }`}
                  >
                    {row.monthlyAvgPct >= 0 ? '+' : ''}
                    {row.monthlyAvgPct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Bull Case & Bear Case Investment Thesis */}
      <section data-testid="dossier-bull-bear-section" className="scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
          <div>
            <h4 className="text-[16px] font-display font-bold text-[#0f172a] tracking-tight">
              Bull &amp; Bear Case Thesis
            </h4>
            <p className="text-[12px] text-[#64748b] mt-0.5">
              Balanced scenario analysis weighing return catalysts against macro and structural drawdown risks
            </p>
          </div>
          <div className="text-[12px] text-[#475569] font-mono tabular-nums">
            Base Case Expected Return:{' '}
            <strong className="text-[#0f172a]">+{intel.baseCaseReturnPct.toFixed(1)}% / yr</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bull Case */}
          <div className="rounded-[10px] border border-[#bbf7d0] bg-[#f8fffb] p-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#dcfce7]">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-[7px] bg-[#d1fae5] text-[#047857] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-[13.5px] font-display font-bold text-[#065f46]">Bull Case</div>
                  <div className="text-[11px] text-[#047857]">{intel.bullCase.headlineMetricLabel}</div>
                </div>
              </div>
              <div className="text-[18px] font-mono font-bold text-[#059669] tabular-nums flex items-center gap-0.5">
                <ArrowUpRight className="w-4 h-4" />
                {intel.bullCase.headlineMetricValue}
              </div>
            </div>
            <p className="text-[12.5px] text-[#1e293b] leading-relaxed mt-3 mb-3 font-medium">
              {intel.bullCase.summary}
            </p>
            <ul className="space-y-2 text-[12px] text-[#334155] leading-relaxed">
              {intel.bullCase.points.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-[11px] font-bold text-[#059669] mt-0.5">0{idx + 1}.</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bear Case */}
          <div className="rounded-[10px] border border-[#fecdd3] bg-[#fffafa] p-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#ffe4e6]">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-[7px] bg-[#ffe4e6] text-[#be123c] flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-[13.5px] font-display font-bold text-[#9f1239]">Bear Case</div>
                  <div className="text-[11px] text-[#be123c]">{intel.bearCase.headlineMetricLabel}</div>
                </div>
              </div>
              <div className="text-[18px] font-mono font-bold text-[#dc2626] tabular-nums flex items-center gap-0.5">
                <ArrowDownRight className="w-4 h-4" />
                {intel.bearCase.headlineMetricValue}
              </div>
            </div>
            <p className="text-[12.5px] text-[#1e293b] leading-relaxed mt-3 mb-3 font-medium">
              {intel.bearCase.summary}
            </p>
            <ul className="space-y-2 text-[12px] text-[#334155] leading-relaxed">
              {intel.bearCase.points.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-[11px] font-bold text-[#dc2626] mt-0.5">0{idx + 1}.</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
