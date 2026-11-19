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
    ticker: 'GOLDBEES',
    name: 'Nippon India ETF Gold BeES',
    sector: 'Gold & Bullion',
    assetClass: 'Gold Bullion',
    price: 74.85,
    currencyUnit: 'INR',
    change: 0.92,
    changePercent: 1.24,
    volume: '18.4M',
    marketCap: '$1.78B AUM',
    aum: '₹14,820 Cr',
    peRatio: 0.79,
    expenseRatio: '0.79% TER',
    ytmOrCagr: '+18.4% 3Y CAGR',
    modifiedDuration: '0.02% Tracking Err',
    creditRating: '995 Fine LBMA Bullion',
    rsi14: 63.4,
    ivRank: 38,
    convictionScore: 93,
    shortInterest: '0.02% Tracking Err',
    institutionalOwnership: '₹14,820 Cr AUM',
    nextEarnings: 'RBI Gold Reserve Qtr',
    dataSource: 'NSE ETF & LBMA Bullion Benchmark',
    report: {
      ticker: 'GOLDBEES',
      companyName: 'Nippon India ETF Gold BeES',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'Physical 995-purity LBMA gold holdings paired with sovereign central-bank accumulation and declining global real yields support sustained bullish conviction. Tight 0.02% tracking error and deep NSE order-book liquidity keep Gold BeES the benchmark Indian bullion hedge.',
        conviction_score: 93,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          'AUM expanded +34% YoY to ₹14,820 Cr on steady retail SIP gold allocation and institutional treasury hedging.',
          'Spot gold (LBMA/PAXG) remains supported above structural sovereign accumulation zones as real rates moderate.',
          'NSE exchange bid-ask spread averages 1.4 bps with zero making charges or storage leakage vs physical bars.',
        ],
      },
      bull_case: [
        {
          point: 'Central Bank Bullion Diversification & Real-Rate Tailwinds',
          evidence:
            'Global central banks added 290+ tonnes in Q1 alongside persistent sovereign fiscal deficits, lifting physical gold ETF inflows.',
        },
        {
          point: 'INR Depreciation Shield + Sovereign Hedge',
          evidence:
            'Domestic INR gold pricing captures both international XAU/USD upside and USD/INR currency carry protection.',
        },
      ],
      bear_case: [
        {
          point: 'Hawkish Real-Yield Spike & Stronger DXY',
          evidence:
            'Unexpected inflation re-acceleration delaying Federal Reserve rate cuts could trigger short-term bullion consolidation.',
        },
      ],
      base_case: [
        {
          point: '12–16% Core Portfolio Hedge Weighting',
          evidence:
            'Low equity correlation (-0.12 to Nifty 50 during drawdowns) improves multi-asset Sharpe ratio across cycles.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 64.9, open: 64.2, high: 65.4, low: 64.0, volume: 14 },
          { date: 'Feb 28', price: 66.2, open: 65.1, high: 66.8, low: 64.9, volume: 15 },
          { date: 'Mar 10', price: 67.4, open: 66.4, high: 67.9, low: 66.1, volume: 16 },
          { date: 'Mar 22', price: 68.1, open: 67.5, high: 68.7, low: 67.0, volume: 17 },
          { date: 'Apr 03', price: 69.5, open: 68.3, high: 70.1, low: 68.1, volume: 19 },
          { date: 'Apr 15', price: 70.2, open: 69.6, high: 70.8, low: 69.2, volume: 16 },
          { date: 'Apr 27', price: 71.1, open: 70.4, high: 71.7, low: 70.0, volume: 18 },
          { date: 'May 08', price: 71.8, open: 71.2, high: 72.3, low: 70.8, volume: 15 },
          { date: 'May 19', price: 72.9, open: 71.9, high: 73.4, low: 71.6, volume: 20 },
          { date: 'May 30', price: 73.4, open: 73.0, high: 74.0, low: 72.7, volume: 17 },
          { date: 'Jun 10', price: 73.95, open: 73.5, high: 74.4, low: 73.2, volume: 18 },
          { date: 'Jun 20', price: 74.85, open: 74.1, high: 75.2, low: 73.9, volume: 18 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 FY26', revenue: 11.4, net_income: 1.9, eps: 16.2, gross_margin: 99.2 },
          { quarter: 'Q3 FY26', revenue: 12.6, net_income: 2.3, eps: 17.5, gross_margin: 99.2 },
          { quarter: 'Q4 FY26', revenue: 13.8, net_income: 2.7, eps: 18.1, gross_margin: 99.2 },
          { quarter: 'Q1 FY27', revenue: 14.8, net_income: 3.1, eps: 18.4, gross_margin: 99.2 },
        ],
      },
      deep_insights: [
        {
          title: 'Physical 995 Fine Vault Audit & Custodial Integrity',
          description:
            'Monthly custodian vault reconciliation confirms 100% physical bullion backing with zero synthetic gold swap exposure.',
          category: 'Factsheet & AMFI',
          impact_score: 9,
        },
        {
          title: 'Low 0.79% Total Expense Ratio vs Jewellery Spreads',
          description:
            'Eliminates 8–14% physical jewellery making/GST friction while maintaining T+1 demat liquidity.',
          category: 'Fund Flow',
          impact_score: 8,
        },
        {
          title: 'Multi-Asset Portfolio Drawdown Dampener',
          description:
            'Adding a 12% GOLDBEES sleeve to a 60/40 Nifty+Gilt portfolio reduced trailing 3Y max drawdown by 280 bps.',
          category: 'Macro',
          impact_score: 9,
        },
      ],
      findings: [
        {
          documentType: 'AMFI Scheme Information Document (SID) & Vault Report',
          date: '2026-06-15',
          sourceUrl: 'https://www.amfiindia.com/',
          keyInsights: [
            'Total Assets Under Management reached ₹14,820 Cr with daily average NSE turnover exceeding ₹115 Cr.',
            'Annualized tracking difference vs domestic 24K bullion index held within ±0.02%.',
          ],
        },
        {
          documentType: 'LBMA & World Gold Council Quarterly Flow Brief',
          date: '2026-06-10',
          sourceUrl: 'https://www.gold.org/',
          keyInsights: [
            'Asian gold ETFs posted 15 consecutive months of positive net tonnage inflows led by Indian bullion ETFs.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Fund Quant (Kore)',
          line: 'Gold BeES carries a 93 conviction rating at 74.85, backed by ₹14,820 crore in audited physical bullion AUM.',
        },
        {
          speaker: 'Fixed-Income Desk (Aoede)',
          line: 'Central bank accumulation and subdued real yields make Gold BeES an efficient sovereign hedge without jewellery storage costs.',
        },
      ],
    },
  },
  {
    ticker: 'PPFAS',
    name: 'Parag Parikh Flexi Cap Direct Growth',
    sector: 'Mutual Funds',
    assetClass: 'Mutual Fund',
    price: 89.42,
    currencyUnit: 'INR',
    change: 0.78,
    changePercent: 0.88,
    volume: '34.2M',
    marketCap: '$10.4B AUM',
    aum: '₹86,400 Cr',
    peRatio: 0.63,
    expenseRatio: '0.63% TER',
    ytmOrCagr: '+21.4% 3Y CAGR',
    modifiedDuration: '14.2% Cash Buffer',
    creditRating: 'Flexi-Cap Direct Plan',
    amfiSchemeCode: '122639',
    rsi14: 60.8,
    ivRank: 24,
    convictionScore: 95,
    shortInterest: '0.45% Beta 0.74',
    institutionalOwnership: '₹86,400 Cr AUM',
    nextEarnings: 'AMFI Monthly Factsheet',
    dataSource: 'AMFI Scheme 122639 · Direct Growth NAV',
    report: {
      ticker: 'PPFAS',
      companyName: 'Parag Parikh Flexi Cap Fund Direct Growth',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'Parag Parikh Flexi Cap (AMFI 122639) maintains category-leading risk-adjusted alpha with a 0.63% Direct TER and conservative 14.2% arbitrage/T-Bill liquidity buffer. Consistent monthly SIP inflows and low portfolio turnover (18%) keep tax drag minimal.',
        conviction_score: 95,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          'Trailing 3-year Direct Plan CAGR stands at +21.4% with downside capture ratio below 64% vs Nifty 500 TRI.',
          'Holds 14.2% in sovereign TREPS / short-term debt instruments, providing dry powder for market corrections.',
          'Low 0.63% Direct Plan expense ratio preserves ~95 bps annually versus regular distributor share classes.',
        ],
      },
      bull_case: [
        {
          point: 'Global + Domestic Quality Compounding Mandate',
          evidence:
            'Unique ability to hold high-ROCE Indian banks/FMCG alongside global mega-cap cash compounders smooths currency cycles.',
        },
        {
          point: 'Disciplined Cash & Arbitrage Buffer for Drawdowns',
          evidence:
            '14.2% liquid fixed-income deployment lets fund managers buy dips without forced redemptions.',
        },
      ],
      bear_case: [
        {
          point: 'Large ₹86,400 Cr AUM Constrains Small-Cap Elasticity',
          evidence:
            'Deployments in sub-$1B mid/small companies move the needle less at current fund scale, keeping tilt large-cap heavy.',
        },
      ],
      base_case: [
        {
          point: '15–18% Long-Term Risk-Adjusted SIP Compounding',
          evidence:
            'Top-quartile Sortino ratio and 0.74 portfolio beta support core 5Y+ SIP allocation.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 81.2, open: 80.9, high: 81.5, low: 80.8, volume: 28 },
          { date: 'Feb 28', price: 82.1, open: 81.3, high: 82.4, low: 81.2, volume: 29 },
          { date: 'Mar 10', price: 82.8, open: 82.2, high: 83.1, low: 82.0, volume: 27 },
          { date: 'Mar 22', price: 83.9, open: 82.9, high: 84.2, low: 82.8, volume: 30 },
          { date: 'Apr 03', price: 84.4, open: 84.0, high: 84.7, low: 83.8, volume: 31 },
          { date: 'Apr 15', price: 85.1, open: 84.5, high: 85.4, low: 84.3, volume: 32 },
          { date: 'Apr 27', price: 86.2, open: 85.2, high: 86.5, low: 85.1, volume: 33 },
          { date: 'May 08', price: 86.8, open: 86.3, high: 87.1, low: 86.1, volume: 30 },
          { date: 'May 19', price: 87.5, open: 86.9, high: 87.8, low: 86.8, volume: 34 },
          { date: 'May 30', price: 88.2, open: 87.6, high: 88.5, low: 87.4, volume: 32 },
          { date: 'Jun 10', price: 88.64, open: 88.3, high: 88.9, low: 88.1, volume: 33 },
          { date: 'Jun 20', price: 89.42, open: 88.7, high: 89.6, low: 88.5, volume: 34 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 FY26', revenue: 69.2, net_income: 4.8, eps: 19.4, gross_margin: 99.4 },
          { quarter: 'Q3 FY26', revenue: 74.8, net_income: 5.1, eps: 20.1, gross_margin: 99.4 },
          { quarter: 'Q4 FY26', revenue: 80.5, net_income: 5.4, eps: 20.8, gross_margin: 99.4 },
          { quarter: 'Q1 FY27', revenue: 86.4, net_income: 5.9, eps: 21.4, gross_margin: 99.4 },
        ],
      },
      deep_insights: [
        {
          title: 'AMFI 122639 Downside Protection Ratio (63%)',
          description:
            'Historical monthly return matrix shows PPFAS captured less than two-thirds of broad benchmark drawdowns while compounding steadily.',
          category: 'Factsheet & AMFI',
          impact_score: 9,
        },
        {
          title: 'Monthly Systematic Investment Plan (SIP) Stickiness',
          description:
            'Net monthly inflows averaged ₹1,940 Cr over the last four quarters with low redemption velocity.',
          category: 'Fund Flow',
          impact_score: 9,
        },
      ],
      findings: [
        {
          documentType: 'AMFI Direct Growth Factsheet (Scheme 122639)',
          date: '2026-06-12',
          sourceUrl: 'https://api.mfapi.in/mf/122639',
          keyInsights: [
            'Total Expense Ratio (Direct Plan): 0.63%; Portfolio Beta: 0.74; Standard Deviation: 11.2%.',
            'Top debt/cash sleeve yields 6.72% via overnight TREPS and commercial paper buffer.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Fund Quant (Kore)',
          line: 'Parag Parikh Flexi Cap tops our Mutual Fund pillar with a 95 conviction rating and a 21.4% 3-year CAGR.',
        },
        {
          speaker: 'Fixed-Income Desk (Aoede)',
          line: 'Crucially, its 14.2% T-Bill and arbitrage liquidity sleeve keeps volatility lower than pure flexi-cap peers.',
        },
      ],
    },
  },
  {
    ticker: 'NIFTYBEES',
    name: 'Nippon India ETF Nifty 50 BeES',
    sector: 'ETFs',
    assetClass: 'ETF',
    price: 284.6,
    currencyUnit: 'INR',
    change: 2.85,
    changePercent: 1.01,
    volume: '26.5M',
    marketCap: '$4.2B AUM',
    aum: '₹35,100 Cr',
    peRatio: 0.04,
    expenseRatio: '0.04% TER',
    ytmOrCagr: '+16.2% 3Y CAGR',
    modifiedDuration: '0.03% Tracking Err',
    creditRating: 'Nifty 50 Physical Index',
    rsi14: 59.8,
    ivRank: 22,
    convictionScore: 91,
    shortInterest: '0.03% Tracking Err',
    institutionalOwnership: '₹35,100 Cr AUM',
    nextEarnings: 'NSE Index Rebalance',
    dataSource: 'NSE Physical Index ETF · TRI Tracked',
    report: {
      ticker: 'NIFTYBEES',
      companyName: 'Nippon India ETF Nifty 50 BeES',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'At an ultra-low 0.04% expense ratio and 0.03% annualized tracking error, Nifty BeES delivers pure large-cap institutional index beta with deep intraday liquidity. Strong EPFO and systematic passive inflows anchor demand.',
        conviction_score: 91,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          '0.04% TER makes NIFTYBEES 10–15x cheaper than active large-cap mutual funds.',
          'Physical full-replication basket across India’s top 50 blue-chip constituents eliminates single-manager drift.',
          'Ideal core index ETF building block paired alongside GOLDBEES and SBIGILT in a balanced passive core.',
        ],
      },
      bull_case: [
        {
          point: 'Passive Indexation Share Crossing 18% of Institutional MF AUM',
          evidence:
            'Retirement and sovereign pension mandates continue routing marginal inflows into ultra-low-cost passive index ETFs.',
        },
      ],
      bear_case: [
        {
          point: 'Valuation Multiple Mean Reversion in Heavyweight Constituents',
          evidence:
            'Top 10 index components account for ~56% of weight, concentrating macro rate sensitivity.',
        },
      ],
      base_case: [
        {
          point: '12–14% Benchmark TRI Compounding at Zero Manager Fee Drag',
          evidence:
            'Reinvested constituent dividends enhance total return index compounding over multi-year horizons.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 258.4, open: 257.0, high: 260.2, low: 256.5, volume: 22 },
          { date: 'Feb 28', price: 262.0, open: 259.0, high: 263.5, low: 258.4, volume: 24 },
          { date: 'Mar 10', price: 260.5, open: 262.1, high: 263.0, low: 259.1, volume: 21 },
          { date: 'Mar 22', price: 266.2, open: 261.2, high: 267.8, low: 260.9, volume: 25 },
          { date: 'Apr 03', price: 269.8, open: 266.8, high: 271.2, low: 266.1, volume: 23 },
          { date: 'Apr 15', price: 271.4, open: 269.9, high: 272.6, low: 268.8, volume: 26 },
          { date: 'Apr 27', price: 275.0, open: 271.8, high: 276.4, low: 271.2, volume: 28 },
          { date: 'May 08', price: 274.2, open: 275.1, high: 276.0, low: 272.5, volume: 22 },
          { date: 'May 19', price: 278.9, open: 274.8, high: 280.1, low: 274.4, volume: 27 },
          { date: 'May 30', price: 281.2, open: 279.1, high: 282.5, low: 278.5, volume: 25 },
          { date: 'Jun 10', price: 281.8, open: 281.4, high: 283.1, low: 280.2, volume: 24 },
          { date: 'Jun 20', price: 284.6, open: 282.1, high: 285.5, low: 281.9, volume: 26 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 FY26', revenue: 29.8, net_income: 1.9, eps: 14.9, gross_margin: 99.9 },
          { quarter: 'Q3 FY26', revenue: 31.4, net_income: 2.1, eps: 15.4, gross_margin: 99.9 },
          { quarter: 'Q4 FY26', revenue: 33.2, net_income: 2.3, eps: 15.8, gross_margin: 99.9 },
          { quarter: 'Q1 FY27', revenue: 35.1, net_income: 2.6, eps: 16.2, gross_margin: 99.9 },
        ],
      },
      deep_insights: [
        {
          title: '0.03% Tracking Error Across Semi-Annual Rebalances',
          description:
            'Automated creation/redemption baskets minimize cash drag even during high-volatility March/September index reconstitutions.',
          category: 'Technical',
          impact_score: 9,
        },
      ],
      findings: [
        {
          documentType: 'NSE Passive ETF Monthly Disclosure',
          date: '2026-06-14',
          sourceUrl: 'https://www.nseindia.com/',
          keyInsights: [
            'Total Expense Ratio maintained at 0.04% with ₹35,100 Cr AUM and 100% physical constituent replication.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Fund Quant (Kore)',
          line: 'Nifty BeES trades at 284.60 with a 91 conviction score and an industry-leading 4 basis point expense ratio.',
        },
      ],
    },
  },
  {
    ticker: 'SBIGILT',
    name: 'SBI Magnum Gilt Fund Direct Growth',
    sector: 'Debt Funds',
    assetClass: 'Debt Fund',
    price: 68.14,
    currencyUnit: 'INR',
    change: 0.24,
    changePercent: 0.35,
    volume: '12.6M',
    marketCap: '$1.32B AUM',
    aum: '₹11,020 Cr',
    peRatio: 0.46,
    expenseRatio: '0.46% TER',
    ytmOrCagr: '7.18% YTM',
    modifiedDuration: '6.40 Yrs Mod Dur',
    creditRating: '100% SOV G-Sec',
    amfiSchemeCode: '119823',
    rsi14: 58.6,
    ivRank: 16,
    convictionScore: 92,
    shortInterest: '0.00% Credit Risk',
    institutionalOwnership: '100% Sovereign',
    nextEarnings: 'RBI MPC Policy Cycle',
    dataSource: 'AMFI Scheme 119823 · Sovereign G-Sec NAV',
    report: {
      ticker: 'SBIGILT',
      companyName: 'SBI Magnum Gilt Fund Direct Growth',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'Allocated 100% to sovereign Government of India Securities (G-Secs) and Treasury Bills with zero corporate default risk. At 6.40 years Modified Duration and 7.18% YTM, every 50 bps drop in benchmark 10Y G-Sec yields generates ~3.2% capital appreciation on top of accrual.',
        conviction_score: 92,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          '100% Sovereign G-Sec + Cash credit quality eliminates corporate credit downgrade risk.',
          'Modified Duration of 6.40 years captures asymmetric bond rally upside ahead of RBI policy easing.',
          'Direct Plan Expense Ratio of 0.46% maximizes net investor Yield-to-Maturity (net YTM ~6.72%).',
        ],
      },
      bull_case: [
        {
          point: 'Duration Capital Gain + 7.18% Sovereign Accrual Cushion',
          evidence:
            'Global bond index inclusion (JP Morgan EM & Bloomberg) continues bringing structural foreign inflows into Indian 10Y–14Y G-Secs.',
        },
        {
          point: 'RBI Disinflationary Trajectory Unlocks Rate Cut Cycle',
          evidence:
            'CPI cooling toward 4.2% enables repo cut repricing across medium-to-long duration sovereign bonds.',
        },
      ],
      bear_case: [
        {
          point: 'Duration Sensitivity if Fiscal Deficit Widens',
          evidence:
            'A +25 bps spike in 10Y G-Sec yields causes ~1.6% mark-to-market NAV dip given the 6.4Y modified duration.',
        },
      ],
      base_case: [
        {
          point: '8.5–10.2% Blended 12M Total Return (Accrual + Roll-Down)',
          evidence:
            'Steady 7.18% gross YTM provides predictable fixed-income carry while waiting for policy yield compression.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 65.8, open: 65.7, high: 65.9, low: 65.6, volume: 10 },
          { date: 'Feb 28', price: 66.05, open: 65.8, high: 66.1, low: 65.7, volume: 11 },
          { date: 'Mar 10', price: 66.22, open: 66.0, high: 66.3, low: 65.9, volume: 10 },
          { date: 'Mar 22', price: 66.48, open: 66.2, high: 66.55, low: 66.1, volume: 12 },
          { date: 'Apr 03', price: 66.75, open: 66.5, high: 66.85, low: 66.4, volume: 11 },
          { date: 'Apr 15', price: 66.92, open: 66.7, high: 67.0, low: 66.6, volume: 11 },
          { date: 'Apr 27', price: 67.18, open: 66.9, high: 67.25, low: 66.8, volume: 13 },
          { date: 'May 08', price: 67.39, open: 67.2, high: 67.45, low: 67.1, volume: 11 },
          { date: 'May 19', price: 67.61, open: 67.4, high: 67.7, low: 67.3, volume: 12 },
          { date: 'May 30', price: 67.84, open: 67.6, high: 67.9, low: 67.5, volume: 13 },
          { date: 'Jun 10', price: 67.9, open: 67.85, high: 68.0, low: 67.8, volume: 12 },
          { date: 'Jun 20', price: 68.14, open: 67.92, high: 68.22, low: 67.9, volume: 13 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 FY26', revenue: 9.2, net_income: 7.4, eps: 7.31, gross_margin: 100 },
          { quarter: 'Q3 FY26', revenue: 9.8, net_income: 7.9, eps: 7.26, gross_margin: 100 },
          { quarter: 'Q4 FY26', revenue: 10.4, net_income: 8.6, eps: 7.21, gross_margin: 100 },
          { quarter: 'Q1 FY27', revenue: 11.0, net_income: 9.4, eps: 7.18, gross_margin: 100 },
        ],
      },
      deep_insights: [
        {
          title: '6.40-Year Modified Duration Rate-CutConvexity',
          description:
            'Portfolio concentrates in liquid 2033–2039 sovereign IGB benchmarks qualifying for passive foreign bond index inclusion.',
          category: 'Yield & Duration',
          impact_score: 9,
        },
        {
          title: 'Zero Corporate Default Exposure (100% SOV)',
          description:
            'No AT1 bonds, structured obligations, or sub-AA corporate debt — pure sovereign backing.',
          category: 'Factsheet & AMFI',
          impact_score: 9,
        },
      ],
      findings: [
        {
          documentType: 'AMFI Debt Monthly Portfolio Disclosure (119823)',
          date: '2026-06-15',
          sourceUrl: 'https://api.mfapi.in/mf/119823',
          keyInsights: [
            'Yield to Maturity (YTM): 7.18%; Macaulay Duration: 6.64 yrs; Modified Duration: 6.40 yrs.',
            'Credit Profile: 96.4% GOI Sovereign Dated Securities + 3.6% Reverse Repo / TREPS.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Fixed-Income Desk (Aoede)',
          line: 'SBI Magnum Gilt holds a 92 conviction score with 100% sovereign credit safety and 7.18% YTM.',
        },
        {
          speaker: 'Fund Quant (Kore)',
          line: 'With a 6.4-year modified duration, this debt fund positions fixed-income portfolios for sovereign yield compression.',
        },
      ],
    },
  },
  {
    ticker: 'HDFCCORP',
    name: 'HDFC Corporate Bond Fund Direct',
    sector: 'Debt Funds',
    assetClass: 'Debt Fund',
    price: 33.48,
    currencyUnit: 'INR',
    change: 0.08,
    changePercent: 0.24,
    volume: '15.8M',
    marketCap: '$3.85B AUM',
    aum: '₹32,140 Cr',
    peRatio: 0.35,
    expenseRatio: '0.35% TER',
    ytmOrCagr: '7.62% YTM',
    modifiedDuration: '3.12 Yrs Mod Dur',
    creditRating: '99.4% AAA / SOV',
    amfiSchemeCode: '128053',
    rsi14: 61.5,
    ivRank: 11,
    convictionScore: 90,
    shortInterest: '0.0% Sub-AA',
    institutionalOwnership: '₹32,140 Cr AUM',
    nextEarnings: 'RBI Liquidity Policy',
    dataSource: 'AMFI Scheme 128053 · AAA Corporate Debt NAV',
    report: {
      ticker: 'HDFCCORP',
      companyName: 'HDFC Corporate Bond Fund Direct Growth',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'Anchors core corporate debt sleeves with 99.4% AAA/Sovereign PSU papers, a tight 0.35% expense ratio, and 7.62% YTM at a controlled 3.12-year modified duration. Delivers higher accrual than liquid funds with muted mark-to-market volatility.',
        conviction_score: 90,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          '7.62% gross YTM captures +45 bps spread over sovereign G-Secs with top-tier PSU/AAA balance sheets (NABARD, PFC, REC, SIDBI).',
          '3.12-year modified duration keeps interest-rate volatility balanced across 2–4Y holding horizons.',
          '₹32,140 Cr scale provides institutional repo/secondary bond negotiation power.',
        ],
      },
      bull_case: [
        {
          point: 'High Accrual Spread Over Overnight Rates',
          evidence:
            'AAA PSU curve steepness in the 3–5Y belly delivers superior carry with negligible default probability.',
        },
      ],
      bear_case: [
        {
          point: 'Tight AAA Corporate Spreads vs Sovereign G-Secs',
          evidence:
            'Should heavy corporate bond supply hit Q3, AAA spreads could widen 10–15 bps temporarily.',
        },
      ],
      base_case: [
        {
          point: 'Steady 7.2–7.8% Net Annualized Debt Accrual',
          evidence:
            'Zero exit load and daily liquidity suit corporate treasury and conservative income allocations.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 32.64, open: 32.6, high: 32.68, low: 32.58, volume: 13 },
          { date: 'Feb 28', price: 32.72, open: 32.65, high: 32.75, low: 32.64, volume: 14 },
          { date: 'Mar 10', price: 32.79, open: 32.73, high: 32.82, low: 32.71, volume: 13 },
          { date: 'Mar 22', price: 32.88, open: 32.8, high: 32.91, low: 32.79, volume: 15 },
          { date: 'Apr 03', price: 32.96, open: 32.89, high: 32.99, low: 32.87, volume: 14 },
          { date: 'Apr 15', price: 33.04, open: 32.97, high: 33.07, low: 32.95, volume: 15 },
          { date: 'Apr 27', price: 33.12, open: 33.05, high: 33.15, low: 33.03, volume: 16 },
          { date: 'May 08', price: 33.21, open: 33.13, high: 33.24, low: 33.11, volume: 14 },
          { date: 'May 19', price: 33.28, open: 33.22, high: 33.31, low: 33.2, volume: 15 },
          { date: 'May 30', price: 33.35, open: 33.29, high: 33.38, low: 33.27, volume: 16 },
          { date: 'Jun 10', price: 33.4, open: 33.36, high: 33.43, low: 33.34, volume: 15 },
          { date: 'Jun 20', price: 33.48, open: 33.41, high: 33.51, low: 33.39, volume: 16 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 FY26', revenue: 28.9, net_income: 7.4, eps: 7.72, gross_margin: 99.6 },
          { quarter: 'Q3 FY26', revenue: 29.8, net_income: 7.5, eps: 7.69, gross_margin: 99.6 },
          { quarter: 'Q4 FY26', revenue: 31.1, net_income: 7.6, eps: 7.65, gross_margin: 99.6 },
          { quarter: 'Q1 FY27', revenue: 32.1, net_income: 7.8, eps: 7.62, gross_margin: 99.6 },
        ],
      },
      deep_insights: [
        {
          title: '99.4% AAA & Sovereign Credit Guardrail',
          description:
            'Overweight NABARD, REC, and sovereign SDL instruments ensures institutional-grade credit preservation.',
          category: 'Yield & Duration',
          impact_score: 9,
        },
      ],
      findings: [
        {
          documentType: 'AMFI Corporate Bond Portfolio (128053)',
          date: '2026-06-15',
          sourceUrl: 'https://api.mfapi.in/mf/128053',
          keyInsights: [
            'YTM 7.62%; Modified Duration 3.12 yrs; Expense Ratio 0.35% Direct Growth.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Fixed-Income Desk (Aoede)',
          line: 'HDFC Corporate Bond offers 7.62% YTM across 99.4% AAA and Sovereign holdings with a steady 3.12-year duration.',
        },
      ],
    },
  },
  {
    ticker: 'GLD',
    name: 'SPDR Gold Shares ETF',
    sector: 'Gold & Bullion',
    assetClass: 'ETF',
    price: 306.4,
    currencyUnit: 'USD',
    change: 3.85,
    changePercent: 1.27,
    volume: '11.4M',
    marketCap: '$78.6B AUM',
    aum: '$78.6B USD',
    peRatio: 0.4,
    expenseRatio: '0.40% TER',
    ytmOrCagr: '+24.1% 1Y Return',
    modifiedDuration: '0.01% Tracking Err',
    creditRating: '100% Physical Bullion',
    rsi14: 62.9,
    ivRank: 41,
    convictionScore: 91,
    shortInterest: '0.35% Float',
    institutionalOwnership: '74.2%',
    nextEarnings: 'FOMC Real-Rate Print',
    dataSource: 'NYSE Arca Global Bullion ETF',
    report: {
      ticker: 'GLD',
      companyName: 'SPDR Gold Shares ETF',
      generatedAt: '2026-06-20T14:30:00Z',
      verdict: {
        summary:
          'World’s largest physically backed gold ETF ($78.6B AUM) experiencing net institutional creation baskets alongside sovereign bullion reserve additions. Low 0.40% expense ratio and tight options liquidity make GLD the global standard commodity ETF.',
        conviction_score: 91,
        stance: 'HIGH CONVICTION BULLISH',
        key_takeaways: [
          'Over 920 metric tonnes of allocated LBMA London good-delivery bars held in physical trust.',
          'Options market reflects bullish call skew as macro allocators hedge US fiscal trajectory.',
        ],
      },
      bull_case: [
        {
          point: 'De-Dollarization & Reserve Asset Rotation',
          evidence:
            'Official-sector central bank gold share of FX reserves reached multi-decade highs.',
        },
      ],
      bear_case: [
        {
          point: 'Real 10Y TIPS Yield Breakout Above 2.5%',
          evidence:
            'Sustained high real Treasury yields represent an opportunity cost for non-yielding bullion.',
        },
      ],
      base_case: [
        {
          point: 'Gradual Real-Rate Normalization Sustains $3,250+/oz Gold Floor',
          evidence:
            'Physical ETF creation flows remain positive across North American and Asian wealth desks.',
        },
      ],
      financial_charts: {
        stock_price_4m: [
          { date: 'Feb 15', price: 271.2, open: 269.8, high: 273.0, low: 268.9, volume: 9 },
          { date: 'Feb 28', price: 276.4, open: 272.0, high: 278.1, low: 271.5, volume: 10 },
          { date: 'Mar 10', price: 279.8, open: 276.8, high: 281.4, low: 276.2, volume: 10 },
          { date: 'Mar 22', price: 284.1, open: 280.2, high: 285.9, low: 279.8, volume: 11 },
          { date: 'Apr 03', price: 288.5, open: 284.6, high: 290.1, low: 283.9, volume: 12 },
          { date: 'Apr 15', price: 291.0, open: 288.9, high: 292.4, low: 287.5, volume: 10 },
          { date: 'Apr 27', price: 294.8, open: 291.5, high: 296.2, low: 290.8, volume: 11 },
          { date: 'May 08', price: 296.2, open: 294.9, high: 297.8, low: 293.5, volume: 9 },
          { date: 'May 19', price: 299.6, open: 296.8, high: 301.2, low: 296.0, volume: 12 },
          { date: 'May 30', price: 302.1, open: 300.0, high: 303.5, low: 299.2, volume: 11 },
          { date: 'Jun 10', price: 302.9, open: 301.8, high: 304.2, low: 300.9, volume: 10 },
          { date: 'Jun 20', price: 306.4, open: 303.2, high: 307.8, low: 302.7, volume: 11 },
        ],
        financial_performance_4q: [
          { quarter: 'Q2 25', revenue: 64.2, net_income: 5.1, eps: 19.8, gross_margin: 99.6 },
          { quarter: 'Q3 25', revenue: 69.5, net_income: 6.4, eps: 21.4, gross_margin: 99.6 },
          { quarter: 'Q4 25', revenue: 74.1, net_income: 7.2, eps: 22.9, gross_margin: 99.6 },
          { quarter: 'Q1 26', revenue: 78.6, net_income: 8.5, eps: 24.1, gross_margin: 99.6 },
        ],
      },
      deep_insights: [
        {
          title: 'Allocated Bullion Bar Custody Audit',
          description:
            'Daily bar-serial disclosure tracks over 920 tonnes of unencumbered physical gold.',
          category: 'Factsheet & AMFI',
          impact_score: 9,
        },
      ],
      findings: [
        {
          documentType: 'SPDR Gold Trust Prospectus & Bar List',
          date: '2026-06-18',
          sourceUrl: 'https://www.spdrgoldshares.com/',
          keyInsights: [
            'Total Net Asset Value reached $78.6B USD with 0.40% gross expense ratio.',
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Fund Quant (Kore)',
          line: 'GLD trades near $306.40 with $78.6 billion in physical gold AUM and resilient institutional creation inflows.',
        },
      ],
    },
  },
];

