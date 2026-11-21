import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { CommunityIdeaItem } from '../types/markets';
import { buildSmoothSeriesPaths } from '../utils/liveWorkspaceAnalytics';
import {
  formatAumCrores,
  formatDecimalPercent,
  MfnavFundPayload,
} from '../../landing/liveLandingEngine';

export type ResearchBriefGroup = 'community' | 'mutual_funds' | 'gold_debt' | 'sif_macro';

interface LiveResearchBriefsGridProps {
  heading: string;
  group: ResearchBriefGroup;
  onSelectIdea?: (idea: CommunityIdeaItem) => void;
  onJumpToAnalysis?: (ticker: string) => void;
}

interface BriefSpec {
  id: string;
  symbol: string;
  sourceKind: 'amfi' | 'sqlite' | 'gold_paxg';
  code: string;
  pillar: string;
  headline: string;
  thesis: string;
}

interface LiveBriefCardData {
  spec: BriefSpec;
  latestValue: number | null;
  unitPrefix: string;
  asOfDate: string;
  dayChangePct: number | null;
  windowReturnPct: number | null;
  cagr3yText: string;
  aumOrMetaText: string;
  sourceAttribution: string;
  series: number[];
}

const BRIEF_GROUPS: Record<ResearchBriefGroup, BriefSpec[]> = {
  community: [
    {
      id: 'live-brief-ppfas',
      symbol: 'PPFAS',
      sourceKind: 'amfi',
      code: '122639',
      pillar: 'AMFI Direct Flexi Cap',
      headline: 'Parag Parikh Flexi Cap Direct — Trailing 60-Session NAV Trajectory',
      thesis:
        'Live AMFI NAV compounding vs. flexi-cap category peer medians with cash-buffer downside protection.',
    },
    {
      id: 'live-brief-paxg',
      symbol: 'PAXGUSDT',
      sourceKind: 'gold_paxg',
      code: 'PAXGUSDT',
      pillar: 'Physical Bullion Spot',
      headline: 'LBMA Physical-Backed Spot Gold (PAXG/USDT) — 30-Day Realized Curve',
      thesis:
        'Live 1-troy-ounce London Good Delivery physical gold benchmark tracking sovereign reserve demand.',
    },
  ],
  mutual_funds: [
    {
      id: 'live-mf-ppfas',
      symbol: 'PPFAS',
      sourceKind: 'amfi',
      code: '122639',
      pillar: 'AMFI Direct · 122639',
      headline: 'Parag Parikh Flexi Cap Direct Growth — Quality Compounding Curve',
      thesis:
        'Verified AMFI Direct plan NAV trajectory, 3Y annualized CAGR, and institutional AUM scale.',
    },
    {
      id: 'live-mf-hdfcmid',
      symbol: 'HDFCMID',
      sourceKind: 'amfi',
      code: '118989',
      pillar: 'AMFI Direct · 118989',
      headline: 'HDFC Mid-Cap Opportunities Direct — Mid-Cap Dispersion & Realized NAV',
      thesis:
        'Tracks live daily AMFI NAV behavior across Indian mid-cap leaders with peer-median attribution.',
    },
    {
      id: 'live-mf-nifty',
      symbol: 'NIFTYBEES',
      sourceKind: 'amfi',
      code: '120716',
      pillar: 'AMFI Index · 120716',
      headline: 'UTI Nifty 50 Index Direct — Core Large-Cap Benchmark Baseline',
      thesis:
        'Low-cost Nifty 50 index NAV baseline used to audit active direct mutual fund alpha generation.',
    },
    {
      id: 'live-mf-qsif1',
      symbol: 'QSIF1',
      sourceKind: 'sqlite',
      code: '1',
      pillar: 'SQLite SEBI SIF · #1',
      headline: 'qsif Equity Long-Short Fund Direct — SEBI SIF Daily NAV Ledger',
      thesis:
        'Direct query against the local SQLite nav_master database tracking India Specialized Investment Funds.',
    },
  ],
  gold_debt: [
    {
      id: 'live-gd-sbigold',
      symbol: 'GOLDBEES',
      sourceKind: 'amfi',
      code: '119788',
      pillar: 'AMFI Gold FoF · 119788',
      headline: 'SBI Gold Direct Growth — Domestic INR Bullion Allocation Curve',
      thesis:
        'Live INR-denominated domestic gold fund NAV capturing physical gold spot plus USD/INR currency carry.',
    },
    {
      id: 'live-gd-sbigilt',
      symbol: 'SBIGILT',
      sourceKind: 'amfi',
      code: '119707',
      pillar: 'AMFI Sovereign Gilt · 119707',
      headline: 'SBI Magnum Gilt Direct — Sovereign Duration Carry & Yield Convexity',
      thesis:
        'Tracks live Indian government securities NAV sensitivity across RBI monetary policy cycles.',
    },
  ],
  sif_macro: [
    {
      id: 'live-sm-hdfccorp',
      symbol: 'HDFCCORP',
      sourceKind: 'amfi',
      code: '118987',
      pillar: 'AMFI AAA Credit · 118987',
      headline: 'HDFC Corporate Bond Direct — High-Grade Accrual Stability Curve',
      thesis:
        'Monitors live AAA corporate credit NAV accrual with low drawdown volatility across rate regimes.',
    },
    {
      id: 'live-sm-paxg',
      symbol: 'PAXGUSDT',
      sourceKind: 'gold_paxg',
      code: 'PAXGUSDT',
      pillar: 'LBMA Physical Gold',
      headline: 'PAXG/USDT Physical Gold — USD Macro Hedge & Real-Rate Inverse Signal',
      thesis:
        'Real-time 30-day Binance PAXG/USDT spot close series anchored 1:1 to vaulted London bullion.',
    },
  ],
};

