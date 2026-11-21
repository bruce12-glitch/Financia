import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Database, Layers } from 'lucide-react';
import { StockQuote } from '../types/financia';
import {
  buildQuarterlyNavBreakdown,
  LiveNavSeriesPoint,
  QuarterlyNavSummary,
  TERMINAL_LIVE_SOURCE_MAP,
} from '../utils/liveWorkspaceAnalytics';
import {
  formatAumCrores,
  formatDecimalPercent,
  MfnavFundPayload,
} from '../../landing/liveLandingEngine';

interface LiveQuarterlyLedgerCardProps {
  activeStock: StockQuote;
}

interface RawNavEntry {
  date?: string;
  nav_date?: string;
  nav?: number | string;
}

interface NavSeriesResponse {
  source?: string;
  payload?: {
    data?: RawNavEntry[];
    nav_history?: RawNavEntry[];
    scheme_name?: string;
  };
  data?: RawNavEntry[];
}

interface FundDetailResponse {
  source?: string;
  payload?: MfnavFundPayload & {
    total_return_pct?: number | null;
    max_drawdown_pct?: number | null;
    annualized_volatility_pct?: number | null;
    observation_count?: number;
  };
}

function parseNavPoints(raw: RawNavEntry[] | undefined): LiveNavSeriesPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: LiveNavSeriesPoint[] = [];
  for (const row of raw) {
    const d = String(row.nav_date || row.date || '').trim();
    const n = Number(row.nav);
    if (d && Number.isFinite(n) && n > 0) {
      out.push({ date: d, nav: n });
    }
  }
  return out;
}

