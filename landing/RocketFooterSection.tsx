import React from 'react';
import { Globe } from 'lucide-react';
import { FinanciaLogo } from './FinanciaLogo';

interface RocketFooterSectionProps {
  activeRegion: string;
  onToggleRegion: () => void;
  onJumpToSection: (sectionId: string) => void;
  onOpenSearch: () => void;
}

const FOOTER_COLUMNS = [
  {
    heading: 'Live Tools',
    links: [
      { label: 'AMFI Fund Screener', target: 'live-nav-explorer' },
      { label: 'SQLite SIF Ledger', target: 'live-nav-explorer' },
      { label: 'Yield Curve & Gold', target: 'macro-bullion-desk' },
      { label: 'Analysis Terminal', target: 'live-terminal' },
    ],
  },
  {
    heading: 'Asset Coverage',
    links: [
      { label: 'Direct Mutual Funds', target: 'live-nav-explorer' },
      { label: 'Spot Gold (PAXG)', target: 'macro-bullion-desk' },
      { label: 'U.S. Treasury Curve', target: 'macro-bullion-desk' },
      { label: 'Market Summary', target: 'market-summary' },
    ],
  },
  {
    heading: 'Workspace Views',
    links: [
      { label: 'Multi-Fund Compare', target: 'live-terminal' },
      { label: 'Debt & Macro Desk', target: 'economy-section' },
      { label: 'FX & Rates', target: 'forex-section' },
      { label: '3D Global Hubs', target: 'global-exchanges-globe' },
    ],
  },
  {
    heading: 'Data Sources',
    links: [
      { label: 'AMFI Daily NAVs', target: 'live-nav-explorer' },
      { label: 'U.S. Treasury (FMP)', target: 'macro-bullion-desk' },
      { label: 'Binance Spot Gold', target: 'macro-bullion-desk' },
      { label: 'Disclosures', target: 'rocket-footer' },
    ],
  },
];

export const RocketFooterSection: React.FC<RocketFooterSectionProps> = ({
  activeRegion,
  onToggleRegion,
  onJumpToSection,
  onOpenSearch,
}) => {
  return (
    <footer
      id="rocket-footer"
      className="relative w-full bg-white text-[#64748b] overflow-hidden pt-16 pb-20 lg:min-h-[430px] px-6"
    >
      {/* Signature Right-Side Atmospheric Rocket Launch Artwork (Harmonized Cobalt-Ice-Gold Palette) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-full md:w-[70%] h-full z-0"
      >
        <svg
          viewBox="0 0 900 440"
          preserveAspectRatio="xMaxYMax meet"
          className="w-full h-full"
        >
          <defs>
            <radialGradient id="financiaSkyWashGrad" cx="76%" cy="64%" r="58%">
              <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.92" />
              <stop offset="48%" stopColor="#EFF6FF" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="financiaHorizonMountain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.58" />
              <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.14" />
            </linearGradient>
            <linearGradient
              id="financiaPlumeCoreGrad"
              x1="612"
              y1="432"
              x2="758"
              y2="98"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FEF3C7" stopOpacity="1" />
              <stop offset="28%" stopColor="#FDE68A" stopOpacity="0.94" />
              <stop offset="68%" stopColor="#BAE6FD" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.96" />
            </linearGradient>
            <radialGradient
              id="financiaIgnitionGlow"
              cx="616"
              cy="424"
              r="138"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="25%" stopColor="#FDE047" stopOpacity="0.65" />
              <stop offset="56%" stopColor="#F59E0B" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#DBEAFE" stopOpacity="0" />
            </radialGradient>
            <filter id="financiaSoftGlowBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="12" />
            </filter>
          </defs>

          <rect x="0" y="0" width="900" height="440" fill="url(#financiaSkyWashGrad)" />

          <path
            d="M 140,440 Q 340,356 560,374 T 900,334 L 900,440 Z"
            fill="url(#financiaHorizonMountain)"
          />

          <circle cx="616" cy="424" r="130" fill="url(#financiaIgnitionGlow)" />

          <path
            d="M 590,440 C 622,354 680,226 756,100 L 762,102 C 706,232 658,360 644,440 Z"
            fill="#FDE68A"
            opacity="0.52"
            filter="url(#financiaSoftGlowBlur)"
          />

          <path
            d="M 610,440 C 636,356 688,228 757,100 L 760,101.5 C 696,232 652,358 628,440 Z"
            fill="url(#financiaPlumeCoreGrad)"
          />

          <line
            x1="759"
            y1="99"
            x2="740"
            y2="140"
            stroke="#FFFFFF"
            strokeWidth="3.8"
            strokeLinecap="round"
          />

          <g transform="translate(765, 86) rotate(24) scale(1.5)">
            <path
              d="M 0,-18 C 2.8,-10 3.4,0 3.4,10 L -3.4,10 C -3.4,0 -2.8,-10 0,-18 Z"
              fill="#090e1a"
            />
            <path d="M 0,-18 C 1.8,-10 2.2,0 2.2,10 L 0,10 Z" fill="#FFFFFF" />
            <path d="M -3.4,4 L -6.8,11.5 L -3.4,10 Z" fill="#0f172a" />
            <path d="M 3.4,4 L 6.8,11.5 L 3.4,10 Z" fill="#2563eb" />
            <ellipse cx="0" cy="11.5" rx="2.8" ry="4.4" fill="#F59E0B" />
            <ellipse cx="0" cy="11" rx="1.5" ry="2.8" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {/* Left-Side Readability Scrim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[68%] bg-gradient-to-r from-white via-white/92 to-transparent z-[1]"
      />

      <div className="relative z-10 max-w-[1240px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-6">
          <div className="lg:col-span-4 space-y-5">
            <button
              type="button"
              onClick={onOpenSearch}
              className="cursor-pointer inline-flex items-center"
              aria-label="Financia Search"
            >
              <FinanciaLogo variant="dark" />
            </button>

            <div>
              <button
                type="button"
                onClick={onToggleRegion}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#e2e8f0] bg-[#f8fafc] hover:border-[#94a3b8] text-[13px] font-medium text-[#090e1a] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Globe className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>{activeRegion === 'IN' ? 'India (INR · AMFI)' : 'Global (USD · ETF)'}</span>
              </button>
            </div>

            <div className="space-y-1.5 text-[12px] font-normal leading-[1.55] text-[#64748b] max-w-xs">
              <p>Mutual fund NAVs sourced live from AMFI (mfnav.in, mfapi.in) and local SQLite nav_master.</p>
              <p>Spot gold (PAXG/USDT) via Binance, U.S. Treasury yields &amp; ETF holdings via FMP &amp; API Ninjas.</p>
              <p className="pt-1 text-[#64748b]">
                For informational and research purposes only. Not SEBI-registered investment advice.
              </p>
              <p className="pt-1 font-medium text-[#090e1a]">© 2026 Financia</p>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <div className="font-display text-[12.5px] font-semibold text-[#090e1a] mb-3.5">
                  {col.heading}
                </div>
                <ul className="space-y-2.5 text-[13px] font-normal text-[#334155]">
                  {col.links.map((lnk) => (
                    <li key={lnk.label}>
                      <button
                        type="button"
                        onClick={() => onJumpToSection(lnk.target)}
                        className="hover:text-[#2563eb] transition-colors text-left cursor-pointer"
                      >
                        {lnk.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="hidden lg:block lg:col-span-2" aria-hidden="true" />
        </div>
      </div>
    </footer>
  );
};
