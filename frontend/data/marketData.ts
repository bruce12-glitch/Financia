import {
  BlogBriefing,
  FaqItem,
  InsightAccordionItem,
  ResearchPlan,
  SectorShowcase,
  StockQuote,
} from '../types/financia';

export const INITIAL_STOCKS: StockQuote[] = [
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Semiconductors & AI',
    price: 138.60,
    change: 4.82,
    changePercent: 3.60,
    volume: '64.8M',
    marketCap: '$3.39T',
    peRatio: 46.2,
    rsi14: 64.8,
    ivRank: 58,
    convictionScore: 94,
    shortInterest: '1.1%',
    institutionalOwnership: '67.8%',
    nextEarnings: 'Aug 26, 2026',
    report: {
      ticker: 'NVDA',
      companyName: 'NVIDIA Corporation',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'Blackwell architecture ramp and hyperscaler capital expenditure commitments reflected in Q1 FY27 Form 10-Q filings confirm sustained Data Center pricing power. Gross margins remain resilient above 73.5% despite initial rack-scale transition costs.',
        conviction_score: 94,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          'Data Center revenue reached $39.2B (+78% YoY) in the latest Form 10-Q, with sovereign AI and enterprise inference demand representing 42% of total shipments.',
          'Institutional Form 13F filings show net accumulation across 68% of tracked quantitative and long-only tech mandates over the trailing quarter.',
          'Options surface shows heavy institutional call positioning at the $145 and $155 strikes with net positive gamma support anchored at $132.',
        ],
      },
      bull_case: [
        {
          point: 'Full-Stack Blackwell Ultra & Rubin Visibility',
          evidence:
            'Hyperscaler capex disclosures across MSFT, META, GOOGL, and AMZN confirm multi-quarter committed purchase obligations exceeding $118B.',
        },
        {
          point: 'CUDA & NIM Enterprise Software Recurring Attach',
          evidence:
            'Annualized software, networking (Spectrum-X), and support run-rate surpassed $4.8B with >82% gross margin contribution.',
        },
      ],
      bear_case: [
        {
          point: 'Custom ASIC Hyperscaler Substitution',
          evidence:
            'Internal silicon deployments (TPU v6, Trainium2) could moderate inference unit growth in cost-sensitive workloads by late FY27.',
        },
        {
          point: 'Export Licensing & Sovereign Regulatory Tightening',
          evidence:
            'Item 1A Risk Factors note ongoing BIS export threshold adjustments impacting tailored regional accelerator SKUs.',
        },
      ],
      base_case: [
        {
          point: 'Sustained 35–45% EPS Compounding Through FY27',
          evidence:
            'Even assuming gradual gross margin normalization to 72.5%, free cash flow yield supports $50B+ annual share repurchases.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 114.2, open: 112.8, high: 116.0, low: 111.9, volume: 58 },
          { date: 'Feb 28', price: 118.5, open: 116.4, high: 120.1, low: 115.8, volume: 62 },
          { date: 'Mar 10', price: 116.8, open: 118.2, high: 119.0, low: 114.5, volume: 54 },
          { date: 'Mar 22', price: 122.4, open: 119.5, high: 124.2, low: 119.1, volume: 69 },
          { date: 'Apr 03', price: 121.0, open: 122.8, high: 123.5, low: 119.4, volume: 51 },
          { date: 'Apr 15', price: 126.9, open: 123.1, high: 128.4, low: 122.8, volume: 73 },
          { date: 'Apr 27', price: 129.4, open: 127.0, high: 131.2, low: 126.5, volume: 66 },
          { date: 'May 08', price: 127.8, open: 129.1, high: 130.0, low: 126.2, volume: 49 },
          { date: 'May 19', price: 133.5, open: 129.8, high: 135.4, low: 129.5, volume: 81 },
          { date: 'May 30', price: 135.2, open: 133.9, high: 136.8, low: 132.7, volume: 63 },
          { date: 'Jun 10', price: 134.1, open: 135.0, high: 136.1, low: 132.8, volume: 55 },
          { date: 'Jun 20', price: 138.6, open: 135.4, high: 139.8, low: 135.1, volume: 65 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 FY26', revenue: 30.0, net_income: 16.6, eps: 0.68, gross_margin: 75.1 },
          { quarter: 'Q3 FY26', revenue: 35.1, net_income: 19.3, eps: 0.78, gross_margin: 74.6 },
          { quarter: 'Q4 FY26', revenue: 39.3, net_income: 22.1, eps: 0.89, gross_margin: 73.8 },
          { quarter: 'Q1 FY27', revenue: 43.4, net_income: 24.6, eps: 0.99, gross_margin: 74.2 },
        ],
      },
      deep_insights: [
        {
          title: 'Rack-Scale NVL72 Supply Commitment Surge',
          description:
            'Purchase commitments for liquid-cooled rack components rose 38% QoQ in Note 12 of the 10-Q, signaling strong H2 shipment visibility.',
          category: 'Fundamental',
          impact_score: 9,
        },
        {
          title: 'Spectrum-X Ethernet Attach Acceleration',
          description:
            'Networking revenue surged 3.1x YoY as AI cluster interconnects standardized on high-radix Ethernet fabrics.',
          category: 'Technical',
          impact_score: 8,
        },
        {
          title: 'Institutional Call Wall & Positive Gamma Regime',
          description:
            'Dealer hedging flows remain constructive above $132, suppressing realized downside volatility relative to sector peers.',
          category: 'Options & Flow',
          impact_score: 8,
        },
      ],
      findings: [
        {
          documentType: 'Form 10-Q (Quarterly Report)',
          date: '2026-05-28',
          sourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
          keyInsights: [
            'Total Q1 revenue of $43.4B (+69% YoY); Data Center segment contributed $39.2B.',
            'Share repurchases totaled $9.2B during the quarter with $38.5B remaining under current Board authorization.',
            'Inventory purchase obligations increased to $24.1B to support Blackwell Ultra wafer and CoWoS packaging capacity.',
          ],
        },
        {
          documentType: 'Form 8-K (Current Report — Compute Keynote & Dividend)',
          date: '2026-06-04',
          sourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
          keyInsights: [
            'Confirmed annual cadence roadmap across Blackwell Ultra, Rubin, and Vera CPU-GPU coherent interconnects.',
            'Expanded sovereign AI infrastructure partnerships across Europe, Middle East, and Asia-Pacific data centers.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Lead Quant (Kore)',
          line: 'NVIDIA continues to command our highest institutional conviction score at 94 out of 100, trading at $138.60 with strong volume expansion.',
        },
        {
          speaker: 'SEC Strategist (Aoede)',
          line: 'Looking directly at Note 12 in the latest Form 10-Q, inventory and capacity purchase commitments climbed to $24.1 billion, confirming full rack-scale NVL72 demand through fiscal 2027.',
        },
        {
          speaker: 'Lead Quant (Kore)',
          line: 'Combined with $9.2 billion in quarterly buybacks and positive options gamma support above $132, the risk-reward profile remains decisively constructive.',
        },
      ],
    },
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Mega-Cap Tech',
    price: 228.45,
    change: 3.15,
    changePercent: 1.40,
    volume: '48.2M',
    marketCap: '$3.47T',
    peRatio: 33.8,
    rsi14: 61.2,
    ivRank: 34,
    convictionScore: 88,
    shortInterest: '0.8%',
    institutionalOwnership: '62.4%',
    nextEarnings: 'Jul 30, 2026',
    report: {
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'Services gross margin hit an all-time record of 74.6% in the latest Form 10-Q while active installed devices surpassed 2.35 billion globally. Edge AI silicon integration is driving an accelerated multi-year iPhone replacement cycle.',
        conviction_score: 88,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          'Services revenue reached $26.8B (+14.2% YoY) in the most recent quarter, now generating over 38% of consolidated gross profit dollars.',
          'Record $110B share repurchase authorization continues to retire ~3.1% of diluted float annually with $104B in annual operating cash flow.',
          'Gross margin expanded to 47.1% consolidated, supported by favorable Pro/Ultra mix and in-house cellular/Wi-Fi silicon cost savings.',
        ],
      },
      bull_case: [
        {
          point: 'On-Device AI Replacement Supercycle',
          evidence:
            'Over 310M active iPhones are older than 3.5 years; hardware memory bandwidth upgrades require newer Pro-tier silicon.',
        },
        {
          point: 'High-Margin Services Compounding',
          evidence:
            'Paid subscriptions across App Store, iCloud+, and Apple Pay surpassed 1.15 billion, insulating earnings from hardware seasonality.',
        },
      ],
      bear_case: [
        {
          point: 'Antitrust & App Store Take-Rate Scrutiny',
          evidence:
            'DOJ and EU Digital Markets Act compliance remedies could trim 80–120 bps from regional Services take rates.',
        },
        {
          point: 'Greater China Handset Competition',
          evidence:
            'Domestic flagship competitors in Tier-1 Chinese cities remain aggressive on camera and foldable form factors.',
        },
      ],
      base_case: [
        {
          point: 'Double-Digit EPS Growth + Capital Return Floor',
          evidence:
            'Low-single-digit unit growth plus 12%+ Services expansion and systematic buybacks yield 11–13% annual EPS growth.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 204.5, open: 203.1, high: 206.2, low: 202.4, volume: 44 },
          { date: 'Feb 28', price: 208.2, open: 205.8, high: 209.5, low: 205.0, volume: 41 },
          { date: 'Mar 10', price: 206.9, open: 208.0, high: 208.9, low: 205.2, volume: 39 },
          { date: 'Mar 22', price: 211.8, open: 207.5, high: 213.0, low: 207.2, volume: 47 },
          { date: 'Apr 03', price: 214.3, open: 212.0, high: 215.8, low: 211.5, volume: 45 },
          { date: 'Apr 15', price: 212.6, open: 214.1, high: 214.9, low: 210.8, volume: 42 },
          { date: 'Apr 27', price: 217.9, open: 213.4, high: 219.2, low: 213.0, volume: 53 },
          { date: 'May 08', price: 221.4, open: 218.2, high: 223.0, low: 217.9, volume: 56 },
          { date: 'May 19', price: 220.1, open: 221.0, high: 222.4, low: 218.8, volume: 38 },
          { date: 'May 30', price: 224.0, open: 220.5, high: 225.6, low: 220.1, volume: 46 },
          { date: 'Jun 10', price: 225.8, open: 224.2, high: 227.1, low: 223.5, volume: 49 },
          { date: 'Jun 20', price: 228.45, open: 226.0, high: 229.4, low: 225.7, volume: 48 },
        ],
        financial_performance_4q: [
          { quarter: 'Q3 FY25', revenue: 85.8, net_income: 21.4, eps: 1.40, gross_margin: 46.3 },
          { quarter: 'Q4 FY25', revenue: 94.9, net_income: 23.6, eps: 1.54, gross_margin: 46.2 },
          { quarter: 'Q1 FY26', revenue: 124.3, net_income: 36.3, eps: 2.40, gross_margin: 46.9 },
          { quarter: 'Q2 FY26', revenue: 95.4, net_income: 24.8, eps: 1.65, gross_margin: 47.1 },
        ],
      },
      deep_insights: [
        {
          title: 'In-House Silicon Margin Tailwind',
          description:
            'Transition to internal modem and RF subsystems reduces BOM cost per handset by an estimated $18–$24 across mainstream models.',
          category: 'Fundamental',
          impact_score: 9,
        },
        {
          title: 'Low Implied Volatility Percentile (IV Rank 34%)',
          description:
            'Options market is underpricing post-WWDC developer ecosystem monetization relative to historical 3-year realized moves.',
          category: 'Options & Flow',
          impact_score: 7,
        },
        {
          title: 'Capital Return Velocity Above $24B/Quarter',
          description:
            'Consistent open-market share retirements provide mechanical downside cushion during broader index pullbacks.',
          category: 'Insider & SEC',
          impact_score: 8,
        },
      ],
      findings: [
        {
          documentType: 'Form 10-Q (Q2 FY26 Quarterly Report)',
          date: '2026-05-04',
          sourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
          keyInsights: [
            'Consolidated revenue of $95.4B with Services reaching an all-time high of $26.8B.',
            'Gross margin expanded to 47.1%, driven by Services mix shift and component cost leverage.',
          ],
        },
        {
          documentType: 'Form 8-K (Capital Return & Dividend Update)',
          date: '2026-05-04',
          sourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
          keyInsights: [
            'Increased quarterly cash dividend for the 14th consecutive year and authorized incremental share repurchases.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Lead Quant (Kore)',
          line: 'Apple holds an 88 conviction score at $228.45. What stands out most in our multi-agent scan is the quiet expansion in consolidated gross margin to 47.1%.',
        },
        {
          speaker: 'SEC Strategist (Aoede)',
          line: 'Exactly. The Form 10-Q breakdown shows Services gross margin at 74.6% on $26.8 billion in quarterly revenue, giving Apple unprecedented cash flow predictability.',
        },
      ],
    },
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Mega-Cap Tech',
    price: 462.10,
    change: 5.40,
    changePercent: 1.18,
    volume: '22.4M',
    marketCap: '$3.43T',
    peRatio: 35.4,
    rsi14: 59.5,
    ivRank: 31,
    convictionScore: 92,
    shortInterest: '0.7%',
    institutionalOwnership: '73.2%',
    nextEarnings: 'Jul 24, 2026',
    report: {
      ticker: 'MSFT',
      companyName: 'Microsoft Corporation',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'Azure cloud growth accelerated to +33% YoY in the latest 10-Q, with AI services contributing 15 percentage points of that growth. Commercial Remaining Performance Obligations (RPO) climbed to $298B, providing unmatched multi-year enterprise revenue visibility.',
        conviction_score: 92,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          'Commercial RPO surged to $298B (+24% YoY), with 45% scheduled to be recognized as revenue within the next 12 months.',
          'Microsoft 365 Commercial cloud seats expanded alongside rising E5 and Copilot enterprise seat adoption.',
          'Operating income rose 17% YoY despite peak data center depreciation, confirming disciplined opex leverage.',
        ],
      },
      bull_case: [
        {
          point: '$298B Commercial RPO Backlog Conversion',
          evidence:
            'Multi-year enterprise cloud migrations and AI inference workloads are locked in under long-term Azure consumption commitments.',
        },
        {
          point: 'Copilot ARPU Uplift Across 400M+ Commercial Seats',
          evidence:
            'Even a 15% enterprise penetration rate adds over $14B in high-margin incremental annual recurring revenue.',
        },
      ],
      bear_case: [
        {
          point: 'Rising Depreciation Expense from $80B+ Capex Run-Rate',
          evidence:
            'Data center server and infrastructure depreciation schedules will weigh on gross margin expansion over the next 6 quarters.',
        },
      ],
      base_case: [
        {
          point: 'Steady 14–16% Revenue & Operating Income Compounding',
          evidence:
            'Azure capacity additions coming online in H2 directly unlock supply-constrained enterprise AI backlog.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 422.0, open: 420.5, high: 425.0, low: 419.0, volume: 21 },
          { date: 'Feb 28', price: 428.5, open: 424.0, high: 430.2, low: 423.1, volume: 23 },
          { date: 'Mar 10', price: 431.2, open: 429.0, high: 433.8, low: 427.5, volume: 19 },
          { date: 'Mar 22', price: 436.8, open: 432.1, high: 438.9, low: 431.8, volume: 24 },
          { date: 'Apr 03', price: 434.0, open: 436.5, high: 437.2, low: 431.9, volume: 20 },
          { date: 'Apr 15', price: 441.5, open: 435.8, high: 443.4, low: 435.0, volume: 25 },
          { date: 'Apr 27', price: 448.2, open: 442.0, high: 450.5, low: 441.6, volume: 28 },
          { date: 'May 08', price: 446.9, open: 448.0, high: 449.8, low: 444.5, volume: 18 },
          { date: 'May 19', price: 453.4, open: 447.5, high: 455.2, low: 447.0, volume: 22 },
          { date: 'May 30', price: 456.8, open: 453.9, high: 458.5, low: 452.8, volume: 21 },
          { date: 'Jun 10', price: 458.2, open: 456.5, high: 460.1, low: 455.2, volume: 20 },
          { date: 'Jun 20', price: 462.1, open: 458.9, high: 463.8, low: 458.0, volume: 22 },
        ],
        financial_performance_4q: [
          { quarter: 'Q4 FY25', revenue: 64.7, net_income: 22.0, eps: 2.95, gross_margin: 69.6 },
          { quarter: 'Q1 FY26', revenue: 65.6, net_income: 24.7, eps: 3.30, gross_margin: 69.4 },
          { quarter: 'Q2 FY26', revenue: 69.6, net_income: 24.1, eps: 3.23, gross_margin: 68.8 },
          { quarter: 'Q3 FY26', revenue: 71.8, net_income: 25.8, eps: 3.46, gross_margin: 69.1 },
        ],
      },
      deep_insights: [
        {
          title: '$298B Commercial RPO Backlog Expansion',
          description:
            'Note 14 unearned revenue and RPO disclosures show average contract duration lengthening as Fortune 500 clients standardize on Azure.',
          category: 'Insider & SEC',
          impact_score: 9,
        },
        {
          title: 'GitHub & Developer Agent Monetization',
          description:
            'Paid enterprise developer seats grew 39% YoY, creating high-switching-cost workflow lock-in.',
          category: 'Fundamental',
          impact_score: 8,
        },
      ],
      findings: [
        {
          documentType: 'Form 10-Q (Q3 FY26 Quarterly Report)',
          date: '2026-04-30',
          sourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
          keyInsights: [
            'Intelligent Cloud revenue rose 22% YoY to $29.8B, led by Azure and other cloud services (+33%).',
            'Commercial remaining performance obligation increased to $298B.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Lead Quant (Kore)',
          line: 'Microsoft scores a 92 conviction rating at $462.10, anchored by $298 billion in commercial remaining performance obligations.',
        },
        {
          speaker: 'SEC Strategist (Aoede)',
          line: 'And inside the 10-Q segment disclosures, Azure grew 33% year-over-year while operating margins held steady despite record data center builds.',
        },
      ],
    },
  },
  {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Semiconductors & AI',
    price: 254.80,
    change: -3.20,
    changePercent: -1.24,
    volume: '79.5M',
    marketCap: '$809B',
    peRatio: 84.5,
    rsi14: 52.4,
    ivRank: 72,
    convictionScore: 76,
    shortInterest: '3.4%',
    institutionalOwnership: '48.9%',
    nextEarnings: 'Jul 22, 2026',
    report: {
      ticker: 'TSLA',
      companyName: 'Tesla, Inc.',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'Energy Generation & Storage deployments surged +114% YoY with segment gross margins exceeding 30.2% in the latest Form 10-Q, offsetting automotive ASP pressure. Full Self-Driving (FSD) neural network milestones and Megapack backlog anchor the valuation premium.',
        conviction_score: 76,
        stance: 'MODERATE ACCUMULATE',
        key_takeaways: [
          'Energy Storage deployments hit a record 11.4 GWh in the latest quarter, making Energy the fastest-growing gross profit engine in the 10-Q.',
          'Automotive regulatory credit revenue and reduced battery cell cost per kWh ($98/kWh pack level) stabilized auto ex-credits gross margin at 16.8%.',
          'Cash and short-term investments rose to $36.8B, funding autonomous compute clusters without external debt issuance.',
        ],
      },
      bull_case: [
        {
          point: 'Megapack Utility Storage & AI Fleet Autonomy',
          evidence:
            'Lathrop and Shanghai Megafactories are ramping toward 80 GWh annual capacity with high-visibility utility contracts.',
        },
      ],
      bear_case: [
        {
          point: 'Global EV Price Elasticity & Tariff Headwinds',
          evidence:
            'Promotional financing rates in North America and Europe continue to cap near-term automotive gross margin recovery.',
        },
      ],
      base_case: [
        {
          point: 'Energy Profit Growth Bridges Autonomy Commercialization',
          evidence:
            '$36.8B liquidity cushion and growing software/storage mix support valuation near $240–$270.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 218.0, open: 215.0, high: 222.5, low: 214.0, volume: 82 },
          { date: 'Feb 28', price: 226.4, open: 220.0, high: 230.1, low: 219.2, volume: 78 },
          { date: 'Mar 10', price: 219.5, open: 225.0, high: 226.8, low: 216.0, volume: 85 },
          { date: 'Mar 22', price: 234.2, open: 222.0, high: 238.0, low: 221.5, volume: 91 },
          { date: 'Apr 03', price: 241.0, open: 235.5, high: 245.2, low: 233.8, volume: 88 },
          { date: 'Apr 15', price: 236.8, open: 240.0, high: 242.0, low: 232.5, volume: 74 },
          { date: 'Apr 27', price: 249.5, open: 238.0, high: 253.0, low: 237.2, volume: 95 },
          { date: 'May 08', price: 258.2, open: 250.5, high: 262.4, low: 249.0, volume: 89 },
          { date: 'May 19', price: 252.0, open: 257.0, high: 258.5, low: 248.5, volume: 72 },
          { date: 'May 30', price: 261.4, open: 253.0, high: 265.0, low: 252.0, volume: 84 },
          { date: 'Jun 10', price: 258.0, open: 260.5, high: 262.0, low: 254.2, volume: 76 },
          { date: 'Jun 20', price: 254.8, open: 257.5, high: 259.2, low: 252.1, volume: 80 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 25', revenue: 25.5, net_income: 1.5, eps: 0.46, gross_margin: 18.0 },
          { quarter: 'Q3 25', revenue: 25.2, net_income: 2.2, eps: 0.62, gross_margin: 19.8 },
          { quarter: 'Q4 25', revenue: 27.1, net_income: 2.3, eps: 0.66, gross_margin: 18.9 },
          { quarter: 'Q1 26', revenue: 26.4, net_income: 2.1, eps: 0.60, gross_margin: 19.4 },
        ],
      },
      deep_insights: [
        {
          title: 'Energy Storage 30.2% Gross Margin Inflection',
          description:
            'Megapack deployments now carry nearly double the gross margin percentage of consolidated automotive deliveries.',
          category: 'Fundamental',
          impact_score: 9,
        },
        {
          title: 'Elevated Implied Volatility Rank (72%)',
          description:
            'Options market prices significant event volatility ahead of Q2 delivery and autonomous fleet updates.',
          category: 'Options & Flow',
          impact_score: 8,
        },
      ],
      findings: [
        {
          documentType: 'Form 10-Q (Q1 2026 Quarterly Report)',
          date: '2026-04-26',
          sourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
          keyInsights: [
            'Energy generation and storage revenue rose 67% YoY with record gross profit contribution.',
            'Cash, cash equivalents and investments increased to $36.8B.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Lead Quant (Kore)',
          line: 'Tesla registers a 76 conviction score at $254.80. While auto margins are closely watched, the real story in the 10-Q is Energy Storage.',
        },
        {
          speaker: 'SEC Strategist (Aoede)',
          line: 'Energy Storage gross margins topped 30.2% with $36.8 billion in total cash and investments on the balance sheet.',
        },
      ],
    },
  },
  {
    ticker: 'AMD',
    name: 'Advanced Micro Devices',
    sector: 'Semiconductors & AI',
    price: 168.90,
    change: 6.15,
    changePercent: 3.78,
    volume: '51.3M',
    marketCap: '$273B',
    peRatio: 41.8,
    rsi14: 63.1,
    ivRank: 54,
    convictionScore: 86,
    shortInterest: '2.3%',
    institutionalOwnership: '71.4%',
    nextEarnings: 'Jul 29, 2026',
    report: {
      ticker: 'AMD',
      companyName: 'Advanced Micro Devices, Inc.',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'EPYC Turin server CPU share gains and Instinct MI325X/MI350 accelerator deployments propelled Data Center revenue to 54% of total company sales in the latest 10-Q. Enterprise server modernization provides a durable high-margin tailwind.',
        conviction_score: 86,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          'Data Center segment revenue surged +84% YoY to $3.9B in the latest Form 10-Q filing.',
          'Server CPU market share crossed 36% in cloud and enterprise x86 deployments.',
          'Non-GAAP gross margin expanded 190 bps YoY to 54.0% on richer Data Center product mix.',
        ],
      },
      bull_case: [
        {
          point: 'Instinct MI350 Series Inference Adoption',
          evidence:
            'High-memory-capacity HBM3e architecture wins inference footprints at META, MSFT, and Oracle Cloud.',
        },
      ],
      bear_case: [
        {
          point: 'Embedded & Gaming Cyclical Recovery Lag',
          evidence:
            'Semi-custom console demand remains in late-cycle digestion, partially offsetting Data Center strength.',
        },
      ],
      base_case: [
        {
          point: 'Data Center Mix Drives Margin Expansion Toward 56%',
          evidence:
            'Continued EPYC server share gains and AI accelerator ramp support 25%+ EPS growth.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 146.0, open: 144.5, high: 148.2, low: 143.8, volume: 46 },
          { date: 'Feb 28', price: 151.2, open: 147.8, high: 153.0, low: 147.0, volume: 49 },
          { date: 'Mar 10', price: 148.5, open: 150.9, high: 151.5, low: 146.9, volume: 42 },
          { date: 'Mar 22', price: 154.8, open: 149.2, high: 156.4, low: 149.0, volume: 53 },
          { date: 'Apr 03', price: 153.1, open: 154.5, high: 155.8, low: 151.2, volume: 44 },
          { date: 'Apr 15', price: 158.4, open: 153.9, high: 160.1, low: 153.5, volume: 55 },
          { date: 'Apr 27', price: 161.0, open: 158.8, high: 162.9, low: 158.0, volume: 50 },
          { date: 'May 08', price: 159.2, open: 160.8, high: 161.5, low: 157.8, volume: 41 },
          { date: 'May 19', price: 163.5, open: 159.9, high: 165.0, low: 159.5, volume: 52 },
          { date: 'May 30', price: 165.1, open: 163.8, high: 166.8, low: 162.9, volume: 48 },
          { date: 'Jun 10', price: 162.8, open: 164.9, high: 165.4, low: 161.5, volume: 45 },
          { date: 'Jun 20', price: 168.9, open: 164.0, high: 170.2, low: 163.6, volume: 51 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 25', revenue: 5.8, net_income: 1.1, eps: 0.69, gross_margin: 53.0 },
          { quarter: 'Q3 25', revenue: 6.8, net_income: 1.5, eps: 0.92, gross_margin: 53.6 },
          { quarter: 'Q4 25', revenue: 7.7, net_income: 1.8, eps: 1.09, gross_margin: 54.0 },
          { quarter: 'Q1 26', revenue: 7.4, net_income: 1.6, eps: 0.98, gross_margin: 54.2 },
        ],
      },
      deep_insights: [
        {
          title: 'EPYC Server Share Crossing 36% Milestone',
          description:
            'Enterprise TCO advantages in high-core-count x86 racks continue to displace legacy Xeon footprint in 10-Q segment notes.',
          category: 'Fundamental',
          impact_score: 9,
        },
      ],
      findings: [
        {
          documentType: 'Form 10-Q (Q1 2026 Quarterly Report)',
          date: '2026-05-02',
          sourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
          keyInsights: [
            'Data Center segment revenue reached $3.9B (+84% YoY) on strong EPYC and Instinct MI325X shipments.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Lead Quant (Kore)',
          line: 'AMD is up 3.78% today to $168.90 with an 86 conviction score as Data Center revenue crosses 54% of total revenue.',
        },
      ],
    },
  },
  {
    ticker: 'META',
    name: 'Meta Platforms, Inc.',
    sector: 'Mega-Cap Tech',
    price: 588.40,
    change: 8.90,
    changePercent: 1.54,
    volume: '16.9M',
    marketCap: '$1.48T',
    peRatio: 26.4,
    rsi14: 62.7,
    ivRank: 41,
    convictionScore: 91,
    shortInterest: '1.0%',
    institutionalOwnership: '79.6%',
    nextEarnings: 'Jul 31, 2026',
    report: {
      ticker: 'META',
      companyName: 'Meta Platforms, Inc.',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'AI-ranked ad recommendation engines drove a +11% increase in average price per ad alongside +7% ad impressions in the latest Form 10-Q. Family of Apps operating margin topped 48%, funding Llama infrastructure entirely out of free cash flow.',
        conviction_score: 91,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          'Family of Apps operating margin reached 48.4% with daily active people (DAP) rising to 3.35 billion.',
          'Average price per ad rose +11% YoY due to higher advertiser conversion rates from generative ad creative tools.',
        ],
      },
      bull_case: [
        {
          point: 'AI Ad Ranking ROAS Uplift & WhatsApp Business Monetization',
          evidence:
            'Click-to-WhatsApp and AI agent business messaging run-rate exceeded $2.2B quarterly.',
        },
      ],
      bear_case: [
        {
          point: 'Reality Labs Operating Losses & Capex Step-Up',
          evidence:
            'Full-year capital expenditure guidance raised to $62–$66B for next-gen AI training clusters.',
        },
      ],
      base_case: [
        {
          point: 'Attractive 26.4x P/E Relative to 18%+ Revenue Growth',
          evidence:
            'Lowest PEG ratio among trillion-dollar hyperscalers with $52B+ annual free cash flow.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 532.0, open: 529.0, high: 536.0, low: 527.5, volume: 15 },
          { date: 'Feb 28', price: 541.5, open: 535.0, high: 544.0, low: 534.0, volume: 16 },
          { date: 'Mar 10', price: 538.0, open: 541.0, high: 542.5, low: 534.2, volume: 14 },
          { date: 'Mar 22', price: 549.2, open: 539.5, high: 552.0, low: 539.0, volume: 18 },
          { date: 'Apr 03', price: 554.0, open: 550.0, high: 557.8, low: 548.5, volume: 17 },
          { date: 'Apr 15', price: 562.8, open: 555.0, high: 565.4, low: 554.2, volume: 19 },
          { date: 'Apr 27', price: 569.5, open: 563.0, high: 572.0, low: 562.0, volume: 21 },
          { date: 'May 08', price: 566.0, open: 569.0, high: 570.5, low: 563.5, volume: 15 },
          { date: 'May 19', price: 574.2, open: 567.0, high: 577.0, low: 566.5, volume: 16 },
          { date: 'May 30', price: 579.8, open: 575.0, high: 582.5, low: 574.0, volume: 17 },
          { date: 'Jun 10', price: 581.0, open: 579.5, high: 584.0, low: 578.0, volume: 16 },
          { date: 'Jun 20', price: 588.4, open: 582.0, high: 590.5, low: 581.5, volume: 17 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 25', revenue: 39.1, net_income: 13.5, eps: 5.16, gross_margin: 81.2 },
          { quarter: 'Q3 25', revenue: 40.6, net_income: 15.7, eps: 6.03, gross_margin: 81.5 },
          { quarter: 'Q4 25', revenue: 48.4, net_income: 20.8, eps: 8.02, gross_margin: 81.8 },
          { quarter: 'Q1 26', revenue: 44.2, net_income: 16.9, eps: 6.52, gross_margin: 81.6 },
        ],
      },
      deep_insights: [
        {
          title: 'Ad Pricing Power (+11% YoY Price Per Ad)',
          description:
            'Advantage+ AI campaign automation increased advertiser return on ad spend by 22%, driving higher auction clearing prices.',
          category: 'Fundamental',
          impact_score: 9,
        },
      ],
      findings: [
        {
          documentType: 'Form 10-Q (Q1 2026 Quarterly Report)',
          date: '2026-04-29',
          sourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
          keyInsights: [
            'Revenue increased 19% YoY to $44.2B; operating margin expanded to 41% consolidated.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Lead Quant (Kore)',
          line: 'Meta trades at $588.40 with a 91 conviction score and an 81.6% gross margin profile.',
        },
      ],
    },
  },
];

