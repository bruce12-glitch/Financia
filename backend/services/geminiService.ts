import { GoogleGenAI, Type } from '@google/genai';
import { StockQuote } from '../../frontend/types/financia.ts';

export const GEMINI_MODEL = 'gemini-4-hydrogen';

export class GeminiConfigError extends Error {
  statusCode = 503;
  code = 'GEMINI_KEY_MISSING';
  constructor(message = 'GEMINI_API_KEY is not configured in server secrets.') {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

export class GeminiUpstreamError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode = 502, code = 'GEMINI_UPSTREAM_ERROR') {
    super(message);
    this.name = 'GeminiUpstreamError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isGeminiConfigured(): boolean {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

function createGeminiClient(): GoogleGenAI {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    throw new GeminiConfigError(
      'GEMINI_API_KEY is not set. Add it in Settings > Secrets to run live Gemini research.'
    );
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface GeminiResearchAnalysis {
  conviction_score: number;
  stance: string;
  summary: string;
  key_takeaways: string[];
  bull_case: { point: string; evidence: string }[];
  bear_case: { point: string; evidence: string }[];
}

export async function generateTickerResearchWithGemini(params: {
  stock: StockQuote;
  mode: 'antigravity' | 'perseus';
  question?: string;
}): Promise<GeminiResearchAnalysis> {
  const ai = createGeminiClient();
  const { stock, mode, question } = params;

  const unit = stock.currencyUnit === 'INR' ? '₹' : '$';
  const scaleSuffix = stock.currencyUnit === 'INR' ? 'Cr AUM/Flow' : 'B';
  const financialsSummary = stock.report.financial_charts.financial_performance_4q
    .map(
      (q) =>
        `${q.quarter}: AUM Flow ${unit}${q.revenue}${scaleSuffix}, Net Accrual ${unit}${q.net_income}${scaleSuffix}, Yield/Return ${q.eps ?? 'N/A'}%`
    )
    .join(' | ');

  const prompt = [
    `Analyze instrument ${stock.name} (${stock.ticker}) under asset class ${stock.assetClass || stock.sector} in ${
      mode === 'perseus' ? 'Perseus Multi-Agent 4-Pillar Desk' : 'Antigravity Flash'
    } mode.`,
    `Instrument Telemetry: Price/NAV ${unit}${stock.price}, 24h Change ${stock.changePercent}%, Fund AUM ${stock.aum || stock.marketCap}, Expense Ratio ${stock.expenseRatio || 'N/A'}, YTM / CAGR ${stock.ytmOrCagr || 'N/A'}, Duration / Tracking ${stock.modifiedDuration || 'N/A'}, Credit / Purity ${stock.creditRating || 'N/A'}, 14D RSI ${stock.rsi14}, IV Rank ${stock.ivRank}%, Data Source: ${stock.dataSource || 'AMFI / ETF / Bullion Feed'}.`,
    `Trailing 4Q Flows & Carry: ${financialsSummary}.`,
    question ? `Analyst Focus Question: ${question}` : '',
    'Financia exclusively researches Mutual Funds, Gold & Bullion, Debt Funds, and ETFs (never individual corporate equities). Ground all conclusions in expense ratio, YTM/duration, credit quality, tracking error, and supplied telemetry.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'You are Financia, an institutional Mutual Fund, Gold & Bullion, Debt Fund, and ETF research analyst. Provide concise, data-grounded portfolio and instrument analysis strictly in the requested JSON schema. Never fabricate NAVs, yields, or AUM outside the provided context.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            conviction_score: {
              type: Type.INTEGER,
              description: 'Institutional conviction score from 1 to 100.',
            },
            stance: {
              type: Type.STRING,
              description: 'Short uppercase stance such as HIGH CONVICTION BULLISH, MODERATE ACCUMULATE, or NEUTRAL WATCH.',
            },
            summary: {
              type: Type.STRING,
              description: '2-3 sentence executive synthesis grounded in provided telemetry.',
            },
            key_takeaways: {
              type: Type.ARRAY,
