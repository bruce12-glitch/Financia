import React, { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { FearGreedGauge } from '../frontend/components/FearGreedGauge';
import {
  FOREX_NEWS,
  FUTURES_NEWS,
  GOLD_DEBT_NEWS,
  MUTUAL_FUND_NEWS,
  TOP_STORIES,
} from '../frontend/data/tradingViewData';
import { WireNewsItem } from '../frontend/types/markets';

interface LandingSentimentSectionProps {
  onSelectNews?: (item: WireNewsItem) => void;
  onRequestWorkspace?: (targetSectionId: string) => void;
}

export const LandingSentimentSection: React.FC<LandingSentimentSectionProps> = ({
  onSelectNews,
  onRequestWorkspace,
}) => {
  const aggregatedNews = useMemo(
    () => [
      ...TOP_STORIES,
      ...MUTUAL_FUND_NEWS,
      ...GOLD_DEBT_NEWS,
      ...FOREX_NEWS,
      ...FUTURES_NEWS,
    ],
    []
  );

  return (
    <section
      id="landing-sentiment"
      aria-label="Real-Time Market Sentiment Gauge Based on News Volume and Price Trends"
      className="relative w-full bg-[#05070C] text-white border-t border-[#161B26] py-20 lg:py-24 px-4 md:px-10"
    >
      <div className="max-w-[1220px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <div className="text-xs font-mono text-[#60A5FA] mb-3">
              01. Real-Time Market Sentiment
            </div>
            <h2
              className="font-display font-bold text-white tracking-[-0.025em]"
              style={{
                fontSize: 'clamp(1.85rem, 3.2vw, 2.8rem)',
                lineHeight: 1.08,
                textWrap: 'balance',
              }}
            >
              Live sentiment driven by news volume and price trends.
            </h2>
          </div>

          <div className="max-w-md flex flex-col items-start lg:items-end gap-3">
            <p className="text-sm text-[#9598A1] leading-relaxed lg:text-right">
              Synthesizes real-time wire story velocity, bullish vs. defensive headline polarity, index price slopes, and cross-asset breadth.
            </p>
            {onRequestWorkspace && (
              <button
                type="button"
                onClick={() => onRequestWorkspace('market-summary')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Open Full Market Summary &amp; Wire Feed</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <FearGreedGauge
          theme="dark"
          newsItems={aggregatedNews}
          onSelectHeadline={
            onSelectNews
              ? (storyId) => {
                  const matched = aggregatedNews.find((item) => item.id === storyId);
                  if (matched) onSelectNews(matched);
                }
              : undefined
          }
        />
      </div>
    </section>
  );
};
