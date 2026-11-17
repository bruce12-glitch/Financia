import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  CRYPTO_ASSETS,
  MACRO_SPARK_ROWS,
  MAJOR_INDICES,
} from '../data/tradingViewData';
import {
  computeCompositeMarketSentiment,
  getSentimentZone,
  scoreToNeedleAngle,
  SentimentPayload,
  SentimentScope,
} from '../utils/sentimentEngine';
import { SentimentTrendChart } from './SentimentTrendChart';

interface ArcSegment {
  label: string;
  startAngle: number;
  endAngle: number;
  color: string;
}

const DIAL_SEGMENTS: ArcSegment[] = [
  { label: 'Extreme Fear', startAngle: -90, endAngle: -48, color: '#F23645' },
  { label: 'Fear', startAngle: -45, endAngle: -11.5, color: '#F97316' },
  { label: 'Neutral', startAngle: -8.5, endAngle: 8.5, color: '#F59E0B' },
  { label: 'Greed', startAngle: 11.5, endAngle: 45, color: '#22C55E' },
  { label: 'Extreme Greed', startAngle: 48, endAngle: 90, color: '#089981' },
];

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  // 0° points straight up (-90° in standard SVG math)
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const SCOPE_OPTIONS: Array<{ id: SentimentScope; label: string }> = [
  { id: 'global', label: 'All Markets' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'india', label: 'India' },
];

