import React from 'react';
import { ArrowRight, Globe2, Lock } from 'lucide-react';
import { AuthUser } from '../frontend/utils/authEngine';

interface LandingAccessGateSectionProps {
  currentUser: AuthUser | null;
  onOpenSignup: () => void;
  onOpenLogin: () => void;
  onEnterFrontend: () => void;
}

export const LandingAccessGateSection: React.FC<LandingAccessGateSectionProps> = ({
  currentUser,
  onOpenSignup,
  onOpenLogin,
  onEnterFrontend,
}) => {
  return (
    <section
      id="frontend-access-gate"
      aria-label="Frontend Terminal and 3D Market Atlas Access"
      className="w-full bg-[#070A10] text-white border-t border-[#161B26] py-16 md:py-20 px-4 md:px-10"
    >
      <div className="max-w-[1220px] mx-auto rounded-2xl border border-[#222836] bg-[#0B0F17] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left Column: Conversion Copy & Actions */}
        <div className="lg:col-span-7 p-7 sm:p-10 md:p-12 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#60A5FA] mb-3">
            {currentUser ? <Globe2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>
              {currentUser
                ? 'Authenticated Workspace Ready'
                : '02. Full Terminal & 3D World'}
            </span>
          </div>

          <h2
            className="font-display font-bold text-white tracking-[-0.02em] mb-3"
            style={{
              fontSize: 'clamp(1.65rem, 2.8vw, 2.35rem)',
              lineHeight: 1.12,
              textWrap: 'balance',
            }}
          >
            Live Stock Terminal, Heatmaps &amp; 3D Global Stock Exchanges
          </h2>

          <p className="text-sm text-[#9598A1] leading-relaxed max-w-xl mb-7">
            {currentUser
              ? `Welcome back, ${currentUser.name}. Enter your research workspace to inspect live SEC filings, earnings calendars, and the interactive 3D global exchange globe.`
              : 'Create a free Financia account or log in to unlock the complete research workspace featuring live Form 10-K/10-Q synthesis, sector heatmaps, price alerts, and the 3D global exchange atlas.'}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {currentUser ? (
              <button
                type="button"
                onClick={onEnterFrontend}
                className="px-6 py-3 rounded-xl bg-[#2962FF] hover:bg-[#1E53E5] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Enter Frontend Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onOpenSignup}
                  className="px-6 py-3 rounded-xl bg-white hover:bg-[#F0F3FA] text-[#131722] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Sign up free
                </button>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-6 py-3 rounded-xl border border-[#323846] hover:border-[#6A6E7A] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Atmospheric Meadow Explorer Teaser Card */}
        <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full border-t lg:border-t-0 lg:border-l border-[#1E2432] overflow-hidden bg-[#132230]">
          <img
            src="/assets/aistudio/image_612bb5a4.png"
            alt="Financia explorer seated in sunlit meadow overlooking markets"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-[56%_45%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#070B11]/90 via-[#070B11]/25 to-[#070B11]/35"
          />
          <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col gap-1">
            <div className="font-display font-bold text-lg text-white tracking-tight">
              Look first / Then leap.
            </div>
            <div className="text-xs text-[#CBD5E1]">
              SEC EDGAR Synthesis · Multi-Asset Watchlists · 3D Global Atlas
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
