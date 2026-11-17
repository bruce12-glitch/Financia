import React, { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  EQUITY_UNIVERSE,
  MARKET_INDICES,
  MARKET_MOOD_METRICS,
  MarketIndexData,
} from '../data/indianMarketData';
import { formatIndianPrice } from '../utils/screenerEngine';

interface MarketSummarySectionProps {
  onSelectAsset: (symbol: string) => void;
  onJumpToScreener: () => void;
}

type RangeKey = '1D' | '1W' | '1M' | '1Y' | '5Y';

export const MarketSummarySection: React.FC<MarketSummarySectionProps> = ({
  onSelectAsset,
  onJumpToScreener,
}) => {
  const [selectedIndexId, setSelectedIndexId] = useState<MarketIndexData['id']>('NIFTY50');
  const [range, setRange] = useState<RangeKey>('1M');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const activeIndex = useMemo(
    () => MARKET_INDICES.find((idx) => idx.id === selectedIndexId) ?? MARKET_INDICES[0],
    [selectedIndexId]
  );

  const series = activeIndex.seriesByRange[range];
  const movers = useMemo(
    () => EQUITY_UNIVERSE.filter((s) => Boolean(s.moverBadge)).slice(0, 4),
    []
  );

  // SVG Chart Geometry
  const chartW = 580;
  const chartH = 200;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const { linePath, areaPath, points, minVal, maxVal } = useMemo(() => {
    const vals = series.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(1, max - min);
    const paddedMin = min - span * 0.14;
    const paddedMax = max + span * 0.12;
    const paddedSpan = paddedMax - paddedMin;

    const pts = series.map((p, i) => {
      const x = padL + (i / Math.max(1, series.length - 1)) * innerW;
      const y = padT + (1 - (p.value - paddedMin) / paddedSpan) * innerH;
      return { ...p, x, y };
    });

    const lp = pts
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
    const ap =
      pts.length > 0
        ? `${lp} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
        : '';

    return {
      linePath: lp,
      areaPath: ap,
      points: pts,
      minVal: paddedMin,
      maxVal: paddedMax,
    };
  }, [series, innerW, innerH]);

  const positive = activeIndex.changePct >= 0;
  const strokeColor = positive ? '#16A34A' : '#DC2626';
  const activeHoverPoint =
    hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : points[points.length - 1];

  return (
    <section
      id="market-summary"
      aria-label="Indian Market Summary and Sentiment Gauge"
      className="w-full bg-[#F7F9F8] text-[#0F1B16] py-16 lg:py-20 border-b border-[#E3EAE6]"
    >
      <div className="max-w-[1220px] mx-auto px-6">
        {/* Section Heading */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-medium text-[#15803D] mb-1.5">
              Market Summary
            </div>
            <h2 className="font-display font-semibold text-3xl md:text-4xl tracking-tight text-[#0B1712]">
              Where Indian markets{' '}
              <span className="font-editorial font-medium">stand today</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onJumpToScreener}
            className="px-4 py-2 rounded-lg bg-white border border-[#D4DFD9] text-xs font-medium text-[#14261E] hover:border-[#15803D] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>All indices</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#15803D]" />
          </button>
        </div>

        {/* 12-Col Main Split: Left 7 Index Chart Card / Right 5 Dark Market Mood Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Index Chart Card */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#DFE7E2] p-6 flex flex-col justify-between">
            <div>
              {/* Tabs + Timeframe Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div
                  role="tablist"
                  aria-label="Select Market Index"
                  className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F1F5F3]"
                >
                  {MARKET_INDICES.map((idx) => (
                    <button
                      key={idx.id}
                      role="tab"
                      aria-selected={selectedIndexId === idx.id}
                      type="button"
                      onClick={() => {
                        setSelectedIndexId(idx.id);
                        setHoverIdx(null);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedIndexId === idx.id
                          ? 'bg-[#0F1F18] text-white'
                          : 'text-[#4B6156] hover:text-[#0F1F18]'
                      }`}
                    >
                      {idx.name}
                    </button>
                  ))}
                </div>

                <div
                  role="group"
                  aria-label="Select Index Timeframe"
                  className="inline-flex items-center gap-1"
                >
                  {(['1D', '1W', '1M', '1Y', '5Y'] as RangeKey[]).map((rk) => (
                    <button
                      key={rk}
                      type="button"
                      onClick={() => {
                        setRange(rk);
                        setHoverIdx(null);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        range === rk
                          ? 'bg-[#E6F4EC] text-[#15803D] font-semibold'
                          : 'text-[#647A6F] hover:text-[#0F1B16]'
                      }`}
                    >
                      {rk}
                    </button>
                  ))}
                </div>
              </div>

              {/* Index Quote Display */}
              <div className="flex flex-wrap items-baseline gap-3 mb-4">
                <span className="text-3xl font-display font-bold font-mono tabular-nums text-[#0B1712]">
                  {activeIndex.value.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`text-xs font-mono tabular-nums font-semibold ${
                    positive ? 'text-[#15803D]' : 'text-[#DC2626]'
                  }`}
                >
                  {positive ? '+' : ''}
                  {activeIndex.change.toFixed(2)} ({positive ? '+' : ''}
                  {activeIndex.changePct.toFixed(2)}%)
                </span>
                <span className="text-xs text-[#6B8075]">{activeIndex.asOf}</span>
              </div>

              {/* Interactive SVG Area Chart */}
              <div className="relative w-full">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-52 select-none"
                  role="img"
                  aria-label={`${activeIndex.name} ${range} trend chart`}
                >
                  <defs>
                    <linearGradient id="marketSummaryFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {[0, 0.33, 0.66, 1].map((frac, idx) => {
                    const y = padT + frac * innerH;
                    const tickVal = Math.round(maxVal - frac * (maxVal - minVal));
                    return (
                      <g key={idx}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={chartW - padR}
                          y2={y}
                          stroke="#E6ECE8"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padL - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-[#7A8F84] text-[10px] font-mono tabular-nums"
                        >
                          {tickVal.toLocaleString('en-IN')}
                        </text>
                      </g>
                    );
                  })}

                  <path d={areaPath} fill="url(#marketSummaryFill)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {activeHoverPoint && (
                    <g>
                      <line
                        x1={activeHoverPoint.x}
                        y1={padT}
                        x2={activeHoverPoint.x}
                        y2={padT + innerH}
                        stroke="#94A3B8"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={activeHoverPoint.x}
                        cy={activeHoverPoint.y}
                        r="4.5"
                        fill="#FFFFFF"
                        stroke={strokeColor}
                        strokeWidth="2.2"
                      />
                    </g>
                  )}

                  {points.map((pt, i) => (
                    <g key={pt.label}>
                      {(i === 0 ||
                        i === points.length - 1 ||
                        i % Math.max(1, Math.floor(points.length / 4)) === 0) && (
                        <text
                          x={pt.x}
                          y={chartH - 6}
                          textAnchor="middle"
                          className="fill-[#7A8F84] text-[10px] font-mono"
                        >
                          {pt.label}
                        </text>
                      )}
                      <rect
                        x={pt.x - innerW / Math.max(2, points.length * 2)}
                        y={padT}
                        width={innerW / Math.max(1, points.length)}
                        height={innerH}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoverIdx(i)}
                      />
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Bottom 4 KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 mt-2 border-t border-[#EBF0ED]">
              <div>
                <div className="text-[11px] text-[#6E8277]">Open</div>
                <div className="text-xs font-mono tabular-nums font-semibold text-[#0F1B16] mt-0.5">
                  {activeIndex.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E8277]">Day range</div>
                <div className="text-xs font-mono tabular-nums font-semibold text-[#0F1B16] mt-0.5">
                  {activeIndex.dayLow.toLocaleString('en-IN')} –{' '}
                  {activeIndex.dayHigh.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E8277]">52W high</div>
                <div className="text-xs font-mono tabular-nums font-semibold text-[#0F1B16] mt-0.5">
                  {activeIndex.high52W.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E8277]">P/E</div>
                <div className="text-xs font-mono tabular-nums font-semibold text-[#0F1B16] mt-0.5">
                  {activeIndex.pe.toFixed(1)}×
                </div>
              </div>
            </div>
          </div>

          {/* Right Dark Market Mood Index Gauge Card */}
          <div className="lg:col-span-5 bg-[#0D1914] text-[#F1F5F3] rounded-2xl border border-[#1E352A] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-semibold text-white">Market Mood Index</span>
                <span className="text-[#7E9488]">Updated 2m ago</span>
              </div>

              {/* Semicircular Sentiment Arc Gauge */}
              <div className="flex flex-col items-center pt-1 pb-4 border-b border-white/[0.08]">
                <svg viewBox="0 0 240 130" className="w-56 h-32" aria-label="Market Mood Index 62 Greed Gauge">
                  {/* Extreme Fear (0-30) */}
                  <path
                    d="M 24 112 A 96 96 0 0 1 68 31"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Fear (30-50) */}
                  <path
                    d="M 74 27 A 96 96 0 0 1 120 16"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Greed (50-70) */}
                  <path
                    d="M 126 16 A 96 96 0 0 1 172 31"
                    fill="none"
                    stroke="#4ADE80"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Extreme Greed (70-100) */}
                  <path
                    d="M 178 36 A 96 96 0 0 1 216 112"
                    fill="none"
                    stroke="#1D382B"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Needle / Active Marker at 62 */}
                  <circle cx="154" cy="24" r="6" fill="#FFFFFF" stroke="#0D1914" strokeWidth="2.5" />

                  <text
                    x="120"
                    y="88"
                    textAnchor="middle"
                    className="fill-white font-display font-bold text-[34px] font-mono"
                  >
                    62
                  </text>
                  <text
                    x="120"
                    y="108"
                    textAnchor="middle"
                    className="fill-[#4ADE80] text-[12px] font-medium"
                  >
                    Market is in Greed
                  </text>
                </svg>

                <div className="text-[11px] text-[#8FA499] text-center">
                  Up from 54 last week · Be selective on fresh buys
                </div>
                <div className="w-full grid grid-cols-4 text-center text-[10px] text-[#738A7E] mt-3">
                  <span>Extreme Fear</span>
                  <span>Fear</span>
                  <span className="text-[#4ADE80] font-medium">Greed</span>
                  <span>Extreme Greed</span>
                </div>
              </div>
            </div>

            {/* 6 Key Sentiment Indicators */}
            <div className="space-y-2.5 pt-4">
              {MARKET_MOOD_METRICS.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-[#9DB0A6]">{m.label}</span>
                  <span className="font-mono tabular-nums font-medium">
                    <span
                      className={
                        m.tone === 'emerald'
                          ? 'text-[#4ADE80]'
                          : m.tone === 'amber'
                            ? 'text-[#FBBF24]'
                            : 'text-white'
                      }
                    >
                      {m.value}
                    </span>
                    {m.tag && (
                      <span className="text-[#7E9488] ml-1.5 font-sans">
                        {m.tag}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom 4-Column Movers Strip (Interactive Cards -> Jump to Scorecard) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {movers.map((stock) => {
            const isUp = stock.changePct >= 0;
            const badgeColor =
              stock.moverBadge === 'TOP LOSER'
                ? 'text-[#DC2626]'
                : stock.moverBadge === '52W HIGH'
                  ? 'text-[#0284C7]'
                  : 'text-[#15803D]';
            return (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => onSelectAsset(stock.symbol)}
                className="bg-white rounded-xl border border-[#DFE7E2] p-4 text-left hover:border-[#16A34A] transition-colors cursor-pointer"
              >
                <div className={`text-[11px] font-semibold tracking-wide mb-2 ${badgeColor}`}>
                  {stock.moverBadge}
                </div>
                <div className="text-sm font-semibold text-[#0B1712]">
                  {stock.name}
                </div>
                <div className="text-[11px] font-mono text-[#6B8075] mb-3">
                  {stock.symbol}
                </div>
                <div className="flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-sm font-semibold text-[#0B1712]">
                    {formatIndianPrice(stock.price, stock.currency)}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isUp ? 'text-[#15803D]' : 'text-[#DC2626]'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {stock.changePct.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
