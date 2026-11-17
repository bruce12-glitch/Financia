import React, { useEffect, useState } from 'react';
import {
  formatTickerDelta,
  formatTickerPrice,
  HeroTickerItem,
  INITIAL_HERO_TICKER_ITEMS,
  stepHeroTickerItems,
} from '../frontend/utils/heroTickerEngine';

interface HeroTickerMarqueeProps {
  onSelectTicker?: (lookupSymbol: string) => void;
  liveFeedActive?: boolean;
}

export const HeroTickerMarquee: React.FC<HeroTickerMarqueeProps> = ({
  onSelectTicker,
  liveFeedActive = true,
}) => {
  const [items, setItems] = useState<HeroTickerItem[]>(INITIAL_HERO_TICKER_ITEMS);

  useEffect(() => {
    if (!liveFeedActive) return;
    const timer = window.setInterval(() => {
      setItems((prev) => stepHeroTickerItems(prev));
    }, 4000);
    return () => window.clearInterval(timer);
  }, [liveFeedActive]);

  const renderTrack = (copyKey: 'primary' | 'clone') => (
    <div
      className="flex items-center shrink-0"
      aria-hidden={copyKey === 'clone' ? true : undefined}
    >
      {items.map((item) => {
        const delta = formatTickerDelta(item.changePercent);
        return (
          <button
            key={`${copyKey}-${item.symbol}`}
            type="button"
            tabIndex={copyKey === 'clone' ? -1 : 0}
            onClick={() => onSelectTicker?.(item.lookupSymbol)}
            aria-label={
              copyKey === 'primary'
                ? `${item.symbol} ${formatTickerPrice(item.price, item.decimals)} ${delta.label}`
                : undefined
            }
            className="inline-flex items-center gap-2 px-4 py-1.5 text-[12px] leading-none hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span className="font-semibold tracking-[0.02em] text-[#9CA3AF]">
              {item.symbol}
            </span>
            <span className="font-mono font-semibold text-white tabular-nums">
              {formatTickerPrice(item.price, item.decimals)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 font-mono font-semibold tabular-nums ${
                delta.isPositive ? 'text-[#22AB94]' : 'text-[#F23645]'
              }`}
            >
              <span aria-hidden="true" className="text-[9px] leading-none">
                {delta.triangle}
              </span>
              <span>{delta.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      data-testid="hero-ticker-marquee"
      aria-label="Live moving market ticker tape"
      className="relative z-20 w-full h-9 bg-[#0B0E14]/92 border-t border-white/10 backdrop-blur-md overflow-hidden flex items-center shrink-0"
    >
      {/* Left & Right subtle edge fades */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-10 z-10 bg-gradient-to-r from-[#0B0E14] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 z-10 bg-gradient-to-l from-[#0B0E14] to-transparent"
      />

      <div className="flex w-max items-center animate-financia-marquee hover:[animation-play-state:paused]">
        {renderTrack('primary')}
        {renderTrack('clone')}
      </div>
    </div>
  );
};
