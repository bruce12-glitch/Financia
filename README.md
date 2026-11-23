# Financia — Institutional Mutual Funds, ETFs, Debt & Gold Intelligence Platform

Financia is a full-stack financial analytics, portfolio accounting, and multi-asset backtesting platform for Indian Mutual Funds (AMFI), Global/Indian ETFs, Sovereign Debt, and Gold Bullion.

## Key Capabilities

- **Real Portfolio Tracker & CAS Workbench (`/portfolio`)**
  - **Backend NSDL / CDSL / CAMS-KFintech CAS PDF Parser (`POST /api/portfolio/cas/parse-pdf`)**: In-memory PDF extraction (`pdfjs-dist`), optional password decryption, automatic PII masking (PAN, folios, DP/BO/Client IDs), ISIN catalog enrichment, and per-folio `Decimal.js` Opening/Closing unit balance reconciliation.
  - **Exact Financial Accounting**: Arbitrary-precision `Decimal.js` (`ROUND_HALF_EVEN`) FIFO STCG/LTCG tax-lot engine, Newton-Raphson + bisection XIRR solver, Portfolio Overlap X-Ray, Target Allocation Drift Rebalancer, and ₹1.25L LTCG Tax-Harvesting Planner.
  - **Cloud Sync**: Google Sign-In with Firestore persistence (`users`, `portfolios`, append-only `transactions`, `backtests`, `alerts`) backed by hardened `firestore.rules`.
- **Multi-Asset Backtester & Factor Attribution Lab (`/backtest`)**
  - Walk-forward historical simulation with Calendar/Drift rebalancing and SIP cashflows, TradingView `lightweight-charts` HTML5 canvas equity curve, Brinson-Hood-Beebower attribution, multi-factor style loadings, 4 macro regime stress tests, and 400-path Monte Carlo fan projections.
- **Automated AMFI & ETF API Gateway + Virtualized Screener (`/screener`)**
  - 3-tier SWR LRU cache with in-flight request coalescing, token-bucket rate limiting, circuit breakers, SQLite AMFI catalog (`backend/catalog/`), and TanStack Virtualized high-density screening.
- **Dedicated Fund Analysis Terminal & Adaptive 4-in-1 Workspace (`/workspace`, `/terminal`)**
  - Unified Light/Dark Institutional Desk, Comfortable/Pro Compact density, Guided/Pro analytical posture, customizable Modular Widget Layout, and `Cmd/Ctrl + K` Command Palette.

## Repository Structure

```text
├── backend/                # Unified Express API, Market Gateway, Catalog & CAS PDF Parser
│   ├── app.ts              # Express app factory & Vite middleware wiring
│   ├── catalog/            # SQLite AMFI catalog, sync service, Finnhub adapter & /api/v1 routes
│   ├── middleware/         # Rate limiting, security headers, CSRF & error handling
│   ├── routes/             # Modular REST routers (casParser, stocks, markets, screener, auth, workspace, ai)
│   └── services/           # MarketApiGateway SWR cache, casPdfParser, navDatabaseService, audit logs
├── frontend/               # React 19 + Vite 8 + Tailwind CSS v4 SPA
│   ├── components/         # Terminal, AdaptiveWorkspaceBar, CommandPalette, ModularLayoutDrawer, Charts
│   ├── context/            # FirebaseAuthContext
│   ├── data/               # Market universe & searchable ticker registries
│   ├── features/           # Feature-sliced domains: portfolio/, backtester/, screener/
│   ├── lib/                # Firebase SDK init, Firestore error wrappers & TanStack Query client
│   ├── store/              # Zustand 4-in-1 workspace store
│   ├── types/              # Shared TypeScript interfaces
│   └── utils/              # Quant engines, alert rules/audio & keyboard shortcuts
├── landing/                # Public landing shell (3D Earth hero, Live Fund Explorer, Macro Bullion, Auth Gate)
├── docs/                   # ARCHITECTURE.md & SECURITY_SPEC.md
├── tests/                  # firestore.rules.test.ts
├── public/                 # Static media assets
├── server.ts               # Node/Express runtime entry point
├── firestore.rules         # Deployed Firestore security rules
├── firebase-blueprint.json # Canonical Firestore entity & collection schema
└── amfi_nav_dev.sql        # Local development AMFI NAV SQLite seed
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/SECURITY_SPEC.md`](docs/SECURITY_SPEC.md) for deep-dive system and security specifications.

## Core API Endpoints

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service & SQLite NAV catalog health status |
| `GET` | `/api/db/gateway/metrics` | Live L1 SWR cache hit ratio, circuit breakers & AMFI catalog counts |
| `POST` | `/api/db/sync/amfi` | Sync live AMFI `NAVAll.txt` feed into SQLite & invalidate stale cache |
| `GET` | `/api/v1/funds/search` | Search AMFI mutual funds & ETFs by query, type, or category |
| `GET` | `/api/v1/funds/:code` | Uniform institutional fund dossier & holdings |
| `GET` | `/api/v1/overlap` | Underlying security overlap matrix between two funds |
| `POST` | `/api/portfolio/cas/parse-pdf` | Parse NSDL/CDSL/CAMS CAS PDF (multipart `file` + optional `password`, `Idempotency-Key` enforced) |
| `GET` | `/api/portfolio/cas/sample-pdf` | Download synthetic NSDL (`?provider=nsdl`) or CDSL (`?provider=cdsl`) CAS PDF |

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment variables (see .env.example)
cp .env.example .env

# Start full-stack Express + Vite server on http://localhost:3000
npm run dev

# Run strict TypeScript check, Firestore rules lint, unit tests, and production build
npm run lint
npm run lint:rules
npm test
npm run build
```
