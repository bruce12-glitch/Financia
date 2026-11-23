# Financia — System Architecture & Repository Map

## 1. Repository Layout

```text
Financia/
├── backend/                     # Unified Express API, Market Gateway, Catalog & CAS PDF Engine
│   ├── app.ts                   # Express app factory, security middleware, route mounts & Vite middleware
│   ├── catalog/                 # SQLite AMFI catalog, sync engine, Finnhub adapter & /api/v1 routes
│   │   ├── database.ts          # Parameterized better-sqlite3 terminal catalog & ISIN lookup
│   │   ├── finnhubService.ts    # Global exchange dossier service with SWR cache & fallback
│   │   ├── routes.ts            # /api/db/* stats, gateway metrics & AMFI sync endpoints
│   │   ├── syncService.ts       # Live AMFI NAVAll.txt synchronization & cache invalidation
│   │   └── v1Routes.ts          # /api/v1/funds/* search, uniform dossier & holding overlap API
│   ├── middleware/              # Rate limiters, security headers, CSRF origin check & error handler
│   ├── routes/                  # Domain REST routers (auth, stocks, markets, screener, casParser, workspace, ai)
│   └── services/                # Core engines (apiGatewayCache, casPdfParser, casSamplePdfGenerator, navDatabaseService, auditLogService)
├── frontend/                    # React 19 + Vite 8 + Tailwind CSS v4 Institutional Workspace
│   ├── App.tsx                  # React Router shell, Adaptive 4-in-1 Workspace & Modular Dashboard
│   ├── main.tsx                 # ErrorBoundary, TanStack QueryClient, BrowserRouter & FirebaseAuthProvider
│   ├── index.css                # Tailwind v4 design system tokens & dark-mode variant
│   ├── components/              # Shared workspace modules (LiveStockTerminal, AdaptiveWorkspaceBar, CommandPalette, Charts)
│   ├── context/                 # FirebaseAuthContext (Google Sign-In + Firestore profile sync)
│   ├── data/                    # Market universe & searchable symbol catalogs
│   ├── features/                # Feature-sliced application domains
│   │   ├── backtester/          # Walk-forward multi-asset backtester, Brinson attribution, stress tests & Monte Carlo
│   │   ├── portfolio/           # Decimal.js FIFO tax-lot ledger, XIRR solver, CAS PDF/CSV ingestion & Firestore repo
│   │   └── screener/            # TanStack Virtualized AMFI/ETF Screener
│   ├── lib/                     # Firebase SDK initialization, Firestore error handlers & TanStack Query client
│   ├── services/                # Client-side API wrappers
│   ├── store/                   # Zustand 4-in-1 workspace state (theme, density, guidanceMode, pinnedWidgets)
│   ├── types/                   # Shared TypeScript interfaces
│   └── utils/                   # Quantitative utilities, alert engine & keyboard shortcuts
├── landing/                     # Public landing experience (3D Earth hero, Live Fund Explorer, Bullion & Auth Gate)
├── docs/                        # Architecture & security specifications
│   ├── ARCHITECTURE.md          # This document
│   └── SECURITY_SPEC.md         # Threat model & Eight-Pillar Firestore security specification
├── tests/                       # Cross-cutting security & compliance test suites
│   └── firestore.rules.test.ts  # Automated verification of Firestore security rules vs. blueprint
├── public/                      # Static production web assets
├── server.ts                    # Node/Express runtime entry point
├── firestore.rules              # Deployed Firestore security rules
├── firebase-blueprint.json      # Canonical Firestore entity & collection schema
├── firebase-applet-config.json  # Firebase project & database configuration
└── amfi_nav_dev.sql             # Local SQLite AMFI NAV seed
```

## 2. Core Data Flows

1. **Market Data & AMFI Catalog Gateway**
   - `MarketApiGateway` (`backend/services/apiGatewayCache.ts`) sits in front of SQLite (`backend/catalog/database.ts`), AMFI live feeds (`backend/catalog/syncService.ts`), and global ETF feeds (`backend/catalog/finnhubService.ts`), providing L1 LRU Stale-While-Revalidate caching, in-flight request coalescing, token-bucket rate limiting, and per-provider circuit breakers.
2. **NSDL / CDSL CAS PDF Ingestion Pipeline**
   - `POST /api/portfolio/cas/parse-pdf` receives encrypted or plaintext CAS PDFs strictly in RAM (`multer.memoryStorage()`), enforces `Idempotency-Key` SHA-256 consistency, extracts coordinate-ordered text tables via `pdfjs-dist`, redacts PII (PAN, folio numbers, BO/DP/Client IDs), computes Opening/Closing unit reconciliation in `Decimal.js` (`ROUND_HALF_EVEN`), enriches ISINs via parameterized SQLite lookups, and returns Zod-validated `LedgerTransaction[]`.
3. **Portfolio Ledger & Cloud Persistence**
   - Validated transactions are committed idempotently via `frontend/features/portfolio/portfolioRepository.ts` in chunked 400-doc atomic Firestore batches under `/users/{uid}/portfolios/{portfolioId}/transactions/{txId}`, protected by `firestore.rules`.
4. **Quantitative Engines**
   - Monetary arithmetic uses `Decimal.js` with `ROUND_HALF_EVEN` (Banker's Rounding) across FIFO STCG/LTCG tax lots, Newton-Raphson + bisection XIRR, drift rebalancing, and multi-asset walk-forward backtesting.
