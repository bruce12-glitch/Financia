import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  DEBT_FUND_LEADERS,
  FEATURED_NFO_AND_SGB,
  FOREX_NEWS,
  GOLD_BULLION_ASSETS,
  GOLD_DEBT_NEWS,
  MACRO_SPARK_ROWS,
  MAJOR_INDICES,
  MUTUAL_FUND_NEWS,
  TOP_STORIES,
} from '../data/tradingViewData';
import {
  buildSvgAreaPath,
  buildSvgPolylinePath,
  formatSignedPercent,
} from '../utils/marketCalculations';
import { CommunityIdeaItem, MarketSymbolRow, WireNewsItem } from '../types/markets';
import { FearGreedGauge } from './FearGreedGauge';
import { SectorHeatmap } from './SectorHeatmap';
import { LiveMacroYieldCard } from './LiveMacroYieldCard';
import { LiveResearchBriefsGrid } from './LiveResearchBriefsGrid';
import { LiveQuantModelsSection } from './LiveQuantModelsSection';

interface MarketSummaryAndIdeasProps {
  onSelectSymbol: (row: MarketSymbolRow) => void;
  onSelectNews: (item: WireNewsItem) => void;
  onSelectIdea: (idea: CommunityIdeaItem) => void;
  onJumpToAnalysis?: (ticker: string) => void;
  liveFeedActive?: boolean;
}

