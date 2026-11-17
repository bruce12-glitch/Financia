import React from 'react';
import {
  ArrowRight,
  Coins,
  Landmark,
  Layers,
  Shield,
} from 'lucide-react';
import { MULTI_ASSET_BROKERS } from '../data/indianMarketData';

interface MultiAssetSectionProps {
  onSelectAsset: (symbol: string) => void;
  onOpenBrokerModal: (tab?: 'broker' | 'account') => void;
  onOpenSmallcaseModal: () => void;
}

export const MultiAssetSection: React.FC<MultiAssetSectionProps> = ({
  onSelectAsset,
  onOpenBrokerModal,
  onOpenSmallcaseModal,
}) => {
  return (
    <section
      id="multi-asset"
      aria-label="Multi-asset Investing Across Indian and US Markets"
      className="w-full bg-[#F7F9F8] text-[#0F1B16] py-16 lg:py-20 border-b border-[#E3EAE6]"
    >
      <div className="max-w-[1220px] mx-auto px-6">
        {/* Heading Row */}
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs font-medium text-[#15803D] mb-2">
              Multi-asset Investing
            </div>
            <h2 className="font-display font-semibold text-3xl md:text-4xl tracking-tight text-[#0B1712] leading-tight">
              Research here.{' '}
              <span className="font-editorial font-medium">Execute here too.</span>
            </h2>
          </div>
          <p className="text-xs md:text-sm text-[#586D63] max-w-md leading-relaxed">
            Link Zerodha, Groww, Upstox or Angel One to place single or basket orders — plus direct access to US stocks, gold, FDs and more.
          </p>
        </div>

        {/* Asymmetric 4-Column Multi-Asset Mosaic */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {/* Card 1: Indian Stocks & Baskets */}
          <div className="rounded-2xl bg-[#EEF3F0] border border-[#DCE6E0] p-6 flex flex-col justify-between min-h-[290px]">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#D4DFD9] flex items-center justify-center text-[#15803D]">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-display font-bold text-[#0B1712] leading-snug">
                Indian Stocks &amp; Baskets
              </h3>
              <p className="text-xs text-[#546A5F] leading-relaxed">
                Place single or multi-stock basket orders through your linked demat.
              </p>
              <button
                type="button"
                onClick={() => onOpenBrokerModal('broker')}
                className="px-4 py-2 rounded-lg bg-[#0F1F18] text-white text-xs font-semibold hover:bg-[#193529] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Link Broker
              </button>
            </div>
            <div className="pt-4 border-t border-[#D7E2DC] text-[11px] font-mono text-[#546A5F]">
              financia · Zerodha · Groww · Upstox
            </div>
          </div>

          {/* Card 2: US Stocks & ETFs (Signature Dark Emerald Card) */}
          <div className="rounded-2xl bg-[#0D1C16] text-white border border-[#1E382C] p-6 flex flex-col justify-between min-h-[290px] bg-emerald-grid relative overflow-hidden">
            <div className="flex items-start justify-between gap-2 relative z-10">
              <span className="text-[11px] font-mono text-[#4ADE80] bg-[#142D22] border border-[#22C55E]/30 px-2.5 py-1 rounded">
                Start from $1
              </span>
              <span className="w-10 h-10 rounded-full bg-[#12281F] border border-[#22C55E]/40 flex items-center justify-center font-mono text-lg font-bold text-[#4ADE80]">
                $
              </span>
            </div>

            {/* Quick Interactive US Tickers inside card */}
            <div className="relative z-10 flex items-center gap-2 my-4">
              <button
                type="button"
                onClick={() => onSelectAsset('NVDA')}
                className="px-2.5 py-1 rounded bg-[#142A20] border border-white/10 font-mono text-[11px] text-white hover:border-[#22C55E] transition-colors cursor-pointer"
              >
                NVDA +3.6%
              </button>
              <span className="px-2.5 py-1 rounded bg-[#142A20] border border-white/10 font-mono text-[11px] text-[#9DB0A6]">
                QQQ
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="text-xl font-display font-bold text-white">
                US Stocks &amp; ETFs
              </h3>
              <p className="text-xs text-[#9DB0A6] leading-relaxed mt-1.5">
                10,000+ fractional US stocks via the RBI-compliant GIFT City route. No wire fees.
              </p>
            </div>
          </div>

          {/* Card 3: Smallcases */}
          <div className="rounded-2xl bg-white border border-[#DFE7E2] p-6 flex flex-col justify-between min-h-[290px]">
            <div>
              <h3 className="text-xl font-display font-bold text-[#0B1712]">
                Smallcases
              </h3>
              <p className="text-xs text-[#546A5F] leading-relaxed mt-1.5">
                Thematic model portfolios — EV, Digital India, Dividend Aristocrats — in one tap.
              </p>

              <div className="mt-4 space-y-2 border-t border-[#EEF3F0] pt-3">
                {[
                  { name: 'Green Energy', ret: '+28.4%' },
                  { name: 'Digital India', ret: '+19.1%' },
                  { name: 'Dividend Aristocrats', ret: '+14.7%' },
                ].map((sc) => (
                  <div
                    key={sc.name}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="text-[#1D3127] font-medium">{sc.name}</span>
                    <span className="font-mono tabular-nums font-semibold text-[#15803D]">
                      {sc.ret}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSmallcaseModal}
              className="mt-4 w-full px-4 py-2 rounded-lg bg-[#0F1F18] text-white text-xs font-semibold hover:bg-[#193529] transition-colors cursor-pointer"
            >
              Explore Smallcases
            </button>
          </div>

          {/* Card 4: Stacked Trio — Digital Gold, Fixed Deposits, Loan Against Securities */}
          <div className="flex flex-col justify-between gap-3.5">
            <button
              type="button"
              onClick={() => onOpenBrokerModal('account')}
              className="flex-1 rounded-2xl bg-white border border-[#DFE7E2] p-4 flex items-center justify-between gap-3 text-left hover:border-[#15803D] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                  <Coins className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-sm font-display font-bold text-[#0B1712]">
                    Digital Gold
                  </div>
                  <div className="text-[11px] text-[#586D63] font-mono">
                    24K · ₹7,214/g · buy from ₹10
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7E9488] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onOpenBrokerModal('account')}
              className="flex-1 rounded-2xl bg-white border border-[#DFE7E2] p-4 flex items-center justify-between gap-3 text-left hover:border-[#15803D] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-sm font-display font-bold text-[#0B1712]">
                    Fixed Deposits
                  </div>
                  <div className="text-[11px] text-[#586D63] font-mono">
                    Up to 9.1% p.a. · DICGC insured
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7E9488] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onOpenBrokerModal('account')}
              className="flex-1 rounded-2xl bg-white border border-[#DFE7E2] p-4 flex items-center justify-between gap-3 text-left hover:border-[#15803D] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-sm font-display font-bold text-[#0B1712]">
                    Loan Against Securities
                  </div>
                  <div className="text-[11px] text-[#586D63] font-mono">
                    Pledge stocks &amp; MFs · from 10.5%
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7E9488] shrink-0" />
            </button>
          </div>
        </div>

        {/* Broker Compatibility Strip */}
        <div className="mt-8 rounded-xl bg-white border border-[#E2EAE5] px-6 py-4 flex flex-col items-center gap-3">
          <div className="text-[11px] text-[#6B8075]">
            Works with your existing broker
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {MULTI_ASSET_BROKERS.map((broker) => (
              <button
                key={broker}
                type="button"
                onClick={() => onOpenBrokerModal('broker')}
                className="text-xs font-display font-semibold text-[#31453B] hover:text-[#15803D] transition-colors cursor-pointer"
              >
                {broker}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