// Module-level session cache so multiple sections never duplicate network requests
const briefCache = new Map<string, Promise<LiveBriefCardData>>();

function fetchLiveBrief(spec: BriefSpec): Promise<LiveBriefCardData> {
  const existing = briefCache.get(spec.id);
  if (existing) return existing;

  const task = (async (): Promise<LiveBriefCardData> => {
    try {
      if (spec.sourceKind === 'gold_paxg') {
        const res = await fetch('/api/gold/klines?symbol=PAXGUSDT&interval=1d&limit=30');
        if (res.ok) {
          const json = (await res.json()) as {
            source?: string;
            candles?: Array<{ time?: string; close?: number }>;
          };
          const candles = Array.isArray(json.candles) ? json.candles : [];
          const closes = candles
            .map((c) => Number(c.close))
            .filter((n) => Number.isFinite(n) && n > 0);
          const latest = closes.length > 0 ? closes[closes.length - 1] : null;
          const prev = closes.length > 1 ? closes[closes.length - 2] : null;
          const first = closes.length > 1 ? closes[0] : null;
          const dayPct =
            latest && prev ? Number((((latest - prev) / prev) * 100).toFixed(2)) : null;
          const winPct =
            latest && first ? Number((((latest - first) / first) * 100).toFixed(2)) : null;
          return {
            spec,
            latestValue: latest,
            unitPrefix: '$',
            asOfDate: 'Live 24/7 Spot',
            dayChangePct: dayPct,
            windowReturnPct: winPct,
            cagr3yText: closes.length > 0 ? `${closes.length}D OHLCV` : '—',
            aumOrMetaText: '1:1 Vaulted Troy Oz',
            sourceAttribution: `${json.source || 'Binance PAXG/USDT'} · Live Spot`,
            series: closes,
          };
        }
      } else {
        const isSqlite = spec.sourceKind === 'sqlite';
        const fundUrl = isSqlite
          ? `/api/nav-master/fund/${encodeURIComponent(spec.code)}`
          : `/api/mfnav/fund/${encodeURIComponent(spec.code)}`;
        const navUrl = isSqlite
          ? `/api/nav-master/nav/${encodeURIComponent(spec.code)}?page=1&page_size=60`
          : `/api/mfnav/nav/${encodeURIComponent(spec.code)}?page=1&page_size=60`;

        const [fundRes, navRes] = await Promise.all([fetch(fundUrl), fetch(navUrl)]);
        let latestValue: number | null = null;
        let asOfDate = 'Latest NAV';
        let dayChangePct: number | null = null;
        let cagr3yText = '—';
        let aumOrMetaText = isSqlite ? 'SEBI SIF Direct' : 'AMFI Direct Plan';

        if (fundRes.ok) {
          const fJson = (await fundRes.json()) as {
            payload?: MfnavFundPayload & {
              latest_date?: string;
              day_change_pct?: number | null;
              total_return_pct?: number | null;
              observation_count?: number;
            };
          };
          const p = fJson.payload;
          if (p) {
            latestValue = typeof p.latest_nav === 'number' ? p.latest_nav : null;
            asOfDate = p.latest_nav_date || p.latest_date || 'Latest NAV';
            dayChangePct =
              typeof p.latest_day_change_pct === 'number'
                ? p.latest_day_change_pct
                : typeof p.day_change_pct === 'number'
                  ? p.day_change_pct
                  : null;
            if (isSqlite) {
              cagr3yText =
                typeof p.total_return_pct === 'number'
                  ? `${p.total_return_pct >= 0 ? '+' : ''}${p.total_return_pct.toFixed(2)}% ITD`
                  : '—';
              aumOrMetaText = p.observation_count ? `${p.observation_count} daily rows` : 'SQLite SIF';
            } else {
              cagr3yText =
                p.daily_metrics?.cagr_3y !== undefined && p.daily_metrics?.cagr_3y !== null
                  ? `${formatDecimalPercent(p.daily_metrics.cagr_3y)} 3Y`
                  : '—';
              const aum = formatAumCrores(p.average_aum_lakhs ?? null);
              if (aum !== '—') aumOrMetaText = `AUM ${aum}`;
            }
          }
        }

        let series: number[] = [];
        if (navRes.ok) {
          const nJson = (await navRes.json()) as {
            payload?: { data?: Array<{ date?: string; nav_date?: string; nav?: number | string }> };
            data?: Array<{ date?: string; nav_date?: string; nav?: number | string }>;
          };
          const rows = nJson.payload?.data || nJson.data || [];
          const sorted = rows
            .map((r) => ({
              d: String(r.nav_date || r.date || ''),
              v: Number(r.nav),
            }))
            .filter((r) => r.d && Number.isFinite(r.v) && r.v > 0)
            .sort((a, b) => a.d.localeCompare(b.d));
          series = sorted.map((r) => r.v);
        }

        const winPct =
          series.length >= 2
            ? Number((((series[series.length - 1] - series[0]) / series[0]) * 100).toFixed(2))
            : null;

        return {
          spec,
          latestValue: latestValue ?? (series.length > 0 ? series[series.length - 1] : null),
          unitPrefix: '₹',
          asOfDate,
          dayChangePct,
          windowReturnPct: winPct,
          cagr3yText,
          aumOrMetaText,
          sourceAttribution: isSqlite
            ? `SQLite nav_master · SIF #${spec.code}`
            : `AMFI / mfnav.in · Scheme ${spec.code}`,
          series,
        };
      }
    } catch {
      // Fall through cleanly
    }

    return {
      spec,
      latestValue: null,
      unitPrefix: spec.sourceKind === 'gold_paxg' ? '$' : '₹',
      asOfDate: 'Feed Unavailable',
      dayChangePct: null,
      windowReturnPct: null,
      cagr3yText: '—',
      aumOrMetaText: 'Live Feed',
      sourceAttribution: spec.pillar,
      series: [],
    };
  })();

  briefCache.set(spec.id, task);
  return task;
}