export const MarketSummaryAndIdeas: React.FC<MarketSummaryAndIdeasProps> = ({
  onSelectSymbol,
  onSelectNews,
  onSelectIdea,
  onJumpToAnalysis,
  liveFeedActive = true,
}) => {
  const [featuredSymbol, setFeaturedSymbol] = useState<string>('GOLDBEES');
  const [showAllStories, setShowAllStories] = useState<boolean>(false);

  const featuredAsset = useMemo(() => {
    return MAJOR_INDICES.find((m) => m.symbol === featuredSymbol) || MAJOR_INDICES[1] || MAJOR_INDICES[0];
  }, [featuredSymbol]);

  const featuredSparkBounds = useMemo(() => {
    const vals = featuredAsset.sparkline || [];
    if (vals.length === 0) return { min: 0, mid: 0, max: 0 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mid = (min + max) / 2;
    return { min, mid, max };
  }, [featuredAsset.sparkline]);

  const aggregatedNews = useMemo(
    () => [
      ...TOP_STORIES,
      ...MUTUAL_FUND_NEWS,
      ...GOLD_DEBT_NEWS,
      ...FOREX_NEWS,
    ],
    []
  );

  const isFeaturedPositive = featuredAsset.changePercent >= 0;
  const heroStrokeColor = isFeaturedPositive ? '#089981' : '#F23645';
  const heroFillColor = isFeaturedPositive
    ? 'rgba(8, 153, 129, 0.14)'
    : 'rgba(242, 54, 69, 0.14)';

  return (
    <div id="market-summary" className="relative overflow-hidden bg-[#f6f9fc] text-[#0d253d] pt-12 pb-14 border-b border-[#e3e8ee]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 right-[8%] w-[560px] h-[360px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(185, 185, 249, 0.34) 0%, rgba(245, 233, 212, 0.24) 52%, rgba(246, 249, 252, 0) 78%)',
        }}
      />
      <div className="relative z-10 max-w-[1260px] mx-auto px-4 md:px-8 space-y-14">
        {/* 1. Market Summary Heading & Hero 4-Pillar Card */}
        <section aria-label="Market summary">
          <button
            type="button"
            onClick={() => setFeaturedSymbol('GOLDBEES')}
            className="inline-flex items-center gap-1 text-2xl md:text-[28px] font-display font-bold text-[#131722] hover:text-[#2962FF] transition-colors mb-5 cursor-pointer"
          >
            <span>Market summary</span>
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Featured Index Chart Card */}
          <div className="glass-card-light rounded-[14px] border border-[#e3e8ee] p-5 md:p-6 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: featuredAsset.badgeColor }}
                >
                  {featuredAsset.badgeText}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#131722]">{featuredAsset.name}</span>
                    <span className="text-xs font-mono text-[#787B86] bg-[#F0F3FA] px-1.5 py-0.5 rounded">
                      {featuredAsset.symbol}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
                    <span className="text-2xl md:text-[26px] font-bold text-[#131722]">
                      {featuredAsset.price}
                    </span>
                    <span className="text-[11px] font-mono text-[#787B86]">
                      {featuredAsset.unit}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        featuredAsset.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                      }`}
                    >
                      {formatSignedPercent(featuredAsset.changePercent)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Switchable Index Selector Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {MAJOR_INDICES.slice(0, 4).map((idxItem) => (
                  <button
                    key={idxItem.symbol}
                    type="button"
                    onClick={() => setFeaturedSymbol(idxItem.symbol)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      featuredSymbol === idxItem.symbol
                        ? 'bg-[#131722] text-white'
                        : 'bg-[#F0F3FA] text-[#434651] hover:bg-[#E0E3EB]'
                    }`}
                  >
                    {idxItem.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <svg
                viewBox="0 0 1100 185"
                className="w-full h-[160px] md:h-[185px]"
                role="img"
                aria-label={`${featuredAsset.name} intraday area summary chart`}
              >
                <line x1="0" y1="62" x2="1040" y2="62" stroke="#F0F3FA" strokeWidth="1" />
                <line x1="0" y1="126" x2="1040" y2="126" stroke="#F0F3FA" strokeWidth="1" />
                <path
                  d={buildSvgAreaPath(featuredAsset.sparkline, 1040, 175, 14)}
                  fill={heroFillColor}
                />
                <path
                  d={buildSvgPolylinePath(featuredAsset.sparkline, 1040, 175, 14)}
                  fill="none"
                  stroke={heroStrokeColor}
                  strokeWidth="2.2"
                />
                <text x="1048" y="45" fill="#787B86" fontSize="11" fontFamily="monospace">
                  {featuredSparkBounds.max.toFixed(2)}
                </text>
                <text x="1048" y="102" fill="#787B86" fontSize="11" fontFamily="monospace">
                  {featuredSparkBounds.mid.toFixed(2)}
                </text>
                <text x="1048" y="158" fill="#787B86" fontSize="11" fontFamily="monospace">
                  {featuredSparkBounds.min.toFixed(2)}
                </text>
              </svg>
            </div>
          </div>

          {/* Real-Time News Volume & Price Trend Market Sentiment Gauge */}
          <FearGreedGauge
            newsItems={aggregatedNews}
            onSelectHeadline={(storyId) => {
              const matched = aggregatedNews.find((n) => n.id === storyId);
              if (matched) onSelectNews(matched);
            }}
          />

          {/* 2-Column Paired Grid: Core ETFs & Benchmarks + Global Gold & Allocation Flows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Left: Core ETFs & Benchmarks */}
            <div className="glass-card-light rounded-[14px] border border-[#e3e8ee] p-5">
              <h3 className="text-base font-bold text-[#131722] mb-4">Core ETFs &amp; Benchmarks</h3>
              <div className="space-y-3">
                {MAJOR_INDICES.slice(0, 6).map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => onSelectSymbol(item)}
                    className="w-full flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-[#F8F9FD] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                        style={{ backgroundColor: item.badgeColor }}
                      >
                        {item.badgeText}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#131722] truncate">
                          {item.name}
                          {item.delayed && <sup className="text-[10px] text-[#F59E0B] ml-0.5">D</sup>}
                        </div>
                        <span className="inline-block text-[11px] font-mono text-[#787B86] bg-[#F0F3FA] px-1.5 py-0.5 rounded">
                          {item.symbol}
                        </span>
                      </div>
                    </div>
                    <div className="text-right tabular-nums shrink-0">
                      <div className="text-sm font-semibold text-[#131722]">
                        {item.price} <span className="text-[10px] text-[#787B86] font-normal">{item.unit}</span>
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          item.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                        }`}
                      >
                        {formatSignedPercent(item.changePercent)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onSelectSymbol(MAJOR_INDICES[0])}
                className="mt-4 text-xs font-semibold text-[#2962FF] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>Inspect NIFTYBEES</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: Global Gold & Allocation Flows */}
            <div className="glass-card-light rounded-[14px] border border-[#e3e8ee] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#D97706] text-white text-xs font-bold flex items-center justify-center">
                    Au
                  </span>
                  <span className="text-sm font-bold text-[#131722]">Global Gold &amp; Allocation Flows</span>
                  <span className="text-[11px] font-mono bg-[#F0F3FA] text-[#787B86] px-1.5 py-0.5 rounded">
                    BULLION &amp; ETF
                  </span>
                </div>
                <div className="flex items-baseline gap-2 tabular-nums">
                  <span className="text-xl font-bold text-[#131722]">$3,284.50</span>
                  <span className="text-[11px] text-[#787B86]">LBMA Spot Gold / oz</span>
                  <span className="text-xs font-semibold text-[#089981]">+1.18%</span>
                </div>

                <svg viewBox="0 0 480 86" className="w-full h-20 mt-2">
                  <path
                    d={buildSvgAreaPath(GOLD_BULLION_ASSETS[0].sparkline, 480, 76, 8)}
                    fill="rgba(8, 153, 129, 0.14)"
                  />
                  <path
                    d={buildSvgPolylinePath(GOLD_BULLION_ASSETS[0].sparkline, 480, 76, 8)}
                    fill="none"
                    stroke="#089981"
                    strokeWidth="2"
                  />
                  <text x="210" y="83" fill="#787B86" fontSize="10">
                    Spot Trend
                  </text>
                </svg>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-[#131722] mb-2">Institutional Pillar Share</div>
                  <div className="grid grid-cols-3 text-xs mb-1.5 tabular-nums">
                    <div>
                      <span className="text-[#D97706]">●</span> Gold &amp; Bullion <div className="font-semibold">42.0%</div>
                    </div>
                    <div>
                      <span className="text-[#2962FF]">●</span> Mutual Funds <div className="font-semibold">35.5%</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[#089981]">●</span> Debt &amp; Gilts <div className="font-semibold">22.5%</div>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#F0F3FA]">
                    <div className="bg-[#D97706] h-full" style={{ width: '42.0%' }} />
                    <div className="bg-[#2962FF] h-full" style={{ width: '35.5%' }} />
                    <div className="bg-[#089981] h-full" style={{ width: '22.5%' }} />
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {GOLD_BULLION_ASSETS.slice(1, 3).map((asset) => (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => onSelectSymbol(asset)}
                      className="w-full flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-[#F8F9FD] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: asset.badgeColor }}
                        >
                          {asset.badgeText}
                        </span>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-[#131722]">{asset.name}</div>
                          <span className="text-[11px] font-mono bg-[#F0F3FA] text-[#787B86] px-1.5 py-0.5 rounded">
                            {asset.symbol}
                          </span>
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-semibold text-[#131722]">
                          {asset.price} <span className="text-[10px] text-[#787B86]">{asset.unit}</span>
                        </div>
                        <div
                          className={`text-xs font-medium ${
                            asset.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                          }`}
                        >
                          {formatSignedPercent(asset.changePercent)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectSymbol(GOLD_BULLION_ASSETS[1])}
                className="mt-4 text-xs font-semibold text-[#2962FF] hover:underline inline-flex items-center gap-0.5 cursor-pointer self-start"
              >
                <span>Inspect Gold Bullion</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2-Column Macro Pair: USDINR & India 10Y Yield */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {MACRO_SPARK_ROWS.map((macro) => (
              <button
                key={macro.symbol}
                type="button"
                onClick={() => onSelectSymbol(macro)}
                className="glass-card-light rounded-[14px] border border-[#e3e8ee] p-5 text-left hover:border-[#533afd]/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: macro.badgeColor }}
                  >
                    {macro.badgeText}
                  </span>
                  <span className="text-sm font-bold text-[#131722]">{macro.name}</span>
                  <span className="text-[11px] font-mono bg-[#F0F3FA] text-[#787B86] px-1.5 py-0.5 rounded">
                    {macro.symbol}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 tabular-nums mb-2">
                  <span className="text-xl font-bold text-[#131722]">{macro.price}</span>
                  <span className="text-[11px] text-[#787B86]">{macro.unit}</span>
                  <span className="text-xs font-semibold text-[#F23645]">
                    {formatSignedPercent(macro.changePercent)}
                  </span>
                </div>
                <svg viewBox="0 0 420 72" className="w-full h-16">
                  <path
                    d={buildSvgAreaPath(macro.sparkline, 420, 62, 6)}
                    fill="rgba(242, 54, 69, 0.14)"
                  />
                  <path
                    d={buildSvgPolylinePath(macro.sparkline, 420, 62, 6)}
                    fill="none"
                    stroke="#F23645"
                    strokeWidth="1.8"
                  />
                  <text x="190" y="70" fill="#787B86" fontSize="10">
                    1 month
                  </text>
                </svg>
              </button>
            ))}
          </div>

          {/* 2-Column Debt Funds & Sovereign Yield Desk + India Annual Inflation Rate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card-light rounded-[14px] border border-[#e3e8ee] p-5 space-y-3">
              <div className="text-sm font-bold text-[#131722] mb-1">
                Debt Funds &amp; Sovereign Yield Desk
              </div>
              {DEBT_FUND_LEADERS.slice(0, 4).map((debt) => (
                <button
                  key={debt.symbol}
                  type="button"
                  onClick={() => onSelectSymbol(debt)}
                  className="w-full flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-[#F8F9FD] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-9 h-9 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: debt.badgeColor }}
                    >
                      {debt.badgeText}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#131722] truncate">{debt.name}</div>
                      <span className="text-[11px] font-mono bg-[#F0F3FA] text-[#787B86] px-1.5 py-0.5 rounded">
                        {debt.symbol}
                      </span>
                    </div>
                  </div>
                  <div className="text-right tabular-nums shrink-0">
                    <div className="text-sm font-semibold text-[#131722]">
                      {debt.price} <span className="text-[10px] text-[#787B86] font-normal">{debt.unit}</span>
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        debt.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                      }`}
                    >
                      {formatSignedPercent(debt.changePercent)}
                    </div>
                  </div>
                </button>
              ))}
              <a
                href="#debt-funds-section"
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#2962FF] hover:underline pt-1"
              >
                <span>Explore all debt funds</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <LiveMacroYieldCard />
          </div>

          {/* Real-Time D3.js Sector Performance Volatility Heatmap */}
          <SectorHeatmap onSelectSymbol={onSelectSymbol} liveFeedActive={liveFeedActive} />
        </section>

        {/* 2. Featured NFOs & SGB Tranches Row */}
        <section aria-label="Featured NFOs and SGB Tranches">
          <h2 className="text-2xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
            <span>Featured NFOs &amp; SGB Tranches</span>
            <ChevronRight className="w-5 h-5" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURED_NFO_AND_SGB.map((item) => (
              <div
                key={item.symbol}
                className="glass-card-light rounded-[12px] border border-[#e3e8ee] p-4 flex flex-col justify-between gap-4 hover:border-[#533afd]/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: item.accentColor }}
                  >
                    {item.symbol.slice(0, 2)}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#131722]">{item.symbol}</div>
                    <div className="text-xs text-[#787B86]">{item.name}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#F0F3FA] tabular-nums">
                  <div>
                    <div className="text-[#787B86]">Issuer / Venue</div>
                    <div className="font-semibold text-[#131722]">{item.exchange}</div>
                  </div>
                  <div>
                    <div className="text-[#787B86]">Coupon / Target YTM</div>
                    <div className="font-semibold text-[#131722]">{item.valuation}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Live Primary Research Briefs (Real AMFI & Physical Bullion Trajectories) */}
        <section aria-label="Primary research briefs">
          <LiveResearchBriefsGrid
            heading="Primary research briefs"
            group="community"
            onSelectIdea={onSelectIdea}
            onJumpToAnalysis={onJumpToAnalysis}
          />
        </section>

        {/* 4. Live Quantitative Models & Cross-Asset Signals */}
        <LiveQuantModelsSection onJumpToAnalysis={onJumpToAnalysis} />

        {/* 5. Top Stories 3-Column Wire Grid (PDF Page 6) */}
        <section aria-label="Top stories">
          <h2 className="text-2xl font-display font-bold text-[#131722] mb-5 inline-flex items-center gap-1">
            <span>Top stories</span>
            <ChevronRight className="w-5 h-5" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
            {(showAllStories ? TOP_STORIES : TOP_STORIES.slice(0, 6)).map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => onSelectNews(story)}
                className="text-left group cursor-pointer"
              >
                <div className="text-xs text-[#787B86] mb-1">
                  {story.timeAgo} · {story.source}
                </div>
                <div className="text-sm font-medium text-[#131722] group-hover:text-[#2962FF] transition-colors leading-snug">
                  {story.headline}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAllStories((prev) => !prev)}
            className="mt-5 text-xs font-semibold text-[#2962FF] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>{showAllStories ? 'Show less' : 'Keep reading'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </section>
      </div>
    </div>
  );
};
