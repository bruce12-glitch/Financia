import { Router } from 'express';
import { marketApiGateway } from '../backend/services/apiGatewayCache.ts';
import { NavDatabaseService } from '../backend/services/navDatabaseService.ts';
import { FinanciaMutualFundDatabase, TerminalSchemeRecord } from './database.ts';

export interface UniformFundHolding {
  rank: number;
  name: string;
  isin: string | null;
  sector: string;
  asset_group: string;
  weight_pct: number;
}

export interface UniformFundDossier {
  scheme_code: string;
  scheme_name: string;
  amc: string;
  isin: string | null;
  isin2: string | null;
  instrument_type: string;
  asset_class: string;
  sub_category: string;
  plan_type: string;
  option_type: string;
  nav: number;
  nav_date: string;
  is_active: boolean;
  inception_date: string;
  expense_ratio: number;
  ter_direct: number | null;
  ter_regular: number | null;
  aum_cr: number | null;
  riskometer: string | null;
  benchmark: string | null;
  fund_managers: string | null;
  exit_load: string | null;
  objective: string | null;
  asset_allocation: Array<{ label: string; pct: number; color: string }>;
  top_10_holdings: UniformFundHolding[];
  holdings_source: 'sqlite_portfolio_holdings' | 'mandate_derived';
}

const MANDATE_HOLDINGS_MAP: Record<string, UniformFundHolding[]> = {
  Equity: [
    { rank: 1, name: 'HDFC Bank Ltd.', isin: 'INE040A01034', sector: 'Financial Services', asset_group: 'Equity', weight_pct: 8.4 },
    { rank: 2, name: 'ICICI Bank Ltd.', isin: 'INE090A01021', sector: 'Financial Services', asset_group: 'Equity', weight_pct: 7.2 },
    { rank: 3, name: 'Infosys Ltd.', isin: 'INE009A01021', sector: 'Information Technology', asset_group: 'Equity', weight_pct: 6.1 },
    { rank: 4, name: 'Reliance Industries Ltd.', isin: 'INE002A01018', sector: 'Energy & Conglomerate', asset_group: 'Equity', weight_pct: 5.9 },
    { rank: 5, name: 'Bharti Airtel Ltd.', isin: 'INE397D01024', sector: 'Telecom', asset_group: 'Equity', weight_pct: 4.8 },
    { rank: 6, name: 'ITC Ltd.', isin: 'INE154A01025', sector: 'Consumer Staples', asset_group: 'Equity', weight_pct: 4.3 },
    { rank: 7, name: 'Larsen & Toubro Ltd.', isin: 'INE018A01030', sector: 'Industrials', asset_group: 'Equity', weight_pct: 4.1 },
    { rank: 8, name: 'TCS Ltd.', isin: 'INE467B01029', sector: 'Information Technology', asset_group: 'Equity', weight_pct: 3.9 },
    { rank: 9, name: 'State Bank of India', isin: 'INE062A01020', sector: 'Financial Services', asset_group: 'Equity', weight_pct: 3.4 },
    { rank: 10, name: 'Axis Bank Ltd.', isin: 'INE238A01034', sector: 'Financial Services', asset_group: 'Equity', weight_pct: 3.1 },
  ],
  Debt: [
    { rank: 1, name: '7.18% GOI Sovereign 2033', isin: 'IN0020230085', sector: 'Sovereign G-Sec', asset_group: 'Debt', weight_pct: 18.5 },
    { rank: 2, name: '7.10% GOI Sovereign 2034', isin: 'IN0020240019', sector: 'Sovereign G-Sec', asset_group: 'Debt', weight_pct: 16.2 },
    { rank: 3, name: 'NABARD AAA NCD 2028', isin: 'INE261F08DX4', sector: 'PSU AAA Bond', asset_group: 'Debt', weight_pct: 9.8 },
    { rank: 4, name: 'REC Ltd. AAA Bond 2029', isin: 'INE020B08DW1', sector: 'PSU AAA Bond', asset_group: 'Debt', weight_pct: 8.4 },
    { rank: 5, name: 'SIDBI AAA Corporate Bond', isin: 'INE556F08KL2', sector: 'Financial AAA', asset_group: 'Debt', weight_pct: 7.5 },
    { rank: 6, name: 'TREPS / Tri-Party Repo', isin: null, sector: 'Cash & Equivalents', asset_group: 'Cash', weight_pct: 6.4 },
  ],
  Commodities: [
    { rank: 1, name: 'LBMA 99.5% Physical Gold Bullion', isin: 'XAU-LBMA-SPOT', sector: 'Precious Metals', asset_group: 'Commodities', weight_pct: 97.6 },
    { rank: 2, name: 'TREPS / Margin Liquidity', isin: null, sector: 'Cash & Equivalents', asset_group: 'Cash', weight_pct: 2.4 },
  ],
  Hybrid: [
    { rank: 1, name: 'HDFC Bank Ltd.', isin: 'INE040A01034', sector: 'Financial Services', asset_group: 'Equity', weight_pct: 6.2 },
    { rank: 2, name: '7.18% GOI Sovereign 2033', isin: 'IN0020230085', sector: 'Sovereign G-Sec', asset_group: 'Debt', weight_pct: 11.4 },
    { rank: 3, name: 'ICICI Bank Ltd.', isin: 'INE090A01021', sector: 'Financial Services', asset_group: 'Equity', weight_pct: 5.5 },
    { rank: 4, name: 'Infosys Ltd.', isin: 'INE009A01021', sector: 'Information Technology', asset_group: 'Equity', weight_pct: 4.8 },
    { rank: 5, name: 'NABARD AAA NCD 2028', isin: 'INE261F08DX4', sector: 'PSU AAA Bond', asset_group: 'Debt', weight_pct: 7.1 },
    { rank: 6, name: 'Reliance Industries Ltd.', isin: 'INE002A01018', sector: 'Energy & Conglomerate', asset_group: 'Equity', weight_pct: 4.5 },
  ],
};

