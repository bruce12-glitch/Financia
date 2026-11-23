import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BullionCandle,
  computeBullionSummary,
  computeRangePositionPct,
  computeYieldCurveAnalytics,
  formatDirectPercent,
  TreasuryTenorPoint,
} from './liveLandingEngine';

interface LiveMacroBullionSectionProps {
  onOpenWorkspace: (sectionId: string) => void;
  onInspectSymbol?: (symbol: string) => void;
}

interface TreasuryResponse {
  source?: string;
  usTreasury?: {
    asOfDate?: string;
    tenors?: TreasuryTenorPoint[];
  };
}

interface GoldKlinesResponse {
  source?: string;
  symbol?: string;
  candles?: BullionCandle[];
}

export const LiveMacroBullionSection: React.FC<LiveMacroBullionSectionProps> = ({
  onOpenWorkspace,
  onInspectSymbol,
}) => {
  const [treasuryTenors, setTreasuryTenors] = useState<TreasuryTenorPoint[]>([]);
  const [treasuryDate, setTreasuryDate] = useState<string>('');
  const [treasurySource, setTreasurySource] = useState<string>('');
  const [goldCandles, setGoldCandles] = useState<BullionCandle[]>([]);
  const [goldSource, setGoldSource] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMacroAndBullion() {
      setLoading(true);
      try {
        const [treasuryRes, goldRes] = await Promise.all([
          fetch('/api/macro/treasury-rates', { signal: controller.signal }),
          fetch('/api/gold/klines?symbol=PAXGUSDT&interval=1d&limit=30', {
            signal: controller.signal,
          }),
        ]);

        if (treasuryRes.ok) {
          const tData = (await treasuryRes.json()) as TreasuryResponse;
          if (Array.isArray(tData.usTreasury?.tenors)) {
            setTreasuryTenors(tData.usTreasury.tenors);
          }
          if (tData.usTreasury?.asOfDate) setTreasuryDate(tData.usTreasury.asOfDate);
          if (tData.source) setTreasurySource(tData.source);
        }

        if (goldRes.ok) {
          const gData = (await goldRes.json()) as GoldKlinesResponse;
          if (Array.isArray(gData.candles)) {
            setGoldCandles(gData.candles);
          }
          if (gData.source) setGoldSource(gData.source);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
      } finally {
        setLoading(false);
      }
    }

    void loadMacroAndBullion();
    return () => controller.abort();
  }, []);

  const curveStats = useMemo(
    () => computeYieldCurveAnalytics(treasuryTenors),
    [treasuryTenors]
  );

  const keyTenors = useMemo(() => {
    const pick = ['3M', '2Y', '10Y', '30Y'];
    return pick.map((label) => {
      const found = treasuryTenors.find((t) => t.label.toUpperCase() === label);
      return {
        label,
        yieldPct: found && Number.isFinite(found.yieldPct) ? found.yieldPct : null,
      };
    });
  }, [treasuryTenors]);

  const bullionSummary = useMemo(
    () => computeBullionSummary(goldCandles),
    [goldCandles]
  );

  const bullionRangePct = useMemo(
    () =>
      bullionSummary
        ? computeRangePositionPct(
            bullionSummary.latestClose,
            bullionSummary.periodLow,
            bullionSummary.periodHigh
          )
        : 50,
    [bullionSummary]
  );

  const goldSeries = useMemo(
    () =>
      goldCandles.map((candle, index) => ({
        day: `D${index + 1}`,
        close: Number(candle.close.toFixed(2)),
        high: Number(candle.high.toFixed(2)),
        low: Number(candle.low.toFixed(2)),
      })),
    [goldCandles]
  );

  return (
    <section
      id="macro-bullion-desk"
      aria-label="Live Sovereign Treasury Yield Curve and Physical-Backed Spot Gold"
      className="relative w-full bg-[#050914] text-white border-b border-white/[0.08] py-24 px-4 sm:px-6 md:px-10 overflow-hidden"
    >
      {/* Subtle Architectural Blueprint Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 obsidian-grid-bg opacity-65"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[340px]"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 0%, rgba(37, 99, 235, 0.14) 0%, transparent 72%)',
        }}
      />

      <div className="relative z-10 max-w-[1240px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12">
          <div className="lg:col-span-7">
            <div className="text-[12.5px] font-semibold text-[#38bdf8] mb-2.5">
              02. Fixed Income &amp; Physical Bullion Telemetry
            </div>
            <h2 className="type-display-xl text-white max-w-2xl">
              Live sovereign yields and physical-backed spot gold in real time.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[15.5px] font-normal leading-[1.6] text-[#94a3b8]">
              Anchor equity and mutual fund allocation against real U.S. Treasury term-structure spreads and 30-day physical-backed gold OHLCV feeds.
            </p>
          </div>
        </div>

        {/* High-Contrast Dual Obsidian Telemetry Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Panel (7 cols): U.S. Treasury Term Structure */}
          <div className="lg:col-span-7 rounded-[14px] obsidian-panel p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-white/[0.09]">
                <div>
                  <div className="text-[12px] font-mono text-[#93c5fd]">
                    U.S. Treasury Term Structure · {treasuryDate || 'Latest Close'}
                  </div>
                  <h3 className="font-display text-[21px] font-semibold text-white mt-1">
                    Sovereign Yield Curve (1M to 30Y)
                  </h3>
                </div>

                <div className="flex items-center gap-6 font-mono tabular-nums">
                  <div>
                    <div className="text-[11px] font-sans text-[#94a3b8]">2s10s Spread</div>
                    <div
                      className={`text-[18px] font-semibold mt-0.5 ${
                        (curveStats.spread2s10sBps ?? 0) >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'
                      }`}
                    >
                      {curveStats.spread2s10sBps !== null
                        ? `${curveStats.spread2s10sBps > 0 ? '+' : ''}${curveStats.spread2s10sBps} bps`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-sans text-[#94a3b8]">Curve Regime</div>
                    <div className="text-[16px] font-semibold text-[#e0f2fe] mt-1">
                      {curveStats.regime}
                    </div>
                  </div>
                </div>
              </div>

              {/* Crisp 4-Tenor Key Benchmarks Strip */}
              <div className="grid grid-cols-4 gap-3 mt-5 pb-5 border-b border-white/[0.07]">
                {keyTenors.map((t) => (
                  <div key={t.label} className="min-w-0">
                    <div className="text-[11px] font-mono text-[#94a3b8]">US {t.label}</div>
                    <div className="text-[17px] font-mono font-semibold text-white tabular-nums mt-0.5">
                      {t.yieldPct !== null ? `${t.yieldPct.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-[235px] w-full mt-5">
                {loading || treasuryTenors.length === 0 ? (
                  <div className="w-full h-full rounded-[8px] bg-white/[0.03] flex items-center justify-center text-[13px] text-[#94a3b8]">
                    Loading live Treasury yield curve...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={treasuryTenors}
                      margin={{ top: 12, right: 16, left: -8, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="financiaTreasuryGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="rgba(148,163,184,0.12)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif" }}
                        axisLine={{ stroke: 'rgba(148,163,184,0.18)' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#040711',
                          border: '1px solid rgba(56,189,248,0.35)',
                          borderRadius: '10px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontFamily: "sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif",
                        }}
                        formatter={(v) => [
                          typeof v === 'number' ? `${v.toFixed(2)}%` : String(v ?? ''),
                          'Yield',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="yieldPct"
                        stroke="#38bdf8"
                        strokeWidth={2.4}
                        fill="url(#financiaTreasuryGrad)"
                        dot={{ r: 3.5, fill: '#040711', stroke: '#38bdf8', strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.09] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#94a3b8]">
              <span className="font-mono tabular-nums">
                3M–10Y:{' '}
                <strong className="font-semibold text-white">
                  {curveStats.spread3m10yBps !== null
                    ? `${curveStats.spread3m10yBps > 0 ? '+' : ''}${curveStats.spread3m10yBps} bps`
                    : '—'}
                </strong>
                {treasurySource ? ' · U.S. Treasury (FMP)' : ''}
              </span>
              <button
                type="button"
                onClick={() => onOpenWorkspace('economy-section')}
                className="font-medium text-[#38bdf8] hover:text-white inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Open Debt &amp; Macro Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Panel (5 cols): Physical-Backed Spot Gold (PAXG/USDT) */}
          <div className="lg:col-span-5 rounded-[14px] obsidian-panel p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 pb-5 border-b border-white/[0.09]">
                <div>
                  <div className="text-[12px] font-mono text-[#f59e0b]">
                    PAXG / USDT · 30D Spot Bullion
                  </div>
                  <h3 className="font-display text-[21px] font-semibold text-white mt-1">
                    Physical-Backed Gold
                  </h3>
                </div>

                {bullionSummary && (
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-[22px] font-semibold text-white">
                      $
                      {bullionSummary.latestClose.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div
                      className={`text-[12px] font-semibold mt-0.5 ${
                        bullionSummary.periodChangePct >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'
                      }`}
                    >
                      {bullionSummary.periodChangePct >= 0 ? '▲' : '▼'}{' '}
                      {formatDirectPercent(bullionSummary.periodChangePct)} (30D)
                    </div>
                  </div>
                )}
              </div>

              <div className="h-[205px] w-full mt-5">
                {loading || goldSeries.length === 0 ? (
                  <div className="w-full h-full rounded-[8px] bg-white/[0.03] flex items-center justify-center text-[13px] text-[#94a3b8]">
                    Loading live spot gold candles...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={goldSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="financiaGoldObsidianGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="rgba(148,163,184,0.1)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis dataKey="day" hide />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `$${Math.round(v)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#040711',
                          border: '1px solid rgba(245,158,11,0.35)',
                          borderRadius: '10px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontFamily: "sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif",
                        }}
                        formatter={(v) => [
                          typeof v === 'number'
                            ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : String(v ?? ''),
                          'Daily Close',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke="#f59e0b"
                        strokeWidth={2.25}
                        fill="url(#financiaGoldObsidianGrad)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* 30-Day Trading Range Position Meter (Computed strictly from real OHLCV candles) */}
              {bullionSummary && (
                <div className="mt-5 pt-4 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between text-[11.5px] text-[#94a3b8] mb-2">
                    <span>30D Spot Range Position</span>
                    <span className="font-mono text-white tabular-nums">
                      {bullionRangePct.toFixed(0)}% of range
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.1] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#d97706] to-[#fbbf24]"
                      style={{ width: `${bullionRangePct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3 text-[12px] font-mono tabular-nums">
                    <div>
                      <span className="text-[#94a3b8] font-sans text-[11px]">30D Low</span>
                      <div className="text-[14px] font-semibold text-white mt-0.5">
                        ${bullionSummary.periodLow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[#94a3b8] font-sans text-[11px]">30D High</span>
                      <div className="text-[14px] font-semibold text-white mt-0.5">
                        ${bullionSummary.periodHigh.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.09] flex items-center justify-between gap-2 text-[12px]">
              <span className="text-[#94a3b8]">
                {goldSource ? 'Binance Spot PAXG/USDT' : 'Spot Gold Feed'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onInspectSymbol) onInspectSymbol('GOLDBEES');
                  else onOpenWorkspace('crypto-section');
                }}
                className="font-medium text-[#f59e0b] hover:text-[#fbbf24] inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Inspect Gold ETFs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Clean Editorial Numbered Capabilities Architecture (Zero Icon-Cliché Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-14 pt-12 border-t border-white/[0.09]">
          <div>
            <div className="font-mono text-[12px] text-[#38bdf8] mb-2">01.</div>
            <h3 className="font-display text-[17px] font-semibold text-white">
              Technical Overlays &amp; Multi-Fund Compare
            </h3>
            <p className="text-[14px] font-normal leading-[1.6] text-[#94a3b8] mt-2">
              Plot SMA, Bollinger Bands, and RSI indicators across ETFs, gold funds, and mutual funds, or overlay multiple symbols on a normalized base-100 scale.
            </p>
          </div>

          <div>
            <div className="font-mono text-[12px] text-[#38bdf8] mb-2">02.</div>
            <h3 className="font-display text-[17px] font-semibold text-white">
              Fast Fund, ETF &amp; ISIN Lookup
            </h3>
            <p className="text-[14px] font-normal leading-[1.6] text-[#94a3b8] mt-2">
              Search by fund name, scheme code, ticker, or ISIN to pull daily NAVs, top holdings, expense ratios, and sector breakdowns immediately.
            </p>
          </div>

          <div>
            <div className="font-mono text-[12px] text-[#38bdf8] mb-2">03.</div>
            <h3 className="font-display text-[17px] font-semibold text-white">
              Global Market Sessions &amp; Price Alerts
            </h3>
            <p className="text-[14px] font-normal leading-[1.6] text-[#94a3b8] mt-2">
              Follow major equity and bullion exchanges across time zones and set price alerts that stay synced to your account.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
