import React, { useMemo, useState } from 'react';
import { ChevronRight, MessageSquare, Rocket } from 'lucide-react';
import {
  COMMUNITY_IDEAS,
  DEBT_FUND_LEADERS,
  FEATURED_NFO_AND_SGB,
  FOREX_NEWS,
  GOLD_BULLION_ASSETS,
  GOLD_DEBT_NEWS,
  INDICATOR_SCRIPTS,
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

interface MarketSummaryAndIdeasProps {
  onSelectSymbol: (row: MarketSymbolRow) => void;
  onSelectNews: (item: WireNewsItem) => void;
  onSelectIdea: (idea: CommunityIdeaItem) => void;
  liveFeedActive?: boolean;
}

export const MarketSummaryAndIdeas: React.FC<MarketSummaryAndIdeasProps> = ({
  onSelectSymbol,
  onSelectNews,
  onSelectIdea,
  liveFeedActive = true,
}) => {
  const [featuredSymbol, setFeaturedSymbol] = useState<string>('GOLDBEES');
  const [ideasTab, setIdeasTab] = useState<'editors' | 'popular'>('editors');
  const [scriptsTab, setScriptsTab] = useState<'editors' | 'popular'>('editors');
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

  const inflationBars = [
    { label: 'Jan', val: 4.1 },
    { label: 'Feb', val: 4.3 },
    { label: 'Mar', val: 4.2 },
    { label: 'Apr', val: 4.6 },
    { label: 'May', val: 4.9 },
    { label: 'Jun', val: 4.8 },
    { label: 'Jul', val: 5.1 },
    { label: 'Aug', val: 5.2 },
    { label: 'Sep', val: 5.4 },
    { label: 'Oct', val: 5.5 },
  ];

  const displayedIdeas = useMemo(() => {
    if (ideasTab === 'popular') {
      return [...COMMUNITY_IDEAS].sort((a, b) => b.boosts - a.boosts).slice(0, 2);
    }
    return COMMUNITY_IDEAS.slice(0, 2);
  }, [ideasTab]);

  const displayedScripts = useMemo(() => {
    if (scriptsTab === 'popular') {
      return [...INDICATOR_SCRIPTS].reverse();
    }
    return INDICATOR_SCRIPTS;
  }, [scriptsTab]);

  const isFeaturedPositive = featuredAsset.changePercent >= 0;
  const heroStrokeColor = isFeaturedPositive ? '#089981' : '#F23645';
  const heroFillColor = isFeaturedPositive
    ? 'rgba(8, 153, 129, 0.14)'
    : 'rgba(242, 54, 69, 0.14)';

  return (
    <div id="market-summary" className="bg-white text-[#131722] pb-14">
      <div className="max-w-[1260px] mx-auto px-4 md:px-8 space-y-14">
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

          {/* Featured Index Chart Card (Matches PDF Page 2) */}
          <div className="rounded-2xl border border-[#E0E3EB] bg-white p-5 md:p-6 mb-5">
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
            <div className="rounded-2xl border border-[#E0E3EB] bg-white p-5">
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
            <div className="rounded-2xl border border-[#E0E3EB] bg-white p-5 flex flex-col justify-between">
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
                className="rounded-2xl border border-[#E0E3EB] bg-white p-5 text-left hover:border-[#2962FF]/40 transition-colors cursor-pointer"
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
            <div className="rounded-2xl border border-[#E0E3EB] bg-white p-5 space-y-3">
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

            <div className="rounded-2xl border border-[#E0E3EB] bg-white p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#F97316] text-white text-[10px] font-bold flex items-center justify-center">
                    IN
                  </span>
                  <span className="text-sm font-bold text-[#131722]">India annual inflation rate</span>
                  <span className="text-[11px] font-mono bg-[#F0F3FA] text-[#787B86] px-1.5 py-0.5 rounded">
                    INIRYY
                  </span>
                </div>

                {/* Bar Chart Matching PDF Page 4 */}
                <div className="h-28 flex items-end gap-2 pt-4 pb-2 border-b border-[#F0F3FA]">
                  {inflationBars.map((bar, idx) => (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className={`w-full rounded-t ${
                          idx === inflationBars.length - 1 ? 'bg-[#2962FF]' : 'bg-[#5B8DEF]'
                        }`}
                        style={{ height: `${(bar.val / 6.2) * 100}%` }}
                        title={`${bar.label}: ${bar.val}%`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-[#787B86] mt-1.5 mb-4">
                  <span>2026</span>
                  <span>Apr</span>
                  <span>Jul</span>
                  <span>Oct</span>
                </div>

                <div className="text-xs font-bold text-[#131722] mb-2">India interest rate</div>
                <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                  <div>
                    <div className="text-[#787B86]">Actual</div>
                    <div className="font-bold text-[#131722]">5.5%</div>
                  </div>
                  <div>
                    <div className="text-[#787B86]">Forecast</div>
                    <div className="font-bold text-[#131722]">—</div>
                  </div>
                  <div>
                    <div className="text-[#787B86]">Next release</div>
                    <div className="font-bold text-[#131722]">Dec 4, 2026</div>
                  </div>
                </div>
              </div>

              <a
                href="#economy-section"
                className="mt-4 inline-flex items-center gap-0.5 text-xs font-semibold text-[#2962FF] hover:underline"
              >
                <span>See all economic indicators</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
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
                className="rounded-xl border border-[#E0E3EB] bg-white p-4 flex flex-col justify-between gap-4 hover:border-[#2962FF]/40 transition-colors"
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

        {/* 3. Community Ideas & Indicators Showcase (PDF Pages 4-5) */}
        <section aria-label="Community ideas">
          <h2 className="text-2xl font-display font-bold text-[#131722] mb-3 inline-flex items-center gap-1">
            <span>Community ideas</span>
            <ChevronRight className="w-5 h-5" />
          </h2>

          <div className="flex items-center gap-2 mb-5">
            {(['editors', 'popular'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setIdeasTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  ideasTab === tab
                    ? 'bg-[#F0F3FA] text-[#131722]'
                    : 'text-[#787B86] hover:text-[#131722]'
                }`}
              >
                {tab === 'editors' ? "Editors' picks" : 'Popular'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedIdeas.map((idea) => (
              <article
                key={idea.id}
                onClick={() => onSelectIdea(idea)}
                className="group cursor-pointer rounded-2xl border border-[#E0E3EB] bg-white overflow-hidden hover:border-[#2962FF]/45 transition-colors flex flex-col"
              >
                {/* Technical Chart Idea Visual */}
                <div className="bg-[#F8F9FD] border-b border-[#E0E3EB] p-3 relative">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#787B86] mb-1">
                    <span className="bg-[#2962FF] text-white px-1.5 py-0.5 rounded font-bold">
                      {idea.symbol}
                    </span>
                    <span>{idea.priceAxisLabels[0]}</span>
                  </div>
                  <svg viewBox="0 0 440 155" className="w-full h-36">
                    <line x1="0" y1="45" x2="395" y2="45" stroke="#E0E3EB" strokeDasharray="3 3" />
                    <line x1="0" y1="100" x2="395" y2="100" stroke="#E0E3EB" strokeDasharray="3 3" />
                    {idea.chartType === 'bearish_fib' ? (
                      <>
                        <path
                          d="M 15,35 L 95,45 L 135,95 L 205,78 L 245,125 L 330,110 L 385,138"
                          fill="none"
                          stroke="#F23645"
                          strokeWidth="2"
                        />
                        <rect x="200" y="72" width="130" height="22" fill="#22C55E" fillOpacity="0.18" />
                        <text x="206" y="86" fill="#15803D" fontSize="9">
                          Fibonacci 0.618 resistance
                        </text>
                      </>
                    ) : (
                      <>
                        <path
                          d="M 15,128 L 80,104 L 130,112 L 210,74 L 265,86 L 340,34 L 385,24"
                          fill="none"
                          stroke="#089981"
                          strokeWidth="2.2"
                        />
                        <line x1="180" y1="24" x2="385" y2="24" stroke="#2962FF" strokeDasharray="4 3" />
                        <text x="245" y="18" fill="#2962FF" fontSize="9">
                          Breakout target
                        </text>
                      </>
                    )}
                    {idea.priceAxisLabels.map((lbl, idx) => (
                      <text
                        key={lbl}
                        x="398"
                        y={28 + idx * 38}
                        fill="#787B86"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {lbl}
                      </text>
                    ))}
                  </svg>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#131722] group-hover:text-[#2962FF] transition-colors mb-1.5">
                      {idea.title}
                    </h3>
                    <p className="text-xs text-[#434651] leading-relaxed line-clamp-2 mb-3">
                      {idea.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#787B86] pt-2 border-t border-[#F0F3FA]">
                    <div>
                      <span className="font-medium text-[#131722]">by {idea.author}</span> ·{' '}
                      <span>{idea.timeLabel}</span>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {idea.comments}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Rocket className="w-3.5 h-3.5" />
                        {idea.boosts}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 4. Indicators and Strategies (PDF Page 5) */}
        <section aria-label="Indicators and strategies">
          <h2 className="text-2xl font-display font-bold text-[#131722] mb-3 inline-flex items-center gap-1">
            <span>Indicators and strategies</span>
            <ChevronRight className="w-5 h-5" />
          </h2>

          <div className="flex items-center gap-2 mb-5">
            {(['editors', 'popular'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setScriptsTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  scriptsTab === tab
                    ? 'bg-[#F0F3FA] text-[#131722]'
                    : 'text-[#787B86] hover:text-[#131722]'
                }`}
              >
                {tab === 'editors' ? "Editors' picks" : 'Popular'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedScripts.map((script) => (
              <article
                key={script.id}
                onClick={() => onSelectIdea(script)}
                className="group cursor-pointer rounded-2xl border border-[#E0E3EB] bg-white overflow-hidden hover:border-[#2962FF]/45 transition-colors flex flex-col"
              >
                <div className="bg-[#0C0F14] p-3 relative">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#9598A1] mb-1">
                    <span className="bg-[#2962FF] text-white px-1.5 py-0.5 rounded font-bold">FN</span>
                    <span>INDICATOR</span>
                  </div>
                  <svg viewBox="0 0 440 155" className="w-full h-36">
                    {script.chartType === 'cci_oscillator' ? (
                      <>
                        <path
                          d="M 10,85 C 60,30 100,120 150,70 C 200,20 260,130 320,55 C 370,15 400,60 430,40"
                          fill="none"
                          stroke="#22C55E"
                          strokeWidth="2"
                        />
                        <path
                          d="M 10,122 C 80,108 140,136 220,118 C 290,105 350,138 430,114"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="1.6"
                        />
                      </>
                    ) : (
                      <>
                        {[25, 45, 65, 85, 105, 125].map((y, idx) => (
                          <rect
                            key={y}
                            x="60"
                            y={y}
                            width={70 + (idx % 3) * 45}
                            height="12"
                            fill={idx === 2 ? '#F59E0B' : '#089981'}
                            fillOpacity="0.6"
                          />
                        ))}
                        <path
                          d="M 210,120 L 250,95 L 290,102 L 340,60 L 395,38"
                          fill="none"
                          stroke="#60A5FA"
                          strokeWidth="2"
                        />
                      </>
                    )}
                  </svg>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#131722] group-hover:text-[#2962FF] transition-colors mb-1">
                      {script.title}
                    </h3>
                    <p className="text-xs text-[#434651] leading-relaxed line-clamp-2 mb-3">
                      {script.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#787B86] pt-2 border-t border-[#F0F3FA]">
                    <span>by {script.author}</span>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span>{script.comments} comments</span>
                      <span>{script.boosts} boosts</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

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