function deriveAssetAllocation(assetClass: string): Array<{ label: string; pct: number; color: string }> {
  if (assetClass === 'Debt') {
    return [
      { label: 'Sovereign & AAA Debt', pct: 91.5, color: '#2563eb' },
      { label: 'Cash & TREPS', pct: 8.5, color: '#94a3b8' },
    ];
  }
  if (assetClass === 'Commodities') {
    return [
      { label: 'Physical Bullion', pct: 97.6, color: '#d97706' },
      { label: 'Cash & Liquidity', pct: 2.4, color: '#94a3b8' },
    ];
  }
  if (assetClass === 'Hybrid') {
    return [
      { label: 'Domestic Equity', pct: 64.0, color: '#059669' },
      { label: 'Fixed Income', pct: 31.0, color: '#2563eb' },
      { label: 'Cash & Equivalents', pct: 5.0, color: '#94a3b8' },
    ];
  }
  return [
    { label: 'Domestic Equity', pct: 94.2, color: '#059669' },
    { label: 'Cash & Equivalents', pct: 5.8, color: '#94a3b8' },
  ];
}

export function buildUniformFundDossier(
  mfDb: FinanciaMutualFundDatabase,
  raw: TerminalSchemeRecord | null
): UniformFundDossier | null {
  if (!raw) return null;

  const dbHoldings = mfDb.getHoldings(raw.scheme_code);
  const holdings: UniformFundHolding[] =
    dbHoldings.length > 0
      ? dbHoldings.map((h) => ({
          rank: h.rank,
          name: h.name,
          isin: h.isin,
          sector: h.sector,
          asset_group: h.asset_group,
          weight_pct: h.weight_pct,
        }))
      : MANDATE_HOLDINGS_MAP[raw.asset_class] ?? MANDATE_HOLDINGS_MAP.Equity;

  return {
    scheme_code: raw.scheme_code,
    scheme_name: raw.scheme_name,
    amc: raw.amc,
    isin: raw.isin,
    isin2: raw.isin2,
    instrument_type: raw.instrument_type,
    asset_class: raw.asset_class,
    sub_category: raw.sub_category,
    plan_type: raw.plan_type,
    option_type: raw.option_type,
    nav: raw.nav,
    nav_date: raw.nav_date,
    is_active: raw.is_active === 1,
    inception_date: raw.inception_date || '2013-01-01',
    expense_ratio: raw.ter_direct ?? raw.ter_regular ?? 0.55,
    ter_direct: raw.ter_direct,
    ter_regular: raw.ter_regular,
    aum_cr: raw.fund_aum_cr,
    riskometer: raw.riskometer,
    benchmark: raw.benchmark,
    fund_managers: raw.fund_managers,
    exit_load: raw.exit_load,
    objective: `${raw.sub_category} ${raw.instrument_type} managed by ${raw.amc} targeting long-term risk-adjusted capital compounding.`,
    asset_allocation: deriveAssetAllocation(raw.asset_class),
    top_10_holdings: holdings,
    holdings_source: dbHoldings.length > 0 ? 'sqlite_portfolio_holdings' : 'mandate_derived',
  };
}

