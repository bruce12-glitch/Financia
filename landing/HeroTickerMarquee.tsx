import React, { useEffect, useState } from 'react';
import {
  BullionCandle,
  FEATURED_AMFI_SCHEMES,
  MfnavFundPayload,
  NavMasterSchemeDetailPayload,
  TreasuryTenorPoint,
} from './liveLandingEngine';

interface HeroTickerMarqueeProps {
  onSelectTicker?: (lookupSymbol: string) => void;
  liveFeedActive?: boolean;
}

interface LiveTickerItem {
  id: string;
  label: string;
  formattedValue: string;
  changePct: number | null;
  lookupSymbol: string;
}

export const HeroTickerMarquee: React.FC<HeroTickerMarqueeProps> = ({
  onSelectTicker,
  liveFeedActive = true,
}) => {
  const [items, setItems] = useState<LiveTickerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLiveTickerData() {
      try {
        const schemeFetches = FEATURED_AMFI_SCHEMES.map(
          async (scheme): Promise<LiveTickerItem | null> => {
            const res = await fetch(`/api/mfnav/fund/${scheme.schemeCode}`, {
              signal: controller.signal,
            });
            if (!res.ok) return null;
            const json = (await res.json()) as { payload?: MfnavFundPayload };
            const data = json.payload;
            if (!data || typeof data.latest_nav !== 'number' || !Number.isFinite(data.latest_nav)) {
              return null;
            }
            return {
              id: `amfi-${scheme.schemeCode}`,
              label: scheme.shortLabel,
              formattedValue: `₹${data.latest_nav.toFixed(2)}`,
              changePct:
                typeof data.latest_day_change_pct === 'number' &&
                Number.isFinite(data.latest_day_change_pct)
                  ? data.latest_day_change_pct
                  : null,
              lookupSymbol: scheme.workspaceTicker,
            };
          }
        );

        const sifFetch = (async (): Promise<LiveTickerItem | null> => {
          const res = await fetch('/api/nav-master/fund/1', { signal: controller.signal });
          if (!res.ok) return null;
          const json = (await res.json()) as { payload?: NavMasterSchemeDetailPayload };
          const d = json.payload;
          if (!d || !Number.isFinite(d.latest_nav)) return null;
          return {
            id: 'sqlite-sif-1',
            label: 'qsif Equity Long Short',
            formattedValue: `₹${d.latest_nav.toFixed(2)}`,
            changePct: typeof d.day_change_pct === 'number' ? d.day_change_pct : null,
            lookupSymbol: 'PPFAS',
          };
        })();

        const goldFetch = (async (): Promise<LiveTickerItem | null> => {
          const res = await fetch('/api/gold/klines?symbol=PAXGUSDT&interval=1d&limit=2', {
            signal: controller.signal,
          });
          if (!res.ok) return null;
          const data = (await res.json()) as { candles?: BullionCandle[] };
          const candles = Array.isArray(data.candles) ? data.candles : [];
          if (candles.length === 0) return null;
          const latest = candles[candles.length - 1];
          const prev = candles.length > 1 ? candles[candles.length - 2] : null;
          const pct =
            prev && prev.close > 0
              ? Number((((latest.close - prev.close) / prev.close) * 100).toFixed(2))
              : null;
          return {
            id: 'spot-gold-paxg',
            label: 'PAXG Spot Gold',
            formattedValue: `$${latest.close.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            changePct: pct,
            lookupSymbol: 'GOLDBEES',
          };
        })();

        const treasuryFetch = (async (): Promise<LiveTickerItem[]> => {
          const res = await fetch('/api/macro/treasury-rates', {
            signal: controller.signal,
          });
          if (!res.ok) return [];
          const data = (await res.json()) as {
            usTreasury?: { tenors?: TreasuryTenorPoint[] };
          };
          const tenors = Array.isArray(data.usTreasury?.tenors) ? data.usTreasury.tenors : [];
          const wanted = ['2Y', '10Y', '30Y'];
          const results: LiveTickerItem[] = [];
          for (const w of wanted) {
            const found = tenors.find((t) => t.label.toUpperCase() === w);
            if (found && Number.isFinite(found.yieldPct)) {
              results.push({
                id: `ust-${w}`,
                label: `US ${w} Treasury`,
                formattedValue: `${found.yieldPct.toFixed(2)}%`,
                changePct: null,
                lookupSymbol: 'SBIGILT',
              });
            }
          }
          return results;
        })();

        const settledSchemes = await Promise.allSettled(schemeFetches);
        const [settledSif, settledGold, settledTreasury] = await Promise.allSettled([
          sifFetch,
          goldFetch,
          treasuryFetch,
        ]);

        const nextItems: LiveTickerItem[] = [];
        for (const r of settledSchemes) {
          if (r.status === 'fulfilled' && r.value) nextItems.push(r.value);
        }
        if (settledSif.status === 'fulfilled' && settledSif.value) {
          nextItems.push(settledSif.value);
        }
        if (settledGold.status === 'fulfilled' && settledGold.value) {
          nextItems.push(settledGold.value);
        }
        if (settledTreasury.status === 'fulfilled' && settledTreasury.value.length > 0) {
          nextItems.push(...settledTreasury.value);
        }

        if (nextItems.length > 0) {
          setItems(nextItems);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
      } finally {
        setLoading(false);
      }
    }

    void fetchLiveTickerData();
    return () => controller.abort();
  }, []);

  const renderTrack = (copyKey: 'primary' | 'clone') => (
    <div
      className="flex items-center shrink-0 divide-x divide-white/[0.07]"
      aria-hidden={copyKey === 'clone' ? true : undefined}
    >
      {items.map((item) => {
        const hasDelta = typeof item.changePct === 'number';
        const isPositive = (item.changePct ?? 0) >= 0;
        const deltaLabel = hasDelta
          ? `${isPositive ? '+' : ''}${item.changePct!.toFixed(2)}%`
          : null;

        return (
          <button
            key={`${copyKey}-${item.id}`}
            type="button"
            tabIndex={copyKey === 'clone' ? -1 : 0}
            onClick={() => onSelectTicker?.(item.lookupSymbol)}
            aria-label={
              copyKey === 'primary'
                ? `${item.label} ${item.formattedValue}${deltaLabel ? ` ${deltaLabel}` : ''}`
                : undefined
            }
            className="inline-flex items-center gap-2.5 px-5 py-2 text-[12.5px] leading-none hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span className="font-medium text-[#94a3b8] tracking-[-0.005em]">
              {item.label}
            </span>
            <span className="font-mono tabular-nums font-medium text-white">
              {item.formattedValue}
            </span>
            {deltaLabel && (
              <span
                className={`inline-flex items-center gap-0.5 font-mono tabular-nums text-[11.5px] font-medium ${
                  isPositive ? 'text-[#34d399]' : 'text-[#fb7185]'
                }`}
              >
                <span aria-hidden="true" className="text-[8px] leading-none">
                  {isPositive ? '▲' : '▼'}
                </span>
                <span>{deltaLabel}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      data-testid="hero-ticker-marquee"
      aria-label="Live AMFI NAV, SQLite SIF, Spot Gold and US Treasury market tape"
      className="relative z-20 w-full h-11 bg-[#050914]/92 backdrop-blur-xl border-t border-white/[0.1] overflow-hidden flex items-center shrink-0"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-[#050914] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-[#050914] to-transparent"
      />

      {loading || items.length === 0 ? (
        <div className="w-full text-center text-[12px] text-[#94a3b8] font-mono px-4 truncate">
          {loading
            ? 'Streaming AMFI Direct NAVs, SQLite SIF ledger, PAXG bullion & U.S. Treasury yields...'
            : 'Live market feeds ready inside the screener below.'}
        </div>
      ) : (
        <div
          className={`flex w-max items-center ${
            liveFeedActive
              ? 'animate-financia-marquee hover:[animation-play-state:paused]'
              : ''
          }`}
        >
          {renderTrack('primary')}
          {renderTrack('clone')}
        </div>
      )}
    </div>
  );
};
