import React, { useMemo, useState } from 'react';
import {
  AnalysisChartMode,
  AnalysisDataPoint,
  PivotLevels,
} from '../utils/instrumentAnalysisEngine';

export type SubOscillatorMode = 'rsi' | 'macd' | 'vol' | 'none';

interface InstrumentAnalysisChartProps {
  symbol: string;
  benchmarkSymbol: string | null;
  unit: string;
  series: AnalysisDataPoint[];
  pivots: PivotLevels;
  chartMode: AnalysisChartMode;
  showSma20: boolean;
  showEma50: boolean;
  showBollinger: boolean;
  oscillatorMode: SubOscillatorMode;
  onChangeOscillator: (mode: SubOscillatorMode) => void;
}

const CHART_W = 1040;
const CHART_H = 316;
const PAD_L = 16;
const PAD_R = 68;
const PAD_T = 18;
const PAD_B = 26;

const OSC_H = 94;
const OSC_PAD_T = 12;
const OSC_PAD_B = 16;

function buildPathFromCoords(coords: Array<[number, number] | null>): string {
  let d = '';
  let started = false;
  for (const pt of coords) {
    if (!pt) {
      started = false;
      continue;
    }
    d += `${started ? 'L' : 'M'}${pt[0].toFixed(1)},${pt[1].toFixed(1)} `;
    started = true;
  }
  return d.trim();
}

