import { Router } from 'express';
import { validateTickerInput } from '../../frontend/utils/stockEngine.ts';
import {
  GeminiConfigError,
  GeminiUpstreamError,
  GEMINI_MODEL,
  generatePortfolioBriefWithGemini,
  generateTickerResearchWithGemini,
  isGeminiConfigured,
} from '../services/geminiService.ts';
import { enrichStockQuote } from '../services/marketDataService.ts';

export function createAiRouter(): Router {
  const router = Router();

  router.get('/ai/status', (_req, res) => {
    res.json({
      configured: isGeminiConfigured(),
      model: GEMINI_MODEL,
    });
  });

  router.post('/ai/research', async (req, res) => {
    const body = (req.body || {}) as {
      ticker?: string;
      mode?: string;
      question?: string;
    };

    const check = validateTickerInput(String(body.ticker || ''));
    if (!check.valid) {
      res.status(400).json({ error: check.error || 'Invalid ticker symbol.' });
      return;
    }

    const mode = body.mode === 'antigravity' ? 'antigravity' : 'perseus';
    const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : undefined;

    try {
      const { stock, source } = await enrichStockQuote(check.normalized);
      const analysis = await generateTickerResearchWithGemini({
        stock,
        mode,
        question,
      });
      res.json({
        source: GEMINI_MODEL,
        dataGroundingSource: source,
        ticker: stock.ticker,
        analysis,
      });
    } catch (err) {
      if (err instanceof GeminiConfigError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      if (err instanceof GeminiUpstreamError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({ error: 'Unexpected error generating Gemini stock analysis.' });
    }
  });

  router.post('/ai/portfolio', async (req, res) => {
    const body = (req.body || {}) as {
      portfolioName?: string;
      totalNetWorth?: number;
      xirr?: number;
      holdingsSummary?: string;
      question?: string;
    };

    const question = String(body.question || '').trim();
    if (!question || question.length < 3) {
      res.status(400).json({ error: 'Please provide a portfolio question (min 3 characters).' });
      return;
    }

    try {
      const answer = await generatePortfolioBriefWithGemini({
        portfolioName: String(body.portfolioName || 'Consolidated Portfolio').slice(0, 80),
        totalNetWorth: Number(body.totalNetWorth) || 0,
        xirr: Number(body.xirr) || 0,
        holdingsSummary: String(body.holdingsSummary || 'No holdings summary supplied').slice(0, 1500),
        question: question.slice(0, 500),
      });
      res.json({
        source: GEMINI_MODEL,
        answer,
      });
    } catch (err) {
      if (err instanceof GeminiConfigError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      if (err instanceof GeminiUpstreamError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({ error: 'Unexpected error generating portfolio brief.' });
    }
  });

  // Compact-payload Gemini explainer for multi-instrument comparisons & portfolio overlap
  router.post('/ai/compare-brief', async (req, res) => {
    const body = (req.body || {}) as {
      funds?: Array<{
        scheme_code?: string;
        scheme_name?: string;
        nav?: number;
        expense_ratio?: number;
        inception_date?: string;
        asset_class?: string;
        aum_cr?: number | null;
      }>;
      overlap_count?: number;
      overlap_weight_pct?: number;
      top_overlapping_securities?: Array<{ name?: string; min_overlap_pct?: number }>;
      question?: string;
    };

    const funds = Array.isArray(body.funds) ? body.funds.slice(0, 4) : [];
    if (funds.length < 2) {
      res.status(400).json({ error: 'Provide at least 2 compact fund summaries to compare.' });
      return;
    }

    const compactSummary = funds
      .map(
        (f) =>
          `${String(f.scheme_name || f.scheme_code || 'Fund').slice(0, 70)} | NAV:${Number(f.nav || 0).toFixed(2)} | TER:${Number(f.expense_ratio || 0).toFixed(2)}% | Incep:${String(f.inception_date || 'N/A').slice(0, 16)} | Class:${String(f.asset_class || 'Equity').slice(0, 24)}`
      )
      .join('; ');
    const overlapTop = Array.isArray(body.top_overlapping_securities)
      ? body.top_overlapping_securities
          .slice(0, 5)
          .map((s) => `${String(s.name || '').slice(0, 32)}(${Number(s.min_overlap_pct || 0).toFixed(1)}%)`)
          .join(', ')
      : '';
    const overlapLine =
      typeof body.overlap_count === 'number'
        ? `Overlap: ${body.overlap_count} shared securities (${Number(body.overlap_weight_pct || 0).toFixed(1)}% weight${overlapTop ? `: ${overlapTop}` : ''}).`
        : '';

    const question =
      typeof body.question === 'string' && body.question.trim().length >= 3
        ? body.question.trim().slice(0, 320)
        : 'Compare fee efficiency, diversification overlap, and risk-return trade-offs across these instruments in 3 concise bullet points.';

    if (!isGeminiConfigured()) {
      res.json({
        source: 'deterministic-compact-brief',
        answer: `Comparison Summary (${funds.length} instruments): ${compactSummary}. ${overlapLine} Lowest TER instrument provides long-term compounding efficiency; pair low-overlap assets to minimize concentration risk.`,
      });
      return;
    }

    try {
      const answer = await generatePortfolioBriefWithGemini({
        portfolioName: `Compare Basket (${funds.length} Instruments)`,
        totalNetWorth: 1000000,
        xirr: 12.0,
        holdingsSummary: `${compactSummary} ${overlapLine}`.slice(0, 1500),
        question,
      });
      res.json({
        source: GEMINI_MODEL,
        answer,
      });
    } catch (err) {
      if (err instanceof GeminiConfigError || err instanceof GeminiUpstreamError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({ error: 'Unexpected error generating comparison brief.' });
    }
  });

  return router;
}