export const SECTOR_SHOWCASES: SectorShowcase[] = [
  {
    id: 'semis-ai',
    title: 'Semiconductors & AI Compute',
    kicker: 'Tier-1 Hardware & Foundry Telemetry',
    description:
      'Track wafer allocation, CoWoS packaging commitments, and hyperscaler data-center capex flows across global silicon leaders with real-time 10-Q supply-chain extraction.',
    featuredTickers: ['NVDA', 'AMD', 'AVGO', 'TSM'],
    avgPe: '42.4x',
    momentumScore: 94,
    flow24h: '+$4.82B Net Institutional Inflow',
    primaryCta: 'Analyze NVDA Deep Report',
  },
  {
    id: 'indices-etfs',
    title: 'Global Indices & Benchmark ETFs',
    kicker: 'Physical vs. Synthetic Constituent Auditing',
    description:
      'Monitor S&P 500, NASDAQ-100, and global benchmark rebalances with automated constituent weight drift analysis, macro yield correlations, and volatility surface tracking.',
    featuredTickers: ['QQQ', 'SPY', 'SMH', 'SOXX'],
    avgPe: '27.8x',
    momentumScore: 86,
    flow24h: '+$2.95B Net Institutional Inflow',
    primaryCta: 'Analyze QQQ Constituent Flow',
  },
  {
    id: 'megacap-cloud',
    title: 'Hyperscale Cloud & Enterprise SaaS',
    kicker: 'RPO Backlog & Operating Leverage',
    description:
      'Audit Remaining Performance Obligations (RPO), net dollar retention rates, and enterprise seat expansion pulled directly from quarterly SEC Form 10-Q footnote tables.',
    featuredTickers: ['MSFT', 'AAPL', 'META', 'AMZN'],
    avgPe: '31.6x',
    momentumScore: 91,
    flow24h: '+$3.40B Net Institutional Inflow',
    primaryCta: 'Analyze MSFT RPO Backlog',
  },
  {
    id: 'macro-quant',
    title: 'Insider Filings & Options Gamma Desk',
    kicker: 'Form 4, 13F & Dealer Volatility Positioning',
    description:
      'Synthesize executive Form 4 cluster buys, institutional 13F quarterly reallocations, and 30-day options implied volatility skew across 4,500+ listed equities.',
    featuredTickers: ['TSLA', 'PLTR', 'JPM', 'NFLX'],
    avgPe: '29.2x',
    momentumScore: 83,
    flow24h: '+$1.74B Net Institutional Inflow',
    primaryCta: 'Analyze TSLA Options Surface',
  },
];