export const InstrumentAnalysisChart: React.FC<InstrumentAnalysisChartProps> = ({
  symbol,
  benchmarkSymbol,
  unit,
  series,
  pivots,
  chartMode,
  showSma20,
  showEma50,
  showBollinger,
  oscillatorMode,
  onChangeOscillator,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const currencyPrefix = unit === 'INR' ? '₹' : '$';
  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;

  const activeIndex = hoverIdx !== null && series[hoverIdx] ? hoverIdx : series.length - 1;
  const activePt = series[activeIndex] || series[series.length - 1];

  const mainGeometry = useMemo(() => {
    if (series.length < 2) return null;
    const xAt = (i: number) => PAD_L + (i / (series.length - 1)) * plotW;

    const values: number[] = [];
    for (const pt of series) {
      if (chartMode === 'price') {
        values.push(pt.close);
        if (showSma20 && pt.sma20 !== null) values.push(pt.sma20);
        if (showEma50 && pt.ema50 !== null) values.push(pt.ema50);
        if (showBollinger && pt.bbUpper !== null && pt.bbLower !== null) {
          values.push(pt.bbUpper, pt.bbLower);
        }
      } else if (chartMode === 'normalized') {
        values.push(pt.normalizedPct);
        if (benchmarkSymbol && pt.benchmarkNormalizedPct !== undefined) {
          values.push(pt.benchmarkNormalizedPct);
        }
      } else {
        values.push(pt.drawdownPct, 0);
      }
    }

    let minY = Math.min(...values);
    let maxY = Math.max(...values);
    if (chartMode === 'drawdown') {
      maxY = 0.2;
      minY = Math.min(minY * 1.12, -1);
    } else {
      const span = maxY - minY || Math.abs(maxY) * 0.05 || 1;
      minY -= span * 0.08;
      maxY += span * 0.08;
    }
    const ySpan = maxY - minY || 1;
    const yAt = (v: number) => PAD_T + ((maxY - v) / ySpan) * plotH;

    const primaryCoords: Array<[number, number]> = series.map((pt, i) => [
      xAt(i),
      yAt(
        chartMode === 'price'
          ? pt.close
          : chartMode === 'normalized'
            ? pt.normalizedPct
            : pt.drawdownPct
      ),
    ]);

    const primaryPath = buildPathFromCoords(primaryCoords);
    const baselineY =
      chartMode === 'drawdown'
        ? yAt(0)
        : chartMode === 'normalized'
          ? yAt(0)
          : PAD_T + plotH;

    const areaPath =
      primaryCoords.length > 1
        ? `${primaryPath} L${primaryCoords[primaryCoords.length - 1][0].toFixed(1)},${baselineY.toFixed(1)} L${primaryCoords[0][0].toFixed(1)},${baselineY.toFixed(1)} Z`
        : '';

    const smaPath =
      chartMode === 'price' && showSma20
        ? buildPathFromCoords(
            series.map((pt, i) => (pt.sma20 !== null ? [xAt(i), yAt(pt.sma20)] : null))
          )
        : '';

    const emaPath =
      chartMode === 'price' && showEma50
        ? buildPathFromCoords(
            series.map((pt, i) => (pt.ema50 !== null ? [xAt(i), yAt(pt.ema50)] : null))
          )
        : '';

    let bbBandPath = '';
    let bbUpperPath = '';
    let bbLowerPath = '';
    if (chartMode === 'price' && showBollinger) {
      const upperPts: Array<[number, number]> = [];
      const lowerPts: Array<[number, number]> = [];
      series.forEach((pt, i) => {
        if (pt.bbUpper !== null && pt.bbLower !== null) {
          upperPts.push([xAt(i), yAt(pt.bbUpper)]);
          lowerPts.push([xAt(i), yAt(pt.bbLower)]);
        }
      });
      if (upperPts.length >= 2) {
        bbUpperPath = buildPathFromCoords(upperPts);
        bbLowerPath = buildPathFromCoords(lowerPts);
        const revLower = [...lowerPts].reverse();
        bbBandPath = `${bbUpperPath} ${revLower.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} Z`;
      }
    }

    const benchmarkPath =
      chartMode === 'normalized' && benchmarkSymbol
        ? buildPathFromCoords(
            series.map((pt, i) =>
              pt.benchmarkNormalizedPct !== undefined
                ? [xAt(i), yAt(pt.benchmarkNormalizedPct)]
                : null
            )
          )
        : '';

    const yTicks = Array.from({ length: 5 }, (_, idx) => {
      const ratio = idx / 4;
      const val = maxY - ratio * ySpan;
      return { y: PAD_T + ratio * plotH, val };
    });

    const xTickIndices = [
      0,
      Math.floor(series.length * 0.25),
      Math.floor(series.length * 0.5),
      Math.floor(series.length * 0.75),
      series.length - 1,
    ];
    const xTicks = xTickIndices.map((idx) => ({
      x: xAt(idx),
      label: series[idx]?.dateLabel || '',
    }));

    const zeroLineY = chartMode !== 'price' && minY <= 0 && maxY >= 0 ? yAt(0) : null;
    const pivotLineY =
      chartMode === 'price' && pivots.pivot >= minY && pivots.pivot <= maxY
        ? yAt(pivots.pivot)
        : null;

    return {
      xAt,
      yAt,
      primaryCoords,
      primaryPath,
      areaPath,
      smaPath,
      emaPath,
      bbBandPath,
      bbUpperPath,
      bbLowerPath,
      benchmarkPath,
      yTicks,
      xTicks,
      zeroLineY,
      pivotLineY,
    };
  }, [series, chartMode, showSma20, showEma50, showBollinger, benchmarkSymbol, pivots.pivot, plotW, plotH]);

  const oscGeometry = useMemo(() => {
    if (oscillatorMode === 'none' || series.length < 2) return null;
    const xAt = (i: number) => PAD_L + (i / (series.length - 1)) * plotW;
    const innerH = OSC_H - OSC_PAD_T - OSC_PAD_B;

    if (oscillatorMode === 'rsi') {
      const yAt = (v: number) => OSC_PAD_T + ((100 - v) / 100) * innerH;
      const path = buildPathFromCoords(
        series.map((pt, i) => (pt.rsi14 !== null ? [xAt(i), yAt(pt.rsi14)] : null))
      );
      return {
        kind: 'rsi' as const,
        path,
        y70: yAt(70),
        y30: yAt(30),
        y50: yAt(50),
      };
    }

    if (oscillatorMode === 'macd') {
      const vals: number[] = [0];
      series.forEach((pt) => {
        if (pt.macd !== null) vals.push(pt.macd);
        if (pt.macdSignal !== null) vals.push(pt.macdSignal);
        if (pt.macdHist !== null) vals.push(pt.macdHist);
      });
      const maxAbs = Math.max(0.01, ...vals.map((v) => Math.abs(v))) * 1.15;
      const yAt = (v: number) => OSC_PAD_T + ((maxAbs - v) / (2 * maxAbs)) * innerH;
      const zeroY = yAt(0);
      const macdPath = buildPathFromCoords(
        series.map((pt, i) => (pt.macd !== null ? [xAt(i), yAt(pt.macd)] : null))
      );
      const sigPath = buildPathFromCoords(
        series.map((pt, i) => (pt.macdSignal !== null ? [xAt(i), yAt(pt.macdSignal)] : null))
      );
      const barW = Math.max(1.5, Math.min(6, plotW / series.length - 1));
      const bars = series.map((pt, i) => {
        if (pt.macdHist === null) return null;
        const y = yAt(pt.macdHist);
        return {
          x: xAt(i) - barW / 2,
          y: Math.min(zeroY, y),
          h: Math.max(1, Math.abs(y - zeroY)),
          w: barW,
          positive: pt.macdHist >= 0,
        };
      });
      return {
        kind: 'macd' as const,
        macdPath,
        sigPath,
        zeroY,
        bars,
      };
    }

    // Rolling volatility
    const volVals = series
      .map((pt) => pt.rollingVolPct)
      .filter((v): v is number => v !== null);
    const maxV = Math.max(5, ...volVals) * 1.12;
    const minV = Math.max(0, Math.min(...volVals, 0) * 0.85);
    const span = maxV - minV || 1;
    const yAt = (v: number) => OSC_PAD_T + ((maxV - v) / span) * innerH;
    const volPath = buildPathFromCoords(
      series.map((pt, i) => (pt.rollingVolPct !== null ? [xAt(i), yAt(pt.rollingVolPct)] : null))
    );
    return {
      kind: 'vol' as const,
      volPath,
      maxV,
      minV,
    };
  }, [oscillatorMode, series, plotW]);

  if (!mainGeometry || !activePt) return null;

  const isPositiveNet = series[series.length - 1].normalizedPct >= 0;
  const strokeHex =
    chartMode === 'drawdown'
      ? '#FB7185'
      : isPositiveNet
        ? '#34D399'
        : '#F43F5E';

  const handleSvgPointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const clamped = Math.max(PAD_L, Math.min(CHART_W - PAD_R, relX));
    const ratio = (clamped - PAD_L) / plotW;
    const idx = Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1))));
    setHoverIdx(idx);
  };

  const activeX = mainGeometry.xAt(activeIndex);
  const activeY = mainGeometry.yAt(
    chartMode === 'price'
      ? activePt.close
      : chartMode === 'normalized'
        ? activePt.normalizedPct
        : activePt.drawdownPct
  );

  const formatYLabel = (val: number) => {
    if (chartMode === 'price') {
      return `${currencyPrefix}${val >= 1000 ? val.toLocaleString('en-US', { maximumFractionDigits: 0 }) : val.toFixed(1)}`;
    }
    return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  return (
    <div className="space-y-2">
      {/* Live Scrubbing Telemetry Readout Strip */}
      <div
        data-testid="analysis-chart-readout"
        className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11.5px] font-mono tabular-nums text-[#94a3b8]"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-white font-semibold">{activePt.dateLabel}</span>
          <span>
            NAV/Px{' '}
            <strong className="text-white">
              {currencyPrefix}
              {activePt.close.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </span>
          <span className={activePt.normalizedPct >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'}>
            Cum {activePt.normalizedPct >= 0 ? '+' : ''}
            {activePt.normalizedPct.toFixed(2)}%
          </span>
          <span className="text-[#fb7185]">
            DD {activePt.drawdownPct.toFixed(2)}%
          </span>
          {showSma20 && activePt.sma20 !== null && chartMode === 'price' && (
            <span className="text-[#fbbf24]">SMA20 {currencyPrefix}{activePt.sma20.toFixed(2)}</span>
          )}
          {showEma50 && activePt.ema50 !== null && chartMode === 'price' && (
            <span className="text-[#a78bfa]">EMA50 {currencyPrefix}{activePt.ema50.toFixed(2)}</span>
          )}
          {benchmarkSymbol && activePt.benchmarkNormalizedPct !== undefined && (
            <span className="text-[#38bdf8]">
              {benchmarkSymbol} {activePt.benchmarkNormalizedPct >= 0 ? '+' : ''}
              {activePt.benchmarkNormalizedPct.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Sub-oscillator Selector */}
        <div className="inline-flex items-center gap-1 text-[11px]">
          <span className="text-[#64748b] mr-1">Oscillator:</span>
          {(
            [
              { id: 'rsi', label: 'RSI (14)' },
              { id: 'macd', label: 'MACD' },
              { id: 'vol', label: 'Rolling σ' },
              { id: 'none', label: 'Hide' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={`oscillator-btn-${opt.id}`}
              onClick={() => onChangeOscillator(opt.id)}
              className={`px-2 py-0.5 rounded-[5px] transition-colors cursor-pointer whitespace-nowrap ${
                oscillatorMode === opt.id
                  ? 'bg-white/[0.14] text-white font-semibold'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main SVG Quantitative Chart */}
      <div className="rounded-[10px] bg-[#040814] border border-white/[0.08] overflow-hidden">
        <svg
          data-testid="instrument-analysis-svg"
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-auto block cursor-crosshair select-none"
          role="img"
          aria-label={`${symbol} quantitative ${chartMode} chart`}
          onMouseMove={handleSvgPointerMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`ia-area-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeHex} stopOpacity={chartMode === 'drawdown' ? 0.32 : 0.24} />
              <stop offset="100%" stopColor={strokeHex} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Right Price/Pct Axis */}
          {mainGeometry.yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={PAD_L}
                y1={tick.y}
                x2={CHART_W - PAD_R}
                y2={tick.y}
                stroke="rgba(148, 163, 184, 0.1)"
                strokeWidth={1}
              />
              <text
                x={CHART_W - PAD_R + 8}
                y={tick.y + 3.5}
                fill="#94a3b8"
                fontSize={10.5}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {formatYLabel(tick.val)}
              </text>
            </g>
          ))}

          {/* 0% Reference Line for Normalized / Drawdown */}
          {mainGeometry.zeroLineY !== null && (
            <line
              x1={PAD_L}
              y1={mainGeometry.zeroLineY}
              x2={CHART_W - PAD_R}
              y2={mainGeometry.zeroLineY}
              stroke="rgba(226, 232, 240, 0.3)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          )}

          {/* Period Pivot Level Dashed Line in Price Mode */}
          {mainGeometry.pivotLineY !== null && (
            <g>
              <line
                x1={PAD_L}
                y1={mainGeometry.pivotLineY}
                x2={CHART_W - PAD_R}
                y2={mainGeometry.pivotLineY}
                stroke="rgba(56, 189, 248, 0.35)"
                strokeDasharray="3 5"
                strokeWidth={1}
              />
              <text
                x={PAD_L + 6}
                y={mainGeometry.pivotLineY - 4}
                fill="#38bdf8"
                fontSize={9.5}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                Pivot {currencyPrefix}{pivots.pivot.toFixed(2)}
              </text>
            </g>
          )}

          {/* Bollinger Volatility Envelope (20, 2σ) */}
          {mainGeometry.bbBandPath && (
            <g>
              <path d={mainGeometry.bbBandPath} fill="rgba(56, 189, 248, 0.08)" />
              <path
                d={mainGeometry.bbUpperPath}
                fill="none"
                stroke="rgba(56, 189, 248, 0.42)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <path
                d={mainGeometry.bbLowerPath}
                fill="none"
                stroke="rgba(56, 189, 248, 0.42)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            </g>
          )}

          {/* Primary Gradient Area Fill */}
          {mainGeometry.areaPath && (
            <path d={mainGeometry.areaPath} fill={`url(#ia-area-${symbol})`} />
          )}

          {/* Benchmark Comparison Curve (Normalized Mode) */}
          {mainGeometry.benchmarkPath && (
            <path
              d={mainGeometry.benchmarkPath}
              fill="none"
              stroke="#38BDF8"
              strokeWidth={1.75}
              strokeDasharray="5 3"
            />
          )}

          {/* Moving Average Overlays (Price Mode) */}
          {mainGeometry.smaPath && (
            <path d={mainGeometry.smaPath} fill="none" stroke="#FBBF24" strokeWidth={1.45} opacity={0.9} />
          )}
          {mainGeometry.emaPath && (
            <path d={mainGeometry.emaPath} fill="none" stroke="#A78BFA" strokeWidth={1.45} opacity={0.9} />
          )}

          {/* Primary Curve */}
          <path
            d={mainGeometry.primaryPath}
            fill="none"
            stroke={strokeHex}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Interactive Vertical Crosshair & Active Point Marker */}
          <line
            x1={activeX}
            y1={PAD_T}
            x2={activeX}
            y2={CHART_H - PAD_B}
            stroke="rgba(226, 232, 240, 0.35)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          <circle
            cx={activeX}
            cy={activeY}
            r={4.5}
            fill={strokeHex}
            stroke="#040814"
            strokeWidth={2}
          />

          {/* Benchmark Active Point Marker */}
          {chartMode === 'normalized' &&
            benchmarkSymbol &&
            activePt.benchmarkNormalizedPct !== undefined && (
              <circle
                cx={activeX}
                cy={mainGeometry.yAt(activePt.benchmarkNormalizedPct)}
                r={3.8}
                fill="#38BDF8"
                stroke="#040814"
                strokeWidth={1.8}
              />
            )}

          {/* Bottom Date Axis */}
          {mainGeometry.xTicks.map((tick, idx) => (
            <text
              key={idx}
              x={tick.x}
              y={CHART_H - 7}
              textAnchor={idx === 0 ? 'start' : idx === mainGeometry.xTicks.length - 1 ? 'end' : 'middle'}
              fill="#64748b"
              fontSize={10}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {tick.label}
            </text>
          ))}
        </svg>

        {/* Synchronized Sub-Oscillator Panel (RSI-14 / MACD / Rolling σ) */}
        {oscGeometry && (
          <div className="border-t border-white/[0.08] bg-[#050a18]">
            <svg
              data-testid="instrument-oscillator-svg"
              viewBox={`0 0 ${CHART_W} ${OSC_H}`}
              className="w-full h-auto block select-none"
              role="img"
              aria-label={`${oscillatorMode} technical oscillator`}
            >
              {oscGeometry.kind === 'rsi' && (
                <g>
                  <rect
                    x={PAD_L}
                    y={oscGeometry.y70}
                    width={plotW}
                    height={oscGeometry.y30 - oscGeometry.y70}
                    fill="rgba(56, 189, 248, 0.05)"
                  />
                  <line
                    x1={PAD_L}
                    y1={oscGeometry.y70}
                    x2={CHART_W - PAD_R}
                    y2={oscGeometry.y70}
                    stroke="rgba(251, 113, 133, 0.4)"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={PAD_L}
                    y1={oscGeometry.y30}
                    x2={CHART_W - PAD_R}
                    y2={oscGeometry.y30}
                    stroke="rgba(52, 211, 153, 0.4)"
                    strokeDasharray="3 3"
                  />
                  <path d={oscGeometry.path} fill="none" stroke="#38BDF8" strokeWidth={1.65} />
                  <text x={CHART_W - PAD_R + 8} y={oscGeometry.y70 + 3} fill="#fb7185" fontSize={9.5} fontFamily="monospace">
                    70
                  </text>
                  <text x={CHART_W - PAD_R + 8} y={oscGeometry.y30 + 3} fill="#34d399" fontSize={9.5} fontFamily="monospace">
                    30
                  </text>
                  <text x={PAD_L + 6} y={14} fill="#94a3b8" fontSize={9.5} fontFamily="monospace">
                    RSI (14) · {activePt.rsi14 !== null ? activePt.rsi14.toFixed(1) : '—'}
                  </text>
                </g>
              )}

              {oscGeometry.kind === 'macd' && (
                <g>
                  <line
                    x1={PAD_L}
                    y1={oscGeometry.zeroY}
                    x2={CHART_W - PAD_R}
                    y2={oscGeometry.zeroY}
                    stroke="rgba(148, 163, 184, 0.25)"
                  />
                  {oscGeometry.bars.map(
                    (bar, idx) =>
                      bar && (
                        <rect
                          key={idx}
                          x={bar.x}
                          y={bar.y}
                          width={bar.w}
                          height={bar.h}
                          fill={bar.positive ? 'rgba(52, 211, 153, 0.55)' : 'rgba(251, 113, 133, 0.55)'}
                        />
                      )
                  )}
                  <path d={oscGeometry.macdPath} fill="none" stroke="#38BDF8" strokeWidth={1.45} />
                  <path d={oscGeometry.sigPath} fill="none" stroke="#FBBF24" strokeWidth={1.25} />
                  <text x={PAD_L + 6} y={14} fill="#94a3b8" fontSize={9.5} fontFamily="monospace">
                    MACD (12, 26, 9) · {activePt.macd !== null ? activePt.macd.toFixed(2) : '—'} / Sig {activePt.macdSignal !== null ? activePt.macdSignal.toFixed(2) : '—'}
                  </text>
                </g>
              )}

              {oscGeometry.kind === 'vol' && (
                <g>
                  <path d={oscGeometry.volPath} fill="none" stroke="#F59E0B" strokeWidth={1.65} />
                  <text x={PAD_L + 6} y={14} fill="#94a3b8" fontSize={9.5} fontFamily="monospace">
                    Rolling 20-Session Annualized σ · {activePt.rollingVolPct !== null ? `${activePt.rollingVolPct.toFixed(1)}%` : '—'}
                  </text>
                  <text x={CHART_W - PAD_R + 8} y={20} fill="#94a3b8" fontSize={9.5} fontFamily="monospace">
                    {oscGeometry.maxV.toFixed(0)}%
                  </text>
                </g>
              )}

              <line
                x1={activeX}
                y1={OSC_PAD_T}
                x2={activeX}
                y2={OSC_H - OSC_PAD_B}
                stroke="rgba(226, 232, 240, 0.25)"
                strokeDasharray="3 3"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
