import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowUpRight,
  Layers,
  Cpu,
  Globe,
  ShieldCheck,
  BarChart3,
  X,
} from 'lucide-react';
import { ResearchPlan, SectorShowcase } from '../types/financia';

interface BentoShowcaseSectionProps {
  sectors: SectorShowcase[];
  plans: ResearchPlan[];
  onSelectTickerAndScroll: (ticker: string) => void;
}

export const BentoShowcaseSection: React.FC<BentoShowcaseSectionProps> = ({
  sectors,
  plans,
  onSelectTickerAndScroll,
}) => {
  const [activeSectorIdx, setActiveSectorIdx] = useState<number>(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);

  const handleActivatePlan = (plan: ResearchPlan) => {
    setSelectedPlanId(plan.id);
    setPlanNotice(
      `Activated ${plan.name} (${plan.headline}) workspace configuration — ${plan.limits.agentMode}.`
    );
  };

  return (
    <div className="w-full bg-[#05070C] text-white">
      {/* SECTION A: Built for Analysts. Trusted Worldwide (Video 00:10 - 00:13, adapted to dark canvas) */}
      <section
        id="about-financia"
        aria-label="About Financia Institutional Stock Intelligence"
        className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24"
      >
        <div className="flex flex-col items-center text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-3">
            <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
              <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
              <span className="w-0.5 h-3 bg-white" />
              <span className="w-0.5 h-2 bg-[#3B82F6]" />
            </span>
            <span>About Financia</span>
            <span aria-hidden="true">·</span>
            <span>Institutional Research Architecture</span>
          </div>
          <h2
            className="font-display font-semibold text-white tracking-tight max-w-xl mb-3"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: 1.12, textWrap: 'balance' }}
          >
            Built for Analysts. Trusted Worldwide
          </h2>
          <p className="text-sm md:text-base text-[#94A3B8] max-w-md">
            Focused on source-grounded SEC accuracy, live market telemetry, and multi-agent depth
          </p>
        </div>

        {/* 3-Card Bento Grid matching Video 00:11 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Fluted Silver-Dark Glass with Stepped Bottom Cutout */}
          <div className="relative rounded-2xl bg-fluted-silver-dark border border-white/15 p-7 min-h-[400px] flex flex-col justify-between overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-display font-semibold text-white leading-snug mb-3">
                SEC Grounded &amp;
                <br />
                Verified
              </h3>
              <p className="text-sm text-[#CBD5E1] leading-relaxed mb-6 max-w-xs">
                Every metric is cross-checked against official Form 10-K, 10-Q, and 8-K filings. Zero unverified assumptions — always.
              </p>
              <button
                type="button"
                onClick={() => onSelectTickerAndScroll('NVDA')}
                className="px-5 py-2.5 rounded-full bg-white text-[#05070C] font-medium text-xs hover:bg-[#DBEAFE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Inspect SEC Filings
              </button>
            </div>

            {/* Stepped architectural bottom-right cutout matching video 00:11 */}
            <div className="relative z-10 pt-8 mt-auto flex items-center justify-between border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-end gap-0.5 h-3.5" aria-hidden="true">
                  <span className="w-0.5 h-2 bg-[#60A5FA]" />
                  <span className="w-0.5 h-3.5 bg-white" />
                  <span className="w-0.5 h-2.5 bg-[#3B82F6]" />
                </span>
                <span className="font-display font-bold text-xs tracking-wide text-white">
                  financia
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#93C5FD]">EDGAR DIRECT · 10-K/10-Q</span>
            </div>
          </div>

          {/* Card 2: Deep Emerald Fluted Glow Card (Video 00:11 Center Card) */}
          <div
            className="relative rounded-2xl border border-[#3B82F6]/35 p-7 min-h-[400px] flex flex-col justify-between overflow-hidden"
            style={{
              background:
                'radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.30) 0%, rgba(15, 29, 58, 0.92) 55%, #070C17 100%)',
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-fluted-emerald opacity-70" />
            <div className="relative z-10">
              <h3 className="text-2xl font-display font-semibold text-white leading-snug mb-3">
                Multi-Agent Research,
                <br />
                24/7
              </h3>
              <p className="text-sm text-[#E2E8F0] leading-relaxed mb-6 max-w-xs">
                Parallel fundamental, technical, and options-flow sub-agents synthesize institutional dossiers in seconds. No delays.
              </p>
              <button
                type="button"
                onClick={() => onSelectTickerAndScroll('MSFT')}
                className="px-5 py-2.5 rounded-full bg-[#3B82F6]/25 text-white border border-[#60A5FA]/40 font-medium text-xs hover:bg-[#3B82F6]/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Launch Agent Committee
              </button>
            </div>

            {/* Decorative ASCII binary step matrix at bottom right matching video 00:11 */}
            <div className="relative z-10 mt-auto pt-6 flex items-end justify-between">
              <div className="text-xs font-mono text-[#60A5FA]">
                4-Tier Adversarial Synthesis
              </div>
              <div
                aria-hidden="true"
                className="font-mono text-[9px] leading-[11px] text-[#60A5FA]/50 text-right select-none"
              >
                <div>11 01 11 10 01</div>
                <div>01 11 01 11 11</div>
                <div>11 10 11 01 10</div>
              </div>
            </div>
          </div>

          {/* Card 3: Tickers Analyzed 10,000+ with 100/80/40/0 Spline Chart (Video 00:12 Right Card) */}
          <div className="relative rounded-2xl bg-[#09101F] border border-white/15 p-7 min-h-[400px] flex flex-col justify-between overflow-hidden">
            <div>
              <div className="text-xs text-[#94A3B8] mb-1">Equities &amp; Filings Indexed</div>
              <div className="text-4xl font-display font-semibold text-white tabular-nums mb-3">
                10,000+
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed max-w-xs">
                Independent analysts, quant desks, institutions — we power real-time equity clarity across global exchanges.
              </p>
            </div>

            {/* 100 / 80 / 40 / 0 Spline Chart matching Video 00:12 */}
            <div className="my-5">
              <svg
                viewBox="0 0 280 120"
                className="w-full h-28 overflow-visible"
                role="img"
                aria-label="Growth trajectory of indexed SEC filings and stock coverage"
              >
                {[
                  { label: '100', y: 16 },
                  { label: '80', y: 44 },
                  { label: '40', y: 74 },
                  { label: '0', y: 104 },
                ].map((row) => (
                  <g key={row.label}>
                    <text
                      x={0}
                      y={row.y + 3}
                      className="fill-[#64748B] text-[10px] font-mono"
                    >
                      {row.label}
                    </text>
                    <line
                      x1={26}
                      y1={row.y}
                      x2={275}
                      y2={row.y}
                      stroke="rgba(255,255,255,0.06)"
                    />
                  </g>
                ))}
                <path
                  d="M 28 82 C 65 72, 85 88, 120 64 C 155 40, 185 78, 220 46 C 245 24, 260 28, 275 18"
                  fill="none"
                  stroke="#60A5FA"
                  strokeWidth={2}
                />
                <path
                  d="M 28 94 C 70 86, 95 66, 135 76 C 175 86, 205 52, 275 58"
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={1.5}
                />
              </svg>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-xs font-medium text-white">
                No noise. No delays.
              </span>
              <button
                type="button"
                onClick={() => onSelectTickerAndScroll('AAPL')}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Explore Data
              </button>
            </div>
          </div>
        </div>

        {/* Institutional Exchange & Filing Data Feeds Strip (Matches Video 00:13 bottom logo strip) */}
        <div className="mt-14 pt-8 border-t border-white/[0.07] text-center">
          <div className="text-xs text-[#64748B] mb-6">
            Direct Institutional Filing &amp; Market Telemetry Feeds Integrated
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 text-sm font-display font-bold tracking-wider text-[#94A3B8]">
            <span>SEC EDGAR</span>
            <span>NASDAQ TOTALVIEW</span>
            <span>NYSE ARCA</span>
            <span>CBOE OPTIONS</span>
            <span>LSEG DATA</span>
            <span>MSCI GLOBAL</span>
          </div>
        </div>
      </section>

      {/* SECTION B: Access the World's Leading Markets & Sectors (Video 00:14 - 00:18) */}
      <section
        id="market-coverage"
        aria-label="Global Stock Market Sector Coverage"
        className="w-full bg-[#080D18] py-20 lg:py-24 border-y border-white/[0.07]"
      >
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-3">
              <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
                <span className="w-0.5 h-3 bg-white" />
                <span className="w-0.5 h-2 bg-[#3B82F6]" />
              </span>
              <span>Markets Overview</span>
            </div>
            <h2
              className="font-display font-semibold text-white tracking-tight"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)', textWrap: 'balance' }}
            >
              Access the World&rsquo;s Leading Equity Sectors
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Selector Column matching Video 00:14 "SCROLL MARKETS" */}
            <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl bg-[#0C1324] border border-white/10 p-6">
              <div>
                <div className="text-xs font-mono text-[#3B82F6] mb-4">
                  ↔ SELECT SECTOR COVERAGE
                </div>
                <div className="space-y-2">
                  {sectors.map((sec, idx) => {
                    const isActive = idx === activeSectorIdx;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setActiveSectorIdx(idx)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between ${
                          isActive
                            ? 'bg-[#132240] border-[#3B82F6]/50 text-white'
                            : 'bg-[#080D18] border-white/[0.06] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold">{sec.title}</div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">{sec.kicker}</div>
                        </div>
                        <span className="text-xs font-mono text-[#60A5FA] tabular-nums">
                          {sec.avgPe}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#94A3B8]">
                <span>Active Coverage Universe</span>
                <span className="font-mono text-white">4,500+ Tickers</span>
              </div>
            </div>

            {/* Right Interactive Sector Card Showcase matching Video 00:15 - 00:18 */}
            <div className="lg:col-span-8">
              {(() => {
                const sec = sectors[activeSectorIdx] || sectors[0];
                return (
                  <div
                    className="relative h-full rounded-2xl border border-[#3B82F6]/35 p-8 lg:p-10 flex flex-col justify-between overflow-hidden"
                    style={{
                      background:
                        'linear-gradient(135deg, #090F1D 0%, #0E1B36 60%, #172B54 100%)',
                    }}
                  >
                    {/* ASCII Binary Matrix Pattern at Top Right matching Video 00:15 */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-6 right-8 font-mono text-[10px] leading-[13px] tracking-widest text-[#60A5FA]/35 text-right select-none hidden sm:block"
                    >
                      <div>1101 0110 1110 0101 1101 1011</div>
                      <div>0111 1011 0101 1110 0110 1101</div>
                      <div>1110 0101 1101 0111 1011 0110</div>
                      <div>0101 1110 0110 1101 1110 1011</div>
                      <div>1011 0111 1011 0101 0111 1110</div>
                      <div>1101 1110 0101 1101 1011 0101</div>
                    </div>

                    <div className="relative z-10 max-w-lg">
                      <div className="w-11 h-11 rounded-full bg-[#3B82F6]/20 border border-[#60A5FA]/30 flex items-center justify-center text-[#60A5FA] mb-6">
                        <BarChart3 className="w-5 h-5" />
                      </div>

                      <div className="text-xs font-mono text-[#60A5FA] mb-2">{sec.kicker}</div>
                      <h3 className="text-3xl font-display font-semibold text-white mb-4">
                        {sec.title}
                      </h3>
                      <p className="text-sm md:text-base text-[#E2E8F0] leading-relaxed mb-8">
                        {sec.description}
                      </p>

                      {/* Featured Sector Ticker Buttons (Like S&P 500 | NASDAQ | Volatility in Video 00:16) */}
                      <div className="flex flex-wrap items-center gap-2.5 mb-8">
                        {sec.featuredTickers.map((tkr) => (
                          <button
                            key={tkr}
                            type="button"
                            onClick={() => onSelectTickerAndScroll(tkr)}
                            className="px-4 py-1.5 rounded-lg bg-[#0E1A33]/85 border border-white/15 hover:border-[#60A5FA] text-xs font-mono font-semibold text-white transition-colors cursor-pointer"
                          >
                            {tkr} ↗
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stepped Bottom Bar with CTA & Sector Metrics */}
                    <div className="relative z-10 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => onSelectTickerAndScroll(sec.featuredTickers[0])}
                        className="px-6 py-2.5 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {sec.primaryCta}
                      </button>

                      <div className="flex items-center gap-6 text-xs font-mono">
                        <div>
                          <span className="text-[#94A3B8] mr-1.5">Sector P/E:</span>
                          <span className="text-white font-semibold tabular-nums">{sec.avgPe}</span>
                        </div>
                        <div>
                          <span className="text-[#94A3B8] mr-1.5">24h Flow:</span>
                          <span className="text-[#60A5FA] font-semibold tabular-nums">
                            {sec.flow24h}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C: Discover Your Perfect Research Plan (Video 00:19 - 00:22 — Classic / Pro / VIP Dark Fluted Cards) */}
      <section
        id="research-plans"
        aria-label="Financia Institutional Research Plans"
        className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24"
      >
        <div className="flex flex-col items-center text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-3">
            <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
              <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
              <span className="w-0.5 h-3 bg-white" />
              <span className="w-0.5 h-2 bg-[#3B82F6]" />
            </span>
            <span>Research Tiers</span>
          </div>
          <h2
            className="font-display font-semibold text-white tracking-tight max-w-xl"
            style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)', textWrap: 'balance' }}
          >
            Discover Your Perfect Research Plan
          </h2>
        </div>

        {planNotice && (
          <div
            role="status"
            className="mb-8 p-4 rounded-xl bg-[#0F1D3A] border border-[#3B82F6]/50 text-xs font-mono text-[#60A5FA] flex items-center justify-between"
          >
            <span>{planNotice}</span>
            <button
              type="button"
              onClick={() => setPlanNotice(null)}
              className="text-white hover:underline ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 3 Dark Fluted-Emerald Cards matching Video 00:20 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const isSelected = selectedPlanId === plan.id;
            const PlanIcon = index === 0 ? Layers : index === 1 ? Cpu : ShieldCheck;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-7 flex flex-col justify-between overflow-hidden transition-all border ${
                  isSelected
                    ? 'bg-[#0E1A36] border-[#60A5FA]/60 shadow-2xl'
                    : 'bg-[#090F1E] border-white/15 hover:border-white/30'
                }`}
              >
                {/* Subtle fluted emerald & dot-matrix bottom texture matching video 00:20 */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-fluted-emerald opacity-80"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 bottom-3 w-28 h-24 bg-dot-matrix opacity-50"
                />

                <div className="relative z-10">
                  {/* Top Row: Circle Icon on Left + Tier Title on Right (Exact Video 00:20 Layout) */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-11 h-11 rounded-full bg-[#16264A] border border-[#3B82F6]/35 flex items-center justify-center text-[#60A5FA]">
                      <PlanIcon className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-display font-semibold text-white">
                      {plan.name}
                    </span>
                  </div>

                  <div className="text-xs text-[#60A5FA] mb-1">{plan.badge}</div>
                  <h3 className="text-lg font-display font-semibold text-white mb-2">
                    {plan.headline}
                  </h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed mb-5">{plan.subtitle}</p>

                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-3xl font-mono font-bold text-white tabular-nums">
                      {plan.priceMonthly}
                    </span>
                    <span className="text-xs text-[#94A3B8]">{plan.cadenceNote}</span>
                  </div>
                </div>

                {/* Inner Translucent Feature Box with White Pill CTA (Exact Video 00:20 Card Interior) */}
                <div className="relative z-10 rounded-xl bg-[#111C35]/90 border border-white/15 p-5 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#93C5FD] mb-3.5">
                      FEATURES:
                    </div>
                    <ul className="space-y-2.5 mb-6">
                      {plan.features.map((feat, fIdx) => (
                        <li
                          key={fIdx}
                          className="flex items-start gap-2.5 text-xs text-[#E2ECE9] leading-relaxed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleActivatePlan(plan)}
                    className={`w-full py-2.5 rounded-full font-semibold text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#60A5FA] text-[#05070C]'
                        : 'bg-white text-[#05070C] hover:bg-[#DBEAFE]'
                    }`}
                  >
                    {isSelected ? 'Active Workspace Tier' : 'Get Started'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Comparison Controls matching Video 00:22 */}
        <div className="mt-10 flex flex-col items-center text-center">
          <p className="text-xs text-[#94A3B8] mb-4">
            Compare research tiers, explore SEC filing depth, and choose what suits your analytical workflow.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onSelectTickerAndScroll('NVDA')}
              className="px-5 py-2.5 rounded-full bg-white text-[#05070C] font-medium text-xs hover:bg-[#DBEAFE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Try Live Terminal Demo
            </button>
            <button
              type="button"
              onClick={() => setShowCompareModal((prev) => !prev)}
              className="px-5 py-2.5 rounded-full bg-[#0F192E] text-white border border-white/15 hover:border-[#3B82F6] font-medium text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{showCompareModal ? 'Hide Tier Comparison' : 'Compare Research Tiers'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#60A5FA]" />
            </button>
          </div>
        </div>

        {/* Expandable Tier Comparison Matrix */}
        {showCompareModal && (
          <div className="mt-8 rounded-2xl bg-[#0C1324] border border-white/15 p-6 overflow-x-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <h3 className="text-base font-display font-semibold text-white">
                Research Tier Specification Matrix
              </h3>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                aria-label="Close specification matrix"
                className="p-1 text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#94A3B8] font-mono">
                  <th className="py-3 pr-4">Capability</th>
                  {plans.map((p) => (
                    <th key={p.id} className="py-3 px-4 text-white font-semibold">
                      {p.name} ({p.priceMonthly})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-[#E2E8F0]">
                <tr>
                  <td className="py-3 pr-4 font-medium text-[#94A3B8]">SEC EDGAR Depth</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-4 font-mono">
                      {p.limits.secFilingsDepth}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-[#94A3B8]">Multi-Agent Committee</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-4 font-mono">
                      {p.limits.agentMode}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-[#94A3B8]">Options &amp; Flow Feed</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-4 font-mono">
                      {p.limits.optionsFlowDelay}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-[#94A3B8]">Export &amp; API</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-4 font-mono">
                      {p.limits.exportFormats}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
