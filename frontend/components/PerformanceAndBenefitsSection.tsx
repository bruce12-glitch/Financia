import React, { useState } from 'react';
import {
  Globe,
  ShieldCheck,
  Cpu,
  Zap,
  Fingerprint,
  ArrowUpRight,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
} from 'lucide-react';
import { BlogBriefing, InsightAccordionItem } from '../types/financia';

interface PerformanceAndBenefitsSectionProps {
  insightsAccordion: InsightAccordionItem[];
  blogBriefings: BlogBriefing[];
  onSelectTickerAndScroll: (ticker: string) => void;
}

const RELIABILITY_NODES = [
  {
    id: 'markets',
    title: 'Markets Worldwide',
    description:
      'Access major global exchanges, benchmark indices, and SEC disclosures from a single high-contrast research terminal — wherever you operate.',
    metric: '4,500+ Equities & ETFs',
    position: 'left-top',
    icon: Globe,
  },
  {
    id: 'advanced',
    title: 'Advanced Quant Models',
    description:
      'Leverage institutional-grade multi-agent research committees designed for footnote precision, speed, and zero pre-training hallucination.',
    metric: '4-Tier Agent Pipeline',
    position: 'left-bottom',
    icon: Cpu,
  },
  {
    id: 'regulated',
    title: 'SEC Grounded & Verified',
    description:
      'Built on strict source-attribution guardrails that link every financial claim directly to Form 10-K, 10-Q, 8-K, and 13F filings.',
    metric: '100% Citation Traceability',
    position: 'right-top',
    icon: ShieldCheck,
  },
  {
    id: 'execution',
    title: 'Sub-Second Extraction',
    description:
      'Experience lightning-fast document synthesis and live chart updates with zero delays — even during peak earnings volatility.',
    metric: '0.42s Avg Parse Latency',
    position: 'right-bottom',
    icon: Zap,
  },
];

