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

  return router;
}
