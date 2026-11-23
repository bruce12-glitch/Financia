import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { Activity, Layers, Scale, ShieldAlert, Sliders, TrendingUp } from 'lucide-react';
import { SCREENER_FUNDS, ScreenerFundRecord } from '../utils/screenerEngine';
import {
  buildCompoundingCurveSeries,
  buildRiskReturnFrontierData,
  computeBlendedPortfolioMetrics,
  computeCorrelationMatrix,
  computeMinVarWeights,
  RiskReturnPoint,
} from '../utils/riskAnalyticsEngine';

const SERIES_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed'];

interface FrontierAndCompoundingViewProps {
  basketFunds: ScreenerFundRecord[];
}

export const FrontierAndCompoundingView: React.FC<FrontierAndCompoundingViewProps> = ({
  basketFunds,
}) => {
  const [overlayAll20, setOverlayAll20] = useState<boolean>(true);
  const [horizonYears, setHorizonYears] = useState<3 | 5 | 10>(10);
  const [principal, setPrincipal] = useState<100000 | 500000 | 1000000>(500000);

  const frontierPoints = useMemo(
    () => buildRiskReturnFrontierData(basketFunds, SCREENER_FUNDS, overlayAll20),
    [basketFunds, overlayAll20]
  );

  const peerPoints = useMemo(
    () => frontierPoints.filter((p) => !p.isSelected),
    [frontierPoints]
  );
  const selectedPoints = useMemo(() => {
    const bySym = new Map(frontierPoints.map((p) => [p.symbol, p]));
    return basketFunds
      .map((f) => bySym.get(f.symbol))
      .filter((p): p is RiskReturnPoint => Boolean(p));
  }, [frontierPoints, basketFunds]);

  const curveData = useMemo(
    () => buildCompoundingCurveSeries(basketFunds, horizonYears, principal),
    [basketFunds, horizonYears, principal]
  );

  const currencyPrefix = basketFunds[0]?.currency === 'INR' ? '₹' : '$';
  const formatCompact = (v: number) => {
    if (v >= 1_000_000) return `${currencyPrefix}${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${currencyPrefix}${Math.round(v / 1_000)}k`;
    return `${currencyPrefix}${v}`;
  };

  return (
    <div
      data-testid="compare-frontier-compounding-panel"
      className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-5 bg-white"
    >
      {/* Left: Risk-Return Efficient Frontier ScatterChart */}
      <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4 flex flex-col">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-display font-bold text-[#0f172a]">
              <Activity className="w-4 h-4 text-[#2563eb]" />
              <span>Risk-Return Efficient Frontier (3Y)</span>
            </div>
            <p className="text-[11.5px] text-[#64748b] mt-0.5">
              Top-left = higher annualized return with lower volatility (superior Sharpe)
            </p>
          </div>
          <button
            type="button"
            data-testid="frontier-toggle-all20"
            onClick={() => setOverlayAll20((prev) => !prev)}
            className={`px-2.5 py-1 rounded-[7px] border text-[11px] font-semibold transition-colors cursor-pointer ${
              overlayAll20
                ? 'bg-[#0f172a] text-white border-[#0f172a]'
                : 'bg-white text-[#475569] border-[#cbd5e1] hover:border-[#0f172a]'
            }`}
          >
            {overlayAll20 ? 'All 20 Universe: ON' : 'Selected Basket Only'}
          </button>
        </div>

        <div className="h-[290px] w-full bg-white rounded-[10px] border border-[#e2e8f0] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 14, right: 18, bottom: 20, left: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="volatilityPct"
                name="3Y Volatility"
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{
                  value: '3Y Volatility (Std Dev %)',
                  position: 'insideBottom',
                  offset: -10,
                  fontSize: 11,
                  fill: '#475569',
                }}
              />
              <YAxis
                type="number"
                dataKey="return3YPct"
                name="3Y Return"
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b' }}
                width={46}
              />
              <ZAxis type="number" dataKey="sharpe3Y" range={[70, 220]} />
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const pt = payload[0].payload as RiskReturnPoint;
                  return (
                    <div className="rounded-[9px] bg-[#0f172a] text-white px-3 py-2.5 text-[11.5px] shadow-lg border border-[#334155]">
                      <div className="font-mono font-bold text-[#38bdf8]">
                        {pt.symbol} · {pt.instrumentType}
                      </div>
                      <div className="text-[#e2e8f0] text-[11px] mb-1.5 max-w-[200px] truncate">
                        {pt.name}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[11px] tabular-nums">
                        <span className="text-[#94a3b8]">3Y Avg Return:</span>
                        <span className="text-right font-semibold text-[#34d399]">
                          {pt.return3YPct >= 0 ? '+' : ''}
                          {pt.return3YPct.toFixed(2)}%
                        </span>
                        <span className="text-[#94a3b8]">3Y Volatility:</span>
                        <span className="text-right">{pt.volatilityPct.toFixed(1)}%</span>
                        <span className="text-[#94a3b8]">1M VaR (95%):</span>
                        <span className="text-right text-[#fca5a5]">
                          {pt.var95MonthlyPct.toFixed(2)}%
                        </span>
                        <span className="text-[#94a3b8]">Max DD (3Y):</span>
                        <span className="text-right text-[#fca5a5]">
                          {pt.maxDrawdown3YPct.toFixed(1)}%
                        </span>
                        <span className="text-[#94a3b8]">Sharpe / TER:</span>
                        <span className="text-right">
                          {pt.sharpe3Y.toFixed(2)} / {pt.expenseRatioPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              {overlayAll20 && peerPoints.length > 0 && (
                <Scatter
                  name="Universe Peers"
                  data={peerPoints}
                  fill="#94a3b8"
                  fillOpacity={0.55}
                />
              )}
              <Scatter
                name="Compared Basket"
                data={selectedPoints}
                fill="#2563eb"
                stroke="#0f172a"
                strokeWidth={1.5}
              >
                {selectedPoints.map((entry, idx) => (
                  <Cell
                    key={entry.symbol}
                    fill={SERIES_COLORS[idx % SERIES_COLORS.length]}
                    stroke="#0f172a"
                    strokeWidth={1.5}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Selected Instrument Coordinates Legend Strip */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {selectedPoints.map((pt, idx) => (
            <div
              key={pt.symbol}
              className="rounded-[8px] border border-[#e2e8f0] bg-white px-2.5 py-2 text-[11px] font-mono tabular-nums"
            >
              <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                />
                <span>{pt.symbol}</span>
              </div>
              <div className="text-[#059669] mt-0.5">
                Ret {pt.return3YPct >= 0 ? '+' : ''}
                {pt.return3YPct.toFixed(1)}%
              </div>
              <div className="text-[#64748b]">
                Vol {pt.volatilityPct.toFixed(1)}% · VaR {pt.var95MonthlyPct.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Multi-Year Net Compounding Wealth Curve */}
      <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4 flex flex-col">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-display font-bold text-[#0f172a]">
              <TrendingUp className="w-4 h-4 text-[#059669]" />
              <span>Net Compounding Wealth Curve</span>
            </div>
            <p className="text-[11.5px] text-[#64748b] mt-0.5">
              Compounded at 3Y annualized average return minus each scheme&apos;s expense ratio (TER)
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              role="group"
              aria-label="Compounding horizon"
              className="inline-flex rounded-[7px] border border-[#cbd5e1] bg-white p-0.5"
            >
              {([3, 5, 10] as const).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  data-testid={`curve-horizon-${yr}y`}
                  onClick={() => setHorizonYears(yr)}
                  className={`px-2 py-0.5 rounded-[5px] text-[11px] font-mono font-semibold cursor-pointer ${
                    horizonYears === yr
                      ? 'bg-[#2563eb] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {yr}Y
                </button>
              ))}
            </div>
            <select
              aria-label="Starting capital"
              data-testid="curve-principal-select"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value) as 100000 | 500000 | 1000000)}
              className="h-7 rounded-[7px] border border-[#cbd5e1] bg-white px-2 text-[11px] font-mono font-semibold text-[#0f172a] cursor-pointer"
            >
              <option value={100000}>{currencyPrefix}100k</option>
              <option value={500000}>{currencyPrefix}500k</option>
              <option value={1000000}>{currencyPrefix}1M</option>
            </select>
          </div>
        </div>

        <div className="h-[290px] w-full bg-white rounded-[10px] border border-[#e2e8f0] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 14, right: 18, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="yearLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                tickFormatter={formatCompact}
                tick={{ fontSize: 11, fill: '#64748b' }}
                width={58}
              />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [
                  `${currencyPrefix}${Math.round(Number(value)).toLocaleString('en-US')}`,
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
              {basketFunds.map((fund, idx) => (
                <Line
                  key={fund.symbol}
                  type="monotone"
                  dataKey={fund.symbol}
                  stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                  strokeWidth={2.4}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Terminal Year Net Value Summary */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {basketFunds.map((fund, idx) => {
            const lastRow = curveData[curveData.length - 1];
            const finalVal = Number(lastRow?.[fund.symbol] ?? principal);
            const gainPct = ((finalVal - principal) / principal) * 100;
            return (
              <div
                key={fund.symbol}
                className="rounded-[8px] border border-[#e2e8f0] bg-white px-2.5 py-2 text-[11px] font-mono tabular-nums"
              >
                <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                  />
                  <span>{fund.symbol}</span>
                </div>
                <div className="font-bold text-[#0f172a] mt-0.5">
                  {formatCompact(finalVal)}
                </div>
                <div className="text-[#059669]">+{gainPct.toFixed(0)}% net</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface CorrelationAndBlendViewProps {
  basketFunds: ScreenerFundRecord[];
}

export const CorrelationAndBlendView: React.FC<CorrelationAndBlendViewProps> = ({
  basketFunds,
}) => {
  const basketKey = basketFunds.map((f) => f.symbol).join('|');
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    const share = Math.round(100 / Math.max(1, basketFunds.length));
    basketFunds.forEach((f) => {
      init[f.symbol] = share;
    });
    return init;
  });

  useEffect(() => {
    const share = Math.round(100 / Math.max(1, basketFunds.length));
    const next: Record<string, number> = {};
    basketFunds.forEach((f) => {
      next[f.symbol] = share;
    });
    setWeights(next);
  }, [basketKey]);

  const corr = useMemo(() => computeCorrelationMatrix(basketFunds), [basketFunds]);
  const blended = useMemo(
    () => computeBlendedPortfolioMetrics(basketFunds, weights, corr),
    [basketFunds, weights, corr]
  );

  const handleEqualWeight = () => {
    const share = Math.round(100 / Math.max(1, basketFunds.length));
    const next: Record<string, number> = {};
    basketFunds.forEach((f) => {
      next[f.symbol] = share;
    });
    setWeights(next);
  };

  const handleMinVarWeights = () => {
    setWeights(computeMinVarWeights(basketFunds, corr));
  };

  const cellStyle = (r: number, isDiag: boolean) => {
    if (isDiag) return 'bg-[#0f172a] text-white font-bold';
    if (r >= 0.7) return 'bg-[#fee2e2] text-[#991b1b] font-semibold';
    if (r >= 0.35) return 'bg-[#fef3c7] text-[#92400e] font-semibold';
    if (r >= 0) return 'bg-[#eff6ff] text-[#1e40af] font-semibold';
    return 'bg-[#dcfce7] text-[#166534] font-bold';
  };

  const currencyPrefix = basketFunds[0]?.currency === 'INR' ? '₹' : '$';

  return (
    <div
      data-testid="compare-correlation-blend-panel"
      className="p-5 grid grid-cols-1 xl:grid-cols-12 gap-5 bg-white"
    >
      {/* Left 5 cols: Empirical Pairwise Correlation Matrix */}
      <div className="xl:col-span-5 rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-display font-bold text-[#0f172a]">
                <Layers className="w-4 h-4 text-[#2563eb]" />
                <span>Empirical Correlation Matrix</span>
              </div>
              <p className="text-[11.5px] text-[#64748b] mt-0.5">
                Pairwise Pearson r computed from aligned monthly return series
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">
                Diversification Score
              </div>
              <div
                data-testid="correlation-diversification-score"
                className="text-lg font-mono font-bold text-[#2563eb] tabular-nums"
              >
                {corr.diversificationScore}/100
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-[10px] border border-[#e2e8f0] p-3">
            <table
              data-testid="correlation-matrix-table"
              className="w-full border-collapse text-center font-mono text-xs tabular-nums"
            >
              <thead>
                <tr>
                  <th className="py-2 px-2 text-left text-[10.5px] text-[#64748b]">Pair r</th>
                  {corr.symbols.map((sym) => (
                    <th key={sym} className="py-2 px-2 text-[11px] font-bold text-[#0f172a]">
                      {sym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corr.symbols.map((rowSym, i) => (
                  <tr key={rowSym} className="border-t border-[#f1f5f9]">
                    <td className="py-2.5 px-2 text-left text-[11px] font-bold text-[#0f172a]">
                      {rowSym}
                    </td>
                    {corr.symbols.map((colSym, j) => {
                      const val = corr.matrix[i][j];
                      return (
                        <td key={colSym} className="p-1">
                          <div
                            className={`rounded-[6px] py-2 px-1.5 text-[11.5px] ${cellStyle(
                              val,
                              i === j
                            )}`}
                          >
                            {val.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3.5 rounded-[9px] border border-[#e2e8f0] bg-white px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-[#0f172a]">{corr.diversificationLabel}</span>
            <span className="text-[#64748b] ml-1.5">
              (Avg off-diagonal r = {corr.averagePairwiseCorrelation.toFixed(2)})
            </span>
          </div>
          <span className="text-[10.5px] font-mono text-[#64748b] shrink-0">
            Green &lt; 0 · Red ≥ 0.70
          </span>
        </div>
      </div>

      {/* Right 7 cols: Interactive Custom Portfolio Blend Backtester */}
      <div className="xl:col-span-7 rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4 flex flex-col justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-display font-bold text-[#0f172a]">
                <Sliders className="w-4 h-4 text-[#2563eb]" />
                <span>Interactive Portfolio Blend Simulator</span>
              </div>
              <p className="text-[11.5px] text-[#64748b] mt-0.5">
                Adjust allocation weights to inspect covariance-adjusted Volatility, Blended VaR (95%) &amp; Sharpe
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="blend-equal-weight-btn"
                onClick={handleEqualWeight}
                className="px-2.5 py-1.5 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] text-[11px] font-semibold text-[#334155] cursor-pointer"
              >
                Equal Weight
              </button>
              <button
                type="button"
                data-testid="blend-min-var-btn"
                onClick={handleMinVarWeights}
                className="px-2.5 py-1.5 rounded-[7px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Scale className="w-3 h-3 text-[#38bdf8]" />
                <span>Min-VaR Balance</span>
              </button>
            </div>
          </div>

          {/* Weight Sliders */}
          <div className="space-y-2.5 bg-white rounded-[10px] border border-[#e2e8f0] p-3.5">
            {basketFunds.map((fund, idx) => {
              const rawVal = weights[fund.symbol] ?? 0;
              const normPct = blended.normalizedWeights[fund.symbol] ?? 0;
              return (
                <div key={fund.symbol} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                      />
                      <span className="font-mono font-bold text-[#0f172a]">{fund.symbol}</span>
                      <span className="text-[#64748b] truncate max-w-[210px]">{fund.name}</span>
                    </div>
                    <span
                      data-testid={`blend-weight-${fund.symbol}`}
                      className="font-mono font-bold text-[#2563eb] tabular-nums shrink-0"
                    >
                      {normPct.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={`Allocation weight for ${fund.symbol}`}
                    data-testid={`blend-slider-${fund.symbol}`}
                    min={0}
                    max={100}
                    step={5}
                    value={rawVal}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [fund.symbol]: Number(e.target.value) }))
                    }
                    className="w-full accent-[#2563eb] h-1.5 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Blended Risk & Return KPI Grid */}
        <div
          data-testid="blend-metrics-grid"
          className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
        >
          <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Blended 3Y Return</div>
            <div
              data-testid="blend-return-val"
              className="text-lg font-mono font-bold text-[#059669] tabular-nums mt-0.5"
            >
              {blended.blendedReturn3YPct >= 0 ? '+' : ''}
              {blended.blendedReturn3YPct.toFixed(2)}%
            </div>
            <div className="text-[10.5px] font-mono text-[#64748b]">
              Blended TER {blended.blendedExpenseRatioPct.toFixed(2)}%
            </div>
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">
              Blended 1M VaR (95%)
            </div>
            <div
              data-testid="blend-var95-val"
              className="text-lg font-mono font-bold text-[#dc2626] tabular-nums mt-0.5"
            >
              {blended.blendedVar95MonthlyPct.toFixed(2)}%
            </div>
            <div className="text-[10.5px] font-mono text-[#64748b]">
              Est. Max DD {blended.blendedMaxDrawdownPct.toFixed(1)}%
            </div>
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">
              Blended Sharpe (3Y)
            </div>
            <div
              data-testid="blend-sharpe-val"
              className="text-lg font-mono font-bold text-[#2563eb] tabular-nums mt-0.5"
            >
              {blended.blendedSharpe3Y.toFixed(2)}
            </div>
            <div className="text-[10.5px] font-mono text-[#64748b]">
              10Y on 100k: {currencyPrefix}
              {blended.blendedTenYearWealthOn100k.toLocaleString('en-US')}
            </div>
          </div>

          <div className="rounded-[9px] border border-[#bfdbfe] bg-[#eff6ff]/70 p-3 col-span-2 sm:col-span-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#1e3a8a]">
              <ShieldAlert className="w-4 h-4 text-[#2563eb] shrink-0" />
              <span>
                Covariance-Adjusted Volatility:{' '}
                <strong className="font-mono tabular-nums">
                  {blended.blendedVolatilityPct.toFixed(2)}%
                </strong>{' '}
                (vs. unhedged avg {blended.weightedAvgVolatilityPct.toFixed(2)}%)
              </span>
            </div>
            <span className="font-mono font-bold text-[#047857] tabular-nums">
              -{blended.diversificationVolSavedPct.toFixed(2)}% vol saved via diversification
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