export const LiveResearchBriefsGrid: React.FC<LiveResearchBriefsGridProps> = ({
  heading,
  group,
  onSelectIdea,
  onJumpToAnalysis,
}) => {
  const specs = BRIEF_GROUPS[group];
  const [cards, setCards] = useState<LiveBriefCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(specs.map((spec) => fetchLiveBrief(spec)))
      .then((results) => {
        if (!cancelled) {
          setCards(results);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [group, specs]);

  const handleCardClick = (item: LiveBriefCardData) => {
    if (onJumpToAnalysis) {
      onJumpToAnalysis(item.spec.symbol === 'QSIF1' ? '1' : item.spec.symbol);
      return;
    }
    if (onSelectIdea) {
      onSelectIdea({
        id: item.spec.id,
        symbol: item.spec.symbol,
        category: item.spec.sourceKind === 'gold_paxg' ? 'gold' : 'mutual_funds',
        title: item.spec.headline,
        description: `${item.spec.thesis} Latest print: ${
          item.latestValue !== null ? `${item.unitPrefix}${item.latestValue.toFixed(2)}` : 'Live'
        } (${item.sourceAttribution}).`,
        author: item.sourceAttribution,
        timeLabel: item.asOfDate,
        comments: 0,
        boosts: 0,
        chartType: 'bullish_breakout',
        priceAxisLabels:
          item.latestValue !== null ? [item.latestValue.toFixed(2)] : ['Live'],
      });
    }
  };

  return (
    <div data-testid={`live-research-briefs-${group}`}>
      <div className="flex flex-wrap items-end justify-between gap-2 mb-5">
        <div>
          <h3 className="text-xl md:text-2xl font-display font-bold text-[#0f172a] inline-flex items-center gap-1 tracking-tight">
            <span>{heading}</span>
            <ChevronRight className="w-5 h-5 text-[#2563eb]" />
          </h3>
          <p className="text-xs text-[#64748b] mt-0.5">
            Real daily NAV &amp; physical bullion curves rendered directly from live AMFI, SQLite SIF &amp; Binance feeds
          </p>
        </div>
        <span className="text-[11px] font-mono text-[#64748b] whitespace-nowrap">
          Zero synthetic curves · Live primary telemetry
        </span>
      </div>

      {loading && cards.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {specs.map((s) => (
            <div
              key={s.id}
              className="h-[270px] rounded-[14px] bg-white border border-[#e2e8f0] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((item) => {
            const paths = buildSmoothSeriesPaths(item.series, 370, 118, 6, 12);
            const isUp = (item.windowReturnPct ?? 0) >= 0;
            const strokeHex = isUp ? '#34d399' : '#fb7185';
            const gradientId = `brief-grad-${item.spec.id}`;
            const midPrice = paths ? (paths.min + paths.max) / 2 : null;

            return (
              <article
                key={item.spec.id}
                onClick={() => handleCardClick(item)}
                className="group cursor-pointer rounded-[14px] bg-white border border-[#e2e8f0] hover:border-[#2563eb]/55 shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)] transition-all overflow-hidden flex flex-col"
              >
                {/* Obsidian Live Trajectory Stage */}
                <div className="bg-[#050914] px-4 pt-3.5 pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white font-bold tracking-wide">
                        {item.spec.symbol}
                      </span>
                      <span className="text-white/25">·</span>
                      <span className="text-[#93c5fd] truncate">{item.spec.pillar}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="text-white font-semibold">
                        {item.latestValue !== null
                          ? `${item.unitPrefix}${item.latestValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : '—'}
                      </span>
                      {item.windowReturnPct !== null && (
                        <span
                          className={`inline-flex items-center gap-0.5 font-semibold ${
                            isUp ? 'text-[#34d399]' : 'text-[#fb7185]'
                          }`}
                        >
                          {isUp ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {isUp ? '+' : ''}
                          {item.windowReturnPct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Authentic Real Series SVG */}
                  <svg
                    viewBox="0 0 432 122"
                    className="w-full h-[116px]"
                    role="img"
                    aria-label={`${item.spec.symbol} real NAV performance chart`}
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeHex} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={strokeHex} stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    <line
                      x1="6"
                      y1="24"
                      x2="366"
                      y2="24"
                      stroke="rgba(148,163,184,0.14)"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="6"
                      y1="64"
                      x2="366"
                      y2="64"
                      stroke="rgba(148,163,184,0.14)"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="6"
                      y1="104"
                      x2="366"
                      y2="104"
                      stroke="rgba(148,163,184,0.14)"
                      strokeDasharray="3 3"
                    />

                    {paths ? (
                      <>
                        <path d={paths.areaPath} fill={`url(#${gradientId})`} />
                        <path
                          d={paths.linePath}
                          fill="none"
                          stroke={strokeHex}
                          strokeWidth="2.1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx={paths.lastX}
                          cy={paths.lastY}
                          r="3.2"
                          fill={strokeHex}
                          stroke="#050914"
                          strokeWidth="1.4"
                        />
                        <text
                          x="374"
                          y="20"
                          fill="#94a3b8"
                          fontSize="9.5"
                          fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                        >
                          {paths.max.toFixed(2)}
                        </text>
                        <text
                          x="374"
                          y="64"
                          fill="#64748b"
                          fontSize="9.5"
                          fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                        >
                          {midPrice?.toFixed(2)}
                        </text>
                        <text
                          x="374"
                          y="108"
                          fill="#94a3b8"
                          fontSize="9.5"
                          fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                        >
                          {paths.min.toFixed(2)}
                        </text>
                      </>
                    ) : (
                      <text
                        x="185"
                        y="64"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="11"
                        fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                      >
                        Awaiting primary series...
                      </text>
                    )}
                  </svg>
                </div>

                {/* Alabaster Research Dossier Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[14.5px] font-display font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors leading-snug mb-1.5">
                      {item.spec.headline}
                    </h4>
                    <p className="text-xs text-[#475569] leading-relaxed line-clamp-2 mb-3.5">
                      {item.spec.thesis}
                    </p>
                  </div>

                  {/* Honest Telemetry Attribution Footer (Zero Fake Social Counters) */}
                  <div className="pt-2.5 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#64748b] tabular-nums">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="text-[#0f172a] font-semibold truncate">
                        {item.sourceAttribution}
                      </span>
                      <span className="text-[#cbd5e1]">·</span>
                      <span className="shrink-0">{item.asOfDate}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#059669] font-semibold">{item.cagr3yText}</span>
                      <span className="text-[#cbd5e1]">·</span>
                      <span className="text-[#475569]">{item.aumOrMetaText}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
