import React, { useEffect, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  createChart,
  IChartApi,
  LineSeries,
  type Time,
} from 'lightweight-charts';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export interface CanvasSeriesPoint {
  time: string; // YYYY-MM-DD
  value: number;
}

interface LightweightCanvasChartProps {
  primarySeries: CanvasSeriesPoint[];
  benchmarkSeries?: CanvasSeriesPoint[];
  primaryLabel?: string;
  benchmarkLabel?: string;
  height?: number;
  accentColor?: string;
}

export const LightweightCanvasChart: React.FC<LightweightCanvasChartProps> = ({
  primarySeries,
  benchmarkSeries,
  height = 300,
  accentColor = '#0d9488',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const theme = useWorkspaceStore((s) => s.theme);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || primarySeries.length === 0) return;

    const isDark = theme === 'dark';
    const chart: IChartApi = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0b1120' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.06)' },
        horzLines: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.06)' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#1f2937' : '#e2e8f0',
      },
      timeScale: {
        borderColor: isDark ? '#1f2937' : '#e2e8f0',
        timeVisible: false,
      },
      crosshair: {
        vertLine: { color: isDark ? '#475569' : '#94a3b8', width: 1 },
        horzLine: { color: isDark ? '#475569' : '#94a3b8', width: 1 },
      },
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: accentColor,
      topColor: `${accentColor}44`,
      bottomColor: `${accentColor}04`,
      lineWidth: 2,
    });

    const dedup = (pts: CanvasSeriesPoint[]) => {
      const seen = new Set<string>();
      return pts
        .filter((p) => {
          if (!p.time || !Number.isFinite(p.value) || seen.has(p.time)) return false;
          seen.add(p.time);
          return true;
        })
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((p) => ({ time: p.time as Time, value: p.value }));
    };

    area.setData(dedup(primarySeries));

    if (benchmarkSeries && benchmarkSeries.length > 0) {
      const bench = chart.addSeries(LineSeries, {
        color: isDark ? '#64748b' : '#94a3b8',
        lineWidth: 1,
        lineStyle: 2,
      });
      bench.setData(dedup(benchmarkSeries));
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [primarySeries, benchmarkSeries, height, accentColor, theme]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-[8px] overflow-hidden"
      data-testid="lightweight-canvas-chart"
    />
  );
};