export const RESEARCH_PLANS: ResearchPlan[] = [
  {
    id: 'core',
    badge: 'For Individual Equity Analysts',
    name: 'Core',
    headline: 'Start Smart',
    subtitle: 'Essential SEC filing synthesis and live stock charting — ideal for independent equity researchers.',
    priceMonthly: '$0',
    cadenceNote: 'Free forever · Instant workspace access',
    features: [
      'Real-time price & volume charts across 5 timeframes',
      'Automated Form 10-K & 10-Q executive summaries',
      'Standard Antigravity Flash multi-agent research runs',
      'Daily watchlist conviction scores & RSI/SMA telemetry',
    ],
    limits: {
      secFilingsDepth: 'Trailing 4 Quarters (10-K / 10-Q)',
      agentMode: 'Antigravity Flash (4-Tier Standard)',
      optionsFlowDelay: '15-Minute Delayed Surface',
      exportFormats: 'Web Report & JSON Snapshot',
    },
  },
  {
    id: 'pro',
    badge: 'For Active Quants & Portfolio Managers',
    name: 'Pro',
    headline: 'Analyze Like a Pro',
    subtitle: 'Deep multi-agent adversarial Bull/Bear modeling, live options gamma skew, and instant 8-K event alerts.',
    priceMonthly: '$79',
    cadenceNote: 'Per analyst / month · Billed annually',
    highlighted: true,
    features: [
      'Dual-engine Perseus & Antigravity multi-agent research',
      'Full SEC EDGAR coverage (10-K, 10-Q, 8-K, Form 4, 13F)',
      'Real-time options implied volatility & dealer gamma walls',
      'Multi-speaker synthetic audio podcast briefings',
    ],
    limits: {
      secFilingsDepth: '10-Year Full EDGAR Footnote Archive',
      agentMode: 'Perseus Deep Committee + Antigravity',
      optionsFlowDelay: 'Real-Time Sub-Second Tick Stream',
      exportFormats: 'PDF Dossier, CSV, Audio WAV & API',
    },
  },
  {
    id: 'vip',
    badge: 'For Institutional Research Desks',
    name: 'VIP',
    headline: 'Institutional Advantage',
    subtitle: 'Dedicated multi-seat research workspace with custom SEC covenant monitors and direct API webhooks.',
    priceMonthly: '$290',
    cadenceNote: 'Per desk seat / month · Dedicated SLA',
    features: [
      'Unlimited concurrent multi-agent ticker deep dives',
      'Custom footnote & accounting anomaly red-flag alerts',
      'Direct REST & SSE streaming API into internal terminals',
      '24/7 dedicated quantitative research engineering support',
    ],
    limits: {
      secFilingsDepth: 'Global Filings (SEC, SEDAR+, FCA, TDnet)',
      agentMode: 'Custom Multi-Agent Committee Weights',
      optionsFlowDelay: 'Direct OPRA & Dark Pool Block Feed',
      exportFormats: 'Full Programmatic Webhook & Parquet',
    },
  },
];