export function createV1Router(
  mfDb: FinanciaMutualFundDatabase,
  _navDb?: NavDatabaseService | null
): Router {
  const router = Router();

  router.get('/funds/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const instrumentType =
      typeof req.query.instrument_type === 'string' ? req.query.instrument_type : 'ALL';
    const category = typeof req.query.category === 'string' ? req.query.category : 'ALL';
    const activeOnly = String(req.query.active_only || '') === 'true';
    const limit = Number(req.query.limit || 25);

    const cacheKey = `amfi:search:${q.toLowerCase()}:${instrumentType}:${category}:${activeOnly}:${limit}`;
    const result = await marketApiGateway.getOrFetch({
      key: cacheKey,
      provider: 'sqlite-amfi-catalog',
      softTtlMs: 30_000,
      hardTtlMs: 300_000,
      fetcher: async () =>
        mfDb.searchTerminalFunds({ q, instrumentType, category, activeOnly, limit }),
    });

    res.json({
      items: result.data,
      cacheStatus: result.cacheStatus,
      updatedAtUtc: result.updatedAtUtc,
    });
  });

  router.get('/funds/:code', async (req, res) => {
    const code = String(req.params.code || '').trim();
    if (!code) {
      res.status(400).json({ error: 'Scheme code required.' });
      return;
    }

    const result = await marketApiGateway.getOrFetch({
      key: `amfi:dossier:${code.toUpperCase()}`,
      provider: 'sqlite-amfi-catalog',
      softTtlMs: 60_000,
      hardTtlMs: 600_000,
      fetcher: async () => {
        const raw = mfDb.getTerminalFundDossier(code);
        return buildUniformFundDossier(mfDb, raw);
      },
    });

    if (!result.data) {
      res.status(404).json({ error: 'Instrument not found in terminal catalog.' });
      return;
    }

    res.json({
      fund: result.data,
      cacheStatus: result.cacheStatus,
      updatedAtUtc: result.updatedAtUtc,
    });
  });

  router.get('/overlap', (req, res) => {
    const fundA = String(req.query.fund_a || '').trim();
    const fundB = String(req.query.fund_b || '').trim();
    if (!fundA || !fundB) {
      res.status(400).json({ error: 'fund_a and fund_b query parameters are required.' });
      return;
    }

    const dossierA = buildUniformFundDossier(mfDb, mfDb.getTerminalFundDossier(fundA));
    const dossierB = buildUniformFundDossier(mfDb, mfDb.getTerminalFundDossier(fundB));

    const mapA = new Map<string, UniformFundHolding>();
    for (const h of dossierA?.top_10_holdings ?? []) {
      mapA.set((h.isin || h.name).toUpperCase(), h);
    }

    const overlapping: Array<{
      name: string;
      isin: string | null;
      sector: string;
      weight_a_pct: number;
      weight_b_pct: number;
      min_overlap_pct: number;
    }> = [];

    let totalOverlap = 0;
    for (const h of dossierB?.top_10_holdings ?? []) {
      const match = mapA.get((h.isin || h.name).toUpperCase());
      if (match) {
        const minW = Number(Math.min(match.weight_pct, h.weight_pct).toFixed(2));
        totalOverlap += minW;
        overlapping.push({
          name: h.name,
          isin: h.isin,
          sector: h.sector,
          weight_a_pct: match.weight_pct,
          weight_b_pct: h.weight_pct,
          min_overlap_pct: minW,
        });
      }
    }

    overlapping.sort((a, b) => b.min_overlap_pct - a.min_overlap_pct);

    res.json({
      overlap_count: overlapping.length,
      overlap_weight_pct: Number(totalOverlap.toFixed(2)),
      top_overlapping_securities: overlapping,
    });
  });

  return router;
}
