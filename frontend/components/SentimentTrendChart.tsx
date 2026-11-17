import React, { useId, useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  getSentimentHistoryWindow,
  getSentimentZone,
  SentimentHistoryPoint,
  SentimentTimeframe,
} from '../utils/sentimentEngine';

interface SentimentTrendChartProps {
  history90d: SentimentHistoryPoint[];
  activeColor: string;
  scopeTitle: string;
  theme?: 'light' | 'dark';
}

const TIMEFRAME_OPTIONS: Array<{ id: SentimentTimeframe; label: string; ariaLabel: string }> = [
  { id: '7d', label: '7D', ariaLabel: '7-day view' },
  { id: '30d', label: '30D', ariaLabel: '30-day view' },
  { id: '90d', label: '90D', ariaLabel: '90-day view' },
];

const SVG_WIDTH = 540;
const SVG_HEIGHT = 176;
const MARGIN = { top: 14, right: 14, bottom: 26, left: 32 };

export const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({
  history90d,
  activeColor,
  scopeTitle,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [timeframe, setTimeframe] = useState<SentimentTimeframe>('30d');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');

  const points = useMemo(
    () => getSentimentHistoryWindow(history90d, timeframe),
    [history90d, timeframe]
  );

  const chartModel = useMemo(() => {
    const innerWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;
    const maxIndex = Math.max(1, points.length - 1);

    const xScale = d3
      .scaleLinear()
      .domain([0, maxIndex])
      .range([MARGIN.left, MARGIN.left + innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([MARGIN.top + innerHeight, MARGIN.top]);

    const lineGenerator = d3
      .line<SentimentHistoryPoint>()
      .x((_d, i) => xScale(i))
      .y((d) => yScale(d.score))
      .curve(d3.curveMonotoneX);

    const areaGenerator = d3
      .area<SentimentHistoryPoint>()
      .x((_d, i) => xScale(i))
      .y0(MARGIN.top + innerHeight)
      .y1((d) => yScale(d.score))
      .curve(d3.curveMonotoneX);

    const linePath = points.length > 0 ? lineGenerator(points) ?? '' : '';
    const areaPath = points.length > 0 ? areaGenerator(points) ?? '' : '';

    const scores = points.map((p) => p.score);
    const minScore = d3.min(scores) ?? 0;
    const maxScore = d3.max(scores) ?? 100;
    const avgScore = Math.round(d3.mean(scores) ?? 50);

    // Select 4 evenly distributed X-axis tick indices
    const tickCount = Math.min(4, Math.max(2, points.length));
    const tickIndices: number[] = [];
    for (let t = 0; t < tickCount; t++) {
      const idx = Math.round((t * (points.length - 1)) / (tickCount - 1));
      if (!tickIndices.includes(idx)) tickIndices.push(idx);
    }

    return {
      innerWidth,
      innerHeight,
      xScale,
      yScale,
      linePath,
      areaPath,
      minScore,
      maxScore,
      avgScore,
      tickIndices,
    };
  }, [points]);

  const activeIdx =
    hoverIdx !== null && hoverIdx >= 0 && hoverIdx < points.length
      ? hoverIdx
      : Math.max(0, points.length - 1);
  const inspectedPoint = points[activeIdx] || null;
  const inspectedZone = inspectedPoint ? getSentimentZone(inspectedPoint.score) : null;

  const handlePointerMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const [mx] = d3.pointer(event);
    const rawIndex = Math.round(chartModel.xScale.invert(mx));
    const clamped = Math.max(0, Math.min(points.length - 1, rawIndex));
    setHoverIdx(clamped);
  };

  return (
    <div
      data-testid="sentiment-d3-chart"
      data-timeframe={timeframe}
      data-points={points.length}
      className={`py-4 border-b ${isDark ? 'border-[#1A202C]' : 'border-[#F0F3FA]'}`}
    >
      {/* Top Header & 7D / 30D / 90D Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#131722]'}`}>
            Historical sentiment trend
          </div>
          <div
            className={`text-[11px] font-mono tabular-nums mt-0.5 flex flex-wrap items-center gap-1.5 ${
              isDark ? 'text-[#9598A1]' : 'text-[#787B86]'
            }`}
          >
            <span>Low {chartModel.minScore}</span>
            <span aria-hidden="true">·</span>
            <span>Avg {chartModel.avgScore}</span>
            <span aria-hidden="true">·</span>
            <span>High {chartModel.maxScore}</span>
            {inspectedPoint && inspectedZone && (
              <>
                <span aria-hidden="true">·</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#131722]'}`}>
                  {inspectedPoint.label}: {inspectedPoint.score}{' '}
                  <span style={{ color: inspectedZone.color }}>({inspectedZone.zone})</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div
          role="group"
          aria-label="Sentiment trend timeframe"
          className={`inline-flex items-center p-0.5 rounded-lg gap-0.5 shrink-0 ${
            isDark ? 'bg-[#06090F] border border-[#1A202C]' : 'bg-[#F0F3FA]'
          }`}
        >
          {TIMEFRAME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-label={opt.ariaLabel}
              aria-pressed={timeframe === opt.id}
              onClick={() => {
                setTimeframe(opt.id);
                setHoverIdx(null);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                timeframe === opt.id
                  ? isDark
                    ? 'bg-[#2962FF] text-white'
                    : 'bg-[#131722] text-white'
                  : isDark
                    ? 'text-[#9598A1] hover:text-white'
                    : 'text-[#434651] hover:text-[#131722]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* D3.js Interactive Area + Line Chart */}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-[168px] select-none overflow-visible"
        role="img"
        aria-label={`${scopeTitle} ${timeframe} historical trend line chart rendered with D3`}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={activeColor} stopOpacity={isDark ? '0.28' : '0.22'} />
            <stop offset="100%" stopColor={activeColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal Reference Gridlines (0, 25, 50, 75, 100) */}
        {[0, 25, 50, 75, 100].map((tickVal) => {
          const yPos = chartModel.yScale(tickVal);
          const isThreshold = tickVal === 25 || tickVal === 50 || tickVal === 75;
          const gridStroke = isDark
            ? isThreshold
              ? '#242B3B'
              : '#161B26'
            : isThreshold
              ? '#E0E3EB'
              : '#F0F3FA';
          return (
            <g key={tickVal}>
              <line
                x1={MARGIN.left}
                x2={SVG_WIDTH - MARGIN.right}
                y1={yPos}
                y2={yPos}
                stroke={gridStroke}
                strokeDasharray={isThreshold ? '3 3' : undefined}
                strokeWidth="1"
              />
              <text
                x={MARGIN.left - 6}
                y={yPos}
                textAnchor="end"
                dominantBaseline="middle"
                fill={isDark ? '#8B92A5' : '#787B86'}
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {tickVal}
              </text>
            </g>
          );
        })}

        {/* D3 Area Fill */}
        {chartModel.areaPath && (
          <path d={chartModel.areaPath} fill={`url(#${gradientId})`} />
        )}

        {/* D3 Trend Line */}
        {chartModel.linePath && (
          <path
            d={chartModel.linePath}
            fill="none"
            stroke={activeColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* X-Axis Date Labels */}
        {chartModel.tickIndices.map((idx) => {
          const pt = points[idx];
          if (!pt) return null;
          const xPos = chartModel.xScale(idx);
          const anchor =
            idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle';
          return (
            <text
              key={`${pt.date}-${idx}`}
              x={xPos}
              y={SVG_HEIGHT - 6}
              textAnchor={anchor}
              fill={isDark ? '#8B92A5' : '#787B86'}
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {pt.label}
            </text>
          );
        })}

        {/* Active / Hovered Point Crosshair & Marker */}
        {inspectedPoint && (
          <g>
            <line
              x1={chartModel.xScale(activeIdx)}
              x2={chartModel.xScale(activeIdx)}
              y1={MARGIN.top}
              y2={SVG_HEIGHT - MARGIN.bottom}
              stroke={isDark ? '#475569' : '#94A3B8'}
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={chartModel.xScale(activeIdx)}
              cy={chartModel.yScale(inspectedPoint.score)}
              r="4.5"
              fill={inspectedZone?.color || activeColor}
              stroke={isDark ? '#0B0F17' : '#FFFFFF'}
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
