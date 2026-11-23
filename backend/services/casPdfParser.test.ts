import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import {
  CasPdfFormatError,
  maskIdentifier,
  maskPan,
  parseCasDateToIso,
  parseCasDecimalToken,
  parseCasPdfBuffer,
  parseCasStatementPages,
} from './casPdfParser.ts';
import {
  generateSampleCdslCasPdf,
  generateSampleNsdlCasPdf,
} from './casSamplePdfGenerator.ts';
import { createCasParserRouter } from '../routes/casParserRoutes.ts';
import { computeFifoPortfolioValuation } from '../../frontend/features/portfolio/portfolioLedgerEngine.ts';

test('parseCasDateToIso handles Indian DD-MMM-YYYY, DD/MM/YYYY, and ISO formats accurately', () => {
  assert.equal(parseCasDateToIso('15-Jan-2024'), '2024-01-15');
  assert.equal(parseCasDateToIso('05-Aug-2024'), '2024-08-05');
  assert.equal(parseCasDateToIso('12/06/2024'), '2024-06-12');
  assert.equal(parseCasDateToIso('2025-11-30'), '2025-11-30');
  assert.equal(parseCasDateToIso('31-Feb-2025'), null);
  assert.equal(parseCasDateToIso('not-a-date'), null);
});

test('parseCasDecimalToken parses Indian lakh commas and parenthesized negatives without float drift', () => {
  assert.equal(parseCasDecimalToken('1,25,000.00')?.toFixed(2), '125000.00');
  assert.equal(parseCasDecimalToken('(19,829.00)')?.toFixed(2), '-19829.00');
  assert.equal(parseCasDecimalToken('(100.0000)')?.toFixed(4), '-100.0000');
  assert.equal(parseCasDecimalToken('₹4,807.6923')?.toFixed(4), '4807.6923');
  assert.equal(parseCasDecimalToken('invalid'), null);
});

test('PII masking utilities strictly redact PAN and account identifiers', () => {
  assert.equal(maskPan('ABCDE1234F'), '******234F');
  assert.equal(maskIdentifier('1208160049182736'), '********2736');
  assert.equal(maskIdentifier('10948271'), '****8271');
});

test('parseCasPdfBuffer extracts multi-page NSDL CAS PDF via pdfjs-dist and reconciles all folios', async () => {
  const nsdlPdf = generateSampleNsdlCasPdf();
  const result = await parseCasPdfBuffer(nsdlPdf);

  assert.equal(result.statementMeta.provider, 'NSDL_CAS');
  assert.equal(result.statementMeta.pageCount, 2);
  assert.equal(result.statementMeta.maskedPan, '******234F');
  assert.equal(result.statementMeta.maskedAccountId, '****1549');
  assert.equal(result.statementMeta.statementPeriod.from, '2024-01-01');
  assert.equal(result.statementMeta.statementPeriod.to, '2026-03-31');

  // Verify every folio number is strictly masked digits/slash and never bleeds scheme names
  assert.deepEqual(
    result.reconciliation.folios.map((f) => f.folioMasked),
    ['*******1/14', '*******1/05', '****1944', '****2098']
  );

  // Must NEVER leak raw PAN or raw folio numbers anywhere in serialized output
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('ABCDE1234F'), false);
  assert.equal(serialized.includes('10948271'), false);

  // 8 real financial transactions across 4 folios (PPFAS x3, HDFCMID x3, NIFTYBEES x1, HDFCLIQ x1)
  assert.equal(result.transactions.length, 8);
  assert.equal(result.reconciliation.totalFolios, 4);
  assert.equal(result.reconciliation.matchedFolios, 4);
  assert.equal(result.reconciliation.driftFolios, 0);
  assert.equal(result.reconciliation.stampDutyTotal, '5.00');
  assert.equal(result.reconciliation.sttTotal, '78.90');

  const ppfasTxs = result.transactions.filter((t) => t.symbol === 'PPFAS');
  assert.equal(ppfasTxs.length, 3);
  assert.equal(ppfasTxs[0].txType, 'SIP');
  assert.equal(ppfasTxs[0].amount, '50000.00');
  assert.equal(ppfasTxs[0].isin, 'INF879O01027');

  const hdfcSell = result.transactions.find((t) => t.symbol === 'HDFCMID' && t.txType === 'SELL');
  assert.ok(hdfcSell);
  assert.equal(hdfcSell.units, '100.0000');
  assert.equal(hdfcSell.amount, '19829.00');

  const hdfcSwitchIn = result.transactions.find((t) => t.symbol === 'HDFCLIQ');
  assert.ok(hdfcSwitchIn);
  assert.equal(hdfcSwitchIn.txType, 'SWITCH_IN');
  assert.equal(hdfcSwitchIn.assetClass, 'Debt');
  assert.equal(hdfcSwitchIn.amount, '125000.00');

  // Verify extracted transactions feed seamlessly into FIFO & XIRR portfolio engine
  const valuation = computeFifoPortfolioValuation({
    transactions: result.transactions,
    livePricesBySymbol: {
      PPFAS: 92.5,
      HDFCMID: 205.0,
      NIFTYBEES: 285.0,
      HDFCLIQ: 5100.0,
    },
    asOfDate: '2026-04-01',
  });
  assert.equal(valuation.holdings.length, 4);
  assert.ok(Number(valuation.totalCurrentValue) > 300000);
  assert.ok(valuation.portfolioXirrPct !== null && valuation.portfolioXirrPct > 0);

  // Re-parsing the same PDF must generate 100% deterministic idempotency keys
  const secondRun = await parseCasPdfBuffer(nsdlPdf);
  assert.deepEqual(
    result.transactions.map((t) => t.idempotencyKey),
    secondRun.transactions.map((t) => t.idempotencyKey)
  );
});