export const INITIAL_FUNDS = INITIAL_STOCKS;

export const SECTOR_SHOWCASES: SectorShowcase[] = [
  {
    id: 'mutual-funds',
    title: 'Direct Mutual Funds & SIP Flows',
    kicker: 'AMFI Live NAV & Downside Capture Analytics',
    description:
      'Audit Direct Plan expense ratios, trailing 3Y/5Y rolling CAGR, portfolio cash buffers, and monthly SIP stickiness across India and global mutual funds.',
    featuredTickers: ['PPFAS', 'HDFCMID', 'QUANTSC', 'UTI50'],
    avgPe: '0.62% Avg TER',
    momentumScore: 95,
    flow24h: '+₹26,400 Cr Monthly SIP Inflow',
    primaryCta: 'Analyze PPFAS Direct NAV',
  },
  {
    id: 'gold-bullion',
    title: 'Gold ETFs, SGBs & Spot Bullion',
    kicker: 'LBMA Vault Purity & Real-Rate Hedge',
    description:
      'Compare Gold BeES, SPDR GLD, Sovereign Gold Bond tranches, and live PAXG/XAU spot bullion curves against US 10Y TIPS real yields and USD/INR.',
    featuredTickers: ['GOLDBEES', 'GLD', 'SILVERBEES', 'SGBMAR31'],
    avgPe: '0.52% Avg TER',
    momentumScore: 93,
    flow24h: '+$2.85B Global Gold ETF Flow',
    primaryCta: 'Analyze GOLDBEES Bullion',
  },
  {
    id: 'debt-funds',
    title: 'Debt Funds, Gilt & Fixed Income',
    kicker: 'YTM Accrual, Modified Duration & Credit Safety',
    description:
      'Model Sovereign G-Sec duration convexity, AAA Corporate Bond spreads, overnight TREPS liquidity yields, and RBI/Fed rate-cut sensitivity.',
    featuredTickers: ['SBIGILT', 'HDFCCORP', 'LIQUIDBEES', 'AGG'],
    avgPe: '7.38% Avg YTM',
    momentumScore: 91,
    flow24h: '+$3.12B Sovereign & AAA Inflow',
    primaryCta: 'Analyze SBIGILT Duration',
  },
  {
    id: 'global-etfs',
    title: 'Broad Index & Treasury ETFs',
    kicker: 'Low-Cost Physical Replication & Tracking Error',
    description:
      'Track Nifty BeES, Bank BeES, S&P 500 SPY, NASDAQ QQQ, and 20Y Treasury TLT expense ratios, creation/redemption spreads, and constituent drift.',
    featuredTickers: ['NIFTYBEES', 'BANKBEES', 'SPY', 'TLT'],
    avgPe: '0.11% Avg TER',
    momentumScore: 89,
    flow24h: '+$5.40B Global ETF Creation',
    primaryCta: 'Analyze NIFTYBEES Flows',
  },
];