export const LiveQuarterlyLedgerCard: React.FC<LiveQuarterlyLedgerCardProps> = ({
  activeStock,
}) => {
  const [quarters, setQuarters] = useState<QuarterlyNavSummary[]>([]);
  const [fundMeta, setFundMeta] = useState<FundDetailResponse['payload'] | null>(null);
  const [dataSourceLabel, setDataSourceLabel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedSource = useMemo(() => {
    const upper = activeStock.ticker.trim().toUpperCase();
    const mapped = TERMINAL_LIVE_SOURCE_MAP[upper];
    if (mapped) return mapped;
    if (/^\d{1,7}$/.test(upper)) {
      return {
        ticker: upper,
        schemeCode: upper,
        isSqliteSif: upper.length <= 2,
        label: activeStock.name,
        category: upper.length <= 2 ? 'SQLite SEBI SIF Ledger' : 'AMFI Direct Scheme',
      };
    }
    return TERMINAL_LIVE_SOURCE_MAP.PPFAS;
  }, [activeStock.ticker, activeStock.name]);

  useEffect(() => {
    const controller = new AbortController();
    const code = resolvedSource.schemeCode || '122639';
    const isSqlite = Boolean(resolvedSource.isSqliteSif);

    async function fetchQuarterlyLedger() {
      setLoading(true);
      setError(null);
      try {
        const navUrl = isSqlite
          ? `/api/nav-master/nav/${encodeURIComponent(code)}?page=1&page_size=260`
          : `/api/mfnav/nav/${encodeURIComponent(code)}?page=1&page_size=260`;
        const fundUrl = isSqlite
          ? `/api/nav-master/fund/${encodeURIComponent(code)}`
          : `/api/mfnav/fund/${encodeURIComponent(code)}`;

        const [navRes, fundRes] = await Promise.all([
          fetch(navUrl, { signal: controller.signal }),
          fetch(fundUrl, { signal: controller.signal }),
        ]);

        if (navRes.ok) {
          const navJson = (await navRes.json()) as NavSeriesResponse;
          const rows =
            navJson.payload?.data || navJson.payload?.nav_history || navJson.data || [];
          const points = parseNavPoints(rows);
          const computed = buildQuarterlyNavBreakdown(points, 4);
          setQuarters(computed);
          setDataSourceLabel(
            isSqlite
              ? `SQLite nav_master · Scheme #${code}`
              : `AMFI / mfnav.in · Scheme ${code}`
          );
        } else {
          setQuarters([]);
          setError('Live quarterly NAV history is temporarily unavailable.');
        }

        if (fundRes.ok) {
          const fJson = (await fundRes.json()) as FundDetailResponse;
          setFundMeta(fJson.payload || null);
        } else {
          setFundMeta(null);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setError('Unable to reach live quarterly NAV endpoint.');
      } finally {
        setLoading(false);
      }
    }

    void fetchQuarterlyLedger();
    return () => controller.abort();
  }, [resolvedSource]);

  const maxAbsReturn = useMemo(() => {
    if (quarters.length === 0) return 10;
    return Math.max(...quarters.map((q) => Math.abs(q.periodReturnPct)), 1.5);
  }, [quarters]);

  const aumFormatted = formatAumCrores(fundMeta?.average_aum_lakhs ?? null);
  const cagr3y = formatDecimalPercent(fundMeta?.daily_metrics?.cagr_3y ?? null);
  const vol3y =
    typeof fundMeta?.daily_metrics?.vol_3y === 'number'
      ? `${(Math.abs(fundMeta.daily_metrics.vol_3y) * 100).toFixed(2)}%`
      : '—';
  const sharpe3y =
    typeof fundMeta?.daily_metrics?.sharpe_3y === 'number'
      ? fundMeta.daily_metrics.sharpe_3y.toFixed(2)
      : '—';

  return (
    <div
      data-testid="live-quarterly-ledger-card"
      className="rounded-[14px] bg-white border border-[#e2e8f0] shadow-[0_8px_28px_rgba(15,23,42,0.05)] overflow-hidden"
    >
      {/* Header Band */}
      <div className="bg-[#050914] text-white px-6 py-5 border-b border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#38bdf8] uppercase tracking-wider mb-1">
              <Database className="w-3.5 h-3.5" />
              <span>{dataSourceLabel || resolvedSource.category}</span>
              {fundMeta?.latest_nav_date && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-[#94a3b8]">As of {fundMeta.latest_nav_date}</span>
                </>
              )}
            </div>
            <h3 className="text-[19px] font-display font-semibold text-white tracking-tight">
              Trailing Quarterly NAV Returns &amp; Drawdown Ledger
            </h3>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Computed directly from chronological daily AMFI / SQLite NAV observations for{' '}
              <span className="text-white font-medium">
                {fundMeta?.scheme_name || resolvedSource.label}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono shrink-0 text-[#cbd5e1]">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#34d399]" />
              Positive Qtr
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#fb7185]" />
              Negative Qtr
            </span>
          </div>
        </div>
      </div>

      {/* Body: Authentic Quarterly Grid */}
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-48 rounded-[12px] bg-[#f8fafc] border border-[#e2e8f0] animate-pulse"
              />
            ))}
          </div>
        ) : error || quarters.length === 0 ? (
          <div className="rounded-[12px] bg-[#f8fafc] border border-[#e2e8f0] p-6 text-center text-xs text-[#475569]">
            {error || 'Insufficient daily NAV observations to compute quarterly breakdown.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quarters.map((q) => {
              const isPos = q.periodReturnPct >= 0;
              const barHeightPx = Math.max(
                14,
                Math.round((Math.abs(q.periodReturnPct) / maxAbsReturn) * 76)
              );
              return (
                <div
                  key={q.quarterLabel}
                  className="rounded-[12px] bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#94a3b8] transition-colors p-4 flex flex-col justify-between"
                >
                  {/* Top Row: Quarter + Authentic Trading Day Count */}
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="font-semibold text-[#0f172a] whitespace-nowrap">
                      {q.quarterLabel}
                    </span>
                    <span className="text-[#64748b] tabular-nums whitespace-nowrap">
                      {q.observations} obs
                    </span>
                  </div>

                  {/* Center Visual Bar + Signed Return */}
                  <div className="h-[112px] flex flex-col items-center justify-end pb-2.5 border-b border-[#e2e8f0] mt-2">
                    <div
                      className={`inline-flex items-center gap-0.5 text-sm font-mono font-bold tabular-nums mb-1.5 ${
                        isPos ? 'text-[#059669]' : 'text-[#dc2626]'
                      }`}
                    >
                      {isPos ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isPos ? '+' : ''}
                        {q.periodReturnPct.toFixed(2)}%
                      </span>
                    </div>

                    <div className="w-full flex items-end justify-center gap-2 px-3">
                      <div
                        className={`w-11 rounded-t-[5px] transition-all ${
                          isPos
                            ? 'bg-gradient-to-t from-[#059669] to-[#34d399]'
                            : 'bg-gradient-to-t from-[#dc2626] to-[#fb7185]'
                        }`}
                        style={{ height: `${barHeightPx}px` }}
                        title={`${q.quarterLabel}: ${q.periodReturnPct > 0 ? '+' : ''}${q.periodReturnPct.toFixed(2)}% (${q.startDate} to ${q.endDate})`}
                      />
                    </div>
                  </div>

                  {/* Bottom Authentic Telemetry (Uniform Single-Line Alignment) */}
                  <div className="mt-3 space-y-1.5 text-[11px] font-mono tabular-nums">
                    <div className="flex items-center justify-between gap-1.5 whitespace-nowrap">
                      <span className="text-[#64748b]">NAV</span>
                      <span className="text-[#0f172a] font-semibold">
                        ₹{q.startNav.toFixed(1)} → ₹{q.endNav.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 whitespace-nowrap">
                      <span className="text-[#64748b]">Max DD</span>
                      <span
                        className={`font-semibold ${
                          q.maxDrawdownPct <= -4 ? 'text-[#dc2626]' : 'text-[#475569]'
                        }`}
                      >
                        {q.maxDrawdownPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Authentic Scheme Structure & Risk Footer Strip */}
        <div className="mt-5 pt-4 border-t border-[#e2e8f0] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs tabular-nums">
          <div>
            <div className="text-[11px] text-[#64748b] flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#2563eb]" />
              <span>Scheme AUM</span>
            </div>
            <div className="font-mono font-semibold text-[#0f172a] mt-0.5">
              {aumFormatted !== '—' ? aumFormatted : 'Verified Ledger'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#64748b]">3Y Annualized CAGR</div>
            <div className="font-mono font-semibold text-[#059669] mt-0.5">{cagr3y}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#64748b]">3Y Realized Volatility</div>
            <div className="font-mono font-semibold text-[#0f172a] mt-0.5">{vol3y}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#64748b]">3Y Sharpe Ratio</div>
            <div className="font-mono font-semibold text-[#2563eb] mt-0.5">{sharpe3y}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