export const FearGreedGauge: React.FC = () => {
  const baseline = useMemo(
    () =>
      computeCompositeMarketSentiment({
        indices: MAJOR_INDICES,
        crypto: CRYPTO_ASSETS,
        macro: MACRO_SPARK_ROWS,
      }),
    []
  );

  const [sentiment, setSentiment] = useState<SentimentPayload>(baseline);
  const [activeScope, setActiveScope] = useState<SentimentScope>('global');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSentiment = useCallback(async (forceRefresh = false) => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const url = forceRefresh ? '/api/sentiment?refresh=1' : '/api/sentiment';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as SentimentPayload;
      if (data && data.scopes && data.scopes.global) {
        setSentiment(data);
      }
    } catch {
      setErrorMessage('Live sentiment feed unavailable — showing composite market breadth baseline.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSentiment(false);
  }, [fetchSentiment]);

  const activeData = sentiment.scopes[activeScope];
  const needleAngle = scoreToNeedleAngle(activeData.score);

  const formattedUpdatedTime = useMemo(() => {
    const parsed = new Date(sentiment.updatedAt);
    if (Number.isNaN(parsed.getTime())) return 'Just now';
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [sentiment.updatedAt]);

  return (
    <div
      data-testid="fear-greed-gauge"
      data-score={activeData.score}
      data-scope={activeScope}
      className="rounded-2xl border border-[#E0E3EB] bg-white p-5 md:p-6 mb-5"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#F0F3FA]">
        <div>
          <h3 className="text-base md:text-lg font-display font-bold text-[#131722]">
            Fear &amp; Greed sentiment gauge
          </h3>
          <p className="text-xs text-[#787B86] mt-0.5 flex flex-wrap items-center gap-1.5 tabular-nums">
            <span>{activeData.sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{sentiment.isLive ? 'Live feed' : 'Composite baseline'}</span>
            <span aria-hidden="true">·</span>
            <span>Updated {formattedUpdatedTime}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Sentiment market scope"
            className="inline-flex items-center p-1 rounded-lg bg-[#F0F3FA] gap-1"
          >
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={activeScope === option.id}
                onClick={() => setActiveScope(option.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeScope === option.id
                    ? 'bg-[#131722] text-white'
                    : 'text-[#434651] hover:text-[#131722]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchSentiment(true)}
            disabled={isRefreshing}
            aria-label="Refresh live sentiment"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E0E3EB] text-xs font-semibold text-[#131722] hover:bg-[#F8F9FD] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <p className="text-xs text-[#D97706] mt-3" role="status">
          {errorMessage}
        </p>
      )}

      {/* Main 2-Column Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-5">
        {/* Left: Semicircular SVG Gauge */}
        <div className="lg:col-span-5 flex flex-col items-center text-center">
          <div className="w-full max-w-[320px]">
            <svg
              viewBox="0 0 320 184"
              className="w-full h-auto overflow-visible"
              role="img"
              aria-label={`${activeData.title} score ${activeData.score} out of 100, classified as ${activeData.zone}`}
            >
              {/* 5 Color Regime Arcs */}
              {DIAL_SEGMENTS.map((seg) => (
                <path
                  key={seg.label}
                  d={describeArc(160, 152, 116, seg.startAngle, seg.endAngle)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="18"
                  strokeLinecap="butt"
                  opacity={seg.label === activeData.zone ? 1 : 0.3}
                />
              ))}

              {/* Scale Ticks */}
              {[0, 25, 50, 75, 100].map((tick) => {
                const angle = scoreToNeedleAngle(tick);
                const labelPos = polarToCartesian(160, 152, 141, angle);
                return (
                  <text
                    key={tick}
                    x={labelPos.x.toFixed(1)}
                    y={labelPos.y.toFixed(1)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#787B86"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                  >
                    {tick}
                  </text>
                );
              })}

              {/* Center Pivot & Needle */}
              <g
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: '160px 152px',
                  transition: 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <polygon points="156,152 160,54 164,152" fill="#131722" />
              </g>
              <circle cx="160" cy="152" r="9" fill="#131722" />
              <circle cx="160" cy="152" r="4" fill="#FFFFFF" />
            </svg>
          </div>

          <div className="-mt-1">
            <div className="text-4xl font-display font-bold font-mono tabular-nums text-[#131722]">
              {activeData.score}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold">
              <span style={{ color: activeData.color }}>{activeData.zone}</span>
              <span aria-hidden="true" className="text-[#D1D5DB]">
                ·
              </span>
              <span className="text-xs font-mono tabular-nums text-[#434651]">
                {activeData.deltaFromClose > 0
                  ? `+${activeData.deltaFromClose} vs close`
                  : activeData.deltaFromClose < 0
                    ? `${activeData.deltaFromClose} vs close`
                    : 'Unchanged vs close'}
              </span>
            </div>
            <p className="text-xs text-[#787B86] max-w-xs mx-auto mt-2 leading-relaxed">
              {activeData.summary}
            </p>
          </div>
        </div>

        {/* Right: Historical Benchmarks, D3 Sentiment Trend Chart & Health Drivers */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          {/* Historical Comparisons */}
          <div className="grid grid-cols-3 gap-4 pb-4 border-b border-[#F0F3FA]">
            {[
              { label: 'Previous close', value: activeData.previousClose },
              { label: '1 week ago', value: activeData.oneWeekAgo },
              { label: '1 month ago', value: activeData.oneMonthAgo },
            ].map((hist) => {
              const histZone = getSentimentZone(hist.value);
              return (
                <div key={hist.label}>
                  <div className="text-xs text-[#787B86]">{hist.label}</div>
                  <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                    <span className="text-lg font-bold font-mono text-[#131722]">{hist.value}</span>
                    <span className="text-xs font-medium truncate" style={{ color: histZone.color }}>
                      {histZone.zone}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* D3.js Historical Sentiment Trend Line Chart (7D / 30D / 90D) */}
          <SentimentTrendChart
            history90d={activeData.history90d}
            activeColor={activeData.color}
            scopeTitle={activeData.title}
          />

          {/* 4 Market Health Component Drivers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-4">
            {activeData.drivers.map((driver) => {
              const driverZone = getSentimentZone(driver.score);
              return (
                <div key={driver.id}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#131722]">{driver.label}</span>
                    <span className="tabular-nums font-mono text-[#434651]">
                      {driver.score} ·{' '}
                      <span className="font-sans font-medium" style={{ color: driverZone.color }}>
                        {driver.signal}
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#F0F3FA] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${driver.score}%`,
                        backgroundColor: driverZone.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
