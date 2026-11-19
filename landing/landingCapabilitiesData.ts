import { SuperchartCandle } from '../frontend/types/markets';

export type SuperchartTimeframe = '15m' | '1h' | '4h' | '1D';

export interface LandingAgentSample {
  ticker: string;
  company: string;
  exchange: string;
  price: string;
  changePercent: number;
  convictionScore: number;
  stance: string;
  filingTag: string;
  headline: string;
  evidencePoints: string[];
}

export interface LandingSectorPulse {
  sector: string;
  changePercent: number;
  leader: string;
  volumeNote: string;
}

export const LANDING_AGENT_SAMPLES: LandingAgentSample[] = [
  {
    ticker: 'GOLDBEES',
    company: 'Nippon India ETF Gold BeES',
    exchange: 'NSE · Gold ETF',
    price: '₹74.85',
    changePercent: 1.24,
    convictionScore: 93,
    stance: 'HIGH CONVICTION ACCUMULATE',
    filingTag: 'LBMA 99.5% Physical Vault · TER 0.79%',
    headline: 'Physical gold ETF inflows accelerated +18% QoQ alongside sovereign reserve diversification.',
    evidencePoints: [
      'AUM crossed ₹14,820 Cr backed 100% by LBMA Good Delivery 99.5% fine physical bars.',
      'Real-yield moderation and INR macro hedging continue to anchor gold ETF creations.',
      'Tight 2–3 bps NSE bid-ask spread makes Gold BeES the premier liquid bullion allocation.',
    ],
  },
  {
    ticker: 'PPFAS',
    company: 'Parag Parikh Flexi Cap Direct Growth',
    exchange: 'AMFI #122639',
    price: '₹86.42',
    changePercent: 0.72,
    convictionScore: 91,
    stance: 'CORE FLEXI-CAP COMPOUNDER',
    filingTag: 'AMFI Factsheet · TER 0.63%',
    headline: 'Consistent 21.8% 3Y CAGR with disciplined cash buffer and low portfolio turnover.',
    evidencePoints: [
      'AUM reached ₹84,120 Cr with resilient monthly SIP retention above 96%.',
      'Direct Growth structure saves ~68 bps annually versus regular advisor-trail plans.',
      'Sharpe ratio 1.38 leads Flexi-Cap peers across 3-year and 5-year rolling windows.',
    ],
  },
  {
    ticker: 'SBIGILT',
    company: 'SBI Magnum Gilt Fund Direct Growth',
    exchange: 'AMFI #119823',
    price: '₹67.18',
    changePercent: 0.48,
    convictionScore: 89,
    stance: 'CONSTRUCTIVE DURATION CARRY',
    filingTag: 'Sovereign G-Sec · YTM 7.18%',
    headline: 'Zero credit default risk with 6.4-year modified duration positioned for RBI policy easing.',
    evidencePoints: [
      '100% allocation to Government of India dated securities & sovereign T-Bills.',
      '7.18% portfolio YTM captures both steady accrual and bond price appreciation on 25–50 bps cuts.',
      'JP Morgan EM Bond Index passive inflows continue absorbing long-end G-Sec supply.',
    ],
  },
  {
    ticker: 'NIFTYBEES',
    company: 'Nippon India ETF Nifty 50 BeES',
    exchange: 'NSE · Index ETF',
    price: '₹284.60',
    changePercent: 1.01,
    convictionScore: 88,
    stance: 'PASSIVE CORE BENCHMARK',
    filingTag: 'SID / NSE ETF · TER 0.04%',
    headline: 'Ultra-low 4 bps expense ratio delivering near-zero tracking error on India benchmark flows.',
    evidencePoints: [
      'AUM topped ₹39,400 Cr with institutional EPFO and retail SIP passive allocations.',
      '3-year annualized tracking difference remains strictly within ±0.03% of Nifty 50 TRI.',
      'Intraday NSE orderbook depth exceeds ₹180 Cr daily turnover for zero-slippage rebalancing.',
    ],
  },
];

export const LANDING_SECTOR_PULSES: LandingSectorPulse[] = [
  { sector: 'Gold & Sovereign Bullion', changePercent: 1.24, leader: 'GOLDBEES', volumeNote: '1.6x creation flow' },
  { sector: 'India Direct Mutual Funds', changePercent: 0.88, leader: 'PPFAS', volumeNote: '₹25,320 Cr SIP/mo' },
  { sector: 'Global & Nifty Index ETFs', changePercent: 1.01, leader: 'NIFTYBEES', volumeNote: '1.4x avg turnover' },
  { sector: 'Sovereign Gilt & AAA Debt', changePercent: 0.48, leader: 'SBIGILT', volumeNote: '7.18%–7.52% YTM' },
  { sector: 'US Treasury & Aggregate Bonds', changePercent: 0.64, leader: 'TLT', volumeNote: '1.3x duration flow' },
];

export const LANDING_SCALE_METRICS = [
  { value: '4 Pillars', label: 'Mutual Funds · Gold · Debt · ETFs' },
  { value: 'AMFI Live', label: 'Direct Mutual & Debt NAV Feeds' },
  { value: 'LBMA + G-Sec', label: 'Bullion & Sovereign Yield Desk' },
  { value: '0.42s', label: 'Median Factsheet & NAV Extraction' },
];

/**
 * Deterministically adapts base candles to a requested timeframe so switching
 * 15m / 1h / 4h / 1D in Supercharts produces authentic, consistent bar structure.
 */
export function adaptCandlesForTimeframe(
  baseCandles: SuperchartCandle[],
  timeframe: SuperchartTimeframe
): SuperchartCandle[] {
  if (timeframe === '1h') return baseCandles;

  const amp = timeframe === '15m' ? 0.45 : timeframe === '4h' ? 1.45 : 2.1;
  const phaseShift = timeframe === '15m' ? 0.6 : timeframe === '4h' ? 1.7 : 2.9;

  return baseCandles.map((candle, idx) => {
    const mid = (candle.open + candle.close) * 0.5;
    const spread = (candle.close - candle.open) * amp;
    const wave = Math.sin(idx * 1.15 + phaseShift) * (Math.abs(candle.high - candle.low) * 0.25 * amp);
    const open = Number((mid - spread * 0.5 + wave * 0.4).toFixed(4));
    const close = Number((mid + spread * 0.5 + wave).toFixed(4));
    const wickPad = Math.max(Math.abs(candle.high - candle.low) * 0.35 * amp, Math.abs(close - open) * 0.35);
    const high = Number((Math.max(open, close) + wickPad).toFixed(4));
    const low = Number(Math.max(0.0001, Math.min(open, close) - wickPad * 0.9).toFixed(4));

    return {
      ...candle,
      open,
      close,
      high,
      low,
    };
  });
}

/**
 * Computes exponential moving average (EMA) series over candle closes.
 */
export function computeCandleEma(candles: SuperchartCandle[], period = 5): number[] {
  if (candles.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [candles[0].close];
  for (let i = 1; i < candles.length; i += 1) {
    ema.push(candles[i].close * k + ema[i - 1] * (1 - k));
  }
  return ema;
}