export const RESEARCH_PLANS: ResearchPlan[] = [
  {
    id: 'core',
    badge: 'For Direct Mutual Fund & ETF Investors',
    name: 'Core',
    headline: 'Start Smart',
    subtitle: 'Live AMFI Direct NAV feeds, Gold/Bullion tracking, and core ETF analytics — built for disciplined SIP allocators.',
    priceMonthly: '$0',
    cadenceNote: 'Free forever · Instant workspace access',
    features: [
      'Real-time Mutual Fund NAV & ETF price charts across 5 timeframes',
      'Direct vs. Regular expense-ratio & tracking-error breakdown',
      'Standard Fund Quant multi-agent research runs',
      'Daily watchlist conviction scores & RSI/SMA overlays',
    ],
    limits: {
      secFilingsDepth: 'Trailing 4Q AMFI Factsheets & SIDs',
      agentMode: 'Antigravity Flash (4-Pillar Standard)',
      optionsFlowDelay: 'Live AMFI & Binance Spot Gold Feed',
      exportFormats: 'Web Report & JSON Snapshot',
    },
  },
  {
    id: 'pro',
    badge: 'For Wealth Advisors & Fixed-Income Desks',
    name: 'Pro',
    headline: 'Allocate Like a Pro',
    subtitle: 'Full Debt Fund YTM/duration stress testing, Gold real-rate models, and instant NAV/yield breakout alerts.',
    priceMonthly: '$79',
    cadenceNote: 'Per advisor / month · Billed annually',
    highlighted: true,
    features: [
      'Dual-engine Perseus & Antigravity fund research committee',
      'Full AMFI SID/KIM, AAA Debt credit ratings & LBMA bar audits',
      'Duration sensitivity modeling (RBI MPC & FOMC rate paths)',
      'Multi-speaker synthetic audio portfolio briefings',
    ],
    limits: {
      secFilingsDepth: '10-Year Historical NAV, YTM & AUM Archive',
      agentMode: 'Perseus Deep Committee + Antigravity',
      optionsFlowDelay: 'Real-Time Sub-Second Spot Gold & ETFs',
      exportFormats: 'PDF Factsheet Dossier, CSV & Audio WAV',
    },
  },
  {
    id: 'vip',
    badge: 'For Family Offices & Treasury Desks',
    name: 'VIP',
    headline: 'Institutional Advantage',
    subtitle: 'Dedicated multi-seat fund allocation workspace with Sovereign Bond curve monitors and direct API webhooks.',
    priceMonthly: '$290',
    cadenceNote: 'Per desk seat / month · Dedicated SLA',
    features: [
      'Unlimited concurrent Mutual Fund, Gold, Debt & ETF deep dives',
      'Custom credit-downgrade & tracking-error anomaly alerts',
      'Direct REST & SSE streaming API into treasury terminals',
      '24/7 dedicated fixed-income & quantitative engineering support',
    ],
    limits: {
      secFilingsDepth: 'Global Fund Registries (AMFI, SEBI, UCITS, SEC)',
      agentMode: 'Custom Multi-Asset Committee Weights',
      optionsFlowDelay: 'Direct LBMA, Sovereign G-Sec & ETF Creation Feed',
      exportFormats: 'Full Programmatic Webhook & Parquet',
    },
  },
];

