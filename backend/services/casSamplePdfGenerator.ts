/**
 * Pure-TypeScript valid PDF 1.4 binary generator for synthetic NSDL and CDSL
 * Consolidated Account Statement (CAS) PDFs.
 *
 * Used for deterministic unit tests, HTTP integration tests, and one-click
 * sandbox testing in the Portfolio Tracker UI without exposing real investor PII.
 */

function escapePdfLiteral(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

interface PdfTextLine {
  x: number;
  y: number;
  text: string;
  size?: number;
}

function buildMinimalPdfBuffer(pages: PdfTextLine[][]): Buffer {
  const objects: string[] = [];

  // Object 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages (placeholder, updated once page object numbers are known)
  const pageObjNums: number[] = [];
  const firstPageObjNum = 4;
  for (let idx = 0; idx < pages.length; idx += 1) {
    pageObjNums.push(firstPageObjNum + idx * 2);
  }
  const kidsRefs = pageObjNums.map((n) => `${n} 0 R`).join(' ');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kidsRefs}] /Count ${pages.length} >>\nendobj\n`);

  // Object 3: Standard Helvetica Font
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  );

  for (let idx = 0; idx < pages.length; idx += 1) {
    const pageObj = firstPageObjNum + idx * 2;
    const contentObj = pageObj + 1;
    const lines = pages[idx];

    const streamOps: string[] = ['BT'];
    for (const line of lines) {
      const fontSize = line.size ?? 9;
      streamOps.push(`/F1 ${fontSize} Tf`);
      streamOps.push(`1 0 0 1 ${line.x} ${line.y} Tm`);
      streamOps.push(`(${escapePdfLiteral(line.text)}) Tj`);
    }
    streamOps.push('ET');
    const streamData = `${streamOps.join('\n')}\n`;

    objects.push(
      `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentObj} 0 obj\n<< /Length ${Buffer.byteLength(streamData, 'utf8')} >>\nstream\n${streamData}endstream\nendobj\n`
    );
  }

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n', 'utf8')];
  const offsets: number[] = [0];
  let cursor = chunks[0].length;

  for (const obj of objects) {
    offsets.push(cursor);
    const buf = Buffer.from(obj, 'utf8');
    chunks.push(buf);
    cursor += buf.length;
  }

  const xrefOffset = cursor;
  const xrefLines = [`xref\n0 ${offsets.length}\n`, '0000000000 65535 f \n'];
  for (let i = 1; i < offsets.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }

  const trailer =
    `${xrefLines.join('')}` +
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  chunks.push(Buffer.from(trailer, 'utf8'));
  return Buffer.concat(chunks);
}

function buildRowsAtY(rawLines: string[], startY = 790, stepY = 16): PdfTextLine[] {
  return rawLines.map((text, idx) => ({
    x: 36,
    y: startY - idx * stepY,
    text,
    size: idx === 0 ? 11 : 9,
  }));
}

export function generateSampleNsdlCasPdf(): Buffer {
  const page1Lines = [
    'National Securities Depository Limited - NSDL Consolidated Account Statement',
    'Statement Period: 01-Jan-2024 to 31-Mar-2026',
    'Investor Name: Aarav Sharma',
    'PAN: ABCDE1234F   DP ID: IN301549   Client ID: 55281940',
    'Mutual Fund Folios (F) - Transaction Statement',
    'PPFAS Mutual Fund',
    'Folio No: 10948271 / 14',
    'Parag Parikh Flexi Cap Fund Direct Growth - ISIN: INF879O01027  Registrar: CAMS',
    'Date  Transaction Description  Amount(INR)  NAV(INR)  Units  Balance',
    'Opening Unit Balance: 0.0000',
    '15-Jan-2024  Systematic Investment Purchase (SIP)  50,000.00  70.2500  711.7438  711.7438',
    '15-Jan-2024  *** Stamp Duty ***  2.50',
    '15-Jul-2024  Systematic Investment Purchase (SIP)  50,000.00  76.8000  651.0417  1,362.7855',
    '15-Jul-2024  *** Stamp Duty ***  2.50',
    '18-Feb-2025  Additional Purchase - Direct  25,000.00  81.5000  306.7485  1,669.5340',
    'Closing Unit Balance: 1,669.5340',
    'HDFC Mutual Fund',
    'Folio No: 19402811 / 05  HDFC Mid-Cap Opportunities Fund Direct Growth - ISIN: INF179K01XQ0',
    'Date  Transaction Description  Amount(INR)  NAV(INR)  Units  Balance',
    'Opening Unit Balance: 100.0000',
    '10-Mar-2024  Purchase - SIP  40,000.00  165.4000  241.8380  341.8380',
    '10-Nov-2024  Purchase - SIP  40,000.00  182.0000  219.7802  561.6182',
    '12-Jan-2026  Partial Redemption  (19,829.00)  198.2900  (100.0000)  461.6182',
    'Closing Unit Balance: 461.6182',
  ];

  const page2Lines = [
    'NSDL Consolidated Account Statement - Demat & Debt Holdings (Page 2)',
    'Nippon India Mutual Fund',
    'Folio No: 88201944  Nippon India ETF Nifty 50 BeES - ISIN: INF204KB14I2',
    'Date  Transaction Description  Amount(INR)  NAV(INR)  Units  Balance',
    'Opening Unit Balance: 0.0000',
    '22-May-2024  Market Buy Credit  78,900.00  263.0000  300.0000  300.0000',
    '22-May-2024  *** STT Paid ***  78.90',
    'Closing Unit Balance: 300.0000',
    'HDFC Mutual Fund',
    'Folio No: 77412098  HDFC Liquid Fund Direct Growth - ISIN: INF179KB1HU9',
    'Date  Transaction Description  Amount(INR)  NAV(INR)  Units  Balance',
    'Opening Unit Balance: 0.0000',
    '05-Aug-2024  Switch In from Overnight  1,25,000.00  4,807.6923  26.0000  26.0000',
    'Closing Unit Balance: 26.0000',
  ];

  return buildMinimalPdfBuffer([buildRowsAtY(page1Lines), buildRowsAtY(page2Lines)]);
}

export function generateSampleCdslCasPdf(): Buffer {
  const page1Lines = [
    'Central Depository Services (India) Limited - CDSL Consolidated Account Statement',
    'Statement Period: 01/04/2024 to 31/03/2026',
    'Holder Name: Meera Iyer',
    'PAN: FGHIJ5678K   BO ID: 1208160049182736',
    'STATEMENT OF TRANSACTIONS - MUTUAL FUND UNITS',
    'Quant Mutual Fund',
    'Folio No: 51920481  Quant Small Cap Fund Direct Growth - ISIN: INF966L01689',
    'Date  Description  Amount  Units  Price  Balance',
    'Opening Balance: 0.0000',
    '12/06/2024  Purchase - SIP  1,50,000.00  600.0000  250.0000  600.0000',
    '12/06/2024  *** Stamp Duty ***  7.50',
    '15/12/2025  Redemption  (52,818.00)  (200.0000)  264.0900  400.0000',
    'Closing Balance: 400.0000',
    'Nippon India Mutual Fund',
    'Folio No: 99381726  Nippon India ETF Gold BeES - ISIN: INF204KB17I5',
    'Date  Description  Amount  Units  Price  Balance',
    'Opening Balance: 0.0000',
    '19/09/2024  Demat Buy Credit  74,850.00  1,000.0000  74.8500  1,000.0000',
    'Closing Balance: 1,000.0000',
  ];

  return buildMinimalPdfBuffer([buildRowsAtY(page1Lines)]);
}
