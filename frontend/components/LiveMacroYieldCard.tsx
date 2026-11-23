import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Landmark } from 'lucide-react';
import {
  computeYieldCurveAnalytics,
  TreasuryTenorPoint,
} from '../../landing/liveLandingEngine';

interface TreasuryResponse {
  source?: string;
  usTreasury?: {
    asOfDate?: string;
    tenors?: TreasuryTenorPoint[];
  };
}

interface MacroBarItem {
  label: string;
  value: number;
  sublabel: string;
}

const INDIA_CPI_SERIES: MacroBarItem[] = [
  { label: 'Jun', value: 5.08, sublabel: 'MOSPI Retail CPI YoY' },
  { label: 'Jul', value: 3.60, sublabel: 'MOSPI Retail CPI YoY' },
  { label: 'Aug', value: 3.65, sublabel: 'MOSPI Retail CPI YoY' },
  { label: 'Sep', value: 5.49, sublabel: 'MOSPI Retail CPI YoY' },
  { label: 'Oct', value: 6.21, sublabel: 'MOSPI Retail CPI YoY' },
  { label: 'Nov', value: 5.48, sublabel: 'MOSPI Retail CPI YoY' },
  { label: 'Dec', value: 5.22, sublabel: 'MOSPI Retail CPI YoY' },
  { label: 'Jan', value: 4.31, sublabel: 'MOSPI Retail CPI YoY' },
];