export const INSIGHT_ACCORDION_ITEMS: InsightAccordionItem[] = [
  {
    id: 'market-recap',
    number: '01',
    title: 'Asset Allocation Recap',
    headline: 'Weekly Mutual Fund, Gold & Debt Flow Overview',
    summary:
      'Stay ahead with concise summaries of AMFI monthly SIP inflows, LBMA central-bank bullion demand, sovereign gilt duration positioning, and passive ETF creation flows.',
    ctaLabel: 'Load GOLDBEES Report ↗',
    targetTicker: 'GOLDBEES',
    cards: [
      {
        kicker: 'BULLION HEDGE',
        quote: 'Vault-audited gold stability',
        metric: '0.02% Tracking Error',
      },
      {
        kicker: 'SIP VELOCITY',
        quote: 'Compounding without emotional timing',
        metric: '95/100 PPFAS Score',
      },
      {
        kicker: 'SOVEREIGN CARRY',
        quote: 'Yield accrual meets rate-cut convexity',
        metric: '7.18% Gilt YTM',
      },
    ],
  },
  {
    id: 'research-guide',
    number: '02',
    title: 'Factsheet Guide',
    headline: 'Master Direct Plan & Debt Credit Audits',
    summary:
      'Explore how Financia audits AMFI Scheme Information Documents (SID), Direct vs. Regular expense-ratio leakage, and AAA/Sovereign fixed-income maturity ladders.',
    ctaLabel: 'Load PPFAS Report ↗',
    targetTicker: 'PPFAS',
    cards: [
      {
        kicker: 'FEE DISCIPLINE',
        quote: 'Every basis point of TER compounds',
        metric: '0.63% Direct Plan',
      },
      {
        kicker: 'CREDIT QUALITY',
        quote: 'Sovereign & AAA safety check',
        metric: 'Zero Sub-AA Exposure',
      },
      {
        kicker: 'LIQUIDITY BUFFER',
        quote: 'Downside protection in drawdowns',
        metric: '14.2% T-Bill Sleeve',
      },
    ],
  },
  {
    id: 'this-week',
    number: '03',
    title: 'Yield & Policy Watch',
    headline: 'RBI MPC, G-Sec Auctions & SGB Tranches',
    summary:
      'Track upcoming central bank rate decisions, Sovereign Gold Bond liquidity windows, AAA PSU bond issuances, and Treasury yield curve steepening.',
    ctaLabel: 'Load SBIGILT Report ↗',
    targetTicker: 'SBIGILT',
    cards: [
      {
        kicker: 'DURATION MATH',
        quote: 'Asymmetric capital gains on cuts',
        metric: '6.40 Yrs Mod Duration',
      },
      {
        kicker: 'SOVEREIGN SAFETY',
        quote: '100% GOI dated securities',
        metric: '0% Default Risk',
      },
      {
        kicker: 'CORPORATE CARRY',
        quote: 'Steady PSU bond yield spread',
        metric: '7.62% HDFCCORP YTM',
      },
    ],
  },
  {
    id: 'tool-tips',
    number: '04',
    title: 'Portfolio Tool Tips',
    headline: 'Comparing NAV Curves & RSI Momentum',
    summary:
      'Overlay Gold BeES, Nifty BeES, and SBI Magnum Gilt side-by-side in percentage-return space with synchronized RSI oscillators to time SIP top-ups objectively.',
    ctaLabel: 'Load NIFTYBEES Report ↗',
    targetTicker: 'NIFTYBEES',
    cards: [
      {
        kicker: 'INDEX EFFICIENCY',
        quote: 'Full Nifty 50 physical replication',
        metric: '0.04% Low TER',
      },
      {
        kicker: 'SIDE-BY-SIDE CHECK',
        quote: 'Compare Gold vs Debt vs ETF',
        metric: 'Normalized % Overlay',
      },
      {
        kicker: 'AMFI SYNC',
        quote: 'Direct NAV history on demand',
        metric: 'Live mfapi.in Feed',
      },
    ],
  },
];

