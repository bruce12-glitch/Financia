import crypto from 'crypto';
import express, { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { FinanciaMutualFundDatabase } from '../catalog/database.ts';
import { createRateLimiter, extractClientIp } from '../middleware/securityMiddleware.ts';
import { securityAuditLog } from '../services/auditLogService.ts';
import {
  CasParseResult,
  CasPdfFormatError,
  CasPdfPasswordError,
  CasSchemeResolver,
  inferAssetClassFromScheme,
  MAX_CAS_PDF_BYTES,
  parseCasPdfBuffer,
} from '../services/casPdfParser.ts';
import {
  generateSampleCdslCasPdf,
  generateSampleNsdlCasPdf,
} from '../services/casSamplePdfGenerator.ts';

const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9._-]{8,64}$/;

const casUploadFieldsSchema = z.object({
  password: z.string().max(64).optional(),
});

interface IdempotencyRecord {
  payloadHash: string;
  statusCode: number;
  responseBody: CasParseResult;
  createdAtMs: number;
}

const IDEMPOTENCY_TTL_MS = 30 * 60 * 1000;
const MAX_IDEMPOTENCY_ENTRIES = 500;

export function createCasParserRouter(mfDb?: FinanciaMutualFundDatabase): Router {
  const router = Router();
  const idempotencyCache = new Map<string, IdempotencyRecord>();

  const parserRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'cas-pdf',
    onLimitExceeded: (_req, ip) => {
      securityAuditLog.record({
        event: 'security.rate_limited',
        rawIp: ip,
        detail: 'CAS PDF parser rate limit exceeded',
        severity: 'warning',
      });
    },
  });

  // Strictly memory-only upload: CAS PDFs contain sensitive financial PII and must NEVER touch disk.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_CAS_PDF_BYTES,
      files: 1,
      fields: 4,
    },
    fileFilter: (_req, file, cb) => {
      const mimeOk =
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/octet-stream' ||
        file.originalname.toLowerCase().endsWith('.pdf');
      if (!mimeOk) {
        cb(new CasPdfFormatError('INVALID_PDF', 'Only PDF (.pdf) CAS statements are accepted.'));
        return;
      }
      cb(null, true);
    },
  });

  const buildSchemeResolver = (): CasSchemeResolver | undefined => {
    if (!mfDb) return undefined;
    return (isin, rawSchemeName) => {
      const match = mfDb.findSchemeByIsinOrName(isin, rawSchemeName);
      if (!match) return null;
      return {
        symbol: match.scheme_code.toUpperCase().replace(/[^A-Za-z0-9._\-^]/g, '').slice(0, 32) || 'MF',
        schemeName: match.scheme_name.slice(0, 160),
        assetClass: inferAssetClassFromScheme(match.scheme_name, match.isin),
        currency: 'INR',
      };
    };
  };

  const pruneIdempotencyCache = () => {
    const now = Date.now();
    for (const [k, rec] of idempotencyCache.entries()) {
      if (now - rec.createdAtMs > IDEMPOTENCY_TTL_MS) {
        idempotencyCache.delete(k);
      }
    }
    while (idempotencyCache.size > MAX_IDEMPOTENCY_ENTRIES) {
      const oldestKey = idempotencyCache.keys().next().value;
      if (oldestKey) idempotencyCache.delete(oldestKey);
      else break;
    }
  };

  /**
   * GET /api/portfolio/cas/sample-pdf?provider=nsdl|cdsl
   * Returns a deterministic synthetic NSDL or CDSL CAS PDF for live testing without real PII.
   */
  router.get('/sample-pdf', (req, res) => {
    const providerParam = String(req.query.provider || 'nsdl').toLowerCase();
    const isCdsl = providerParam === 'cdsl';
    const pdfBuffer = isCdsl ? generateSampleCdslCasPdf() : generateSampleNsdlCasPdf();
    const filename = isCdsl
      ? 'financia-sample-cdsl-cas.pdf'
      : 'financia-sample-nsdl-cas.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.send(pdfBuffer);
  });

  /**
   * POST /api/portfolio/cas/parse-pdf
   * Accepts multipart/form-data with field `file` (PDF <= 10 MB) and optional `password`.
   * Enforces Idempotency-Key consistency, masks PII, and returns schema-validated
   * LedgerTransaction[] + per-folio Decimal.js unit reconciliation.
   */
  router.post(
    '/parse-pdf',
    parserRateLimiter,
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      upload.single('file')(req, res, (err: unknown) => {
        if (!err) {
          next();
          return;
        }
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({
              code: 'FILE_TOO_LARGE',
              error: 'CAS PDF exceeds the 10 MB maximum file size limit.',
            });
            return;
          }
          res.status(400).json({
            code: 'INVALID_UPLOAD',
            error: 'Invalid file upload payload. Attach a single PDF under field "file".',
          });
          return;
        }
        if (err instanceof CasPdfFormatError) {
          res.status(400).json({ code: err.code, error: err.message });
          return;
        }
        res.status(400).json({
          code: 'INVALID_PDF',
          error: 'Unable to read uploaded PDF file.',
        });
      });
    },
    async (req: express.Request, res: express.Response) => {
      const clientIp = extractClientIp(req);
      const rawIdempotencyKey = req.headers['idempotency-key'];
      let idempotencyKey: string | null = null;

      if (typeof rawIdempotencyKey === 'string' && rawIdempotencyKey.trim()) {
        if (!IDEMPOTENCY_KEY_REGEX.test(rawIdempotencyKey.trim())) {
          res.status(400).json({
            code: 'INVALID_IDEMPOTENCY_KEY',
            error: 'Idempotency-Key header must be 8-64 alphanumeric/UUID characters.',
          });
          return;
        }
        idempotencyKey = rawIdempotencyKey.trim();
      }

      if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        res.status(400).json({
          code: 'MISSING_FILE',
          error: 'Please upload an NSDL, CDSL, or CAMS/KFintech CAS PDF file.',
        });
        return;
      }

      const parsedFields = casUploadFieldsSchema.safeParse({
        password: typeof req.body?.password === 'string' ? req.body.password : undefined,
      });
      if (!parsedFields.success) {
        res.status(400).json({
          code: 'INVALID_FIELDS',
          error: 'Invalid CAS request parameters.',
        });
        return;
      }

      const fileDigest = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
      const hasPasswordFlag = parsedFields.data.password ? '1' : '0';
      const payloadHash = crypto
        .createHash('sha256')
        .update(`${fileDigest}:${hasPasswordFlag}`)
        .digest('hex');

      if (idempotencyKey) {
        pruneIdempotencyCache();
        const existing = idempotencyCache.get(idempotencyKey);
        if (existing) {
          if (existing.payloadHash !== payloadHash) {
            res.status(422).json({
              code: 'IDEMPOTENCY_CONFLICT',
              error:
                'Idempotency-Key was already used with a different CAS PDF payload. Generate a new key.',
            });
            return;
          }
          res.setHeader('X-Idempotency-Replayed', 'true');
          res.status(existing.statusCode).json(existing.responseBody);
          return;
        }
      }

      try {
        const result = await parseCasPdfBuffer(req.file.buffer, {
          password: parsedFields.data.password,
          schemeResolver: buildSchemeResolver(),
        });

        if (idempotencyKey) {
          idempotencyCache.set(idempotencyKey, {
            payloadHash,
            statusCode: 200,
            responseBody: result,
            createdAtMs: Date.now(),
          });
        }

        // PII-free structured audit entry (never logs password, PAN, raw folio, or file text)
        securityAuditLog.record({
          event: 'portfolio.cas_pdf_parsed',
          rawIp: clientIp,
          detail: `Parsed ${result.statementMeta.provider} (${result.statementMeta.pageCount}p, ${result.transactions.length} tx, ${result.reconciliation.matchedFolios}/${result.reconciliation.totalFolios} folios matched)`,
          severity: 'info',
        });

        res.status(200).json(result);
      } catch (err: unknown) {
        if (err instanceof CasPdfPasswordError) {
          res.status(422).json({
            code: err.code,
            error: err.message,
          });
          return;
        }
        if (err instanceof CasPdfFormatError) {
          res.status(err.code === 'FILE_TOO_LARGE' ? 413 : 400).json({
            code: err.code,
            error: err.message,
          });
          return;
        }

        securityAuditLog.record({
          event: 'portfolio.cas_pdf_error',
          rawIp: clientIp,
          detail: 'Unexpected failure while parsing uploaded CAS PDF',
          severity: 'warning',
        });

        res.status(500).json({
          code: 'PARSE_FAILED',
          error: 'Could not parse the uploaded CAS PDF statement. Please verify the file and try again.',
        });
      }
    }
  );

  return router;
}
