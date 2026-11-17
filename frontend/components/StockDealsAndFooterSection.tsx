import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { STOCK_DEALS_DATA } from '../data/indianMarketData';

interface StockDealsAndFooterSectionProps {
  onSelectAsset: (symbol: string) => void;
  onOpenBrokerModal: (tab?: 'broker' | 'account') => void;
}

export const StockDealsAndFooterSection: React.FC<StockDealsAndFooterSectionProps> = ({
  onSelectAsset,
  onOpenBrokerModal,
}) => {
  const [dealType, setDealType] = useState<'Bulk' | 'Block' | 'Insider'>('Bulk');
  const [windowFilter, setWindowFilter] = useState<'7d' | '30d'>('7d');

  const deals = useMemo(() => {
    const rows = STOCK_DEALS_DATA[dealType];
    if (windowFilter === '30d') return rows;
    return rows.filter((r) => r.window === '7d');
  }, [dealType, windowFilter]);

  return (
    <div className="bg-[#0A1410] text-[#F1F5F3]">
      {/* Section: Stock Deals (Bulk / Block / Insider) */}
      <section
        id="stock-deals"
        aria-label="Institutional Bulk, Block and Insider Stock Deals"
        className="w-full py-16 lg:py-20 border-b border-white/[0.06]"
      >
        <div className="max-w-[1220px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left 4 Cols: Heading + Net FII/DII Summary Cards */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <div className="text-xs font-medium text-[#4ADE80] mb-2">
                Stock Deals
              </div>
              <h2 className="font-display font-semibold text-3xl md:text-4xl tracking-tight text-white leading-tight">
                Follow the{' '}
                <span className="font-editorial font-medium text-[#D8E5DF]">
                  smart
                </span>
                <br />
                money.
              </h2>
              <p className="text-sm text-[#9DB0A6] leading-relaxed mt-3">
                Track bulk deals, block deals and insider trades as they’re disclosed — see where large investors are moving capital.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#0E1B16] border border-[#1E352A] p-4">
                <div className="text-[11px] text-[#8FA499]">Net FII today</div>
                <div className="text-lg font-display font-bold font-mono tabular-nums text-[#4ADE80] mt-1">
                  +₹2,140 Cr
                </div>
              </div>
              <div className="rounded-xl bg-[#0E1B16] border border-[#1E352A] p-4">
                <div className="text-[11px] text-[#8FA499]">Net DII today</div>
                <div className="text-lg font-display font-bold font-mono tabular-nums text-[#F87171] mt-1">
                  −₹860 Cr
                </div>
              </div>
            </div>
          </div>

          {/* Right 8 Cols: Deals Filter Tabs & Institutional Deals Table */}
          <div className="lg:col-span-8 bg-[#0E1B16] rounded-2xl border border-[#1E352A] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center p-1 rounded-lg bg-[#09130F] border border-white/[0.06]">
                {(['Bulk', 'Block', 'Insider'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDealType(tab)}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      dealType === tab
                        ? 'bg-[#1B372A] text-white'
                        : 'text-[#8FA499] hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setWindowFilter((w) => (w === '7d' ? '30d' : '7d'))
                }
                className="px-3 py-1.5 rounded-lg bg-[#12251D] border border-white/10 text-xs font-mono text-[#CFE0D7] hover:border-[#22C55E] transition-colors cursor-pointer"
              >
                {windowFilter === '7d' ? 'Last 7 days' : 'Last 30 days'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-medium text-[#7E9488]">
                    <th className="py-3 pl-5 pr-3">Date</th>
                    <th className="py-3 px-3">Stock</th>
                    <th className="py-3 px-3">Investor</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3 text-right">Qty</th>
                    <th className="py-3 pl-3 pr-5 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs">
                  {deals.map((deal) => (
                    <tr
                      key={`${deal.date}-${deal.stock}-${deal.investor}`}
                      onClick={() => onSelectAsset(deal.symbol)}
                      className="hover:bg-[#13241D] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 pl-5 pr-3 font-mono text-[#8FA499] whitespace-nowrap">
                        {deal.date}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-white whitespace-nowrap">
                        {deal.stock}
                      </td>
                      <td className="py-3.5 px-3 text-[#CFE0D7]">
                        {deal.investor}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-mono font-semibold ${
                            deal.action === 'Buy'
                              ? 'text-[#4ADE80]'
                              : 'text-[#F87171]'
                          }`}
                        >
                          {deal.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D8E5DF]">
                        {deal.qty}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right font-mono tabular-nums font-semibold text-white">
                        {deal.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section
        aria-label="Start Investing with Conviction"
        className="w-full py-20 px-6 border-b border-white/[0.06] text-center"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(34, 197, 94, 0.1) 0%, rgba(10, 20, 16, 1) 75%)',
        }}
      >
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="text-xs font-medium text-[#4ADE80]">Free to start</div>
          <h2 className="font-display font-semibold text-3xl md:text-5xl tracking-tight text-white leading-tight">
            Invest with conviction,{' '}
            <span className="font-editorial font-medium text-[#D8E5DF]">
              not hunches.
            </span>
          </h2>
          <p className="text-sm text-[#9DB0A6]">
            Join 2M+ Indian investors using Financia to research, track and act.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenBrokerModal('account')}
              className="px-6 py-2.5 rounded-lg bg-[#22C55E] text-[#05140C] font-semibold text-xs md:text-sm hover:bg-[#4ADE80] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Create free account
            </button>
            <a
              href="#scorecards"
              className="px-6 py-2.5 rounded-lg bg-[#12221B] text-white border border-white/15 font-medium text-xs md:text-sm hover:bg-[#182E25] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Explore Pro</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#4ADE80]" />
            </a>
          </div>
        </div>
      </section>

      {/* Quiet 5-Column Footer */}
      <footer className="max-w-[1220px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/[0.07]">
          <div className="md:col-span-4 space-y-3">
            <a
              href="#"
              className="inline-flex items-center gap-2 text-lg font-display font-bold text-white"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20">
                <rect x="2" y="10" width="3.5" height="8" rx="1" fill="#22C55E" />
                <rect x="8.25" y="6" width="3.5" height="12" rx="1" fill="#4ADE80" />
                <rect x="14.5" y="2" width="3.5" height="16" rx="1" fill="#FFFFFF" />
              </svg>
              <span>financia</span>
            </a>
            <p className="text-xs text-[#7E9488] leading-relaxed max-w-xs">
              Research, portfolio analysis and multi-asset execution for Indian investors. Investments in securities are subject to market risks.
            </p>
          </div>

          <div className="md:col-span-2 space-y-2.5">
            <div className="text-xs font-semibold text-white">Research</div>
            <ul className="space-y-2 text-xs text-[#8FA499]">
              <li>
                <a href="#screeners" className="hover:text-white transition-colors">
                  Stock Screener
                </a>
              </li>
              <li>
                <a href="#screeners" className="hover:text-white transition-colors">
                  MF Screener
                </a>
              </li>
              <li>
                <a href="#market-summary" className="hover:text-white transition-colors">
                  Market Mood Index
                </a>
              </li>
              <li>
                <a href="#stock-deals" className="hover:text-white transition-colors">
                  Stock Deals
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-2.5">
            <div className="text-xs font-semibold text-white">Invest</div>
            <ul className="space-y-2 text-xs text-[#8FA499]">
              <li>
                <a href="#multi-asset" className="hover:text-white transition-colors">
                  US Stocks
                </a>
              </li>
              <li>
                <a href="#multi-asset" className="hover:text-white transition-colors">
                  Smallcases
                </a>
              </li>
              <li>
                <a href="#multi-asset" className="hover:text-white transition-colors">
                  Digital Gold
                </a>
              </li>
              <li>
                <a href="#multi-asset" className="hover:text-white transition-colors">
                  Fixed Deposits
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-2.5">
            <div className="text-xs font-semibold text-white">Portfolio</div>
            <ul className="space-y-2 text-xs text-[#8FA499]">
              <li>
                <a href="#portfolio-hub" className="hover:text-white transition-colors">
                  Import Holdings
                </a>
              </li>
              <li>
                <a href="#portfolio-hub" className="hover:text-white transition-colors">
                  Portfolio AI
                </a>
              </li>
              <li>
                <a href="#portfolio-hub" className="hover:text-white transition-colors">
                  MCP Connect
                </a>
              </li>
              <li>
                <a href="#portfolio-hub" className="hover:text-white transition-colors">
                  Red Flags
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-2.5">
            <div className="text-xs font-semibold text-white">Company</div>
            <ul className="space-y-2 text-xs text-[#8FA499]">
              <li>
                <a href="#market-summary" className="hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#scorecards" className="hover:text-white transition-colors">
                  Scorecards
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenBrokerModal('account')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Create Account
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenBrokerModal('broker')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Link Broker
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-[#6D8277]">
          <span>© 2026 Financia Technologies Pvt. Ltd.</span>
          <span>Privacy · Terms · Disclosures · Grievance Redressal</span>
        </div>
      </footer>
    </div>
  );
};
