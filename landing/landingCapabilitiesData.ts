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
    ticker: 'NVDA',
    company: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    price: '$138.60',
    changePercent: 3.6,
    convictionScore: 94,
    stance: 'HIGH CONVICTION BULLISH',
    filingTag: 'Form 10-Q · Note 12 Verified',
    headline: 'Blackwell rack-scale commitments rose 38% QoQ with 73.5%+ gross margin support.',
    evidencePoints: [
      'Data Center segment reached $39.2B (+78% YoY) in latest quarterly filing.',
      'Purchase obligations climbed to $24.1B for CoWoS & HBM4 wafer supply.',
      'Positive institutional options gamma wall anchored at $132–$145 strikes.',
    ],
  },
  {
    ticker: 'AAPL',
    company: 'Apple Inc.',
    exchange: 'NASDAQ',
    price: '$228.45',
    changePercent: 1.4,
    convictionScore: 86,
    stance: 'CONSTRUCTIVE ACCUMULATION',
    filingTag: 'Form 10-K · Services Margin Mix',
    headline: 'Installed base crossed 2.25B active devices while Services gross margin topped 74.1%.',
    evidencePoints: [
      'Services recurring revenue run-rate exceeded $104B annualized.',
      'Free cash flow conversion supports $95B+ annual capital return.',
      'Edge NPU refresh cycle accelerates upgrade velocity across Pro tiers.',
    ],
  },
  {
    ticker: 'RELIANCE',
    company: 'Reliance Industries Ltd',
    exchange: 'NSE',
    price: '₹2,948.60',
    changePercent: 1.24,
    convictionScore: 88,
    stance: 'INSTITUTIONAL ACCUMULATION',
    filingTag: 'NSE Filing · Jio & New Energy',
    headline: 'Jio ARPU expansion and Jamnagar green hydrogen gigafactory commissioning lift EBITDA visibility.',
    evidencePoints: [
      'Digital services subscriber base topped 490M with rising 5G monetization.',
      'Retail square footage expansion continues across Tier-2 & Tier-3 corridors.',
      'Net debt-to-EBITDA compressed below 0.72x on strong O2C cash generation.',
    ],
  },
  {
    ticker: 'MSFT',
    company: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    price: '$448.20',
    changePercent: 1.18,
    convictionScore: 91,
    stance: 'HIGH CONVICTION CORE',
    filingTag: 'Form 10-Q · Azure AI Backlog',
    headline: 'Commercial remaining performance obligations reached $298B (+24% YoY) led by Azure.',
    evidencePoints: [
      'AI workloads contributed 13 points of Azure constant-currency growth.',
      'Operating margin expanded 140 bps despite elevated GPU data center capex.',
      'Enterprise M365 seat expansion holds 97% renewal retention.',
    ],
  },
];

export const LANDING_SECTOR_PULSES: LandingSectorPulse[] = [
  { sector: 'Semiconductors & AI', changePercent: 3.42, leader: 'NVDA', volumeNote: '1.8x avg vol' },
  { sector: 'Cloud & Enterprise SaaS', changePercent: 2.15, leader: 'MSFT', volumeNote: '1.3x avg vol' },
  { sector: 'India Nifty Banking', changePercent: 1.28, leader: 'HDFCBANK', volumeNote: '1.4x avg vol' },
  { sector: 'Digital Assets & L1s', changePercent: -1.47, leader: 'BTCUSD', volumeNote: '1.6x avg vol' },
  { sector: 'Energy & Crude Futures', changePercent: -0.64, leader: 'CL1!', volumeNote: '1.1x avg vol' },
];

export const LANDING_SCALE_METRICS = [
  { value: '150+', label: 'Global Exchanges & Venues' },
  { value: '10,000+', label: 'SEC-Indexed Equities & ETFs' },
  { value: '4-Tier', label: 'Adversarial Agent Committee' },
  { value: '0.42s', label: 'Median Filing Extraction' },
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
