import React, { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { EQUITY_UNIVERSE } from '../data/indianMarketData';
import { formatIndianPrice } from '../utils/screenerEngine';

interface ScorecardSectionProps {
  selectedSymbol: string;
  onSelectAsset: (symbol: string) => void;
}

type ForecastMetric = 'Price' | 'Revenue' | 'EPS';

export const ScorecardSection: React.FC<ScorecardSectionProps> = ({
  selectedSymbol,
  onSelectAsset,
}) => {
  const [forecastTab, setForecastTab] = useState<ForecastMetric>('Price');
  const [showPeers, setShowPeers] = useState(false);

  const asset = useMemo(
    () =>
      EQUITY_UNIVERSE.find((s) => s.symbol === selectedSymbol) ?? EQUITY_UNIVERSE[0],
    [selectedSymbol]
  );

  const quickTickers = ['HDFCBANK', 'RELIANCE', 'COALINDIA', 'HAL', 'TCS', 'INFY', 'NVDA'];

  const peers = useMemo(
    () =>
      asset.peerSymbols
        .map((sym) => EQUITY_UNIVERSE.find((e) => e.symbol === sym))
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [asset]
  );

  // Forecast Fan SVG Coordinates
  const forecast = asset.forecasts[forecastTab];
  const fW = 480;
  const fH = 188;
  const pL = 44;
  const pR = 14;
  const pT = 16;
  const pB = 26;
  const iW = fW - pL - pR;
  const iH = fH - pT - pB;

  const { actualPath, highPath, medPath, lowPath, minY, maxY } = useMemo(() => {
    const allNums = [
      ...forecast.actual,
      ...forecast.high,
      ...forecast.median,
      ...forecast.low,
    ].filter((n): n is number => n !== null);
    const min = Math.min(...allNums);
    const max = Math.max(...allNums);
    const span = Math.max(1, max - min);
    const lo = min - span * 0.14;
    const hi = max + span * 0.14;
    const fullSpan = hi - lo;

    const toPath = (arr: (number | null)[]) => {
      let d = '';
      arr.forEach((v, idx) => {
        if (v === null) return;
        const x = pL + (idx / (arr.length - 1)) * iW;
        const y = pT + (1 - (v - lo) / fullSpan) * iH;
        d += `${d === '' ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      });
      return d.trim();
    };

    return {
      actualPath: toPath(forecast.actual),
      highPath: toPath(forecast.high),
      medPath: toPath(forecast.median),
      lowPath: toPath(forecast.low),
      minY: lo,
      maxY: hi,
    };
  }, [forecast, iW, iH]);

  return (
    <section
      id="scorecards"
      aria-label="Asset Pages, Investment Checklists, and Analyst Forecasts"
      className="w-full bg-[#F7F9F8] text-[#0F1B16] py-16 lg:py-20 border-b border-[#E3EAE6]"
    >
      <div className="max-w-[1220px] mx-auto px-6">
        {/* Centered Header Matching PDF */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="text-xs font-medium text-[#15803D] mb-2">
            Asset Pages &amp; Scorecards
          </div>
          <h2 className="font-display font-semibold text-3xl md:text-4xl tracking-tight text-[#0B1712] leading-tight">
            Every asset, graded —{' '}
            <span className="font-editorial font-medium">
              so filings turn into decisions
            </span>
          </h2>
          <p className="text-sm text-[#586D63] mt-3 leading-relaxed">
            Financial statements, peer comparisons, shareholding patterns and corporate actions — summarised into an Investment Checklist and Scorecard for every stock, ETF, fund and index.
          </p>
        </div>

        {/* Interactive Ticker Selector Ribbon */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {quickTickers.map((sym) => {
            const active = asset.symbol === sym;
            return (
              <button
                key={sym}
                type="button"
                onClick={() => onSelectAsset(sym)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#0F1F18] text-white border-[#0F1F18]'
                    : 'bg-white text-[#3F554B] border-[#D7E2DC] hover:border-[#15803D]'
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>

        {/* 2-Column Main Split: Left Light Scorecard / Right Dark Analyst Forecasts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 6 Cols: Light Asset Scorecard & Investment Checklist */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#DFE7E2] p-6 flex flex-col justify-between">
            <div>
              {/* Asset Header */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#EBF0ED]">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#0F1F18] text-[#4ADE80] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {asset.shortCode}
                  </span>
                  <div>
                    <h3 className="text-base font-display font-bold text-[#0B1712]">
                      {asset.name}
                    </h3>
                    <div className="text-xs text-[#6B8075]">
                      {asset.exchange}: {asset.symbol} · {asset.sector}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-lg font-bold text-[#0B1712]">
                    {formatIndianPrice(asset.price, asset.currency)}
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      asset.changePct >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'
                    }`}
                  >
                    {asset.changePct >= 0 ? '+' : ''}
                    {asset.changePct.toFixed(2)}% today
                  </div>
                </div>
              </div>

              {/* 6-Tile Scorecard Grid */}
              <div className="pt-5">
                <div className="text-[11px] font-semibold tracking-wider text-[#6B8075] mb-2.5">
                  Scorecard
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {asset.scorecard.map((tile) => {
                    const toneColor =
                      tile.tone === 'emerald'
                        ? 'text-[#15803D]'
                        : tile.tone === 'amber'
                          ? 'text-[#D97706]'
                          : 'text-[#0B1712]';
                    return (
                      <div
                        key={tile.label}
                        className="rounded-xl bg-[#F8FAF9] border border-[#E6EDE9] p-3"
                      >
                        <div className="text-[11px] text-[#6B8075]">{tile.label}</div>
                        <div className={`text-sm font-semibold mt-0.5 ${toneColor}`}>
                          {tile.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Investment Checklist */}
              <div className="pt-5">
                <div className="text-[11px] font-semibold tracking-wider text-[#6B8075] mb-2.5">
                  Investment Checklist
                </div>
                <div className="divide-y divide-[#EEF3F0]">
                  {asset.checklist.map((item) => (
                    <div
                      key={item.text}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            item.passed
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : 'bg-[#FEE2E2] text-[#DC2626]'
                          }`}
                        >
                          {item.passed ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </span>
                        <span className="text-[#1D3127]">{item.text}</span>
                      </div>
                      <span
                        className={`font-mono tabular-nums font-medium shrink-0 ${
                          item.passed ? 'text-[#15803D]' : 'text-[#DC2626]'
                        }`}
                      >
                        {item.metric}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Inline Peer Comparison Drawer */}
              {showPeers && (
                <div className="mt-4 pt-4 border-t border-[#E6EDE9]">
                  <div className="text-[11px] font-semibold text-[#586D63] mb-2">
                    Peer Comparison Snapshot
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[11px] text-[#6B8075] border-b border-[#E6EDE9]">
                          <th className="py-1.5">Ticker</th>
                          <th className="py-1.5 text-right">PE</th>
                          <th className="py-1.5 text-right">ROCE</th>
                          <th className="py-1.5 text-right">1Y Ret</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F3]">
                        {peers.map((peer) => (
                          <tr
                            key={peer.symbol}
                            onClick={() => onSelectAsset(peer.symbol)}
                            className="hover:bg-[#F3F7F5] cursor-pointer"
                          >
                            <td className="py-1.5 font-mono font-semibold text-[#0B1712]">
                              {peer.symbol}
                            </td>
                            <td className="py-1.5 text-right font-mono tabular-nums">
                              {peer.pe.toFixed(1)}
                            </td>
                            <td className="py-1.5 text-right font-mono tabular-nums">
                              {peer.roce.toFixed(1)}%
                            </td>
                            <td className="py-1.5 text-right font-mono tabular-nums text-[#15803D]">
                              +{peer.return1Y.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-5 mt-4 border-t border-[#EEF3F0]">
              <a
                href="#screeners"
                className="px-4 py-2 rounded-lg bg-[#0F1F18] text-white text-xs font-semibold hover:bg-[#193529] transition-colors whitespace-nowrap shrink-0"
              >
                View stock page
              </a>
              <button
                type="button"
                onClick={() => setShowPeers((v) => !v)}
                className="px-4 py-2 rounded-lg bg-[#F1F5F3] text-[#1D3127] text-xs font-medium hover:bg-[#E2ECE7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showPeers ? 'Hide peers' : 'Compare peers'}
              </button>
            </div>
          </div>

          {/* Right 6 Cols: Dark Analyst Forecasts & 1Y Target Fan Chart */}
          <div className="lg:col-span-6 bg-[#0D1914] text-[#F1F5F3] rounded-2xl border border-[#1E352A] p-6 flex flex-col justify-between">
            <div>
              {/* Top Row: Title & Metric Toggle */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div>
                  <h3 className="text-base font-display font-semibold text-white">
                    Analyst Forecasts
                  </h3>
                  <div className="text-xs text-[#7E9488] mt-0.5">
                    Aggregated from {asset.analystCount} analysts · Source: S&amp;P Global
                  </div>
                </div>

                <div className="inline-flex items-center p-1 rounded-lg bg-[#09120E] border border-white/[0.07]">
                  {(['Price', 'Revenue', 'EPS'] as ForecastMetric[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setForecastTab(tab)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        forecastTab === tab
                          ? 'bg-[#173025] text-white font-semibold'
                          : 'text-[#8FA499] hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consensus Rating Bar + High/Median/Low */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 py-5 border-b border-white/[0.08] items-center">
                <div className="sm:col-span-7 space-y-2.5">
                  <div className="text-[11px] text-[#7E9488]">Consensus rating</div>
                  <div className="text-2xl font-display font-bold text-[#4ADE80]">
                    {asset.consensus}
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#192C23] overflow-hidden flex">
                    <div
                      style={{ width: `${asset.buyPct}%` }}
                      className="bg-[#22C55E] h-full"
                    />
                    <div
                      style={{ width: `${asset.holdPct}%` }}
                      className="bg-[#F59E0B] h-full"
                    />
                    <div
                      style={{ width: `${asset.sellPct}%` }}
                      className="bg-[#EF4444] h-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#A8B8B0]">
                    <span>Buy {asset.buyPct}%</span>
                    <span>Hold {asset.holdPct}%</span>
                    <span>Sell {asset.sellPct}%</span>
                  </div>
                </div>

                <div className="sm:col-span-5 grid grid-cols-3 sm:grid-cols-1 gap-2 sm:pl-4 sm:border-l border-white/[0.08]">
                  <div className="flex sm:items-center justify-between flex-col sm:flex-row text-xs">
                    <span className="text-[#7E9488]">High</span>
                    <span className="font-mono font-semibold text-[#4ADE80]">
                      {asset.targetHigh}
                    </span>
                  </div>
                  <div className="flex sm:items-center justify-between flex-col sm:flex-row text-xs">
                    <span className="text-[#7E9488]">Median</span>
                    <span className="font-mono font-semibold text-white">
                      {asset.targetMedian}
                    </span>
                  </div>
                  <div className="flex sm:items-center justify-between flex-col sm:flex-row text-xs">
                    <span className="text-[#7E9488]">Low</span>
                    <span className="font-mono font-semibold text-[#F87171]">
                      {asset.targetLow}
                    </span>
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="text-xs text-[#9DB0A6] pt-4 pb-2">
                Median 1-year target implies{' '}
                <span className="text-[#4ADE80] font-semibold font-mono">
                  {asset.upsidePct} upside
                </span>{' '}
                from current {forecastTab.toLowerCase()}.
              </div>

              {/* Forecast Fan SVG Chart */}
              <svg
                viewBox={`0 0 ${fW} ${fH}`}
                className="w-full h-48 select-none"
                role="img"
                aria-label={`${asset.symbol} ${forecastTab} 12-month analyst forecast chart`}
              >
                {[0, 0.33, 0.66, 1].map((frac, i) => {
                  const y = pT + frac * iH;
                  const val = Math.round(maxY - frac * (maxY - minY));
                  return (
                    <g key={i}>
                      <line
                        x1={pL}
                        y1={y}
                        x2={fW - pR}
                        y2={y}
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <text
                        x={pL - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-[#738A7E] text-[10px] font-mono tabular-nums"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Actual historical solid emerald line */}
                <path
                  d={actualPath}
                  fill="none"
                  stroke="#E4EDE8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Forecast high */}
                <path
                  d={highPath}
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                />
                {/* Forecast median */}
                <path
                  d={medPath}
                  fill="none"
                  stroke="#4ADE80"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                {/* Forecast low */}
                <path
                  d={lowPath}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                />

                {forecast.dates.map((d, idx) => {
                  if (idx % 2 !== 0 && idx !== forecast.dates.length - 1) return null;
                  const x = pL + (idx / (forecast.dates.length - 1)) * iW;
                  return (
                    <text
                      key={d}
                      x={x}
                      y={fH - 6}
                      textAnchor="middle"
                      className="fill-[#738A7E] text-[10px] font-mono"
                    >
                      {d}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-[11px] text-[#9DB0A6]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#E4EDE8]" />
                <span>Actual</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-[#22C55E]" />
                <span>High</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-[#4ADE80]" />
                <span>Median</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-[#EF4444]" />
                <span>Low</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