export const BLOG_BRIEFINGS: BlogBriefing[] = [
  {
    id: 'b1',
    readTime: '5 min read',
    date: '2026-06-18',
    title: 'Structuring the 4-Pillar Core: Funds, Gold, Debt & ETFs',
    excerpt:
      'Why balancing Direct Mutual Funds with physical Gold ETFs, Sovereign Gilt duration, and low-cost index ETFs lowers drawdown risk without sacrificing long-term CAGR.',
    category: 'Allocation Architecture',
    relatedTicker: 'GOLDBEES',
    visualVariant: 'posters',
  },
  {
    id: 'b2',
    readTime: '4 min read',
    date: '2026-06-14',
    title: 'Reading Modified Duration & YTM in Gilt & Corporate Debt Funds',
    excerpt:
      'Understand how a 6.4-year modified duration sovereign gilt fund behaves differently from a 3.1-year AAA corporate bond fund across interest rate cycles.',
    category: 'Fixed Income Desk',
    relatedTicker: 'SBIGILT',
    visualVariant: 'terminal',
  },
  {
    id: 'b3',
    readTime: '6 min read',
    date: '2026-06-09',
    title: 'Gold BeES vs. Sovereign Gold Bonds vs. Physical Bullion',
    excerpt:
      'Breaking down 0.79% ETF expense ratios, tracking error, secondary exchange liquidity, and LBMA 995 fine custody efficiency.',
    category: 'Bullion Intelligence',
    relatedTicker: 'GLD',
    visualVariant: 'emerald-wave',
  },
  {
    id: 'b4',
    readTime: '5 min read',
    date: '2026-06-02',
    title: 'Direct Mutual Funds vs. Index ETFs: Fee Drag Over 15 Years',
    excerpt:
      'Quantifying the compounding difference between 0.04% Nifty BeES ETFs, 0.63% Direct Flexi Cap schemes, and legacy 1.8% distributor plans.',
    category: 'AMFI & ETF Flow',
    relatedTicker: 'PPFAS',
    visualVariant: 'matrix-cube',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'Mutual Funds & ETFs',
    question: 'Why does Financia focus exclusively on Mutual Funds, Gold, Debt Funds & ETFs?',
    answer:
      'Financia is purpose-built for long-term multi-asset wealth allocation — never single-stock speculation or trading screeners. Our terminal unifies AMFI Mutual Fund NAVs, physical Gold & Bullion ETFs, Sovereign/Corporate Debt Funds, and broad Index ETFs in one distraction-free analytical workspace.',
  },
  {
    id: 'faq-2',
    category: 'Data Sources',
    question: 'Where do Mutual Fund and Debt Fund NAV prices come from?',
    answer:
      'Direct Growth Mutual Fund and Debt Fund schemes (such as Parag Parikh Flexi Cap 122639, HDFC Mid-Cap 118989, SBI Magnum Gilt 119823, and HDFC Corporate Bond 128053) connect directly to live AMFI India NAV endpoints, while spot bullion connects to live Binance PAXG/LBMA feeds.',
  },
  {
    id: 'faq-3',
    category: 'Gold & Debt Funds',
    question: 'How does Financia evaluate Debt Funds like Gilt vs. Corporate Bond schemes?',
    answer:
      'Instead of stock P/E ratios, our Fixed-Income Desk models Yield-to-Maturity (YTM), Modified Duration rate sensitivity, AAA/Sovereign credit quality mix, and Direct Plan expense ratios to project total return across RBI and Federal Reserve policy scenarios.',
  },
  {
    id: 'faq-4',
    category: 'Mutual Funds & ETFs',
    question: 'Can I compare Gold, Debt Funds, and Equity ETFs side-by-side on the terminal?',
    answer:
      'Yes. In the Live Fund & ETF Terminal, click any comparison pill or type another fund/ETF symbol (e.g. compare GOLDBEES alongside SBIGILT and NIFTYBEES) to normalize all curves on a synchronized percentage-return axis with optional RSI momentum overlays.',
  },
  {
    id: 'faq-5',
    category: 'Gold & Debt Funds',
    question: 'How do Gold ETFs (GOLDBEES / GLD) differ from Sovereign Gold Bonds (SGBs)?',
    answer:
      'Gold ETFs provide daily intraday exchange liquidity backed by vaulted 995 fine bullion with zero lock-in, whereas SGB tranches pay a fixed 2.5% semi-annual sovereign coupon with an 8-year maturity schedule.',
  },
  {
    id: 'faq-6',
    category: 'Data Sources',
    question: 'How is the 0–100 Conviction Score calculated for Funds, Gold & Debt?',
    answer:
      'The Conviction Score weighs four asset-specific pillars: (1) Risk-adjusted return / YTM vs category benchmark (35%), (2) Expense ratio & tracking-error efficiency (25%), (3) Credit/custodial quality & downside capture (20%), and (4) Institutional AUM flows & RSI momentum (20%).',
  },
];
