import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Layers, Monitor, SlidersHorizontal } from 'lucide-react';
import { SUPERCHART_INSTRUMENTS } from '../frontend/data/tradingViewData';
import { SuperchartCandle, SuperchartInstrument } from '../frontend/types/markets';

interface SuperchartsSectionProps {
  onSelectSymbol?: (symbol: string) => void;
}

export const SuperchartsSection: React.FC<SuperchartsSectionProps> = ({ onSelectSymbol }) => {
  const [activeSymbol, setActiveSymbol] = useState<string>('AAPL');
  const [timeframe, setTimeframe] = useState<'15m' | '1h' | '4h' | '1D'>('1h');
  const [showVolumeProfile, setShowVolumeProfile] = useState<boolean>(true);
  const [showFibLevels, setShowFibLevels] = useState<boolean>(true);
  const [featuresExpanded, setFeaturesExpanded] = useState<boolean>(false);
  const [liveBtcCandles, setLiveBtcCandles] = useState<SuperchartCandle[] | null>(null);
  const [liveBtcPrice, setLiveBtcPrice] = useState<number | null>(null);
  const [btcFeedTag, setBtcFeedTag] = useState<string>('Binance Public Feed');

  // Fetch live Binance OHLCV & subscribe to btcusdt@kline_1m WebSocket when BTCUSD is active
  useEffect(() => {
    if (activeSymbol !== 'BTCUSD') return;

    let cancelled = false;
    const binanceInterval = timeframe === '1D' ? '1d' : timeframe;

    fetch(`/api/crypto/klines?symbol=BTCUSDT&interval=${encodeURIComponent(binanceInterval)}&limit=14`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { source?: string; candles?: SuperchartCandle[] } | null) => {
        if (cancelled || !data?.candles || data.candles.length === 0) return;
        setLiveBtcCandles(data.candles);
        setLiveBtcPrice(data.candles[data.candles.length - 1].close);
        setBtcFeedTag(
          data.source === 'binance-public-rest' ? 'Binance Live REST' : 'Cached BTC Feed'
        );
      })
      .catch(() => {
        // Keep built-in fallback candles silently
      });

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
      ws.onmessage = (evt) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(evt.data) as {
            k?: { t: number; o: string; h: string; l: string; c: string; v: string };
          };
          if (!msg.k) return;
          const k = msg.k;
          const closeNum = Number(Number(k.c).toFixed(2));
          if (!Number.isFinite(closeNum) || closeNum <= 0) return;

          setLiveBtcPrice(closeNum);
          setBtcFeedTag('Binance Live WS');
          setLiveBtcCandles((prev) => {
            if (!prev || prev.length === 0) return prev;
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = {
              ...last,
              close: closeNum,
              high: Math.max(last.high, Number(Number(k.h).toFixed(2))),
              low: Math.min(last.low, Number(Number(k.l).toFixed(2))),
            };
            return next;
          });
        } catch {
          // Ignore malformed frame
        }
      };
    } catch {
      // Ignore WebSocket restricted sandbox environments
    }

    return () => {
      cancelled = true;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [activeSymbol, timeframe]);

  const activeInstrument: SuperchartInstrument = useMemo(() => {
    const base =
      SUPERCHART_INSTRUMENTS.find((item) => item.symbol === activeSymbol) ||
      SUPERCHART_INSTRUMENTS[0];
    if (activeSymbol === 'BTCUSD' && liveBtcCandles && liveBtcCandles.length > 0) {
      const firstOpen = liveBtcCandles[0].open || base.lastPrice;
      const latestClose = liveBtcPrice ?? liveBtcCandles[liveBtcCandles.length - 1].close;
      const pct = firstOpen > 0 ? Number((((latestClose - firstOpen) / firstOpen) * 100).toFixed(2)) : base.changePercent;
      return {
        ...base,
        exchange: btcFeedTag,
        lastPrice: latestClose,
        changePercent: pct,
        candles: liveBtcCandles,
      };
    }
    return base;
  }, [activeSymbol, liveBtcCandles, liveBtcPrice, btcFeedTag]);

  const secondaryInstrument: SuperchartInstrument = useMemo(() => {
    return (
      SUPERCHART_INSTRUMENTS.find((item) => item.symbol !== activeSymbol) ||
      SUPERCHART_INSTRUMENTS[2]
    );
  }, [activeSymbol]);

  const candles = activeInstrument.candles;
  const priceMin = Math.min(...candles.map((c) => c.low));
  const priceMax = Math.max(...candles.map((c) => c.high));
  const range = priceMax - priceMin || 1;

  const mapY = (val: number, h = 230, pad = 18) =>
    pad + (1 - (val - priceMin) / range) * (h - pad * 2);

  // Compute pseudo volume profile histogram bars on left margin
  const profileBuckets = [38, 62, 85, 100, 74, 48, 92, 66, 40, 28];

  return (
    <section
      id="supercharts-section"
      aria-label="Supercharged Supercharts"
      className="relative w-full bg-[#000000] text-white pt-16 pb-0 overflow-hidden"
    >
      {/* Massive Stacked Headline Matching PDF Page 2 */}
      <div className="max-w-[1280px] mx-auto px-6 text-center mb-10">
        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: 'clamp(2.4rem, 5vw, 4.35rem)', lineHeight: 1.04 }}
        >
          <span className="block text-[#868993]">Supercharged</span>
          <span className="block text-white">Supercharts</span>
        </h2>
      </div>

      {/* Multi-Pane Interactive Dark Superchart Workstation Container */}
      <div className="max-w-[1180px] mx-auto px-4 md:px-6 pb-16">
        <div className="rounded-t-2xl border border-[#2A2E39] bg-[#131722] shadow-2xl overflow-hidden">
          {/* Top Workstation Toolbar */}
          <div className="px-4 py-2.5 border-b border-[#2A2E39] bg-[#1E222D] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {SUPERCHART_INSTRUMENTS.map((inst) => (
                <button
                  key={inst.symbol}
                  type="button"
                  onClick={() => {
                    setActiveSymbol(inst.symbol);
                    onSelectSymbol?.(inst.symbol);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeSymbol === inst.symbol
                      ? 'bg-[#2962FF] text-white'
                      : 'text-[#B2B5BE] hover:bg-[#2A2E39] hover:text-white'
                  }`}
                >
                  {inst.symbol}
                </button>
              ))}

              <span className="h-4 w-px bg-[#2A2E39] mx-1 hidden sm:inline-block" />

              <div className="flex items-center gap-1" role="group" aria-label="Superchart timeframe">
                {(['15m', '1h', '4h', '1D'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                      timeframe === tf
                        ? 'bg-[#2A2E39] text-white font-semibold'
                        : 'text-[#787B86] hover:text-[#D1D4DC]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowVolumeProfile((prev) => !prev)}
                aria-pressed={showVolumeProfile}
                className={`px-2.5 py-1 rounded text-xs font-medium inline-flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  showVolumeProfile
                    ? 'border-[#2962FF]/60 bg-[#2962FF]/15 text-[#90CAF9]'
                    : 'border-[#2A2E39] text-[#787B86] hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Volume Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFibLevels((prev) => !prev)}
                aria-pressed={showFibLevels}
                className={`px-2.5 py-1 rounded text-xs font-medium inline-flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  showFibLevels
                    ? 'border-[#F59E0B]/60 bg-[#F59E0B]/15 text-[#FCD34D]'
                    : 'border-[#2A2E39] text-[#787B86] hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Fib Levels</span>
              </button>
            </div>
          </div>

          {/* Split Chart Grid: Top Main Chart + Bottom Secondary Dual Panes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#2A2E39]">
            {/* Left Narrow Drawing Tools Rail */}
            <div className="hidden lg:flex lg:col-span-1 border-r border-[#2A2E39] py-4 flex-col items-center gap-4 text-[#787B86]">
              {['┼', '╱', '☰', '✎', 'T', '☺', '⌖'].map((glyph, idx) => (
                <span
                  key={idx}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs ${
                    idx === 0 ? 'bg-[#2962FF]/20 text-[#2962FF]' : 'hover:bg-[#2A2E39]'
                  }`}
                >
                  {glyph}
                </span>
              ))}
            </div>

            {/* Primary Interactive Candlestick + Volume Profile Chart */}
            <div className="lg:col-span-11 p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <span className="font-semibold text-white">{activeInstrument.title}</span>
                  <span className="text-[#787B86]">· {activeInstrument.exchange} · {timeframe}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                  <span className="text-white font-semibold">
                    {activeInstrument.lastPrice.toLocaleString()}
                  </span>
                  <span
                    className={
                      activeInstrument.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                    }
                  >
                    {activeInstrument.changePercent >= 0 ? '+' : '−'}
                    {Math.abs(activeInstrument.changePercent).toFixed(2)}%
                  </span>
                </div>
              </div>

              <svg
                viewBox="0 0 880 245"
                className="w-full h-[230px] md:h-[260px] select-none"
                role="img"
                aria-label={`${activeInstrument.symbol} multi-pane candlestick superchart`}
              >
                {/* Horizontal Subtle Grid Lines */}
                {[45, 95, 145, 195].map((yPos) => (
                  <line
                    key={yPos}
                    x1="0"
                    y1={yPos}
                    x2="825"
                    y2={yPos}
                    stroke="#2A2E39"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Volume Profile Horizontal Histogram (TPO Bars) */}
                {showVolumeProfile &&
                  profileBuckets.map((pct, idx) => {
                    const barY = 20 + idx * 20;
                    const barW = (pct / 100) * 145;
                    const isPoc = idx === 3;
                    return (
                      <rect
                        key={idx}
                        x="14"
                        y={barY}
                        width={barW}
                        height="13"
                        rx="2"
                        fill={isPoc ? '#F59E0B' : idx < 5 ? '#2962FF' : '#089981'}
                        opacity={isPoc ? 0.72 : 0.36}
                      />
                    );
                  })}

                {/* Fibonacci Retracement Reference Lines */}
                {showFibLevels && (
                  <g>
                    <line x1="170" y1="68" x2="815" y2="68" stroke="#F59E0B" strokeOpacity="0.45" strokeDasharray="5 4" />
                    <text x="174" y="63" fill="#FCD34D" fontSize="10" fontFamily="monospace">
                      0.618 (VAH)
                    </text>
                    <line x1="170" y1="128" x2="815" y2="128" stroke="#2962FF" strokeOpacity="0.55" strokeDasharray="5 4" />
                    <text x="174" y="123" fill="#90CAF9" fontSize="10" fontFamily="monospace">
                      0.500 (POC)
                    </text>
                  </g>
                )}

                {/* Candlesticks */}
                {candles.map((c, idx) => {
                  const slotW = 610 / candles.length;
                  const cx = 195 + idx * slotW + slotW * 0.5;
                  const yHigh = mapY(c.high);
                  const yLow = mapY(c.low);
                  const yOpen = mapY(c.open);
                  const yClose = mapY(c.close);
                  const isUp = c.close >= c.open;
                  const bodyTop = Math.min(yOpen, yClose);
                  const bodyH = Math.max(4, Math.abs(yClose - yOpen));
                  const fill = isUp ? '#089981' : '#F23645';

                  return (
                    <g key={c.time}>
                      <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={fill} strokeWidth="2" />
                      <rect
                        x={cx - 10}
                        y={bodyTop}
                        width="20"
                        height={bodyH}
                        rx="1.5"
                        fill={fill}
                      />
                    </g>
                  );
                })}

                {/* Right Price Axis Readouts */}
                {[
                  { y: 24, val: priceMax },
                  { y: 120, val: (priceMax + priceMin) / 2 },
                  { y: 215, val: priceMin },
                ].map((tick, i) => (
                  <text
                    key={i}
                    x="832"
                    y={tick.y}
                    fill="#787B86"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {tick.val.toFixed(activeInstrument.lastPrice < 10 ? 4 : 1)}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Bottom Split Sub-Charts Row Matching PDF Page 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#2A2E39] bg-[#131722]">
            <div className="p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-[#D1D4DC]">
                  {secondaryInstrument.symbol} · 15m · {secondaryInstrument.exchange}
                </span>
                <span className="font-mono text-[#089981] tabular-nums">
                  {secondaryInstrument.lastPrice.toLocaleString()}
                </span>
              </div>
              <svg viewBox="0 0 400 72" className="w-full h-16">
                <path
                  d="M 0,58 L 48,46 L 96,52 L 144,34 L 192,40 L 240,22 L 288,28 L 336,14 L 400,19"
                  fill="none"
                  stroke="#2962FF"
                  strokeWidth="2"
                />
                <path
                  d="M 0,58 L 48,46 L 96,52 L 144,34 L 192,40 L 240,22 L 288,28 L 336,14 L 400,19 L 400,72 L 0,72 Z"
                  fill="rgba(41, 98, 255, 0.16)"
                />
              </svg>
            </div>

            <div className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-[#D1D4DC]">Multi-Pane Oscillator &amp; Breadth</span>
                <span className="font-mono text-[#F23645] tabular-nums">RSI 58.4</span>
              </div>
              <svg viewBox="0 0 400 72" className="w-full h-16">
                <path
                  d="M 0,44 L 45,30 L 90,48 L 135,24 L 180,38 L 225,18 L 270,32 L 315,20 L 360,36 L 400,26"
                  fill="none"
                  stroke="#089981"
                  strokeWidth="2"
                />
                <line x1="0" y1="36" x2="400" y2="36" stroke="#2A2E39" strokeDasharray="3 3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Centered CTA Under Chart Matching PDF Page 2 */}
        <div className="mt-8 flex flex-col items-center text-center">
          <button
            type="button"
            onClick={() => setFeaturesExpanded((prev) => !prev)}
            className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-left transition-colors cursor-pointer"
          >
            <Monitor className="w-5 h-5 text-[#2962FF] shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white inline-flex items-center gap-1">
                <span>Explore all features</span>
                <ChevronRight className="w-4 h-4" />
              </div>
              <p className="text-xs text-[#9598A1]">For every level of analysis</p>
            </div>
          </button>

          {featuresExpanded && (
            <div className="mt-4 max-w-2xl w-full rounded-xl bg-[#131722] border border-[#2A2E39] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs">
              <div>
                <div className="font-semibold text-white mb-1">110+ Drawing Tools</div>
                <p className="text-[#9598A1]">Fibonacci fans, Pitchforks, Gann boxes, and anchored VWAP directly in browser.</p>
              </div>
              <div>
                <div className="font-semibold text-white mb-1">16+ Chart Types</div>
                <p className="text-[#9598A1]">TPO Volume Profiles, Renko, Heikin Ashi, Kagi, and baseline spread overlays.</p>
              </div>
              <div>
                <div className="font-semibold text-white mb-1">Pine Script Engine</div>
                <p className="text-[#9598A1]">Run 100,000+ community scripts and custom backtested trading strategies.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