test('parseCasPdfBuffer extracts CDSL CAS PDF with Amount-Units-Price column order and lakh commas', async () => {
  const cdslPdf = generateSampleCdslCasPdf();
  const result = await parseCasPdfBuffer(cdslPdf);

  assert.equal(result.statementMeta.provider, 'CDSL_CAS');
  assert.equal(result.statementMeta.maskedPan, '******678K');
  assert.equal(result.statementMeta.maskedAccountId, '********2736');
  assert.equal(result.transactions.length, 3);
  assert.equal(result.reconciliation.matchedFolios, 2);
  assert.equal(result.reconciliation.driftFolios, 0);
  assert.equal(result.reconciliation.stampDutyTotal, '7.50');

  const quantSip = result.transactions.find((t) => t.symbol === 'QUANTSC' && t.txType === 'SIP');
  assert.ok(quantSip);
  assert.equal(quantSip.amount, '150000.00');
  assert.equal(quantSip.units, '600.0000');
  assert.equal(quantSip.price, '250.0000');

  const goldBuy = result.transactions.find((t) => t.symbol === 'GOLDBEES');
  assert.ok(goldBuy);
  assert.equal(goldBuy.assetClass, 'Gold');
  assert.equal(goldBuy.units, '1000.0000');
});

test('parseCasPdfBuffer rejects non-PDF binaries with typed CasPdfFormatError', async () => {
  await assert.rejects(
    () => parseCasPdfBuffer(Buffer.from('This is plain text, not a PDF')),
    (err: unknown) => err instanceof CasPdfFormatError && err.code === 'INVALID_PDF'
  );
});

test('parseCasStatementPages flags closing unit balance drift when statement balance mismatches', () => {
  const result = parseCasStatementPages(
    [
      {
        pageNumber: 1,
        lines: [
          'NSDL Consolidated Account Statement',
          'Folio No: 44449999  Parag Parikh Flexi Cap Fund Direct Growth - ISIN: INF879O01027',
          'Date  Transaction Description  Amount  NAV  Units  Balance',
          'Opening Unit Balance: 0.0000',
          '15-Jan-2025  Purchase - SIP  10,000.00  80.0000  125.0000  125.0000',
          'Closing Unit Balance: 130.0000',
        ],
      },
    ],
    { fileSha256: 'deadbeef' }
  );

  assert.equal(result.transactions.length, 1);
  assert.equal(result.reconciliation.driftFolios, 1);
  assert.equal(result.reconciliation.folios[0].status, 'DRIFT');
  assert.equal(result.reconciliation.folios[0].unitDrift, '-5.0000');
});

test('HTTP POST /api/portfolio/cas/parse-pdf handles multipart upload, idempotency replay, and mismatch 422', async () => {
  const app = express();
  app.use('/api/portfolio/cas', createCasParserRouter());

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Sample PDF download endpoint returns valid %PDF- binary
    const sampleRes = await fetch(`${baseUrl}/api/portfolio/cas/sample-pdf?provider=nsdl`);
    assert.equal(sampleRes.status, 200);
    assert.equal(sampleRes.headers.get('content-type'), 'application/pdf');
    const sampleBytes = new Uint8Array(await sampleRes.arrayBuffer());
    assert.equal(Buffer.from(sampleBytes.slice(0, 5)).toString('ascii'), '%PDF-');

    // 2. Upload real PDF via multipart/form-data with Idempotency-Key
    const idempKey = 'cas-test-idem-key-0001';
    const form1 = new FormData();
    form1.append('file', new Blob([sampleBytes], { type: 'application/pdf' }), 'nsdl-cas.pdf');

    const res1 = await fetch(`${baseUrl}/api/portfolio/cas/parse-pdf`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempKey },
      body: form1,
    });
    assert.equal(res1.status, 200);
    const body1 = (await res1.json()) as {
      statementMeta: { provider: string };
      transactions: unknown[];
      reconciliation: { matchedFolios: number };
    };
    assert.equal(body1.statementMeta.provider, 'NSDL_CAS');
    assert.equal(body1.transactions.length, 8);
    assert.equal(body1.reconciliation.matchedFolios, 4);

    // 3. Replaying same Idempotency-Key with same PDF succeeds with X-Idempotency-Replayed header
    const formReplay = new FormData();
    formReplay.append('file', new Blob([sampleBytes], { type: 'application/pdf' }), 'nsdl-cas.pdf');
    const resReplay = await fetch(`${baseUrl}/api/portfolio/cas/parse-pdf`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempKey },
      body: formReplay,
    });
    assert.equal(resReplay.status, 200);
    assert.equal(resReplay.headers.get('x-idempotency-replayed'), 'true');

    // 4. Reusing same Idempotency-Key with DIFFERENT PDF must fail with 422 Unprocessable Entity
    const cdslBytes = new Uint8Array(generateSampleCdslCasPdf());
    const formMismatch = new FormData();
    formMismatch.append('file', new Blob([cdslBytes], { type: 'application/pdf' }), 'cdsl-cas.pdf');
    const resMismatch = await fetch(`${baseUrl}/api/portfolio/cas/parse-pdf`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempKey },
      body: formMismatch,
    });
    assert.equal(resMismatch.status, 422);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
