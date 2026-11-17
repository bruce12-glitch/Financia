import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Globe2, Layers, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  CRYPTO_ASSETS,
  ENERGY_FUTURES,
  FOREX_PERFORMANCE_PAIRS,
  MAJOR_INDICES,
  METALS_FUTURES,
} from '../frontend/data/tradingViewData';
import { ExchangeRegion, GLOBAL_STOCK_EXCHANGES } from '../frontend/utils/globalExchanges';
import {
  LANDING_AGENT_SAMPLES,
  LANDING_SCALE_METRICS,
  LANDING_SECTOR_PULSES,
} from './landingCapabilitiesData';

interface LandingCapabilitiesSectionProps {
  onRequestWorkspace: (targetSectionId: string, ticker?: string) => void;
  onInspectSymbol?: (symbol: string) => void;
}

type AssetPreviewTab = 'Indices' | 'Forex' | 'Crypto' | 'Futures';

export const LandingCapabilitiesSection: React.FC<LandingCapabilitiesSectionProps> = ({
  onRequestWorkspace,
  onInspectSymbol,
}) => {
  const [activeTicker, setActiveTicker] = useState<string>(LANDING_AGENT_SAMPLES[0].ticker);
  const [activeRegion, setActiveRegion] = useState<'All' | ExchangeRegion>('All');
  const [assetTab, setAssetTab] = useState<AssetPreviewTab>('Indices');

  const activeAgentSample = useMemo(
    () =>
      LANDING_AGENT_SAMPLES.find((item) => item.ticker === activeTicker) ||
      LANDING_AGENT_SAMPLES[0],
    [activeTicker]
  );

  const visibleExchanges = useMemo(() => {
    const pool =
      activeRegion === 'All'
        ? GLOBAL_STOCK_EXCHANGES
        : GLOBAL_STOCK_EXCHANGES.filter((ex) => ex.region === activeRegion);
    return pool.slice(0, 5);
  }, [activeRegion]);

  const assetRows = useMemo(() => {
    if (assetTab === 'Indices') {
      return MAJOR_INDICES.slice(0, 4).map((r) => ({
        symbol: r.symbol,
        name: r.name,
        price: r.price,
        changePercent: r.changePercent,
      }));
    }
    if (assetTab === 'Forex') {
      return FOREX_PERFORMANCE_PAIRS.slice(0, 4).map((fx) => ({
        symbol: fx.pair,
        name: `${fx.baseFlag}${fx.quoteFlag} Spot`,
        price: fx.spotRate,
        changePercent: fx.returns['1D'],
      }));
    }
    if (assetTab === 'Crypto') {
      return CRYPTO_ASSETS.slice(1, 5).map((c) => ({
        symbol: c.symbol,
        name: c.name,
        price: c.price,
        changePercent: c.changePercent,
      }));
    }
    return [...ENERGY_FUTURES.slice(0, 2), ...METALS_FUTURES.slice(0, 2)].map((f) => ({
      symbol: f.symbol,
      name: f.name,
      price: f.price,
      changePercent: f.changePercent,
    }));
  }, [assetTab]);

  return (
    <section
      id="landing-capabilities"
      aria-label="Institutional Research Architecture and Capabilities"
      className="relative w-full bg-[#05070C] text-white border-t border-[#161B26] py-20 lg:py-24 px-4 md:px-10 overflow-hidden"
    >
      <div className="max-w-[1220px] mx-auto">
        {/* Section Editorial Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="text-xs font-mono text-[#60A5FA] mb-3">
              01. Institutional Research Architecture
            </div>
            <h2
              className="font-display font-bold text-white tracking-[-0.025em]"
              style={{
                fontSize: 'clamp(1.9rem, 3.4vw, 2.95rem)',
                lineHeight: 1.08,
                textWrap: 'balance',
              }}
            >
              Built for conviction. Grounded in primary filings.
            </h2>
          </div>
          <p className="text-sm text-[#9598A1] max-w-md leading-relaxed">
            From raw SEC Form 10-K tables to interactive 3D exchange telemetry, every signal inside Financia traces back to verifiable market data.
          </p>
        </div>

        {/* Asymmetric 12-Column Bento Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1 (Wide): Multi-Agent SEC Synthesis Live Preview */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0B0F17] border border-[#1E2432] p-6 md:p-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#1A202C]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#60A5FA] shrink-0" />
                  <h3 className="font-display font-semibold text-base md:text-lg text-white">
                    Multi-Agent SEC Filing Synthesis
                  </h3>
                </div>

                {/* Interactive Ticker Segmented Switcher */}
                <div
                  role="group"
                  aria-label="Preview equity filing report"
                  className="flex items-center gap-1 p-1 rounded-lg bg-[#06090F] border border-[#1A202C]"
                >
                  {LANDING_AGENT_SAMPLES.map((sample) => {
                    const active = sample.ticker === activeAgentSample.ticker;
                    return (
                      <button
                        key={sample.ticker}
                        type="button"
                        onClick={() => setActiveTicker(sample.ticker)}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#2962FF] text-white font-semibold'
                            : 'text-[#9598A1] hover:text-white'
                        }`}
                      >
                        {sample.ticker}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Sample Readout */}
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs font-mono text-[#9598A1]">
                    {activeAgentSample.exchange} · {activeAgentSample.filingTag}
                  </div>
                  <div className="text-xl font-display font-bold text-white mt-0.5">
                    {activeAgentSample.company}
                  </div>
                </div>
                <div className="flex items-baseline gap-3 font-mono tabular-nums">
                  <span className="text-lg font-bold text-white">{activeAgentSample.price}</span>
                  <span className="text-xs font-semibold text-[#089981]">
                    +{activeAgentSample.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#D1D4DC] leading-relaxed mb-5">
                {activeAgentSample.headline}
              </p>

              {/* Evidence Points */}
              <ul className="space-y-2.5 mb-6">
                {activeAgentSample.evidencePoints.map((pt, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-[#9CA3AF] leading-relaxed"
                  >
                    <span className="font-mono text-[#60A5FA] shrink-0 mt-0.5">
                      0{idx + 1}.
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer Bar: Conviction Score + Workspace Action */}
            <div className="pt-4 border-t border-[#1A202C] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#9598A1]">Conviction</span>
                <div className="w-28 h-1.5 rounded-full bg-[#161B26] overflow-hidden">
                  <div
                    className="h-full bg-[#2962FF] transition-all duration-200"
                    style={{ width: `${activeAgentSample.convictionScore}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-white tabular-nums">
                  {activeAgentSample.convictionScore}/100
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRequestWorkspace('live-terminal', activeAgentSample.ticker)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Inspect {activeAgentSample.ticker} in Terminal</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2 (Right): 3D Global Stock Exchanges Atlas Preview */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0B0F17] border border-[#1E2432] p-6 md:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-[#1A202C]">
                <div className="flex items-center gap-2.5">
                  <Globe2 className="w-4 h-4 text-[#60A5FA] shrink-0" />
                  <h3 className="font-display font-semibold text-base md:text-lg text-white">
                    3D Global Exchanges Atlas
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#9598A1] tabular-nums">
                  {GLOBAL_STOCK_EXCHANGES.length} hubs
                </span>
              </div>

              {/* Region Filter Tabs */}
              <div
                role="group"
                aria-label="Filter global exchanges by region"
                className="flex flex-wrap items-center gap-1 mb-4"
              >
                {(['All', 'Americas', 'Europe', 'Asia-Pacific'] as const).map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setActiveRegion(region)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activeRegion === region
                        ? 'bg-[#1D2B48] text-white'
                        : 'text-[#9598A1] hover:text-white hover:bg-[#141923]'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>

              {/* Exchange List */}
              <div className="divide-y divide-[#161B26]">
                {visibleExchanges.map((ex) => (
                  <div
                    key={ex.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span aria-hidden="true" className="text-sm shrink-0">
                        {ex.flag}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{ex.name}</div>
                        <div className="text-[11px] text-[#787B86] truncate">
                          {ex.country} · {ex.benchmark}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#60A5FA] shrink-0">
                      {ex.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#1A202C] flex items-center justify-between">
              <span className="text-xs text-[#9598A1]">Interactive WebGL Globe</span>
              <button
                type="button"
                onClick={() => onRequestWorkspace('global-exchanges-globe')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Open 3D Market Atlas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3 (Bottom Left): Cross-Asset Live Telemetry */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0B0F17] border border-[#1E2432] p-6 md:p-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#1A202C]">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[#60A5FA] shrink-0" />
                  <h3 className="font-display font-semibold text-base md:text-lg text-white">
                    Cross-Asset Coverage
                  </h3>
                </div>

                <div
                  role="group"
                  aria-label="Select asset class preview"
                  className="flex items-center gap-1"
                >
                  {(['Indices', 'Forex', 'Crypto', 'Futures'] as AssetPreviewTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setAssetTab(tab)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        assetTab === tab
                          ? 'bg-[#1D2B48] text-white'
                          : 'text-[#9598A1] hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-[#161B26]">
                {assetRows.map((row) => {
                  const isUp = row.changePercent >= 0;
                  return (
                    <button
                      key={row.symbol}
                      type="button"
                      onClick={() => onInspectSymbol?.(row.symbol)}
                      className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] px-1.5 -mx-1.5 rounded transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-white">
                          {row.symbol}
                        </div>
                        <div className="text-[11px] text-[#787B86] truncate">{row.name}</div>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <div className="text-xs font-semibold text-white">{row.price}</div>
                        <div
                          className={`text-[11px] font-semibold ${
                            isUp ? 'text-[#089981]' : 'text-[#F23645]'
                          }`}
                        >
                          {isUp ? '+' : '−'}
                          {Math.abs(row.changePercent).toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#1A202C] flex items-center justify-between">
              <span className="text-xs text-[#9598A1]">Click any symbol to inspect quote</span>
              <button
                type="button"
                onClick={() => onRequestWorkspace('market-summary')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>All Markets</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 4 (Bottom Right Wide): Sector Momentum & Breadth */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0B0F17] border border-[#1E2432] p-6 md:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-[#1A202C]">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-[#60A5FA] shrink-0" />
                  <h3 className="font-display font-semibold text-base md:text-lg text-white">
                    Sector Momentum &amp; Target Alerts
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#9598A1]">24h Relative Flow</span>
              </div>

              <div className="space-y-3.5">
                {LANDING_SECTOR_PULSES.map((item) => {
                  const isUp = item.changePercent >= 0;
                  const barWidth = Math.min(100, Math.max(18, Math.abs(item.changePercent) * 24));
                  return (
                    <div key={item.sector} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-[#E5E7EB] truncate">
                            {item.sector}
                          </span>
                          <span className="text-[11px] font-mono text-[#787B86] shrink-0">
                            · {item.leader} · {item.volumeNote}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-semibold tabular-nums shrink-0 ${
                            isUp ? 'text-[#089981]' : 'text-[#F23645]'
                          }`}
                        >
                          {isUp ? '+' : '−'}
                          {Math.abs(item.changePercent).toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#131823] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isUp ? 'bg-[#089981]' : 'bg-[#F23645]'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-[#1A202C] flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-[#9598A1]">
                Real-time sector heatmaps &amp; instant price-threshold alerts inside workspace
              </span>
              <button
                type="button"
                onClick={() => onRequestWorkspace('markets')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Open Heatmaps &amp; Alerts</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Claim-to-Proof Quantitative Strip */}
        <div className="mt-10 pt-8 border-t border-[#161B26] grid grid-cols-2 lg:grid-cols-4 gap-6">
          {LANDING_SCALE_METRICS.map((metric) => (
            <div key={metric.label}>
              <div className="font-display font-bold text-2xl md:text-3xl text-white tabular-nums">
                {metric.value}
              </div>
              <div className="text-xs text-[#9598A1] mt-1">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
