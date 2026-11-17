import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Newspaper, RefreshCw, TrendingUp } from 'lucide-react';
import {
  CRYPTO_ASSETS,
  CRYPTO_NEWS,
  FOREX_NEWS,
  FUTURES_NEWS,
  INDIAN_STOCKS_NEWS,
  MACRO_SPARK_ROWS,
  MAJOR_INDICES,
  TOP_STORIES,
} from '../data/tradingViewData';
import { WireNewsItem } from '../types/markets';
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

const DEFAULT_WIRE_NEWS: WireNewsItem[] = [
  ...TOP_STORIES,
  ...INDIAN_STOCKS_NEWS,
  ...CRYPTO_NEWS,
  ...FOREX_NEWS,
  ...FUTURES_NEWS,
];

export interface FearGreedGaugeProps {
  theme?: 'light' | 'dark';
  newsItems?: WireNewsItem[];
  onSelectHeadline?: (storyId: string) => void;
}

export const FearGreedGauge: React.FC<FearGreedGaugeProps> = ({
  theme = 'light',
  newsItems = DEFAULT_WIRE_NEWS,
  onSelectHeadline,
}) => {
  const isDark = theme === 'dark';

  const baseline = useMemo(
    () =>
      computeCompositeMarketSentiment({
        indices: MAJOR_INDICES,
        crypto: CRYPTO_ASSETS,
        macro: MACRO_SPARK_ROWS,
        news: newsItems,
      }),
    [newsItems]
  );

  const [sentiment, setSentiment] = useState<SentimentPayload>(baseline);
  const [activeScope, setActiveScope] = useState<SentimentScope>('global');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSentiment((prev) => (prev.isLive ? prev : baseline));
  }, [baseline]);

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
      setErrorMessage('Live sentiment feed unavailable — showing news volume & price trend baseline.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSentiment(false);
  }, [fetchSentiment]);

  const activeData = sentiment.scopes[activeScope];
  const needleAngle = scoreToNeedleAngle(activeData.score);
  const newsSignals = activeData.newsSignals;
  const priceTrendZone = getSentimentZone(activeData.priceTrendScore);
  const newsZone = getSentimentZone(newsSignals.combinedNewsScore);

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
      data-theme={theme}
      className={`rounded-2xl border p-5 md:p-6 ${
        isDark
          ? 'border-[#1E2432] bg-[#0B0F17] text-white'
          : 'border-[#E0E3EB] bg-white text-[#131722] mb-5'
      }`}
    >
      {/* Header Row */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b ${
          isDark ? 'border-[#1A202C]' : 'border-[#F0F3FA]'
        }`}
      >
        <div>
          <h3
            className={`text-base md:text-lg font-display font-bold ${
              isDark ? 'text-white' : 'text-[#131722]'
            }`}
          >
            Real-time market sentiment gauge
          </h3>
          <p
            className={`text-xs mt-0.5 flex flex-wrap items-center gap-1.5 tabular-nums ${
              isDark ? 'text-[#9598A1]' : 'text-[#787B86]'
            }`}
          >
            <span>{activeData.sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{newsSignals.totalArticles} stories tracked</span>
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
            className={`inline-flex items-center p-1 rounded-lg gap-1 ${
              isDark ? 'bg-[#06090F] border border-[#1A202C]' : 'bg-[#F0F3FA]'
            }`}
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
                    ? isDark
                      ? 'bg-[#2962FF] text-white'
                      : 'bg-[#131722] text-white'
                    : isDark
                      ? 'text-[#9598A1] hover:text-white'
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
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isDark
                ? 'border-[#252C3D] text-white hover:bg-[#141A26]'
                : 'border-[#E0E3EB] text-[#131722] hover:bg-[#F8F9FD]'
            }`}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-5">
        {/* Left: Semicircular SVG Gauge + News Volume & Price Trend Signal Strip */}
        <div className="lg:col-span-5 flex flex-col items-center text-center">
          <div className="w-full max-w-[320px]">
            <svg
              viewBox="0 0 320 184"
              className="w-full h-auto overflow-visible"
              role="img"
              aria-label={`${activeData.title} score ${activeData.score} out of 100, classified as ${activeData.zone}`}
            >
              {DIAL_SEGMENTS.map((seg) => (
                <path
                  key={seg.label}
                  d={describeArc(160, 152, 116, seg.startAngle, seg.endAngle)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="18"
                  strokeLinecap="butt"
                  opacity={seg.label === activeData.zone ? 1 : isDark ? 0.24 : 0.3}
                />
              ))}

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
                    fill={isDark ? '#8B92A5' : '#787B86'}
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                  >
                    {tick}
                  </text>
                );
              })}

              <g
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: '160px 152px',
                  transition: 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <polygon
                  points="156,152 160,54 164,152"
                  fill={isDark ? '#F8FAFC' : '#131722'}
                />
              </g>
              <circle cx="160" cy="152" r="9" fill={isDark ? '#F8FAFC' : '#131722'} />
              <circle cx="160" cy="152" r="4" fill={isDark ? '#0B0F17' : '#FFFFFF'} />
            </svg>
          </div>

          <div className="-mt-1">
            <div
              className={`text-4xl font-display font-bold font-mono tabular-nums ${
                isDark ? 'text-white' : 'text-[#131722]'
              }`}
            >
              {activeData.score}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold">
              <span style={{ color: activeData.color }}>{activeData.zone}</span>
              <span aria-hidden="true" className={isDark ? 'text-[#334155]' : 'text-[#D1D5DB]'}>
                ·
              </span>
              <span
                className={`text-xs font-mono tabular-nums ${
                  isDark ? 'text-[#9598A1]' : 'text-[#434651]'
                }`}
              >
                {activeData.deltaFromClose > 0
                  ? `+${activeData.deltaFromClose} vs close`
                  : activeData.deltaFromClose < 0
                    ? `${activeData.deltaFromClose} vs close`
                    : 'Unchanged vs close'}
              </span>
            </div>
            <p
              className={`text-xs max-w-xs mx-auto mt-2 leading-relaxed ${
                isDark ? 'text-[#9598A1]' : 'text-[#787B86]'
              }`}
            >
              {activeData.summary}
            </p>
          </div>

          {/* News Volume & Price Trend Signal Breakdown */}
          <div
            data-testid="sentiment-news-price-breakdown"
            className={`w-full mt-5 rounded-xl border p-3.5 text-left ${
              isDark ? 'border-[#1A202C] bg-[#070A10]' : 'border-[#E0E3EB] bg-[#F8F9FD]'
            }`}
          >
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-dashed border-[#252C3D]/35">
              <div>
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-medium ${
                    isDark ? 'text-[#9598A1]' : 'text-[#787B86]'
                  }`}
                >
                  <Newspaper className="w-3.5 h-3.5 text-[#60A5FA]" />
                  <span>News volume (24h)</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
                  <span
                    className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#131722]'}`}
                  >
                    {newsSignals.recent24hArticles}/{newsSignals.totalArticles}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: newsZone.color }}>
                    {newsSignals.combinedNewsScore}/100
                  </span>
                </div>
                <div
                  className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                    isDark ? 'text-[#787B86]' : 'text-[#787B86]'
                  }`}
                >
                  {newsSignals.bullishArticles} pos · {newsSignals.bearishArticles} neg
                </div>
              </div>

              <div>
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-medium ${
                    isDark ? 'text-[#9598A1]' : 'text-[#787B86]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#089981]" />
                  <span>Price trend</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
                  <span
                    className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#131722]'}`}
                  >
                    {activeData.priceTrendScore}
                  </span>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: priceTrendZone.color }}
                  >
                    {priceTrendZone.zone}
                  </span>
                </div>
                <div className="text-[11px] font-mono tabular-nums mt-0.5 text-[#787B86]">
                  Velocity {newsSignals.velocityScore}/100
                </div>
              </div>
            </div>

            {newsSignals.topHeadlines.length > 0 && (
              <div className="pt-2.5 space-y-2">
                {newsSignals.topHeadlines.slice(0, 2).map((item) => {
                  const tagColor =
                    item.sentiment === 'bullish'
                      ? '#089981'
                      : item.sentiment === 'bearish'
                        ? '#F23645'
                        : '#9598A1';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectHeadline?.(item.id)}
                      className={`w-full text-left flex items-start gap-2 group ${
                        onSelectHeadline ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: tagColor }}
                      />
                      <span
                        className={`text-[11px] leading-snug line-clamp-2 ${
                          isDark
                            ? 'text-[#CBD5E1] group-hover:text-white'
                            : 'text-[#434651] group-hover:text-[#131722]'
                        }`}
                      >
                        {item.headline}{' '}
                        <span className="text-[#787B86] font-mono">· {item.timeAgo}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Historical Benchmarks, D3 Sentiment Trend Chart & Health Drivers */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div
            className={`grid grid-cols-3 gap-4 pb-4 border-b ${
              isDark ? 'border-[#1A202C]' : 'border-[#F0F3FA]'
            }`}
          >
            {[
              { label: 'Previous close', value: activeData.previousClose },
              { label: '1 week ago', value: activeData.oneWeekAgo },
              { label: '1 month ago', value: activeData.oneMonthAgo },
            ].map((hist) => {
              const histZone = getSentimentZone(hist.value);
              return (
                <div key={hist.label}>
                  <div className={`text-xs ${isDark ? 'text-[#9598A1]' : 'text-[#787B86]'}`}>
                    {hist.label}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                    <span
                      className={`text-lg font-bold font-mono ${
                        isDark ? 'text-white' : 'text-[#131722]'
                      }`}
                    >
                      {hist.value}
                    </span>
                    <span className="text-xs font-medium truncate" style={{ color: histZone.color }}>
                      {histZone.zone}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <SentimentTrendChart
            history90d={activeData.history90d}
            activeColor={activeData.color}
            scopeTitle={activeData.title}
            theme={theme}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-4">
            {activeData.drivers.map((driver) => {
              const driverZone = getSentimentZone(driver.score);
              return (
                <div key={driver.id}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#131722]'}`}>
                      {driver.label}
                    </span>
                    <span
                      className={`tabular-nums font-mono ${
                        isDark ? 'text-[#CBD5E1]' : 'text-[#434651]'
                      }`}
                    >
                      {driver.score} ·{' '}
                      <span className="font-sans font-medium" style={{ color: driverZone.color }}>
                        {driver.signal}
                      </span>
                    </span>
                  </div>
                  <div
                    className={`w-full h-1.5 rounded-full overflow-hidden ${
                      isDark ? 'bg-[#161B26]' : 'bg-[#F0F3FA]'
                    }`}
                  >
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