export const INSIGHT_ACCORDION_ITEMS: InsightAccordionItem[] = [
  {
    id: 'market-recap',
    number: '01',
    title: 'Market Recap',
    headline: 'Weekly Institutional Equity Overview',
    summary:
      'Stay ahead with concise, source-grounded summaries of semiconductor supply chains, hyperscaler RPO backlogs, and institutional 13F capital rotation.',
    ctaLabel: 'Load NVDA Report ↗',
    targetTicker: 'NVDA',
    cards: [
      {
        kicker: 'FINANCIA RESEARCH',
        quote: 'Where clarity meets capital',
        metric: '10-K & 10-Q Grounded',
      },
      {
        kicker: 'QUANT COMMITTEE',
        quote: 'For analysts who value logic over luck',
        metric: '94/100 Conviction Peak',
      },
      {
        kicker: 'LIVE TELEMETRY',
        quote: 'Markets move. Systems matter.',
        metric: 'Sub-Second Filing Parse',
      },
    ],
  },
  {
    id: 'research-guide',
    number: '02',
    title: 'Research Guide',
    headline: 'Master Multi-Agent SEC Filing Synthesis',
    summary:
      'Explore how Financia cross-references footnote disclosures in Form 10-Q against management earnings call commentary and insider Form 4 transactions.',
    ctaLabel: 'Load AAPL Report ↗',
    targetTicker: 'AAPL',
    cards: [
      {
        kicker: 'TIER 1 EXTRACTION',
        quote: 'Footnote precision over headline noise',
        metric: 'Zero Hallucination Guard',
      },
      {
        kicker: 'TIER 2 DEBATE',
        quote: 'Adversarial Bull vs. Bear stress testing',
        metric: '3-Scenario Modeling',
      },
      {
        kicker: 'TIER 3 VERDICT',
        quote: 'Quantified conviction scoring',
        metric: '100-Point Institutional Scale',
      },
    ],
  },
  {
    id: 'this-week',
    number: '03',
    title: 'This Week',
    headline: 'High-Impact Earnings & 8-K Catalysts',
    summary:
      'Track upcoming quarterly releases, hyperscaler capital expenditure revisions, and options implied volatility crush setups across the Financia coverage universe.',
    ctaLabel: 'Load MSFT Report ↗',
    targetTicker: 'MSFT',
    cards: [
      {
        kicker: 'CLOUD BACKLOG',
        quote: '$298B commercial RPO visibility',
        metric: '+33% Azure Expansion',
      },
      {
        kicker: 'MARGIN PROFILE',
        quote: 'Operating leverage at scale',
        metric: '69.1% Gross Margin',
      },
      {
        kicker: 'OPTIONS SURFACE',
        quote: 'Constructive institutional skew',
        metric: '31% IV Percentile',
      },
    ],
  },
  {
    id: 'tool-tips',
    number: '04',
    title: 'Tool Tips',
    headline: 'Reading Bollinger Bands & Gamma Walls',
    summary:
      'Combine multi-timeframe SMA/EMA technical overlays with SEC fundamental catalysts to identify high-probability institutional accumulation zones.',
    ctaLabel: 'Load AMD Report ↗',
    targetTicker: 'AMD',
    cards: [
      {
        kicker: 'VOLATILITY BANDS',
        quote: '2-Sigma compression breakouts',
        metric: '20-Period Bollinger',
      },
      {
        kicker: 'MOMENTUM OSCILLATOR',
        quote: 'RSI divergence confirmation',
        metric: '14-Period Tabular RSI',
      },
      {
        kicker: 'FILING CORRELATION',
        quote: 'Price action anchored to cash flow',
        metric: '4Q Revenue Overlay',
      },
    ],
  },
];

