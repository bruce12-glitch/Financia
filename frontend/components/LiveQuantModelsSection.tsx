import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  buildSmoothSeriesPaths,
  computeSifDispersionSummary,
} from '../utils/liveWorkspaceAnalytics';
import {
  computeBullionSummary,
  computePeerSpreadPct,
  computeYieldCurveAnalytics,
  MfnavFundPayload,
  TreasuryTenorPoint,
} from '../../landing/liveLandingEngine';

interface LiveQuantModelsSectionProps {
  onJumpToAnalysis?: (ticker: string) => void;
}

interface AlphaRow {
  code: number;
  label: string;
  ticker: string;
  fundCagr3yPct: number;
  peerMedian3yPct: number;
  alphaSpreadPct: number;
}

interface SifSchemeRow {
  scheme_code: number;
  scheme_name: string;
  latest_nav: number;
  latest_date: string;
  observation_count: number;
  total_return_pct?: number | null;
}

const ALPHA_MODEL_SCHEMES = [
  { code: 122639, label: 'Parag Parikh Flexi', ticker: 'PPFAS' },
  { code: 118989, label: 'HDFC Mid-Cap Dir.', ticker: 'HDFCMID' },
  { code: 119788, label: 'SBI Gold Direct', ticker: 'GOLDBEES' },
  { code: 119707, label: 'SBI Magnum Gilt', ticker: 'SBIGILT' },
];

