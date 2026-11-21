import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { AuthUser } from '../frontend/utils/authEngine';

interface LandingAccessGateSectionProps {
  currentUser: AuthUser | null;
  onOpenSignup: () => void;
  onOpenLogin: () => void;
  onEnterFrontend: () => void;
}

const WORKSPACE_CAPABILITIES = [
  {
    title: 'Mutual Fund & ETF Lookup',
    detail:
      'Look up funds by name, ISIN, or scheme code to check daily NAV history, expense ratios, and how they stack up against peers.',
  },
  {
    title: 'Interactive Charting & Indicators',
    detail:
      'Review price trends with moving averages, Bollinger Bands, and RSI, or overlay multiple funds and gold on a single chart.',
  },
  {
    title: 'Saved Watchlists & Price Alerts',
    detail:
      'Keep the funds and ETFs you follow in one place and set alerts whenever a price or NAV crosses your target level.',
  },
  {
    title: 'Holdings, Sector Heatmaps & Global Sessions',
    detail:
      'See what a fund actually owns, explore bull and bear sector weights, and follow major market venues across time zones.',
  },
];

export const LandingAccessGateSection: React.FC<LandingAccessGateSectionProps> = ({
  currentUser,
  onOpenSignup,
  onOpenLogin,
  onEnterFrontend,
}) => {
  return (
    <section
      id="frontend-access-gate"
      aria-label="Financia Workspace Access"
      className="w-full bg-[#f8fafc] text-[#090e1a] border-b border-[#e2e8f0] py-20 px-4 sm:px-6 md:px-10"
    >
      <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Editorial Column */}
        <div className="lg:col-span-6">
          <div className="text-[12.5px] font-semibold text-[#2563eb] mb-2.5">
            Workspace Access
          </div>
          <h2 className="type-display-xl text-[#090e1a]">
            Everything you need to research funds, gold, and bonds.
          </h2>
          <p className="text-[16px] font-normal text-[#475569] mt-4 leading-[1.6] max-w-xl">
            {currentUser
              ? `Signed in as ${currentUser.name}. Open your workspace to review watchlists, compare funds side by side, and inspect sector heatmaps.`
              : 'Create a free account to save watchlists, set custom price alerts, compare funds side by side, and open the full research workspace.'}
          </p>

          <div className="flex flex-wrap items-center gap-3.5 mt-8">
            <button
              type="button"
              onClick={currentUser ? onEnterFrontend : onOpenSignup}
              className="btn-primary-pill text-[15px] min-h-[46px] inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-[0_12px_28px_rgba(9,14,26,0.18)]"
            >
              <span>{currentUser ? 'Open Workspace' : 'Create free account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!currentUser && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="btn-secondary-pill text-[14.5px] min-h-[46px] inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Obsidian Capability Ledger */}
        <div className="lg:col-span-6 rounded-[14px] bg-[#070d1c] text-white p-7 sm:p-8 shadow-level-2 border border-white/[0.1]">
          <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.1]">
            <span className="font-display text-[14px] font-semibold text-white">
              Included in every Financia workspace
            </span>
            <span className="text-[12px] font-mono text-[#38bdf8]">
              Free access
            </span>
          </div>

          <ul className="divide-y divide-white/[0.08]">
            {WORKSPACE_CAPABILITIES.map((item) => (
              <li key={item.title} className="py-4 first:pt-1 last:pb-1 flex items-start gap-3">
                <Check className="w-4 h-4 text-[#38bdf8] shrink-0 mt-1" />
                <div>
                  <div className="text-[14px] font-semibold text-white">
                    {item.title}
                  </div>
                  <p className="text-[13px] font-normal text-[#94a3b8] leading-[1.55] mt-1">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