export const LiveMacroYieldCard: React.FC = () => {
  const [mode, setMode] = useState<'treasury' | 'india'>('treasury');
  const [tenors, setTenors] = useState<TreasuryTenorPoint[]>([]);
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [sourceTag, setSourceTag] = useState<string>('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/macro/treasury-rates', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TreasuryResponse | null) => {
        if (Array.isArray(data?.usTreasury?.tenors)) {
          setTenors(data.usTreasury.tenors);
        }
        if (data?.usTreasury?.asOfDate) {
          setAsOfDate(data.usTreasury.asOfDate);
        }
        if (data?.source) {
          setSourceTag(data.source);
        }
      })
      .catch(() => {
        // Fallback gracefully to India RBI view if offline
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const curveStats = useMemo(() => computeYieldCurveAnalytics(tenors), [tenors]);

  const treasuryBars: MacroBarItem[] = useMemo(() => {
    const keep = ['3M', '6M', '1Y', '2Y', '5Y', '10Y', '20Y', '30Y'];
    const filtered = keep
      .map((lbl) => tenors.find((t) => t.label.toUpperCase() === lbl))
      .filter((t): t is TreasuryTenorPoint => Boolean(t && Number.isFinite(t.yieldPct)));
    return filtered.map((t) => ({
      label: t.label,
      value: t.yieldPct,
      sublabel: `U.S. ${t.label} Sovereign Yield`,
    }));
  }, [tenors]);

  const activeBars = mode === 'treasury' && treasuryBars.length > 0 ? treasuryBars : INDIA_CPI_SERIES;
  const maxBarValue = useMemo(() => {
    return Math.max(...activeBars.map((b) => b.value), 5.5) * 1.14;
  }, [activeBars]);

  const inspectedBar =
    hoveredIdx !== null && activeBars[hoveredIdx]
      ? activeBars[hoveredIdx]
      : activeBars[activeBars.length - 1];

  return (
    <div
      data-testid="live-macro-yield-card"
      className="rounded-[14px] bg-white border border-[#e2e8f0] shadow-[0_8px_28px_rgba(15,23,42,0.05)] p-5 md:p-6 flex flex-col justify-between"
    >
      <div>
        {/* Card Header + Mode Switcher */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-[8px] bg-[#050914] text-[#38bdf8] flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-display font-bold text-[#0f172a] leading-tight">
                {mode === 'treasury'
                  ? 'U.S. Sovereign Yield Curve'
                  : 'India CPI Inflation & RBI Policy'}
              </div>
              <div className="text-[11px] font-mono text-[#64748b] mt-0.5 truncate">
                {mode === 'treasury'
                  ? `${sourceTag && sourceTag.includes('fmp') ? 'U.S. Treasury Direct (FMP)' : sourceTag || 'U.S. Treasury Direct'} · ${asOfDate || 'Latest Close'}`
                  : 'MOSPI CPI YoY · RBI MPC Corridor'}
              </div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Macro indicator view"
            className="inline-flex items-center p-0.5 rounded-[8px] bg-[#f1f5f9] border border-[#e2e8f0] shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'treasury'}
              onClick={() => {
                setMode('treasury');
                setHoveredIdx(null);
              }}
              className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'treasury'
                  ? 'bg-[#050914] text-white'
                  : 'text-[#475569] hover:text-[#0f172a]'
              }`}
            >
              US Yields (Live)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'india'}
              onClick={() => {
                setMode('india');
                setHoveredIdx(null);
              }}
              className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'india'
                  ? 'bg-[#050914] text-white'
                  : 'text-[#475569] hover:text-[#0f172a]'
              }`}
            >
              India RBI / CPI
            </button>
          </div>
        </div>

        {/* Active Hover / Focus Readout Strip */}
        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] mb-4 tabular-nums">
          <span className="text-[#475569] font-medium truncate">
            {inspectedBar ? `${inspectedBar.sublabel} (${inspectedBar.label})` : 'Loading curve...'}
          </span>
          <span className="font-mono font-bold text-[#0f172a] shrink-0 ml-2">
            {inspectedBar ? `${inspectedBar.value.toFixed(2)}%` : '—'}
          </span>
        </div>

        {/* Precision Labeled Bar Chart */}
        {loading && mode === 'treasury' && treasuryBars.length === 0 ? (
          <div className="h-[148px] rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0] animate-pulse mb-4" />
        ) : (
          <div className="pt-2 pb-1">
            <div className="h-[136px] flex items-end gap-2 sm:gap-2.5 border-b border-[#e2e8f0] pb-2">
              {activeBars.map((bar, idx) => {
                const isSelected = hoveredIdx === idx;
                const isHighlight =
                  mode === 'treasury'
                    ? bar.label === '10Y' || bar.label === '2Y'
                    : idx === activeBars.length - 1;
                const heightPct = Math.max(18, Math.round((bar.value / maxBarValue) * 100));

                return (
                  <button
                    key={bar.label}
                    type="button"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onFocus={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group cursor-pointer focus:outline-none"
                    aria-label={`${bar.label}: ${bar.value.toFixed(2)}%`}
                  >
                    <span
                      className={`text-[10px] font-mono tabular-nums transition-colors ${
                        isSelected || isHighlight
                          ? 'text-[#0f172a] font-bold'
                          : 'text-[#64748b] font-medium'
                      }`}
                    >
                      {bar.value.toFixed(2)}%
                    </span>
                    <div
                      className={`w-full rounded-t-[5px] transition-all ${
                        isSelected
                          ? 'bg-[#050914]'
                          : isHighlight
                            ? 'bg-gradient-to-t from-[#1d4ed8] to-[#38bdf8]'
                            : 'bg-[#2563eb]/75 group-hover:bg-[#1d4ed8]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Crisp X-Axis Labels */}
            <div className="flex items-center gap-2 sm:gap-2.5 pt-2 mb-5">
              {activeBars.map((bar, idx) => (
                <div
                  key={bar.label}
                  className={`flex-1 text-center text-[11px] font-mono ${
                    hoveredIdx === idx ? 'text-[#0f172a] font-bold' : 'text-[#64748b]'
                  }`}
                >
                  {bar.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Authentic Key Sovereign Metrics Grid */}
        {mode === 'treasury' ? (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#f1f5f9] text-xs tabular-nums">
            <div>
              <div className="text-[11px] text-[#64748b]">2s10s Spread</div>
              <div
                className={`font-mono font-bold mt-0.5 ${
                  (curveStats.spread2s10sBps ?? 0) >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                }`}
              >
                {curveStats.spread2s10sBps !== null
                  ? `${curveStats.spread2s10sBps > 0 ? '+' : ''}${curveStats.spread2s10sBps} bps`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748b]">Curve Regime</div>
              <div className="font-mono font-bold text-[#0f172a] mt-0.5 truncate">
                {curveStats.regime}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748b]">10Y Benchmark</div>
              <div className="font-mono font-bold text-[#2563eb] mt-0.5">
                {tenors.find((t) => t.label === '10Y')?.yieldPct.toFixed(2) ?? '—'}%
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#f1f5f9] text-xs tabular-nums">
            <div>
              <div className="text-[11px] text-[#64748b]">RBI Repo Rate</div>
              <div className="font-mono font-bold text-[#0f172a] mt-0.5">5.50%</div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748b]">SDF / MSF Band</div>
              <div className="font-mono font-bold text-[#0f172a] mt-0.5">5.25% – 5.75%</div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748b]">CPI Target Band</div>
              <div className="font-mono font-bold text-[#059669] mt-0.5">4.0% ± 2.0%</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Link with Generous Spacing (Never Clips) */}
      <div className="mt-5 pt-3.5 border-t border-[#e2e8f0] flex items-center justify-between gap-2">
        <a
          href="#economy-section"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
        >
          <span>See all economic &amp; sovereign indicators</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
        <span className="text-[10.5px] font-mono text-[#64748b] whitespace-nowrap">
          {mode === 'treasury' ? 'Live Feed' : 'RBI / MOSPI'}
        </span>
      </div>
    </div>
  );
};
