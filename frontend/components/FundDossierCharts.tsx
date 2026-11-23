import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  computeDonutArcs,
  computeTechnicalGauge,
  ScreenerExpirationPoint,
  ScreenerExposureSlice,
  ScreenerFundRecord,
} from '../utils/screenerEngine';

/* ============================================================================
 * 1. Seasonals Multi-Year Overlay Chart (Reference Image 3)
 * ============================================================================ */
interface SeasonalsOverlayChartProps {
  seasonals: ScreenerFundRecord['seasonals'];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const SeasonalsOverlayChart: React.FC<SeasonalsOverlayChartProps> = ({ seasonals }) => {
  const [expanded, setExpanded] = useState(false);

  const geometry = useMemo(() => {
    const w = 520;
    const h = 156;
    const padL = 8;
    const padR = 26;
    const padT = 14;
    const padB = 18;
    const usableW = w - padL - padR;
    const usableH = h - padT - padB;

    const allVals = [
      0,
      ...seasonals.currentYear,
      ...seasonals.priorYear,
      ...seasonals.twoYearsAgo,
    ];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const span = max - min || 1;

    const toCoord = (val: number, idx: number, total: number): [number, number] => {
      const x = padL + (idx / Math.max(1, total - 1)) * usableW;
      const y = padT + usableH - ((val - min) / span) * usableH;
      return [Number(x.toFixed(1)), Number(y.toFixed(1))];
    };

    const makePath = (series: number[]) =>
      series
        .map((val, idx) => {
          const [x, y] = toCoord(val, idx, 12);
          return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');

    const curCoords = seasonals.currentYear.map((v, i) => toCoord(v, i, 12));
    const curLast = curCoords[curCoords.length - 1] || [padL, padT + usableH / 2];
    const zeroY = toCoord(0, 0, 12)[1];

    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      zeroY,
      curPath: makePath(seasonals.currentYear),
      priorPath: makePath(seasonals.priorYear),
      twoAgoPath: makePath(seasonals.twoYearsAgo),
      curLast,
      quarterXs: [3, 6, 9].map((m) => toCoord(0, m, 12)[0]),
    };
  }, [seasonals]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <h4 className="text-[15px] font-display font-semibold text-[#0f172a]">Seasonals</h4>
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#64748b]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#2563eb] rounded-full" />
            {seasonals.currentYearLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#f59e0b] rounded-full" />
            {seasonals.priorYearLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#10b981] rounded-full" />
            {seasonals.twoYearsAgoLabel}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${geometry.w} ${geometry.h}`}
        className="w-full h-auto block"
        role="img"
        aria-label="Multi-year seasonal cumulative return comparison"
      >
        {/* Quarterly dashed vertical guidelines */}
        {geometry.quarterXs.map((qx, idx) => (
          <line
            key={idx}
            x1={qx}
            y1={geometry.padT}
            x2={qx}
            y2={geometry.h - geometry.padB}
            stroke="#cbd5e1"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        ))}

        {/* Right axis hairline & Zero baseline */}
        <line
          x1={geometry.w - geometry.padR}
          y1={geometry.padT}
          x2={geometry.w - geometry.padR}
          y2={geometry.h - geometry.padB}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <line
          x1={geometry.padL}
          y1={geometry.zeroY}
          x2={geometry.w - 4}
          y2={geometry.zeroY}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {/* Two years ago (emerald) */}
        <path
          d={geometry.twoAgoPath}
          fill="none"
          stroke="#10b981"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Prior year (amber) */}
        <path
          d={geometry.priorPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Current year (bold cobalt + terminal marker) */}
        <path
          d={geometry.curPath}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={geometry.curLast[0]}
          cy={geometry.curLast[1]}
          r="4"
          fill="#2563eb"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      </svg>

      <div className="mt-2.5 flex justify-center">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="px-4 py-1.5 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-xs font-medium text-[#1e293b] transition-colors cursor-pointer"
        >
          {expanded ? 'Hide monthly seasonals' : 'More seasonals'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-3 border-t border-[#e2e8f0]">
          {MONTH_LABELS.map((month, idx) => {
            const avg = Number(
              (
                ((seasonals.priorYear[idx] ?? 0) +
                  (seasonals.twoYearsAgo[idx] ?? 0) +
                  (seasonals.currentYear[idx] ?? seasonals.priorYear[idx] ?? 0)) /
                3
              ).toFixed(1)
            );
            return (
              <div
                key={month}
                className={`rounded-[6px] px-2 py-1.5 text-center font-mono text-[11px] tabular-nums ${
                  avg >= 0 ? 'bg-[#ecfdf5] text-[#047857]' : 'bg-[#fef2f2] text-[#b91c1c]'
                }`}
              >
                <div className="text-[10px] text-[#64748b] font-sans">{month}</div>
                <div className="font-semibold">
                  {avg >= 0 ? '+' : ''}
                  {avg}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. Exposure Type Ring Donut Chart (Reference Image 4)
 * ============================================================================ */
interface ExposureDonutChartProps {
  slices: ScreenerExposureSlice[];
}

export const ExposureDonutChart: React.FC<ExposureDonutChartProps> = ({ slices }) => {
  const radius = 44;
  const arcs = useMemo(() => computeDonutArcs(slices, radius), [slices]);

  return (
    <div>
      <h4 className="text-[15px] font-display font-semibold text-[#0f172a] mb-3">Exposure type</h4>

      <div className="flex flex-col items-center">
        <svg
          width="124"
          height="124"
          viewBox="0 0 124 124"
          className="mb-4"
          role="img"
          aria-label="Asset exposure type breakdown donut chart"
        >
          <g transform="rotate(-90 62 62)">
            <circle
              cx="62"
              cy="62"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="16"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx="62"
                cy="62"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth="16"
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
              />
            ))}
          </g>
        </svg>

        <div className="w-full space-y-2 text-xs">
          {slices.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-[#1e293b]">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                {s.pct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. Technicals Semicircle Speedometer Gauge (Reference Image 6)
 * ============================================================================ */
interface TechnicalsGaugeProps {
  technicals: ScreenerFundRecord['technicals'];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const [sx, sy] = polarToCartesian(cx, cy, r, startAngle);
  const [ex, ey] = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

export const TechnicalsGauge: React.FC<TechnicalsGaugeProps> = ({ technicals }) => {
  const [expanded, setExpanded] = useState(false);
  const gauge = useMemo(() => computeTechnicalGauge(technicals.score), [technicals.score]);

  const segments = [
    { start: -86, end: -54, color: '#991b1b' }, // Strong Sell
    { start: -50, end: -18, color: '#ef4444' }, // Sell
    { start: -14, end: 14, color: '#9ca3af' },  // Neutral
    { start: 18, end: 50, color: '#3b82f6' },   // Buy
    { start: 54, end: 86, color: '#1d4ed8' },   // Strong Buy
  ];

  return (
    <div>
      <h4 className="text-[15px] font-display font-semibold text-[#0f172a] mb-2">Technicals</h4>

      <div className="flex flex-col items-center">
        <svg
          width="192"
          height="112"
          viewBox="0 0 192 112"
          role="img"
          aria-label={`Technical analysis summary: ${gauge.label}`}
        >
          {segments.map((seg, i) => (
            <path
              key={i}
              d={describeArc(96, 98, 72, seg.start, seg.end)}
              fill="none"
              stroke={seg.color}
              strokeWidth="8"
              strokeLinecap="round"
            />
          ))}

          {/* Dynamic rotating tapered needle */}
          <g transform={`rotate(${gauge.angleDeg} 96 98)`}>
            <polygon points="93.2,98 96,34 98.8,98" fill="#0f172a" />
            <circle cx="96" cy="98" r="5" fill="#0f172a" />
          </g>
        </svg>

        <div
          data-testid="dossier-technicals-label"
          className="font-display font-bold text-xl tracking-tight mt-0.5"
          style={{ color: gauge.colorHex }}
        >
          {gauge.label}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 px-4 py-1.5 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-xs font-medium text-[#1e293b] transition-colors cursor-pointer"
        >
          {expanded ? 'Hide technicals' : 'More technicals'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#e2e8f0] space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] p-2.5">
              <div className="text-[11px] text-[#64748b] mb-1">Oscillators</div>
              <div className="font-mono text-[11px] flex items-center justify-between tabular-nums">
                <span className="text-[#dc2626]">S:{technicals.oscillatorsSell}</span>
                <span className="text-[#64748b]">N:{technicals.oscillatorsNeutral}</span>
                <span className="text-[#2563eb]">B:{technicals.oscillatorsBuy}</span>
              </div>
            </div>
            <div className="rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] p-2.5">
              <div className="text-[11px] text-[#64748b] mb-1">Moving Averages</div>
              <div className="font-mono text-[11px] flex items-center justify-between tabular-nums">
                <span className="text-[#dc2626]">S:{technicals.maSell}</span>
                <span className="text-[#64748b]">N:{technicals.maNeutral}</span>
                <span className="text-[#2563eb]">B:{technicals.maBuy}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-[#334155] tabular-nums">
            <div className="rounded bg-[#f8fafc] px-2 py-1 text-center">
              RSI(14): <strong>{technicals.rsi14.toFixed(1)}</strong>
            </div>
            <div className="rounded bg-[#f8fafc] px-2 py-1 text-center">
              SMA20: <strong>{technicals.sma20Relation}</strong>
            </div>
            <div className="rounded bg-[#f8fafc] px-2 py-1 text-center">
              MACD: <strong>{technicals.macdSignal}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 4. Options Volume & Open Interest by Expiration Grouped Bar Chart (Ref 7 & 8)
 * ============================================================================ */
interface OptionsExpirationBarChartProps {
  title: string;
  data: ScreenerExpirationPoint[];
  note?: string;
  testId: string;
}

function formatCompactContracts(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export const OptionsExpirationBarChart: React.FC<OptionsExpirationBarChartProps> = ({
  title,
  data,
  note,
  testId,
}) => {
  const [filterMode, setFilterMode] = useState<'both' | 'calls' | 'puts'>('both');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = useMemo(() => {
    const vals = data.flatMap((d) => {
      if (filterMode === 'calls') return [d.calls];
      if (filterMode === 'puts') return [d.puts];
      return [d.calls, d.puts];
    });
    const peak = Math.max(1000, ...vals);
    return Math.ceil(peak / 100000) * 100000;
  }, [data, filterMode]);

  const yTicks = [maxVal, Math.round(maxVal * 0.66), Math.round(maxVal * 0.33)];
  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h4 className="text-[15px] font-display font-semibold text-[#0f172a]">{title}</h4>
        <div className="relative inline-flex items-center">
          <select
            aria-label={`${title} contract filter`}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as 'both' | 'calls' | 'puts')}
            className="appearance-none bg-transparent pr-5 py-0.5 text-xs font-medium text-[#64748b] hover:text-[#0f172a] focus:outline-none cursor-pointer"
          >
            <option value="both">Calls and puts</option>
            <option value="calls">Calls only</option>
            <option value="puts">Puts only</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748b] pointer-events-none -ml-4" />
        </div>
      </div>

      {note && <p className="text-[11px] text-[#64748b] mb-2">{note}</p>}

      <div className="relative pt-2">
        {/* Horizontal dashed grid + Right-aligned Y ticks */}
        <div className="relative h-[156px] flex items-end gap-1.5 pr-11 border-b border-[#cbd5e1]">
          {yTicks.map((tickVal, idx) => {
            const topPct = idx === 0 ? 4 : idx === 1 ? 36 : 68;
            return (
              <div
                key={idx}
                className="pointer-events-none absolute left-0 right-0 flex items-center"
                style={{ top: `${topPct}%` }}
              >
                <div className="flex-1 border-t border-dashed border-[#e2e8f0]" />
                <span className="w-10 text-right font-mono text-[10.5px] text-[#475569] tabular-nums pl-1.5">
                  {formatCompactContracts(tickVal)}
                </span>
              </div>
            );
          })}

          {data.map((pt, idx) => {
            const callPct = Math.max(3, Math.round((pt.calls / maxVal) * 94));
            const putPct = Math.max(3, Math.round((pt.puts / maxVal) * 94));
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={pt.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`relative z-10 flex-1 h-full flex items-end justify-center gap-1 px-0.5 rounded-t transition-colors ${
                  isHovered ? 'bg-[#f1f5f9]/70' : ''
                }`}
              >
                {(filterMode === 'both' || filterMode === 'calls') && (
                  <div
                    className="w-2.5 sm:w-3 rounded-t-[3px] bg-[#2563eb] transition-all"
                    style={{ height: `${callPct}%` }}
                    title={`${pt.label} Calls: ${pt.calls.toLocaleString()}`}
                  />
                )}
                {(filterMode === 'both' || filterMode === 'puts') && (
                  <div
                    className="w-2.5 sm:w-3 rounded-t-[3px] bg-[#f43f5e] transition-all"
                    style={{ height: `${putPct}%` }}
                    title={`${pt.label} Puts: ${pt.puts.toLocaleString()}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* X-Axis Expiration Labels */}
        <div className="flex items-center justify-between pr-11 pt-1.5 text-[10.5px] font-mono text-[#475569]">
          {data.map((pt, idx) => {
            const showLabel = data.length <= 6 || idx % 2 === 0;
            return (
              <span key={pt.label} className="flex-1 text-center truncate">
                {showLabel ? pt.label : ''}
              </span>
            );
          })}
        </div>

        {/* Interactive Legend + Hovered Readout */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#475569]">
          {(filterMode === 'both' || filterMode === 'calls') && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
              Calls
            </span>
          )}
          {(filterMode === 'both' || filterMode === 'puts') && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
              Puts
            </span>
          )}
          {activePoint && (
            <span className="font-mono text-[11px] text-[#0f172a] tabular-nums">
              · {activePoint.label}: C {formatCompactContracts(activePoint.calls)} / P{' '}
              {formatCompactContracts(activePoint.puts)} (PCR{' '}
              {(activePoint.puts / Math.max(1, activePoint.calls)).toFixed(2)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