export const LiveQuantModelsSection: React.FC<LiveQuantModelsSectionProps> = ({
  onJumpToAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<'models' | 'sif'>('models');
  const [goldCloses, setGoldCloses] = useState<number[]>([]);
  const [goldCandles, setGoldCandles] = useState<
    Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>
  >([]);
  const [tenors, setTenors] = useState<TreasuryTenorPoint[]>([]);
  const [treasuryDate, setTreasuryDate] = useState<string>('');
  const [alphaRows, setAlphaRows] = useState<AlphaRow[]>([]);
  const [sifRows, setSifRows] = useState<SifSchemeRow[]>([]);
  const [sifTotals, setSifTotals] = useState<{ schemes: number; rows: number }>({
    schemes: 0,
    rows: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuantitativeModels() {
      setLoading(true);
      try {
        const [goldRes, treasuryRes, sifRes, ...fundResponses] = await Promise.all([
          fetch('/api/gold/klines?symbol=PAXGUSDT&interval=1d&limit=30', {
            signal: controller.signal,
          }),
          fetch('/api/macro/treasury-rates', { signal: controller.signal }),
          fetch('/api/nav-master/schemes?limit=30', { signal: controller.signal }),
          ...ALPHA_MODEL_SCHEMES.map((s) =>
            fetch(`/api/mfnav/fund/${s.code}`, { signal: controller.signal })
          ),
        ]);

        if (goldRes.ok) {
          const gJson = (await goldRes.json()) as {
            candles?: Array<{
              time: string;
              open: number;
              high: number;
              low: number;
              close: number;
              volume: number;
            }>;
          };
          if (Array.isArray(gJson.candles)) {
            setGoldCandles(gJson.candles);
            setGoldCloses(
              gJson.candles
                .map((c) => Number(c.close))
                .filter((v) => Number.isFinite(v) && v > 0)
            );
          }
        }

        if (treasuryRes.ok) {
          const tJson = (await treasuryRes.json()) as {
            usTreasury?: { asOfDate?: string; tenors?: TreasuryTenorPoint[] };
          };
          if (Array.isArray(tJson.usTreasury?.tenors)) {
            setTenors(tJson.usTreasury.tenors);
          }
          if (tJson.usTreasury?.asOfDate) {
            setTreasuryDate(tJson.usTreasury.asOfDate);
          }
        }

        if (sifRes.ok) {
          const sJson = (await sifRes.json()) as {
            totalSchemes?: number;
            totalRows?: number;
            schemes?: SifSchemeRow[];
          };
          setSifTotals({
            schemes: sJson.totalSchemes || 0,
            rows: sJson.totalRows || 0,
          });
          if (Array.isArray(sJson.schemes) && sJson.schemes.length > 0) {
            // Hydrate exact ITD return for top 8 SQLite SIF schemes
            const topSubset = sJson.schemes.slice(0, 8);
            const detailResults = await Promise.all(
              topSubset.map(async (item) => {
                try {
                  const dRes = await fetch(`/api/nav-master/fund/${item.scheme_code}`, {
                    signal: controller.signal,
                  });
                  if (!dRes.ok) return item;
                  const dJson = (await dRes.json()) as {
                    payload?: { total_return_pct?: number | null };
                  };
                  return {
                    ...item,
                    total_return_pct: dJson.payload?.total_return_pct ?? null,
                  };
                } catch {
                  return item;
                }
              })
            );
            setSifRows(detailResults);
          }
        }

        const parsedAlpha: AlphaRow[] = [];
        for (let i = 0; i < fundResponses.length; i++) {
          const res = fundResponses[i];
          const meta = ALPHA_MODEL_SCHEMES[i];
          if (!res.ok) continue;
          const json = (await res.json()) as { payload?: MfnavFundPayload };
          const p = json.payload;
          const fundDec = p?.daily_metrics?.cagr_3y ?? null;
          const medianDec = p?.category_metrics?.metrics?.cagr_3y?.median ?? null;
          const spreadPct = computePeerSpreadPct(fundDec, medianDec);
          if (
            typeof fundDec === 'number' &&
            typeof medianDec === 'number' &&
            spreadPct !== null
          ) {
            parsedAlpha.push({
              code: meta.code,
              label: meta.label,
              ticker: meta.ticker,
              fundCagr3yPct: Number((fundDec * 100).toFixed(2)),
              peerMedian3yPct: Number((medianDec * 100).toFixed(2)),
              alphaSpreadPct: spreadPct,
            });
          }
        }
        setAlphaRows(parsedAlpha);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
      } finally {
        setLoading(false);
      }
    }

    void loadQuantitativeModels();
    return () => controller.abort();
  }, []);

  const curveStats = useMemo(() => computeYieldCurveAnalytics(tenors), [tenors]);
  const bullionSummary = useMemo(() => computeBullionSummary(goldCandles), [goldCandles]);
  const goldPath = useMemo(() => buildSmoothSeriesPaths(goldCloses, 370, 128, 8, 14), [goldCloses]);
  const yield10Y = useMemo(
    () => tenors.find((t) => t.label === '10Y')?.yieldPct ?? null,
    [tenors]
  );

  const sifSummary = useMemo(
    () =>
      computeSifDispersionSummary(
        sifRows.map((r) => ({
          scheme_code: String(r.scheme_code),
          scheme_name: r.scheme_name,
          latest_nav: r.latest_nav,
          window_return_pct: typeof r.total_return_pct === 'number' ? r.total_return_pct : undefined,
        }))
      ),
    [sifRows]
  );

  const maxAlphaAbs = useMemo(() => {
    if (alphaRows.length === 0) return 5;
    return Math.max(...alphaRows.map((r) => Math.abs(r.alphaSpreadPct)), 2);
  }, [alphaRows]);

  return (
    <section
      aria-label="Live Quantitative Models and Cross-Asset Telemetry"
      data-testid="live-quant-models-section"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#0f172a] inline-flex items-center gap-1 tracking-tight">
            <span>Quantitative models &amp; live signals</span>
            <ChevronRight className="w-5 h-5 text-[#2563eb]" />
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Real-time cross-asset spread, AMFI peer-median alpha, and SEBI SIF long-short dispersion computed from live APIs
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Quantitative model views"
          className="inline-flex items-center p-1 rounded-[10px] bg-[#e2e8f0]/60 border border-[#cbd5e1]/60 shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'models'}
            onClick={() => setActiveTab('models')}
            className={`px-3.5 py-1.5 rounded-[7px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'models'
                ? 'bg-[#050914] text-white'
                : 'text-[#475569] hover:text-[#0f172a]'
            }`}
          >
            Cross-Asset Signals
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sif'}
            onClick={() => setActiveTab('sif')}
            className={`px-3.5 py-1.5 rounded-[7px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'sif'
                ? 'bg-[#050914] text-white'
                : 'text-[#475569] hover:text-[#0f172a]'
            }`}
          >
            SQLite SIF Dispersion ({sifTotals.schemes || 25})
          </button>
        </div>
      </div>

      {activeTab === 'models' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model Card 1: Sovereign Yield Curve vs. Physical Spot Gold */}
          <article className="rounded-[14px] bg-white border border-[#e2e8f0] shadow-[0_8px_24px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
            <div className="bg-[#050914] px-4 pt-3.5 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#38bdf8] font-bold">MODEL 01</span>
                  <span className="text-white/25">·</span>
                  <span className="text-[#cbd5e1]">PAXG/USDT vs US10Y</span>
                </div>
                <span className="text-[#f59e0b] font-semibold tabular-nums">
                  {bullionSummary
                    ? `$${bullionSummary.latestClose.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : 'Loading...'}
                </span>
              </div>

              <svg
                viewBox="0 0 432 136"
                className="w-full h-[132px]"
                role="img"
                aria-label="Live physical gold trajectory against US 10Y sovereign yield"
              >
                <defs>
                  <linearGradient id="quant-gold-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <line
                  x1="8"
                  y1="30"
                  x2="372"
                  y2="30"
                  stroke="rgba(148,163,184,0.14)"
                  strokeDasharray="3 3"
                />
                <line
                  x1="8"
                  y1="72"
                  x2="372"
                  y2="72"
                  stroke="rgba(148,163,184,0.14)"
                  strokeDasharray="3 3"
                />
                <line
                  x1="8"
                  y1="114"
                  x2="372"
                  y2="114"
                  stroke="rgba(148,163,184,0.14)"
                  strokeDasharray="3 3"
                />

                {goldPath ? (
                  <>
                    <path d={goldPath.areaPath} fill="url(#quant-gold-grad)" />
                    <path
                      d={goldPath.linePath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx={goldPath.lastX}
                      cy={goldPath.lastY}
                      r="3.2"
                      fill="#f59e0b"
                      stroke="#050914"
                      strokeWidth="1.4"
                    />
                    <text
                      x="378"
                      y="24"
                      fill="#94a3b8"
                      fontSize="9.5"
                      fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                    >
                      ${goldPath.max.toFixed(0)}
                    </text>
                    <text
                      x="378"
                      y="74"
                      fill="#38bdf8"
                      fontSize="9.5"
                      fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                    >
                      {yield10Y !== null ? `${yield10Y.toFixed(2)}%` : '10Y'}
                    </text>
                    <text
                      x="378"
                      y="118"
                      fill="#94a3b8"
                      fontSize="9.5"
                      fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                    >
                      ${goldPath.min.toFixed(0)}
                    </text>
                  </>
                ) : (
                  <text
                    x="200"
                    y="72"
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                  >
                    {loading ? 'Loading live PAXG/USDT & Treasury feed...' : 'Live feed standby'}
                  </text>
                )}
              </svg>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-[15.5px] font-display font-bold text-[#0f172a] mb-1">
                  Sovereign Yield Curve &amp; Physical Bullion Overlay
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed mb-3.5">
                  Pairs real-time 30-day LBMA vaulted spot gold (PAXG/USDT) against the live U.S. 10Y benchmark and 2s10s slope to gauge macro real-rate pressure.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#f1f5f9] text-[11px] font-mono tabular-nums">
                <div>
                  <div className="text-[#64748b] font-sans">US 10Y Yield</div>
                  <div className="text-[#0f172a] font-bold mt-0.5">
                    {yield10Y !== null ? `${yield10Y.toFixed(2)}%` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[#64748b] font-sans">2s10s Spread</div>
                  <div
                    className={`font-bold mt-0.5 ${
                      (curveStats.spread2s10sBps ?? 0) >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                    }`}
                  >
                    {curveStats.spread2s10sBps !== null
                      ? `${curveStats.spread2s10sBps > 0 ? '+' : ''}${curveStats.spread2s10sBps} bps`
                      : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#64748b] font-sans">Gold 30D Ret</div>
                  <div
                    className={`font-bold mt-0.5 ${
                      (bullionSummary?.periodChangePct ?? 0) >= 0
                        ? 'text-[#059669]'
                        : 'text-[#dc2626]'
                    }`}
                  >
                    {bullionSummary
                      ? `${bullionSummary.periodChangePct >= 0 ? '+' : ''}${bullionSummary.periodChangePct.toFixed(2)}%`
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Model Card 2: AMFI Direct 3Y Alpha vs Category Peer Median */}
          <article className="rounded-[14px] bg-white border border-[#e2e8f0] shadow-[0_8px_24px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
            <div className="bg-[#050914] px-4 pt-3.5 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center justify-between text-[11px] font-mono mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#38bdf8] font-bold">MODEL 02</span>
                  <span className="text-white/25">·</span>
                  <span className="text-[#cbd5e1]">AMFI 3Y ALPHA VS PEER MEDIAN</span>
                </div>
                <span className="text-[#94a3b8]">{treasuryDate || 'Live AMFI'}</span>
              </div>

              <div className="space-y-2.5 min-h-[124px] flex flex-col justify-center">
                {alphaRows.length > 0 ? (
                  alphaRows.map((row) => {
                    const isPos = row.alphaSpreadPct >= 0;
                    const barPct = Math.max(
                      4,
                      Math.min(100, Math.round((Math.abs(row.alphaSpreadPct) / maxAlphaAbs) * 100))
                    );
                    return (
                      <button
                        key={row.code}
                        type="button"
                        onClick={() => onJumpToAnalysis?.(row.ticker)}
                        className="w-full grid grid-cols-[148px_1fr_64px] items-center gap-3 text-left group cursor-pointer"
                      >
                        <span className="text-[11px] font-mono text-[#e2e8f0] group-hover:text-[#38bdf8] whitespace-nowrap transition-colors">
                          {row.label}
                        </span>
                        <div className="h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isPos
                                ? 'bg-gradient-to-r from-[#059669] to-[#34d399]'
                                : 'bg-gradient-to-r from-[#dc2626] to-[#fb7185]'
                            }`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span
                          className={`text-[11px] font-mono font-bold text-right tabular-nums ${
                            isPos ? 'text-[#34d399]' : 'text-[#fb7185]'
                          }`}
                        >
                          {isPos ? '+' : ''}
                          {row.alphaSpreadPct.toFixed(2)}%
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center text-xs font-mono text-[#64748b] py-6">
                    {loading ? 'Computing live AMFI peer-median spreads...' : 'Peer spread standby'}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-[15.5px] font-display font-bold text-[#0f172a] mb-1">
                  AMFI Direct 3Y Excess Alpha vs. Category Median
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed mb-3.5">
                  Measures each flagship Direct Growth scheme&apos;s trailing 3-year annualized CAGR minus its live AMFI sub-category peer median.
                </p>
              </div>

              <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] font-mono text-[#64748b]">
                <span className="text-[#0f172a] font-semibold">AMFI / mfnav.in · Live Peer Audit</span>
                <span>Click any row to inspect ›</span>
              </div>
            </div>
          </article>
        </div>
      ) : (
        /* SQLite nav_master SEBI SIF Long-Short Dispersion Panel */
        <div className="rounded-[14px] bg-white border border-[#e2e8f0] shadow-[0_8px_24px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="bg-[#050914] text-white px-5 py-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono text-[#38bdf8] uppercase tracking-wider">
                SQLite nav_master · {sifTotals.schemes || 25} SEBI SIF Schemes ·{' '}
                {(sifTotals.rows || 4990).toLocaleString()} Daily NAV Rows
              </div>
              <h3 className="text-base font-display font-semibold text-white mt-0.5">
                SEBI Specialized Investment Fund (SIF) Inception-to-Date Dispersion
              </h3>
            </div>
            <div className="flex items-center gap-5 text-xs font-mono tabular-nums">
              <div>
                <span className="text-[#94a3b8] block text-[10px]">Sampled Median</span>
                <span className="text-[#34d399] font-bold">
                  {sifSummary.medianReturnPct !== null
                    ? `${sifSummary.medianReturnPct >= 0 ? '+' : ''}${sifSummary.medianReturnPct.toFixed(2)}%`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-[#94a3b8] block text-[10px]">Positive Breadth</span>
                <span className="text-white font-bold">
                  {sifSummary.positiveCount}/{sifSummary.count}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {sifRows.map((row) => {
              const ret = typeof row.total_return_pct === 'number' ? row.total_return_pct : null;
              const isPos = (ret ?? 0) >= 0;
              return (
                <button
                  key={row.scheme_code}
                  type="button"
                  onClick={() => onJumpToAnalysis?.(String(row.scheme_code))}
                  className="p-3.5 rounded-[10px] bg-[#f8fafc] hover:bg-[#eff6ff] border border-[#e2e8f0] hover:border-[#2563eb]/45 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#0f172a] truncate">
                      {row.scheme_name}
                    </div>
                    <div className="text-[11px] font-mono text-[#64748b] mt-0.5">
                      SIF #{row.scheme_code} · {row.observation_count} daily obs · {row.latest_date}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-xs font-bold text-[#0f172a]">
                      ₹{row.latest_nav.toFixed(4)}
                    </div>
                    <div
                      className={`text-[11px] font-semibold ${
                        ret === null
                          ? 'text-[#64748b]'
                          : isPos
                            ? 'text-[#059669]'
                            : 'text-[#dc2626]'
                      }`}
                    >
                      {ret !== null ? `${isPos ? '+' : ''}${ret.toFixed(2)}% ITD` : 'Live'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