export const PerformanceAndBenefitsSection: React.FC<PerformanceAndBenefitsSectionProps> = ({
  insightsAccordion,
  blogBriefings,
  onSelectTickerAndScroll,
}) => {
  const [activeNodeId, setActiveNodeId] = useState<string>('markets');
  const [activeRadarFilter, setActiveRadarFilter] = useState<string>('All Markets');
  const [biometricVerified, setBiometricVerified] = useState<boolean>(false);
  const [analyticsMetric, setAnalyticsMetric] = useState<'flow' | 'gamma' | 'filings'>('flow');
  const [openAccordionId, setOpenAccordionId] = useState<string>(
    insightsAccordion[0]?.id || 'market-recap'
  );
  const [blogOffset, setBlogOffset] = useState<number>(0);

  const barHeightsByMetric: Record<'flow' | 'gamma' | 'filings', number[]> = {
    flow: [38, 64, 52, 86, 96, 74, 68, 92],
    gamma: [54, 42, 78, 62, 88, 94, 58, 80],
    filings: [70, 84, 60, 95, 72, 88, 90, 98],
  };

  const currentBars = barHeightsByMetric[analyticsMetric];

  const handlePrevBlog = () => {
    setBlogOffset((prev) => (prev === 0 ? Math.max(0, blogBriefings.length - 3) : prev - 1));
  };

  const handleNextBlog = () => {
    setBlogOffset((prev) => (prev + 1 >= blogBriefings.length - 2 ? 0 : prev + 1));
  };

  const visibleBlogs = blogBriefings.slice(blogOffset, blogOffset + 3);

  return (
    <div className="w-full bg-[#05070C] text-white">
      {/* SECTION 1: Performance You Can Rely On (Video 00:23 - 00:27 & Image 6 Top-Left, Dark Mode) */}
      <section
        aria-label="Performance You Can Rely On"
        className="relative w-full py-20 lg:py-28 border-t border-white/[0.07] overflow-hidden"
      >
        {/* Subtle dot-matrix background texture matching Video 00:24 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-dot-matrix opacity-25"
        />

        <div className="relative z-10 max-w-[1240px] mx-auto px-6">
          <div className="flex flex-col items-center text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-3">
              <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
                <span className="w-0.5 h-3 bg-white" />
                <span className="w-0.5 h-2 bg-[#3B82F6]" />
              </span>
              <span>Why Choose Financia</span>
            </div>
            <h2
              className="font-display font-semibold text-white tracking-tight max-w-md"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: 1.12, textWrap: 'balance' }}
            >
              Performance You Can Rely On
            </h2>
          </div>

          {/* 3-Column Layout: Left Feature Cards | Center Rim-Lit Analyst Silhouette | Right Feature Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Flank Cards */}
            <div className="lg:col-span-4 space-y-6">
              {RELIABILITY_NODES.slice(0, 2).map((node) => {
                const IconComp = node.icon;
                const active = activeNodeId === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setActiveNodeId(node.id)}
                    className={`w-full text-left p-6 rounded-2xl border transition-all cursor-pointer relative ${
                      active
                        ? 'bg-[#101B33] border-[#60A5FA]/50 shadow-xl'
                        : 'bg-[#0B111E]/90 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-display font-semibold text-white">
                        {node.title}
                      </h3>
                      <span className="w-9 h-9 rounded-full bg-[#162647] border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA]">
                        <IconComp className="w-4 h-4" />
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">
                      {node.description}
                    </p>
                    <div className="text-[11px] font-mono text-[#60A5FA]">{node.metric}</div>
                  </button>
                );
              })}
            </div>

            {/* Center High-Contrast Rim-Lit Analyst Portrait Silhouette (Matches Video 00:24 & Image 6) */}
            <div className="lg:col-span-4 flex flex-col items-center text-center">
              <div className="relative w-64 h-72 sm:w-72 sm:h-80 flex items-center justify-center mb-6">
                {/* Ambient Rim Glow */}
                <div
                  aria-hidden="true"
                  className="absolute inset-4 rounded-full blur-2xl opacity-45"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(96, 165, 250, 0.45) 0%, rgba(15, 29, 58, 0.14) 70%, transparent 100%)',
                  }}
                />
                {/* Crisp High-Contrast Rim-Lit Silhouette SVG */}
                <svg
                  viewBox="0 0 260 300"
                  className="relative z-10 w-full h-full"
                  role="img"
                  aria-label="High-contrast analyst profile silhouette with optical glasses"
                >
                  <defs>
                    <linearGradient id="rimLightGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#EFF6FF" />
                      <stop offset="35%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#090F1E" />
                    </linearGradient>
                    <linearGradient id="silhouetteFill" x1="0.2" y1="0" x2="0.8" y2="1">
                      <stop offset="0%" stopColor="#121D36" />
                      <stop offset="50%" stopColor="#080C17" />
                      <stop offset="100%" stopColor="#05070C" />
                    </linearGradient>
                  </defs>
                  {/* Shoulders & Suit Collar */}
                  <path
                    d="M 30 295 C 35 235, 75 215, 130 215 C 185 215, 225 235, 230 295 Z"
                    fill="url(#silhouetteFill)"
                    stroke="url(#rimLightGrad)"
                    strokeWidth="2"
                  />
                  {/* Head & Neck Profile Silhouette */}
                  <path
                    d="M 105 218 L 105 185 C 82 178, 72 155, 74 128 C 72 92, 92 56, 132 56 C 168 56, 188 84, 184 125 C 182 156, 168 176, 152 185 L 152 218 Z"
                    fill="url(#silhouetteFill)"
                    stroke="url(#rimLightGrad)"
                    strokeWidth="2.2"
                  />
                  {/* Signature Rim-Lit Eyeglasses Frame */}
                  <circle
                    cx="92"
                    cy="122"
                    r="16"
                    fill="rgba(96, 165, 250, 0.1)"
                    stroke="#DBEAFE"
                    strokeWidth="2.2"
                  />
                  <circle
                    cx="132"
                    cy="122"
                    r="16"
                    fill="rgba(96, 165, 250, 0.06)"
                    stroke="#60A5FA"
                    strokeWidth="1.8"
                  />
                  <line x1="108" y1="120" x2="116" y2="120" stroke="#DBEAFE" strokeWidth="2" />
                  <line x1="148" y1="120" x2="176" y2="115" stroke="#3B82F6" strokeWidth="1.8" />
                </svg>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed max-w-xs mb-5">
                Every analysis reflects our commitment to SEC grounding, low-latency telemetry, and institutional precision — trusted by thousands of equity researchers worldwide.
              </p>
              <button
                type="button"
                onClick={() => onSelectTickerAndScroll('NVDA')}
                className="px-6 py-2.5 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Analyze Stocks Now
              </button>
            </div>

            {/* Right Flank Cards */}
            <div className="lg:col-span-4 space-y-6">
              {RELIABILITY_NODES.slice(2, 4).map((node) => {
                const IconComp = node.icon;
                const active = activeNodeId === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setActiveNodeId(node.id)}
                    className={`w-full text-left p-6 rounded-2xl border transition-all cursor-pointer relative ${
                      active
                        ? 'bg-[#101B33] border-[#60A5FA]/50 shadow-xl'
                        : 'bg-[#0B111E]/90 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-9 h-9 rounded-full bg-[#162647] border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA]">
                        <IconComp className="w-4 h-4" />
                      </span>
                      <h3 className="text-lg font-display font-semibold text-white">
                        {node.title}
                      </h3>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">
                      {node.description}
                    </p>
                    <div className="text-[11px] font-mono text-[#60A5FA]">{node.metric}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Analyze Smarter. Grow Faster — 3-Column Dark Interactive Telemetry Panel (Video 00:28 - 00:35) */}
      <section
        aria-label="Our Benefits and Interactive Telemetry"
        className="w-full bg-[#080D18] py-20 lg:py-24 border-y border-white/[0.08]"
      >
        <div className="max-w-[1240px] mx-auto px-6">
          {/* Header Row matching Video 00:28 */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-3">
                <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                  <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
                  <span className="w-0.5 h-3 bg-white" />
                  <span className="w-0.5 h-2 bg-[#3B82F6]" />
                </span>
                <span>Our Benefits</span>
              </div>
              <h2
                className="font-display font-semibold text-white tracking-tight mb-3"
                style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: 1.1 }}
              >
                Analyze Smarter.
                <br />
                Decide Faster
              </h2>
              <p className="text-sm text-[#94A3B8] max-w-md leading-relaxed">
                Access global equity intelligence with confidence — from instant ticker screening to multi-agent SEC models, everything is built for analytical clarity.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectTickerAndScroll('MSFT')}
              className="px-6 py-2.5 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] transition-colors self-start md:self-end cursor-pointer whitespace-nowrap shrink-0"
            >
              Start Analyzing Now
            </button>
          </div>

          {/* 3-Column Interactive Showcase matching Video 00:29 - 00:35 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10 pt-10">
            {/* Column 1 (5 cols): Quick Setup Semicircular ASCII Dot-Matrix Radar */}
            <div className="lg:col-span-5 pr-0 lg:pr-8 pb-8 lg:pb-0 flex flex-col justify-between">
              <div className="relative h-56 flex items-center justify-center">
                {/* Interactive Callout Pills connected to Semicircle Dome (Exact Video 00:29) */}
                {(['Fast Setup', 'Zero Noise', 'SEC Verified', 'All Markets'] as const).map(
                  (tag, idx) => {
                    const posClasses = [
                      'top-3 left-4',
                      'top-16 left-0',
                      'top-1 right-12',
                      'top-14 right-0',
                    ][idx];
                    const isSelected = activeRadarFilter === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setActiveRadarFilter(tag)}
                        className={`absolute ${posClasses} z-10 px-3 py-1 rounded-md text-[11px] font-mono border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#3B82F6] text-[#05070C] border-[#60A5FA] font-semibold'
                            : 'bg-[#101A30] text-[#E2E8F0] border-white/15 hover:border-[#3B82F6]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  }
                )}

                {/* Semicircular ASCII Dot-Matrix Graphic */}
                <svg
                  viewBox="0 0 320 150"
                  className="w-full max-w-[320px] h-40 mt-10"
                  role="img"
                  aria-label="Semicircular dot-matrix stock screening radar"
                >
                  {Array.from({ length: 14 }).map((_, rowIdx) => {
                    const y = 140 - rowIdx * 9;
                    const halfSpan = Math.sqrt(Math.max(0, 1 - Math.pow(rowIdx / 14, 2))) * 135;
                    const colsCount = Math.floor(halfSpan / 5);
                    return (
                      <g key={rowIdx}>
                        {Array.from({ length: colsCount * 2 }).map((__, colIdx) => {
                          const x = 160 + (colIdx - colsCount) * 5.5;
                          const highlight = (rowIdx + colIdx) % 5 === 0;
                          return (
                            <rect
                              key={colIdx}
                              x={x}
                              y={y}
                              width={2.5}
                              height={4.5}
                              fill={highlight ? '#60A5FA' : 'rgba(255,255,255,0.28)'}
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="pt-4 flex items-end justify-between">
                <div>
                  <h3 className="text-lg font-display font-semibold text-white mb-1.5">
                    Instant Screening Setup
                  </h3>
                  <p className="text-xs text-[#94A3B8] max-w-xs leading-relaxed">
                    Launch your research workspace with zero friction — active filter:{' '}
                    <span className="text-[#60A5FA] font-mono">{activeRadarFilter}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTickerAndScroll('AMD')}
                  aria-label="Run instant stock screen on AMD"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#3B82F6] hover:text-[#05070C] flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </div>

            {/* Column 2 (3 cols): Biometric Workspace Verification (Video 00:31 - 00:32) */}
            <div className="lg:col-span-3 px-0 lg:px-8 py-8 lg:py-0 flex flex-col justify-between items-center text-center">
              <div className="flex flex-col items-center my-auto">
                <button
                  type="button"
                  onClick={() => setBiometricVerified((prev) => !prev)}
                  aria-pressed={biometricVerified}
                  aria-label="Verify Biometric Research Workspace"
                  className={`w-36 h-36 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    biometricVerified
                      ? 'bg-[#101D38] border-[#60A5FA] shadow-[0_0_30px_rgba(96,165,250,0.28)]'
                      : 'bg-[#0E1729] border-white/15 hover:border-[#3B82F6]'
                  }`}
                >
                  <Fingerprint
                    className={`w-16 h-16 transition-transform duration-200 ${
                      biometricVerified ? 'text-[#60A5FA] scale-105' : 'text-[#3B82F6]'
                    }`}
                  />
                </button>
                <span className="text-[11px] font-mono text-[#94A3B8] mt-3">
                  {biometricVerified ? (
                    <span className="text-[#60A5FA] inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> Workspace Verified
                    </span>
                  ) : (
                    'Just tap and verify'
                  )}
                </span>
              </div>

              <div className="w-full text-left pt-4">
                <h3 className="text-lg font-display font-semibold text-white mb-1.5">
                  Biometric Workspace
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Secure access to proprietary watchlists and custom SEC notes — fast, private, and encrypted.
                </p>
              </div>
            </div>

            {/* Column 3 (4 cols): Real-Time Dot-Matrix Analytics (Video 00:33 - 00:35) */}
            <div className="lg:col-span-4 pl-0 lg:pl-8 pt-8 lg:pt-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono text-[#94A3B8]">TELEMETRY MATRIX</span>
                  <div className="inline-flex items-center gap-1 bg-[#05070C] p-1 rounded-lg border border-white/10">
                    {(['flow', 'gamma', 'filings'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAnalyticsMetric(m)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                          analyticsMetric === m
                            ? 'bg-[#3B82F6] text-[#05070C] font-semibold'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dot-Matrix Bar Chart with 100 / 80 / 40 / 0 Y-Axis matching Video 00:34 */}
                <div className="relative h-44 flex items-end gap-3 pl-8 pr-2 pb-2 border-b border-white/10">
                  <div className="absolute left-0 top-2 bottom-2 flex flex-col justify-between text-[10px] font-mono text-[#64748B]">
                    <span>100</span>
                    <span>80</span>
                    <span>40</span>
                    <span>0</span>
                  </div>
                  {currentBars.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                    >
                      <div
                        className="w-full rounded-t bg-dot-matrix-dense border border-[#3B82F6]/35 transition-all duration-200"
                        style={{ height: `${val}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <h3 className="text-lg font-display font-semibold text-white mb-1.5">
                  Real-Time Analytics
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Make informed equity decisions with multi-timeframe charts and instant SEC filing velocity updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Insights That Move You Forward — Numbered Accordion (Video 00:36 - 00:41 & Image 6 Bottom-Left) */}
      <section
        id="insights-accordion"
        aria-label="Insights That Move You Forward"
        className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24"
      >
        <div className="flex flex-col items-center text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-3">
            <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
              <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
              <span className="w-0.5 h-3 bg-white" />
              <span className="w-0.5 h-2 bg-[#3B82F6]" />
            </span>
            <span>Resources Preview</span>
          </div>
          <h2
            className="font-display font-semibold text-white tracking-tight max-w-md"
            style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)', lineHeight: 1.12, textWrap: 'balance' }}
          >
            Insights That Move You Forward
          </h2>
        </div>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {insightsAccordion.map((item) => {
            const isOpen = openAccordionId === item.id;
            return (
              <div key={item.id} className="py-6 transition-all">
                {/* Accordion Header Row */}
                <button
                  type="button"
                  onClick={() => setOpenAccordionId(item.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-5">
                    <span
                      className={`w-8 h-8 rounded-full font-mono text-xs flex items-center justify-center border transition-colors ${
                        isOpen
                          ? 'bg-[#3B82F6] text-[#05070C] border-[#60A5FA] font-bold'
                          : 'bg-[#0C1324] text-[#94A3B8] border-white/15 group-hover:text-white'
                      }`}
                    >
                      {item.number}
                    </span>
                    <span className="text-lg md:text-xl font-display font-semibold text-white">
                      {item.title}
                    </span>
                  </div>

                  {/* Compact preview pill when collapsed, or Down arrow when expanded (Matches Video 00:38) */}
                  <div className="flex items-center gap-4">
                    {!isOpen && (
                      <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0C1324] border border-white/10 text-xs text-[#94A3B8]">
                        <span>{item.headline}</span>
                      </div>
                    )}
                    <span className="w-8 h-8 rounded-full bg-[#0C1324] border border-white/15 flex items-center justify-center text-[#60A5FA]">
                      {isOpen ? (
                        <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </span>
                  </div>
                </button>

                {/* Expanded Content Row matching Video 00:38 (3-Panel Architectural Display + Right Description & CTA) */}
                {isOpen && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pl-0 lg:pl-13">
                    {/* Center 3-Panel Poster Showcase ("Where clarity meets capital / For analysts who value logic over luck / Markets move. Systems matter.") */}
                    <div className="lg:col-span-7 rounded-2xl bg-[#0D1526] border border-white/15 p-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {item.cards.map((poster, pIdx) => (
                        <div
                          key={pIdx}
                          className={`rounded-xl p-4 min-h-[210px] flex flex-col justify-between border ${
                            pIdx === 0
                              ? 'bg-gradient-to-b from-[#122448] to-[#0A1121] border-[#3B82F6]/35'
                              : pIdx === 1
                              ? 'bg-fluted-silver-dark border-white/15'
                              : 'bg-[#070B14] bg-dot-matrix border-white/15'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[#60A5FA]">
                              {poster.kicker}
                            </span>
                            <span className="inline-flex items-end gap-0.5 h-2.5" aria-hidden="true">
                              <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
                              <span className="w-0.5 h-2.5 bg-white" />
                            </span>
                          </div>
                          <div className="text-base font-display font-semibold text-white leading-snug my-4">
                            {poster.quote}
                          </div>
                          <div className="text-[11px] font-mono text-[#93C5FD] pt-2 border-t border-white/10">
                            {poster.metric}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right Description & Discover Button */}
                    <div className="lg:col-span-5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-2xl font-display font-semibold text-white mb-3">
                          {item.headline}
                        </h3>
                        <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
                          {item.summary}
                        </p>
                        <button
                          type="button"
                          onClick={() => onSelectTickerAndScroll(item.targetTicker)}
                          className="px-5 py-2.5 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>{item.ctaLabel}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: A Solid Choice for Confident Growth (3D Monolith Ingot Banner — Video 00:42 & Image 6 Bottom-Right) */}
      <section
        aria-label="Built for Confident Institutional Research"
        className="max-w-[1240px] mx-auto px-6 pb-20"
      >
        <div
          className="relative rounded-3xl border border-white/15 px-6 py-16 lg:py-20 flex flex-col items-center text-center overflow-hidden"
          style={{
            background:
              'radial-gradient(circle at 85% 25%, rgba(59, 130, 246, 0.24) 0%, transparent 45%), radial-gradient(circle at 50% 85%, rgba(37, 99, 235, 0.28) 0%, #070B14 65%)',
          }}
        >
          {/* Bottom-left ASCII dot-matrix corner matching Video 00:42 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-6 bottom-6 w-48 h-40 bg-dot-matrix opacity-45"
          />

          <div className="relative z-10 inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-3">
            <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
              <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
              <span className="w-0.5 h-3 bg-white" />
              <span className="w-0.5 h-2 bg-[#3B82F6]" />
            </span>
            <span>Built for Conviction</span>
          </div>

          <h2
            className="relative z-10 font-display font-semibold text-white tracking-tight max-w-lg mb-3"
            style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.85rem)', lineHeight: 1.12, textWrap: 'balance' }}
          >
            A Solid Choice for Confident Analysis
          </h2>
          <p className="relative z-10 text-sm text-[#94A3B8] mb-7">
            Source-grounded reliability and quantitative precision embedded in everything we build
          </p>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 mb-12">
            <button
              type="button"
              onClick={() => onSelectTickerAndScroll('NVDA')}
              className="px-6 py-2.5 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Launch Research Terminal
            </button>
            <a
              href="#about-financia"
              className="px-6 py-2.5 rounded-full bg-[#0E1729] text-white border border-white/15 hover:border-[#3B82F6] font-medium text-xs inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Learn More About Us</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#60A5FA]" />
            </a>
          </div>

          {/* 3D Isometric Financia Titanium-Obsidian Ingot Monolith SVG (Exact Match to Video 00:42) */}
          <div className="relative z-10 w-72 h-56 sm:w-88 sm:h-64 flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute bottom-3 w-56 h-10 rounded-full bg-[#3B82F6]/30 blur-xl"
            />
            <svg
              viewBox="0 0 360 240"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label="3D isometric Financia brushed titanium monolith block"
            >
              <defs>
                <linearGradient id="ingotTop" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="50%" stopColor="#1E293B" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
                <linearGradient id="ingotSide" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#16223D" />
                  <stop offset="100%" stopColor="#080D18" />
                </linearGradient>
                <linearGradient id="ingotBaseGlow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#93C5FD" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
              {/* Tilted 3D Monolith Bar */}
              <g transform="translate(15, -5)">
                <polygon
                  points="75,45 145,15 275,135 205,165"
                  fill="url(#ingotTop)"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1"
                />
                <polygon
                  points="75,45 205,165 180,205 50,85"
                  fill="url(#ingotSide)"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                />
                <polygon
                  points="205,165 275,135 250,175 180,205"
                  fill="url(#ingotBaseGlow)"
                  stroke="#DBEAFE"
                  strokeWidth="1"
                />
                <text
                  x="165"
                  y="102"
                  transform="rotate(42, 165, 102)"
                  textAnchor="middle"
                  className="fill-white/40 font-display font-bold text-lg tracking-widest select-none"
                >
                  ▮ financia
                </text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* SECTION 5: Explore the Future of Research Innovation — Blog Carousel (Video 00:44 - 00:47) */}
      <section
        aria-label="Explore the Future of Equity Research Innovation"
        className="max-w-[1240px] mx-auto px-6 py-16 lg:py-20 border-t border-white/[0.07]"
      >
        <div className="flex flex-col items-center text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-3">
            <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
              <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
              <span className="w-0.5 h-3 bg-white" />
              <span className="w-0.5 h-2 bg-[#3B82F6]" />
            </span>
            <span>Research Briefings</span>
          </div>
          <h2
            className="font-display font-semibold text-white tracking-tight max-w-lg"
            style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)', lineHeight: 1.12, textWrap: 'balance' }}
          >
            Explore the Future of Stock Intelligence
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleBlogs.map((blog) => (
            <article
              key={blog.id}
              className="rounded-2xl bg-[#0C1324] border border-white/10 hover:border-[#3B82F6]/50 transition-colors overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Stylized Architectural Card Header Visual */}
                <div
                  className={`h-48 p-5 flex flex-col justify-between border-b border-white/10 ${
                    blog.visualVariant === 'posters'
                      ? 'bg-gradient-to-br from-[#13264D] via-[#0B152C] to-[#060A14]'
                      : blog.visualVariant === 'terminal'
                      ? 'bg-fluted-silver-dark'
                      : 'bg-gradient-to-tr from-[#0B1324] via-[#172B54] to-[#1E3A8A]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#60A5FA]">
                    <span>{blog.category}</span>
                    <span>Ticker: {blog.relatedTicker}</span>
                  </div>
                  <div className="my-auto">
                    <div className="text-lg font-display font-semibold text-white leading-snug">
                      {blog.title}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#CBD5E1]">
                    <span>FINANCIA DESK</span>
                    <span>SEC VERIFIED</span>
                  </div>
                </div>

                {/* Metadata & Excerpt */}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono mb-3">
                    <span>{blog.readTime}</span>
                    <span aria-hidden="true">·</span>
                    <span>{blog.date}</span>
                  </div>
                  <h3 className="text-lg font-display font-semibold text-white mb-2.5">
                    {blog.title}
                  </h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">{blog.excerpt}</p>
                </div>
              </div>

              <div className="px-6 pb-6">
                <button
                  type="button"
                  onClick={() => onSelectTickerAndScroll(blog.relatedTicker)}
                  className="text-xs font-mono font-semibold text-[#60A5FA] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Load {blog.relatedTicker} Intelligence Report</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom Progress Bar & Left/Right Carousel Buttons matching Video 00:46 */}
        <div className="mt-10 flex items-center justify-between gap-6">
          <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#60A5FA] transition-all duration-200"
              style={{
                width: `${((blogOffset + 3) / Math.max(blogBriefings.length, 3)) * 100}%`,
              }}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrevBlog}
              aria-label="Previous research briefing"
              className="w-9 h-9 rounded-full bg-[#0F192E] border border-white/15 hover:border-[#60A5FA] flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextBlog}
              aria-label="Next research briefing"
              className="w-9 h-9 rounded-full bg-[#0F192E] border border-white/15 hover:border-[#60A5FA] flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
