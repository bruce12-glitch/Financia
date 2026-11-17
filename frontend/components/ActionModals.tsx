import React, { useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { MULTI_ASSET_BROKERS } from '../data/indianMarketData';
import { validateInquiryForm } from '../utils/stockEngine';

interface BrokerModalProps {
  open: boolean;
  initialTab: 'broker' | 'account';
  onClose: () => void;
}

export const BrokerAccountModal: React.FC<BrokerModalProps> = ({
  open,
  initialTab,
  onClose,
}) => {
  const [tab, setTab] = useState<'broker' | 'account'>(initialTab);
  const [selectedBroker, setSelectedBroker] = useState<string>('Zerodha');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [panOrNote, setPanOrNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setSubmitted(false);
      setErrors({});
    }
  }, [open, initialTab]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateInquiryForm({
      name: tab === 'broker' ? `${selectedBroker} Investor` : name,
      email,
      phone,
      message:
        panOrNote ||
        (tab === 'broker'
          ? `Sync demat holdings from ${selectedBroker}`
          : 'Create free Financia research workspace'),
    });
    if (!res.valid) {
      setErrors(res.errors);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Financia Broker Link and Account Onboarding"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0E1B16] border border-[#233E32] text-[#F1F5F3] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center p-1 rounded-lg bg-[#09120E] border border-white/10">
            <button
              type="button"
              onClick={() => {
                setTab('account');
                setSubmitted(false);
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'account' ? 'bg-[#22C55E] text-[#05140C]' : 'text-[#9DB0A6]'
              }`}
            >
              Free Account
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('broker');
                setSubmitted(false);
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'broker' ? 'bg-[#22C55E] text-[#05140C]' : 'text-[#9DB0A6]'
              }`}
            >
              Link Broker
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close onboarding modal"
            className="p-1.5 rounded-lg text-[#8FA499] hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-[#173527] text-[#4ADE80] mx-auto flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-bold text-white">
              {tab === 'broker'
                ? `${selectedBroker} Sync Initiated`
                : 'Workspace Ready'}
            </h3>
            <p className="text-xs text-[#9DB0A6] leading-relaxed">
              Confirmation sent to {email}. Your read-only holdings and scorecard workspace is configured.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="px-5 py-2 rounded-lg bg-[#22C55E] text-[#05140C] text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'broker' && (
              <div>
                <div className="text-xs font-medium text-[#9DB0A6] mb-2">
                  Select Demat Broker
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {MULTI_ASSET_BROKERS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBroker(b)}
                      className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        selectedBroker === b
                          ? 'bg-[#193529] border-[#22C55E] text-white'
                          : 'bg-[#09120E] border-white/10 text-[#9DB0A6]'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === 'account' && (
              <div>
                <label
                  htmlFor="modal-name"
                  className="block text-xs text-[#9DB0A6] mb-1"
                >
                  Full Name
                </label>
                <input
                  id="modal-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Mehta"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#09120E] border border-white/12 text-xs text-white focus:border-[#22C55E] focus:outline-none"
                />
                {errors.name && (
                  <p className="text-[11px] text-[#F87171] mt-1">{errors.name}</p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="modal-email"
                className="block text-xs text-[#9DB0A6] mb-1"
              >
                Email Address
              </label>
              <input
                id="modal-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investor@financia.in"
                className="w-full px-3.5 py-2 rounded-lg bg-[#09120E] border border-white/12 text-xs text-white focus:border-[#22C55E] focus:outline-none"
              />
              {errors.email && (
                <p className="text-[11px] text-[#F87171] mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-phone"
                className="block text-xs text-[#9DB0A6] mb-1"
              >
                Mobile Number
              </label>
              <input
                id="modal-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200 11223"
                className="w-full px-3.5 py-2 rounded-lg bg-[#09120E] border border-white/12 text-xs text-white focus:border-[#22C55E] focus:outline-none"
              />
              {errors.phone && (
                <p className="text-[11px] text-[#F87171] mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-note"
                className="block text-xs text-[#9DB0A6] mb-1"
              >
                {tab === 'broker' ? 'PAN / Portfolio Scope' : 'Research Goal'}
              </label>
              <input
                id="modal-note"
                type="text"
                value={panOrNote}
                onChange={(e) => setPanOrNote(e.target.value)}
                placeholder="Indian equities, MFs & US fractional allocation"
                className="w-full px-3.5 py-2 rounded-lg bg-[#09120E] border border-white/12 text-xs text-white focus:border-[#22C55E] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#22C55E] text-[#05140C] font-semibold text-xs hover:bg-[#4ADE80] transition-colors cursor-pointer"
            >
              {tab === 'broker'
                ? `Continue with ${selectedBroker}`
                : 'Create Free Research Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const McpConnectModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const snippet = `{
  "mcpServers": {
    "financia-portfolio": {
      "url": "https://mcp.financia.in/sse",
      "scope": ["holdings:read", "scorecards:read", "us-orders:propose"]
    }
  }
}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(snippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect Portfolio via MCP"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0E1B16] border border-[#233E32] text-[#F1F5F3] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-display font-bold text-white">
            Connect via MCP (Claude &amp; ChatGPT)
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close MCP modal"
            className="p-1 text-[#8FA499] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#9DB0A6] leading-relaxed">
          Paste this configuration into Claude Desktop or ChatGPT MCP connectors to query PAN holdings, red flags, and S&amp;P Global scorecards.
        </p>
        <pre className="p-3.5 rounded-xl bg-[#08100C] border border-white/10 font-mono text-[11px] text-[#86EFAC] overflow-x-auto">
          {snippet}
        </pre>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg bg-[#22C55E] text-[#05140C] font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Config' : 'Copy MCP Config'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const SmallcasePreviewModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSelectAsset: (symbol: string) => void;
}> = ({ open, onClose, onSelectAsset }) => {
  if (!open) return null;

  const portfolios = [
    {
      name: 'Green Energy Transition',
      cagr: '+28.4% 1Y',
      minAmount: '₹24,500',
      tickers: ['COALINDIA', 'PETRONET'],
      desc: 'Clean utility grid, LNG terminal & domestic energy transition leaders.',
    },
    {
      name: 'Digital India Core',
      cagr: '+19.1% 1Y',
      minAmount: '₹31,200',
      tickers: ['TCS', 'INFY', 'BHARTIARTL'],
      desc: 'Cloud engineering exporters paired with rising 5G ARPU cash compounders.',
    },
    {
      name: 'Dividend Aristocrats',
      cagr: '+14.7% 1Y',
      minAmount: '₹18,900',
      tickers: ['ITC', 'CASTROLIND', 'COALINDIA'],
      desc: 'High ROCE, zero-leverage businesses returning > 3% annual cash yield.',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Smallcases Thematic Portfolios"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white text-[#0B1712] border border-[#DCE6E0] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold">
            Curated Smallcase Baskets
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Smallcases modal"
            className="p-1 text-[#586D63] hover:text-[#0B1712] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {portfolios.map((pf) => (
            <div
              key={pf.name}
              className="rounded-xl bg-[#F7F9F8] border border-[#E2EAE5] p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{pf.name}</span>
                <span className="font-mono text-xs font-semibold text-[#15803D]">
                  {pf.cagr} · Min {pf.minAmount}
                </span>
              </div>
              <p className="text-xs text-[#586D63]">{pf.desc}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {pf.tickers.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onSelectAsset(t);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded bg-white border border-[#D4DFD9] font-mono text-[11px] font-semibold hover:border-[#15803D] cursor-pointer"
                  >
                    Inspect {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