export const BLOG_BRIEFINGS: BlogBriefing[] = [
  {
    id: 'b1',
    readTime: '5 min read',
    date: '2026-06-18',
    title: 'Smarter Tools for Modern Equity Analysts',
    excerpt:
      'Explore how multi-agent SEC document committees and live options telemetry are reshaping institutional stock research, eliminating hours of manual 10-Q footnote auditing.',
    category: 'Research Architecture',
    relatedTicker: 'NVDA',
    visualVariant: 'posters',
  },
  {
    id: 'b2',
    readTime: '4 min read',
    date: '2026-06-14',
    title: 'One-Click SEC 10-K & 8-K Synthesis',
    excerpt:
      'Discover how Financia extracts off-balance-sheet purchase commitments, RPO backlogs, and segment margin inflections directly from raw EDGAR filings in seconds.',
    category: 'SEC Intelligence',
    relatedTicker: 'MSFT',
    visualVariant: 'terminal',
  },
  {
    id: 'b3',
    readTime: '6 min read',
    date: '2026-06-09',
    title: 'Market Telemetry That Never Sleeps',
    excerpt:
      'How continuous 24/7 monitoring of Form 4 insider cluster transactions and 13F institutional rebalancing surfaces conviction shifts before consensus upgrades.',
    category: 'Quantitative Flow',
    relatedTicker: 'AAPL',
    visualVariant: 'emerald-wave',
  },
  {
    id: 'b4',
    readTime: '5 min read',
    date: '2026-06-02',
    title: 'Deconstructing Energy Storage Margins in EV Filings',
    excerpt:
      'A deep dive into utility-scale Megapack gross margin trajectories and how segment-level SEC disclosures reveal hidden earnings drivers.',
    category: 'Sector Deep Dive',
    relatedTicker: 'TSLA',
    visualVariant: 'matrix-cube',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'Stock Analysis',
    question: 'How does Financia analyze stocks differently from a trading platform?',
    answer:
      'Financia is strictly a stock intelligence and institutional equity research platform — never a brokerage or order-execution venue. Instead of pushing trade execution, our 4-tier multi-agent committee synthesizes SEC filings (10-K, 10-Q, 8-K, Form 4, 13F), options implied volatility, and real-time technical charts into objective Bull, Bear, and Base cases with a 0–100 Conviction Score.',
  },
  {
    id: 'faq-2',
    category: 'Data Sources',
    question: 'Are all insights grounded in verified SEC filings and real market data?',
    answer:
      'Yes. Our research agents enforce strict grounding protocols that prioritize figures extracted directly from official SEC EDGAR filings (Form 10-K annual reports, Form 10-Q quarterly reports, and Form 8-K material event disclosures), supplemented by live exchange price, volume, and options surface telemetry.',
  },
  {
    id: 'faq-3',
    category: 'Platform Features',
    question: 'What is the difference between Antigravity Flash and Perseus Deep Research modes?',
    answer:
      'Antigravity Flash delivers rapid 4-tier executive verdicts, price/volume technical overlays, and key filing takeaways in seconds. Perseus Deep Research conducts an exhaustive multi-agent adversarial debate across fundamental, quant, and insider flow sub-agents, complete with an audio briefing script.',
  },
  {
    id: 'faq-4',
    category: 'Stock Analysis',
    question: 'Can I analyze any custom stock or ETF ticker symbol on the live terminal?',
    answer:
      'Absolutely. Type any valid stock or ETF ticker symbol (such as NVDA, AAPL, MSFT, TSLA, AMD, PLTR, QQQ, or BRK.B) into the Financia Live Terminal search bar and press "Analyze Ticker" to trigger a live multi-agent research run and interactive chart update.',
  },
  {
    id: 'faq-5',
    category: 'Data Sources',
    question: 'How does Financia handle ETFs versus individual operating companies?',
    answer:
      'Financia automatically distinguishes between operating equities and exchange-traded funds (ETFs), differentiating physical replication benchmarks (like QQQ or SPY) from leveraged or synthetic derivatives, and adjusting chart metrics from corporate revenue/net income to constituent flows and yield distributions.',
  },
  {
    id: 'faq-6',
    category: 'Platform Features',
    question: 'How is the 0–100 Institutional Conviction Score calculated?',
    answer:
      'The Conviction Score combines four weighted pillars: (1) SEC 10-Q/10-K operating margin and free-cash-flow momentum (35%), (2) RPO backlog and guidance revisions (25%), (3) Form 4 insider and 13F institutional accumulation (20%), and (4) 20/50-day technical trend and options gamma skew (20%).',
  },
];
