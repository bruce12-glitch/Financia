import React, { useState } from 'react';
import {
  Plus,
  Minus,
  ArrowUpRight,
  ArrowUp,
  MessageSquare,
  X,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { FaqItem, InquiryMessage } from '../types/financia';
import { validateInquiryForm } from '../utils/stockEngine';

interface FaqAndFooterSectionProps {
  faqs: FaqItem[];
  onJumpToTerminal: () => void;
  onSelectTickerAndScroll: (ticker: string) => void;
}

type WidgetStep = 'quick' | 'consent' | 'form' | 'recent';

export const FaqAndFooterSection: React.FC<FaqAndFooterSectionProps> = ({
  faqs,
  onJumpToTerminal,
  onSelectTickerAndScroll,
}) => {
  const [activeFaqCat, setActiveFaqCat] = useState<
    'All Questions' | 'Stock Analysis' | 'Data Sources' | 'Platform Features'
  >('All Questions');
  const [openFaqId, setOpenFaqId] = useState<string>(faqs[2]?.id || 'faq-3');

  // Floating Research Desk Widget State (Replicates Video 00:02 - 00:09)
  const [widgetOpen, setWidgetOpen] = useState<boolean>(false);
  const [widgetStep, setWidgetStep] = useState<WidgetStep>('quick');
  const [selectedTopic, setSelectedTopic] = useState<string>(
    'I need help with institutional stock analysis'
  );
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [inquiries, setInquiries] = useState<InquiryMessage[]>([]);

  const filteredFaqs =
    activeFaqCat === 'All Questions'
      ? faqs
      : faqs.filter((f) => f.category === activeFaqCat);

  const openContactFormDirectly = () => {
    setWidgetOpen(true);
    setWidgetStep('form');
  };

  const handleSelectQuickTopic = (topic: string) => {
    setSelectedTopic(topic);
    setFormData((prev) => ({ ...prev, message: prev.message || topic }));
    setWidgetStep('consent');
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateInquiryForm(formData);
    if (!result.valid) {
      setFormErrors(result.errors);
      return;
    }
    setFormErrors({});
    const newMsg: InquiryMessage = {
      id: `inq-${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      message: formData.message.trim(),
      topic: selectedTopic,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setInquiries((prev) => [newMsg, ...prev]);
    setFormData({ name: '', email: '', phone: '', message: '' });
    setWidgetStep('recent');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-[#05070C] text-white">
      {/* SECTION 1: Categorized FAQ (Video 00:48 - 00:52, Dark Mode) */}
      <section
        id="faq-section"
        aria-label="Frequently Asked Questions"
        className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24 border-t border-white/[0.08]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left 4 Columns: Title + Contact Desk Box */}
          <div className="lg:col-span-4 flex flex-col justify-between lg:min-h-[420px]">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-3">
                <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                  <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
                  <span className="w-0.5 h-3 bg-white" />
                  <span className="w-0.5 h-2 bg-[#3B82F6]" />
                </span>
                <span>FAQs</span>
              </div>
              <h2
                className="font-display font-semibold text-white tracking-tight mb-6"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.25rem)', lineHeight: 1.08 }}
              >
                FAQ
              </h2>
            </div>

            <div className="p-6 rounded-2xl bg-[#0C1324] border border-white/10 mt-8 lg:mt-auto">
              <p className="text-xs text-[#CBD5E1] leading-relaxed mb-4">
                Have more questions about our SEC filing parsers or multi-agent conviction scoring? Contact our quantitative research desk anytime — we&rsquo;re here 24/5.
              </p>
              <button
                type="button"
                onClick={openContactFormDirectly}
                className="px-5 py-2.5 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Contact Us</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right 8 Columns: Category Filter Tabs + Expandable FAQ Rows */}
          <div className="lg:col-span-8">
            <div
              role="group"
              aria-label="Filter FAQ by category"
              className="flex flex-wrap items-center gap-2 mb-8"
            >
              {(
                ['All Questions', 'Stock Analysis', 'Data Sources', 'Platform Features'] as const
              ).map((cat) => {
                const active = activeFaqCat === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveFaqCat(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#05070C] font-semibold'
                        : 'bg-[#0C1324] text-[#94A3B8] border border-white/10 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="divide-y divide-white/10 border-t border-b border-white/10">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="py-5">
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? '' : faq.id)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group"
                    >
                      <span className="text-base font-display font-medium text-white group-hover:text-[#60A5FA] transition-colors">
                        {faq.question}
                      </span>
                      <span className="w-7 h-7 rounded-full bg-[#0C1324] border border-white/10 flex items-center justify-center text-[#60A5FA] shrink-0">
                        {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                    {isOpen && (
                      <p className="mt-3 text-sm text-[#94A3B8] leading-relaxed max-w-2xl">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Smarter Access to Global Financial Intelligence Banner (Video 00:52 - 00:53) */}
      <section
        aria-label="Smarter Access to Global Financial Intelligence"
        className="max-w-[1240px] mx-auto px-6 pb-16"
      >
        <div
          className="relative rounded-3xl border border-[#3B82F6]/35 p-8 lg:p-14 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          style={{
            background:
              'linear-gradient(125deg, #0D1933 0%, #172B54 45%, #070C17 100%)',
          }}
        >
          <div className="lg:col-span-7 relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#BFDBFE] mb-4">
              <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
                <span className="w-0.5 h-3 bg-white" />
                <span className="w-0.5 h-2 bg-[#3B82F6]" />
              </span>
              <span>All-in-One Intelligence Platform</span>
            </div>
            <h2
              className="font-display font-semibold text-white tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.85rem, 3.3vw, 2.85rem)', lineHeight: 1.12, textWrap: 'balance' }}
            >
              Smarter Access to Global Stock Intelligence
            </h2>
            <p className="text-sm text-[#E2E8F0] leading-relaxed max-w-lg mb-7">
              Access institutional-grade SEC filing synthesis, real-time technical charts, and multi-agent conviction scoring — all in one sleek dashboard built for equity analysts.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onJumpToTerminal}
                className="px-6 py-2.5 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Launch Live Terminal
              </button>
              <button
                type="button"
                onClick={() => onSelectTickerAndScroll('AAPL')}
                className="px-6 py-2.5 rounded-full bg-[#091121]/80 text-white border border-white/20 hover:border-[#60A5FA] font-medium text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Explore Equities</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#60A5FA]" />
              </button>
            </div>
          </div>

          {/* Right Frosted Glass 3D Candlesticks Graphic matching Video 00:53 */}
          <div className="lg:col-span-5 relative z-10 flex items-center justify-center">
            <svg
              viewBox="0 0 320 200"
              className="w-full max-w-[320px] h-48"
              role="img"
              aria-label="3D frosted glass financial candlesticks"
            >
              <defs>
                <linearGradient id="glassCandleGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.48)" />
                  <stop offset="50%" stopColor="rgba(96,165,250,0.28)" />
                  <stop offset="100%" stopColor="rgba(12,24,48,0.72)" />
                </linearGradient>
              </defs>
              {[
                { x: 35, y: 65, h: 75, wTop: 35, wBot: 165 },
                { x: 90, y: 40, h: 90, wTop: 15, wBot: 155 },
                { x: 145, y: 80, h: 65, wTop: 55, wBot: 170 },
                { x: 200, y: 30, h: 95, wTop: 10, wBot: 150 },
                { x: 255, y: 50, h: 85, wTop: 25, wBot: 160 },
              ].map((c, idx) => (
                <g key={idx} transform="rotate(14, 160, 100)">
                  <line
                    x1={c.x + 16}
                    y1={c.wTop}
                    x2={c.x + 16}
                    y2={c.wBot}
                    stroke="rgba(219,234,254,0.6)"
                    strokeWidth="2"
                  />
                  <rect
                    x={c.x}
                    y={c.y}
                    width="32"
                    height={c.h}
                    rx="4"
                    fill="url(#glassCandleGrad)"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="1.2"
                  />
                </g>
              ))}
            </svg>
          </div>

          {/* Stepped bottom-right dark cutout with ASCII matrix matching Video 00:53 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 bottom-0 w-72 h-14 bg-[#05070C] rounded-tl-2xl border-t border-l border-white/15 flex items-center justify-end px-6 font-mono text-[9px] text-[#60A5FA]/50 tracking-widest"
          >
            1101 0111 1011 1110 0101
          </div>
        </div>
      </section>

      {/* SECTION 3: Quiet Stepped Dark Footer (Video 00:54 - 00:56) */}
      <footer className="relative w-full bg-[#04060A] border-t border-white/10 pt-16 pb-14 overflow-hidden">
        {/* Top-Right ASCII Dot-Matrix Corner matching Video 00:54 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-4 right-8 font-mono text-[10px] leading-[13px] tracking-widest text-[#60A5FA]/35 text-right select-none hidden md:block"
        >
          <div>11 01 11 10 01 11 01 10 11 11</div>
          <div>01 11 10 11 01 10 11 01 10 01</div>
          <div>10 01 11 01 11 11 01 11 01 10</div>
        </div>

        <div className="max-w-[1240px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-14 border-b border-white/10">
            {/* Brand Column */}
            <div className="lg:col-span-3">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="inline-flex items-end gap-0.5 h-5" aria-hidden="true">
                  <span className="w-1 h-3 bg-[#60A5FA]" />
                  <span className="w-1 h-5 bg-white" />
                  <span className="w-1 h-3.5 bg-[#3B82F6]" />
                </span>
                <span className="font-display font-bold text-xl tracking-tight text-white">
                  financia
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed mb-5 max-w-xs">
                Multi-Agent Stock Intelligence &amp; Real-Time SEC Filing Telemetry.
              </p>
              <button
                type="button"
                onClick={onJumpToTerminal}
                className="px-5 py-2 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Try Free Demo</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* SECTORS Column */}
            <div className="lg:col-span-2">
              <div className="text-xs font-mono uppercase tracking-wider text-white mb-4">
                COVERAGE
              </div>
              <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                {['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMD', 'META'].map((tkr) => (
                  <li key={tkr}>
                    <button
                      type="button"
                      onClick={() => onSelectTickerAndScroll(tkr)}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      {tkr} Equity Report
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* RESEARCH Column */}
            <div className="lg:col-span-2">
              <div className="text-xs font-mono uppercase tracking-wider text-white mb-4">
                RESEARCH
              </div>
              <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                <li>
                  <a href="#live-terminal" className="hover:text-white transition-colors">
                    Live Stock Terminal
                  </a>
                </li>
                <li>
                  <a href="#research-plans" className="hover:text-white transition-colors">
                    Research Tiers
                  </a>
                </li>
                <li>
                  <a href="#insights-accordion" className="hover:text-white transition-colors">
                    SEC 10-K / 10-Q Parser
                  </a>
                </li>
                <li>
                  <a href="#market-coverage" className="hover:text-white transition-colors">
                    Options IV Surface
                  </a>
                </li>
              </ul>
            </div>

            {/* COMPANY Column */}
            <div className="lg:col-span-2">
              <div className="text-xs font-mono uppercase tracking-wider text-white mb-4">
                COMPANY
              </div>
              <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                <li>
                  <a href="#about-financia" className="hover:text-white transition-colors">
                    About Financia
                  </a>
                </li>
                <li>
                  <a href="#faq-section" className="hover:text-white transition-colors">
                    Methodology &amp; FAQs
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={openContactFormDirectly}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Contact Research Desk
                  </button>
                </li>
              </ul>
            </div>

            {/* OFFICE & CONTACT Column */}
            <div className="lg:col-span-3">
              <div className="text-xs font-mono uppercase tracking-wider text-white mb-4">
                RESEARCH DESK
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">
                Financia Quantitative Intelligence Hub · Global Equity &amp; SEC EDGAR Analytics Desk
              </p>
              <div className="text-xs font-mono text-[#CBD5E1]">research@financia.io</div>
            </div>
          </div>

          {/* Copyright & Back to the Top Row matching Video 00:55 */}
          <div className="py-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-[#94A3B8]">
            <div className="font-mono">COPYRIGHT 2026 © FINANCIA INTELLIGENCE</div>
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={openContactFormDirectly}
                className="hover:text-white underline cursor-pointer"
              >
                Data Grounding Policy
              </button>
              <button
                type="button"
                onClick={openContactFormDirectly}
                className="hover:text-white underline cursor-pointer"
              >
                Terms &amp; Disclaimers
              </button>
            </div>
            <button
              type="button"
              onClick={scrollToTop}
              className="font-mono text-white hover:text-[#60A5FA] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>BACK TO THE TOP</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Institutional Research Disclaimer (Matches both Video 00:55 and Financia repo safeguards) */}
          <div className="pt-6 text-[11px] text-[#64748B] leading-relaxed space-y-2">
            <div className="font-mono uppercase text-[#94A3B8]">
              RESEARCH &amp; NON-BROKERAGE DISCLOSURE:
            </div>
            <p>
              Financia is strictly a stock analysis, SEC document synthesis, and live market telemetry application — not a brokerage, dealer, or trading execution platform. Automated multi-agent models and LLM synthesis can make mistakes; always verify primary SEC EDGAR filings (Form 10-K, 10-Q, 8-K) and do not rely on this application as direct personalized investment advice.
            </p>
          </div>
        </div>
      </footer>

      {/* FLOATING INTERACTIVE RESEARCH DESK / SUPPORT DRAWER (Exact Match to Video 00:02 - 00:09) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {widgetOpen && (
          <div
            role="dialog"
            aria-label="Financia Research Desk Assistant"
            className="mb-3 w-[340px] sm:w-[370px] rounded-2xl bg-[#0B1221] border border-[#3B82F6]/40 shadow-2xl p-5 text-white"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                {widgetStep !== 'quick' && (
                  <button
                    type="button"
                    onClick={() => setWidgetStep('quick')}
                    aria-label="Back to quick topics"
                    className="p-1 rounded hover:bg-white/10 text-[#60A5FA] cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <span className="text-xs font-display font-semibold text-white">
                  Financia Research Desk
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWidgetOpen(false)}
                aria-label="Close Research Desk dialog"
                className="p-1 text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Quick Prompt Pills (Video 00:02 - 00:03) */}
            {widgetStep === 'quick' && (
              <div className="space-y-2.5">
                <p className="text-xs text-[#94A3B8] mb-3">
                  Select a research inquiry or connect with our quantitative desk:
                </p>
                {[
                  'I need help with SEC 10-Q / 10-K analysis',
                  'I need help understanding Conviction Scores',
                  'I have a question about institutional API feeds',
                ].map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleSelectQuickTopic(topic)}
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-[#132240] hover:bg-[#1B2E54] border border-white/15 text-xs text-white transition-colors cursor-pointer"
                  >
                    {topic}
                  </button>
                ))}
                {inquiries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setWidgetStep('recent')}
                    className="w-full text-center pt-2 text-xs font-mono text-[#60A5FA] hover:underline cursor-pointer"
                  >
                    View Recent Inquiries ({inquiries.length})
                  </button>
                )}
              </div>
            )}

            {/* Step 2: GDPR / Data Privacy Consent (Video 00:04) */}
            {widgetStep === 'consent' && (
              <div className="text-center py-3">
                <p className="text-xs text-[#E2E8F0] leading-relaxed mb-5">
                  Hello! We would like to assist you with your equity research inquiry. Under data protection regulations, we request your approval for processing your contact details to respond.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWidgetStep('quick')}
                    className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors cursor-pointer"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidgetStep('form')}
                    className="px-5 py-2 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                  >
                    Accept
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Form with Validation (Video 00:05 - 00:08) */}
            {widgetStep === 'form' && (
              <form onSubmit={handleSubmitInquiry} noValidate className="space-y-3">
                <p className="text-xs text-[#94A3B8] text-center mb-2">
                  Please fill out the form below and our analysts will get back to you.
                </p>

                <div>
                  <label htmlFor="inq-name" className="sr-only">
                    Name
                  </label>
                  <input
                    id="inq-name"
                    type="text"
                    placeholder="Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111B33] border border-white/15 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#60A5FA]"
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-[#FCA5A5] mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{formErrors.name}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="inq-email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="inq-email"
                    type="email"
                    placeholder="Email *"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111B33] border border-white/15 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#60A5FA]"
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-[#FCA5A5] mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{formErrors.email}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="inq-phone" className="sr-only">
                    Phone Number
                  </label>
                  <input
                    id="inq-phone"
                    type="tel"
                    placeholder="Phone Number *"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111B33] border border-white/15 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#60A5FA]"
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] text-[#FCA5A5] mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{formErrors.phone}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="inq-message" className="sr-only">
                    Message
                  </label>
                  <textarea
                    id="inq-message"
                    rows={2}
                    placeholder="Message *"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#111B33] border border-white/15 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#60A5FA]"
                  />
                  {formErrors.message && (
                    <p className="text-[11px] text-[#FCA5A5] mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{formErrors.message}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-white text-[#05070C] font-semibold text-xs hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                >
                  Send Message
                </button>
              </form>
            )}

            {/* Step 4: Recent Conversations (Video 00:09) */}
            {widgetStep === 'recent' && (
              <div>
                <div className="text-sm font-display font-semibold text-white mb-3">
                  Recent Inquiries
                </div>
                {inquiries.length === 0 ? (
                  <p className="text-xs text-[#94A3B8] py-6 text-center">No recent conversations</p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto">
                    {inquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="p-3 rounded-xl bg-[#111B33] border border-[#3B82F6]/30 text-xs"
                      >
                        <div className="flex items-center justify-between text-[#60A5FA] font-mono text-[11px] mb-1">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Sent by {inq.name}
                          </span>
                          <span>{inq.timestamp}</span>
                        </div>
                        <p className="text-white font-medium mb-0.5">{inq.message}</p>
                        <span className="text-[10px] text-[#94A3B8] font-mono">{inq.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setWidgetStep('form')}
                  className="mt-4 w-full py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  New Inquiry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Floating Circular Trigger Button matching Video 00:01 - 00:09 */}
        <button
          type="button"
          onClick={() => setWidgetOpen((prev) => !prev)}
          aria-label="Open Financia Research Desk Assistant"
          className="w-12 h-12 rounded-full bg-white text-[#05070C] hover:bg-[#DBEAFE] shadow-2xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
        >
          {widgetOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
