import React from 'react';
import { Globe, Heart, ShieldCheck } from 'lucide-react';
import { FinanciaLogo } from './FinanciaLogo';

interface RocketFooterSectionProps {
  activeRegion: string;
  onToggleRegion: () => void;
  onJumpToSection: (sectionId: string) => void;
  onOpenSearch: () => void;
}

const FOOTER_COLUMNS = [
  {
    groups: [
      {
        heading: 'MORE THAN A PRODUCT',
        links: [
          { label: 'Stock Analysis', target: 'live-terminal' },
          { label: 'Supercharts', target: 'supercharts-section' },
        ],
      },
      {
        heading: 'SCREENERS',
        links: [
          { label: 'Stocks', target: 'indian-stocks-section' },
          { label: 'ETFs', target: 'market-summary' },
          { label: 'Bonds', target: 'market-summary' },
          { label: 'Crypto coins', target: 'crypto-section' },
          { label: 'CEX pairs', target: 'crypto-section' },
          { label: 'DEX pairs', target: 'crypto-section' },
          { label: 'Pine', target: 'supercharts-section' },
        ],
      },
      {
        heading: 'HEATMAPS',
        links: [
          { label: 'Stocks', target: 'indian-stocks-section' },
          { label: 'ETFs', target: 'market-summary' },
          { label: 'Crypto coins', target: 'crypto-section' },
        ],
      },
      {
        heading: 'CALENDARS',
        links: [
          { label: 'Economic', target: 'economy-section' },
          { label: 'Earnings', target: 'indian-stocks-section' },
          { label: 'Dividends', target: 'indian-stocks-section' },
          { label: 'IPOs', target: 'market-summary' },
        ],
      },
      {
        heading: 'MORE PRODUCTS',
        links: [
          { label: 'News Flow', target: 'forex-section' },
          { label: 'Portfolios', target: 'market-summary' },
          { label: 'Yield Curves', target: 'economy-section' },
          { label: 'Options', target: 'supercharts-section' },
          { label: 'Macro Maps', target: 'economy-section' },
          { label: 'Pine Script®', target: 'supercharts-section' },
          { label: 'MCP Server', target: 'supercharts-section' },
        ],
      },
      {
        heading: 'APPS',
        links: [
          { label: 'Mobile', target: 'market-summary' },
          { label: 'Desktop', target: 'supercharts-section' },
        ],
      },
    ],
  },
  {
    groups: [
      {
        heading: 'TOOLS & SUBSCRIPTIONS',
        links: [
          { label: 'Features', target: 'supercharts-section' },
          { label: 'Pricing', target: 'market-summary' },
          { label: 'Market data', target: 'market-summary' },
          { label: 'Gift plans', target: 'market-summary' },
        ],
      },
      {
        heading: 'TRADING',
        links: [
          { label: 'Overview', target: 'market-summary' },
          { label: 'Brokers', target: 'economy-section' },
          { label: 'Brokers comparison', target: 'economy-section' },
          { label: 'The Leap', target: 'market-summary' },
        ],
      },
      {
        heading: 'SPECIAL OFFERS',
        links: [
          { label: 'CME Group futures', target: 'futures-section' },
          { label: 'Eurex futures', target: 'futures-section' },
          { label: 'US stocks bundle', target: 'market-summary' },
        ],
      },
      {
        heading: 'ABOUT COMPANY',
        links: [
          { label: 'Who we are', target: 'market-summary' },
          { label: 'Space mission', target: 'rocket-footer' },
          { label: 'Blog', target: 'forex-section' },
          { label: 'Help Center', target: 'economy-section' },
          { label: 'Careers', target: 'rocket-footer' },
          { label: 'Media kit', target: 'rocket-footer' },
        ],
      },
      {
        heading: 'POLICIES & SECURITY',
        links: [
          { label: 'Terms of Use', target: 'rocket-footer' },
          { label: 'Disclaimer', target: 'rocket-footer' },
          { label: 'Privacy Policy', target: 'rocket-footer' },
          { label: 'Cookies Policy', target: 'rocket-footer' },
          { label: 'Accessibility Statement', target: 'rocket-footer' },
          { label: 'Trust Center', target: 'rocket-footer' },
          { label: 'Security tips', target: 'rocket-footer' },
          { label: 'Status page', target: 'rocket-footer' },
        ],
      },
    ],
  },
  {
    groups: [
      {
        heading: 'COMMUNITY',
        links: [
          { label: 'Social network', target: 'market-summary' },
          { label: 'Wall of Love', target: 'market-summary' },
          { label: 'Refer a friend', target: 'market-summary' },
          { label: 'Creator program', target: 'market-summary' },
          { label: 'House Rules', target: 'market-summary' },
          { label: 'Moderators', target: 'market-summary' },
        ],
      },
      {
        heading: 'IDEAS',
        links: [
          { label: 'Trading', target: 'market-summary' },
          { label: 'Education', target: 'market-summary' },
          { label: "Editors' picks", target: 'market-summary' },
        ],
      },
      {
        heading: 'PINE SCRIPT',
        links: [
          { label: 'Indicators & strategies', target: 'market-summary' },
          { label: 'Wizards', target: 'market-summary' },
          { label: 'Freelancers', target: 'market-summary' },
          { label: 'Marketplace', target: 'market-summary' },
        ],
      },
    ],
  },
  {
    groups: [
      {
        heading: 'BUSINESS SOLUTIONS',
        links: [
          { label: 'Widgets', target: 'supercharts-section' },
          { label: 'Charting libraries', target: 'supercharts-section' },
          { label: 'Lightweight Charts™', target: 'supercharts-section' },
          { label: 'Advanced Charts', target: 'supercharts-section' },
          { label: 'Trading Platform', target: 'supercharts-section' },
        ],
      },
      {
        heading: 'GROWTH OPPORTUNITIES',
        links: [
          { label: 'Advertising', target: 'rocket-footer' },
          { label: 'Brokerage integration', target: 'economy-section' },
          { label: 'Partner program', target: 'rocket-footer' },
          { label: 'Education program', target: 'rocket-footer' },
        ],
      },
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
      className="relative w-full bg-white text-[#131722] border-t border-[#E0E3EB] overflow-hidden"
    >
      {/* Signature Right-Side Atmospheric Rocket Launch Artwork (Matches image_1ecaff0a.png & PDF Page 18) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-10 sm:bottom-12 w-full md:w-[70%] h-[440px] md:h-[540px] z-0"
      >
        <svg
          viewBox="0 0 900 520"
          preserveAspectRatio="xMaxYMax slice"
          className="w-full h-full"
        >
          <defs>
            {/* Seamless White-to-Ice-Blue Atmospheric Mist Gradient */}
            <radialGradient id="skyWashGrad" cx="72%" cy="68%" r="58%">
              <stop offset="0%" stopColor="#DCE6F5" stopOpacity="0.95" />
              <stop offset="48%" stopColor="#EBF1FA" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            {/* Distant Horizon Mountain Mist */}
            <linearGradient id="horizonMountain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D3DFEE" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#EBF0F7" stopOpacity="0.1" />
            </linearGradient>

            {/* Incandescent Golden-White Rocket Exhaust Trail */}
            <linearGradient id="plumeCoreGrad" x1="590" y1="505" x2="726" y2="82" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF7CC" stopOpacity="1" />
              <stop offset="28%" stopColor="#FDE68A" stopOpacity="0.92" />
              <stop offset="68%" stopColor="#E0F2FE" stopOpacity="0.78" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
            </linearGradient>

            {/* Bright Exhaust Ground Glow */}
            <radialGradient id="ignitionGlow" cx="595" cy="495" r="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="25%" stopColor="#FDE047" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#FDBA74" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#DCE6F5" stopOpacity="0" />
            </radialGradient>

            <filter id="softGlowBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="12" />
            </filter>
          </defs>

          {/* Soft Blue Atmospheric Sky Backdrop */}
          <rect x="0" y="0" width="900" height="520" fill="url(#skyWashGrad)" />

          {/* Gentle Atmospheric Horizon Ridges */}
          <path
            d="M 140,520 Q 340,425 560,445 T 900,400 L 900,520 Z"
            fill="url(#horizonMountain)"
          />

          {/* Soft Exhaust Glow Bloom at Launch Pad */}
          <circle cx="595" cy="495" r="135" fill="url(#ignitionGlow)" />

          {/* Wide Luminous Exhaust Plume Halo */}
          <path
            d="M 568,518 C 598,415 655,245 724,84 L 729,85 C 675,252 630,425 620,518 Z"
            fill="#FDE68A"
            opacity="0.45"
            filter="url(#softGlowBlur)"
          />

          {/* Crisp Inner Rocket Contrail Trajectory Arc */}
          <path
            d="M 588,518 C 612,415 660,248 725,84 L 727.5,85 C 668,252 624,422 604,518 Z"
            fill="url(#plumeCoreGrad)"
          />

          {/* White-Hot Exhaust Tail Spark Right Behind Rocket */}
          <line
            x1="726"
            y1="84"
            x2="710"
            y2="128"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Detailed Rising Rocket Orbiter Silhouette angled along trajectory */}
          <g transform="translate(729, 73) rotate(22)">
            {/* Nosecone & Upper Stage */}
            <path d="M 0,-18 C 2.6,-10 3.2,0 3.2,10 L -3.2,10 C -3.2,0 -2.6,-10 0,-18 Z" fill="#1E293B" />
            <path d="M 0,-18 C 1.8,-10 2.1,0 2.1,10 L 0,10 Z" fill="#FFFFFF" />
            {/* Boosters / Fins */}
            <path d="M -3.2,4 L -6.2,11 L -3.2,10 Z" fill="#334155" />
            <path d="M 3.2,4 L 6.2,11 L 3.2,10 Z" fill="#475569" />
            {/* Engine Ignition Core */}
            <ellipse cx="0" cy="11.5" rx="2.6" ry="4" fill="#FDE047" />
            <ellipse cx="0" cy="11" rx="1.4" ry="2.6" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {/* Main Footer Grid Content */}
      <div className="relative z-10 max-w-[1340px] mx-auto px-6 md:px-10 pt-14 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12">
          {/* Brand, Socials, Locale & Compliance Column */}
          <div className="lg:col-span-4 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenSearch}
                className="cursor-pointer"
                aria-label="Financia Search"
              >
                <FinanciaLogo variant="dark" />
              </button>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-[#434651]">
                MADE BY HUMANS
                <Heart className="w-3.5 h-3.5 text-[#2962FF] fill-[#2962FF]" />
              </span>
            </div>

            {/* Social Row */}
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[#131722]">
              {['𝕏', 'f', '▶', '◎', 'in', '✈', '♪', '●'].map((icon, i) => (
                <a
                  key={i}
                  href="#market-summary"
                  aria-label={`Financia social channel ${i + 1}`}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#F0F3FA] transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>

            {/* Locale Button */}
            <div>
              <button
                type="button"
                onClick={onToggleRegion}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#E0E3EB] bg-white hover:bg-[#F8F9FD] text-xs font-semibold text-[#131722] transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#434651]" />
                <span>{activeRegion === 'IN' ? 'English (India)' : 'English (Global)'}</span>
              </button>
            </div>

            {/* Attribution Notes */}
            <div className="space-y-2 text-[11px] leading-relaxed text-[#787B86] max-w-xs">
              <p>
                Select market data provided by <span className="text-[#2962FF]">ICE Data Services</span>.
              </p>
              <p>
                Select reference data provided by FactSet. Copyright © 2026 FactSet Research Systems Inc.
              </p>
              <p>
                Copyright © 2026, American Bankers Association. CUSIP Database provided by FactSet Research Systems Inc.
              </p>
              <p>
                SEC filings and other documents provided by <span className="text-[#2962FF]">Quartr</span>.
              </p>
              <p>© 2026 Financia, Inc.</p>
            </div>

            {/* Compliance Badges Matching image_1ecaff0a.png */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E0E3EB] bg-white text-[11px] font-medium text-[#131722]">
                <span className="w-6 h-6 rounded-full border border-[#131722] flex items-center justify-center text-[9px] font-bold">
                  SOC2
                </span>
                <span>
                  SOC 2
                  <br />
                  Compliant
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E0E3EB] bg-white text-[11px] font-medium text-[#131722]">
                <ShieldCheck className="w-5 h-5 text-[#131722]" />
                <span>
                  GDPR
                  <br />
                  Compliant
                </span>
              </div>
            </div>
          </div>

          {/* 4 Navigation Link Columns Matching PDF Page 18 */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {FOOTER_COLUMNS.map((col, colIdx) => (
              <div key={colIdx} className="space-y-6">
                {col.groups.map((grp) => (
                  <div key={grp.heading}>
                    <div className="text-[10px] font-bold tracking-wider uppercase text-[#787B86] mb-2.5">
                      {grp.heading}
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#131722]">
                      {grp.links.map((lnk) => (
                        <li key={lnk.label}>
                          <button
                            type="button"
                            onClick={() => onJumpToSection(lnk.target)}
                            className="hover:text-[#2962FF] transition-colors text-left cursor-pointer"
                          >
                            {lnk.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Monumental Bottom Motto Matching image_1ecaff0a.png & PDF Page 19 */}
        <div className="pt-8 pb-4 text-center">
          <p
            className="font-display font-extrabold text-[#131722] uppercase select-none"
            style={{
              fontSize: 'clamp(1.25rem, 4.1vw, 3.35rem)',
              letterSpacing: '0.26em',
              lineHeight: 1.15,
            }}
          >
            LOOK FIRST / THEN LEAP.
          </p>
        </div>
      </div>
    </footer>
  );
};
