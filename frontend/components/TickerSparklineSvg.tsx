import React, { useMemo } from 'react';
import { buildSparklineSvgGeometry } from '../utils/sparkline24h';

interface TickerSparklineSvgProps {
  ticker: string;
  values: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Performant, memoized pure-SVG 24-hour sparkline chart for LiveStockTerminal rows and cards.
 * Zero charting library overhead — renders crisp polyline, vertical gradient fill,
 * 24h open reference baseline, and terminal live tick marker.
 */
export const TickerSparklineSvg: React.FC<TickerSparklineSvgProps> = React.memo(
  ({ ticker, values, isPositive, width = 112, height = 32, className = '' }) => {
    const geometry = useMemo(
      () => buildSparklineSvgGeometry(values, width, height, 3, 4),
      [values, width, height]
    );

    if (!geometry) {
      return (
        <div
          style={{ width, height }}
          className={`rounded bg-[#f1f5f9] ${className}`}
          aria-hidden="true"
        />
      );
    }

    const stroke = isPositive ? '#059669' : '#dc2626';
    const safeId = `spk24-${ticker.replace(/[^a-zA-Z0-9]/g, '')}-${width}x${height}`;

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`overflow-visible shrink-0 ${className}`}
        role="img"
        aria-label={`${ticker} 24-hour price trend`}
      >
        <defs>
          <linearGradient id={safeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.24" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* 24h opening reference baseline */}
        <line
          x1="3"
          y1={geometry.baselineY}
          x2={width - 3}
          y2={geometry.baselineY}
          stroke="#94a3b8"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Subtle area wash */}
        <path d={geometry.areaPath} fill={`url(#${safeId})`} />

        {/* Crisp 24h trajectory stroke */}
        <path
          d={geometry.linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Live terminal price marker */}
        <circle
          cx={geometry.lastX}
          cy={geometry.lastY}
          r="2.4"
          fill={stroke}
          stroke="#ffffff"
          strokeWidth="1.1"
        />
      </svg>
    );
  }
);

TickerSparklineSvg.displayName = 'TickerSparklineSvg';
