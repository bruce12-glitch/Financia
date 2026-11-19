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
              items: { type: Type.STRING },
              description: '3 concise institutional takeaways.',
            },
            bull_case: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  point: { type: Type.STRING },
                  evidence: { type: Type.STRING },
                },
              },
            },
            bear_case: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  point: { type: Type.STRING },
                  evidence: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new GeminiUpstreamError('Gemini returned an empty response payload.');
    }

    const parsed = JSON.parse(rawText) as Partial<GeminiResearchAnalysis>;
    return {
      conviction_score: Math.max(
        1,
        Math.min(100, Math.round(Number(parsed.conviction_score) || stock.convictionScore))
      ),
      stance: String(parsed.stance || stock.report.verdict.stance),
      summary: String(parsed.summary || stock.report.verdict.summary),
      key_takeaways: Array.isArray(parsed.key_takeaways)
        ? parsed.key_takeaways.slice(0, 4).map(String)
        : [],
      bull_case: Array.isArray(parsed.bull_case)
        ? parsed.bull_case.slice(0, 3).map((b) => ({
            point: String(b?.point || ''),
            evidence: String(b?.evidence || ''),
          }))
        : [],
      bear_case: Array.isArray(parsed.bear_case)
        ? parsed.bear_case.slice(0, 3).map((b) => ({
            point: String(b?.point || ''),
            evidence: String(b?.evidence || ''),
          }))
        : [],
    };
  } catch (err) {
    if (err instanceof GeminiConfigError || err instanceof GeminiUpstreamError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Upstream Gemini request failed.';
    const statusCode = /429|RESOURCE_EXHAUSTED/i.test(message)
      ? 429
      : /403|PERMISSION_DENIED/i.test(message)
        ? 403
        : 502;
    throw new GeminiUpstreamError(message, statusCode);
  }
}

export async function generatePortfolioBriefWithGemini(params: {
  portfolioName: string;
  totalNetWorth: number;
  xirr: number;
  holdingsSummary: string;
  question: string;
}): Promise<string> {
  const ai = createGeminiClient();

  const prompt = [
    `Portfolio Snapshot: ${params.portfolioName}`,
    `Total Net Worth: ${params.totalNetWorth}, XIRR: ${params.xirr}%`,
    `Holdings & Risk Summary: ${params.holdingsSummary}`,
    `User Question: ${params.question}`,
    'Respond in 3-4 concise, factual sentences highlighting diversification, concentration risks, and actionable portfolio considerations.',
  ].join('\n');

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'You are Financia Portfolio Diagnostics AI. Keep responses concise, quantitative, and strictly grounded in the supplied portfolio snapshot.',
      },
    });
    const text = (response.text ?? '').trim();
    if (!text) {
      throw new GeminiUpstreamError('Gemini returned an empty portfolio analysis.');
    }
    return text;
  } catch (err) {
    if (err instanceof GeminiConfigError || err instanceof GeminiUpstreamError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Upstream Gemini portfolio request failed.';
    throw new GeminiUpstreamError(message, 502);
  }
}
