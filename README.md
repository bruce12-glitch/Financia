# Financia

Institutional-grade financial data engine, SQLite-powered mutual fund database, and multi-asset analytics terminal for Indian and global financial markets.

Financia couples an embedded SQLite relational database engine operating in Write-Ahead Logging (WAL) mode with real-time AMFI NAV ingestion pipelines, a multi-factor mutual fund and ETF screener, real-time Finnhub global exchange data, and an institutional Bloomberg-style dark terminal interface built on React 19, Vite, Tailwind CSS, and Three.js.

---

## Table of Contents

- [Architecture](#architecture)
- [Key Modules](#key-modules)
  - [1. SQLite Mutual Fund Database Engine](#1-sqlite-mutual-fund-database-engine)
  - [2. AMFI NAV Ingestion & Normalization Pipeline](#2-amfi-nav-ingestion--normalization-pipeline)
  - [3. Multi-Factor Screener & Risk Analytics Engine](#3-multi-factor-screener--risk-analytics-engine)
  - [4. Multi-Asset Live Terminal & 3D Global Exchanges](#4-multi-asset-live-terminal--3d-global-exchanges)
  - [5. Hardened Security & Isolation Layer](#5-hardened-security--isolation-layer)
- [REST API Reference](#rest-api-reference)
  - [Institutional V1 Endpoints (`/api/v1`)](#institutional-v1-endpoints-apiv1)
  - [Database & Ingestion Endpoints (`/api/db`)](#database--ingestion-endpoints-apidb)
  - [Global Exchange Endpoints (`/api/global`)](#global-exchange-endpoints-apiglobal)
  - [Market Data & Stocks Endpoints (`/api/stocks`, `/api/markets`)](#market-data--stocks-endpoints-apistocks-apimarkets)
  - [Authentication & Workspace Endpoints (`/api/auth`, `/api/workspace`)](#authentication--workspace-endpoints-apiauth-apiworkspace)
- [Database Schema & Storage Engine](#database-schema--storage-engine)
- [Directory Structure](#directory-structure)
- [Environment Configuration](#environment-configuration)
- [Quickstart & Development](#quickstart--development)
- [Testing & Quality Verification](#testing--quality-verification)
- [License](#license)

---

## Architecture

```
                          +-------------------------------------------------------------+
                          |                    Upstream Data Feeds                      |
                          |  - Daily AMFI Semicolon Feeds (14,000+ schemes)             |
                          |  - Finnhub Global REST/WS (Quotes, Candles, Profile, News)  |
                          |  - MFPRO Monthly Portfolio Disclosures (24k+ holdings)      |
                          |  - Remote Parquet Datasets (HTTP Range Probes)              |
                          +-------------------------------------------------------------+
                                                         |
                                                         v
                          +-------------------------------------------------------------+
                          |                 Ingestion & Normalization                   |
                          |  - AMFI Text Sanitizer (Mojibake & Encoding Repair)         |
                          |  - Instrument Classifier (ETF / FoF / Index / Active / Seg) |
                          |  - AST-Guarded Read-Only SQL Sandbox Validator              |
                          |  - ISIN Checksum & Validation Engine                        |
                          +-------------------------------------------------------------+
                                                         |
                                                         v
                          +-------------------------------------------------------------+
                          |                 SQLite High-Performance Engine              |
                          |                         (better-sqlite3)                    |
                          |  - WAL Mode (PRAGMA journal_mode = WAL)                     |
                          |  - Synchronous Normal (PRAGMA synchronous = NORMAL)         |
                          |  - Schema: schemes, nav_history, portfolio_holdings,        |
                          |    isin_master, scheme_conflicts, aum_anomalies             |
                          |  - Materialized Screener Views & Composite B-Tree Indexes   |
                          +-------------------------------------------------------------+
                                                         |
                                                         v
                          +-------------------------------------------------------------+
                          |                      Express 4 Backend                      |
                          |  - /api/v1       : Uniform Fund Dossiers & Overlap Engine   |
                          |  - /api/db       : Database Administration & SQL Console    |
                          |  - /api/global   : Finnhub Global Markets Proxy             |
                          |  - /api/stocks   : Real-time Tickers, Candles, Technicals   |
                          |  - /api/auth     : Argon2/PBKDF2 Sessions & Audit Log       |
                          |  - Middleware    : Strict CSP, Origin Check, Rate Limiters  |
                          +-------------------------------------------------------------+
                                                         |
                                                         v
                          +-------------------------------------------------------------+
                          |                 React 19 Frontend Terminal                  |
                          |  - Fund Screener : VaR 95/99, CVaR, Max Drawdown, Sharpe    |
                          |  - Terminal      : Interactive Charts, Sparklines, Depth    |
                          |  - 3D Globe      : Three.js Real-time Exchange Sessions     |
                          |  - Portfolios    : Correlation Matrix & Stress Testing      |
                          |  - Landing       : WebGL/Canvas Financial Visualizations    |
                          +-------------------------------------------------------------+
```

---

## Key Modules

### 1. SQLite Mutual Fund Database Engine
- **In-Process Relational Storage**: Backed by `better-sqlite3` with Write-Ahead Logging (`WAL`) and `NORMAL` synchronous mode for low-latency concurrent read throughput.
- **Auto-Bootstrapping**: Automatically initializes tables, constraints, indexes, and analytical views from `amfi_nav_dev.sql` or pre-seeded terminal catalogs on first run.
- **Fast Search Indexing**: Composite B-tree indexes across `(scheme_code, nav_date)`, `(isin)`, `(fund_code, month_end)`, and `(instrument_type, asset_class)` ensure sub-millisecond query performance.
- **Portfolio Holdings Resolution**: Maps monthly disclosed holdings across equity, debt, sovereign, and money-market instruments with ISIN resolution and duplicate reconciliation.

### 2. AMFI NAV Ingestion & Normalization Pipeline
- **Mojibake & Encoding Repair**: Sanitizes malformed UTF-8/Windows-1252 text, fixing corrupted quotes, hyphens, and currency symbols common in raw AMFI daily dumps.
- **Instrument Classification**: Accurately categorizes instruments into:
  - `MUTUAL_FUND` (Open/Close-ended equity, debt, hybrid)
  - `ETF` (Gold, Index, Sector, International ETFs)
  - `INDEX_FUND` (Passive index trackers)
  - `FOF` (Fund of Funds domestic and overseas)
  - `SEGREGATED` (Segregated portfolios created post-credit events)
- **Family Grouping**: Unifies Direct, Regular, Growth, IDCW, and Bonus share classes under a calculated deterministic `fund_family_key`.
- **Quality Audit Tracking**: Logs unresolved scheme conflicts, orphaned ISINs, and irregular AUM fluctuations into dedicated audit tables.

### 3. Multi-Factor Screener & Risk Analytics Engine
- **Comprehensive Quant Metrics**: Calculates and ranks funds across quantitative risk and performance metrics:
  - **VaR (Value at Risk)**: Historical simulation at 95% and 99% confidence intervals.
  - **CVaR (Conditional VaR / Expected Shortfall)**: Average loss beyond the VaR threshold.
  - **Maximum Drawdown (MDD)**: Peak-to-trough peak loss over rolling 1Y, 3Y, and 5Y horizons.
  - **Risk-Adjusted Ratios**: Sharpe Ratio (against risk-free rate), Sortino Ratio (downside risk only), Alpha, Beta, and Tracking Error.
- **Portfolio Overlap Analyzer**: Computes common stock and sector exposure between any two selected funds down to the exact security weight.

### 4. Multi-Asset Live Terminal & 3D Global Exchanges
- **Interactive Financial Terminal**: Features real-time candle charts, 24-hour mini-sparklines, order book depth simulation, earnings calendar, and analyst ratings.
- **Unified Symbol Search**: Instant search scoring across Indian mutual funds, AMFI codes, ISINs, US equities, global ETFs, and crypto pairs.
- **3D Global Exchanges Globe**: Renders an interactive Three.js orthographic/perspective globe visualizing financial market centers (NYSE, NASDAQ, LSE, Tokyo, Hong Kong, NSE/BSE) with live countdown timers and open/closed status tracking based on exchange operating hours.
- **Macro & Bullion Trackers**: Live US 10-Year Treasury Yield (`DGS10`), yield curve inversion monitoring, gold/silver bullion ratios, and Market Fear & Greed index gauge.

### 5. Hardened Security & Isolation Layer
- **AST-Guarded SQL Console**: Web SQL query workbench blocks destructive statements (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `ATTACH`) via strict AST validation and read-only connection handles.
- **Enterprise Middleware**:
  - Strict Content Security Policy (CSP), anti-clickjacking headers (`X-Frame-Options: DENY`), and MIME type sniffing protection.
  - Mutation origin verification guarding against cross-site request forgery.
  - IP-based sliding-window rate limiters on `/api/auth` (40 req / 15 min) and `/api` (450 req / min).
- **Extension Error Isolation**: Runtime wrappers shield the UI from third-party browser extensions that interfere with the global `fetch` API.

---

## REST API Reference

### Institutional V1 Endpoints (`/api/v1`)

| Method | Endpoint | Query / Path Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/funds/search` | `q`, `instrument_type`, `category`, `active_only`, `limit` | Autocomplete and filter funds by instrument type and asset class. |
| `GET` | `/api/v1/funds/:code` | `:code` (AMFI scheme code) | Returns a uniform fund dossier (AUM, TER, NAV, allocation, top 10 holdings). |
| `GET` | `/api/v1/compare` | `codes` (comma-separated scheme codes, max 4) | Multi-fund side-by-side comparison payload. |
| `GET` | `/api/v1/holdings/funds` | — | Returns available filter facets for portfolio holdings (AMCs, categories, months). |
| `GET` | `/api/v1/holdings/:fund` | `:fund` (scheme code or fund code) | Returns top portfolio holdings for the specified fund. |
| `GET` | `/api/v1/overlap` | `fund_a`, `fund_b` | Calculates portfolio overlap percentage and common holdings between two funds. |
| `GET` | `/api/v1/etfs` | `q`, `limit`, `offset` | Filter and paginate active Exchange Traded Funds. |
| `GET` | `/api/v1/debt` | `q`, `limit`, `offset` | Filter and paginate active Debt and Money Market funds. |
| `GET` | `/api/v1/macro/dgs10` | — | US 10-Year Treasury Yield and yield curve comparison data. |
| `GET` | `/api/v1/nav/history/:code` | `:code` (AMFI scheme code) | Returns daily historical NAV time-series points (local SQLite fallback to upstream). |

### Database & Ingestion Endpoints (`/api/db`)

| Method | Endpoint | Payload / Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/db/health` | — | Healthcheck reporting database size, row counts, and catalog status. |
| `GET` | `/api/db/overview` | — | Comprehensive storage overview with table-by-table record counts. |
| `GET` | `/api/db/schema` | — | Returns SQLite schema metadata, column types, and foreign keys. |
| `GET` | `/api/db/terminal/stats` | — | Returns high-level metrics for the 14,000+ scheme terminal catalog. |
| `GET` | `/api/db/terminal/screener`| `q`, `instrumentType`, `assetClass`, `amc`, `sortBy`, `sortDir` | Screener table query with sorting and filtering. |
| `POST` | `/api/db/ingest/amfi` | `{ "rawText": "...", "dryRun": false }` | Parses and upserts raw semicolon-delimited AMFI NAV feeds. |
| `POST` | `/api/db/query` | `{ "sql": "SELECT ...", "maxRows": 250 }` | Executes a validated read-only SQL query against SQLite. |
| `GET` | `/api/db/quality` | `tab` (`scheme_conflicts` \| `aum_anomalies`), `status`, `code` | Data quality issues, orphaned records, and AUM anomaly logs. |
| `GET` | `/api/db/export/nav-master.sql` | `limit` (default 500) | Generates a downloadable SQL dump of the NAV master table. |
| `POST` | `/api/db/sync-all` | — | Synchronizes remote dataset tables from configured upstream sources. |

### Global Exchange Endpoints (`/api/global`)

| Method | Endpoint | Query / Path Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/global/status` | — | Checks Finnhub API key configuration and curated catalog count. |
| `GET` | `/api/global/instruments` | — | Returns curated list of global stocks, ETFs, and indices. |
| `GET` | `/api/global/search` | `q` (ticker or company name) | Live global symbol lookup via Finnhub. |
| `GET` | `/api/global/news` | `category` (default: `general`) | Real-time global market news headlines and summaries. |
| `GET` | `/api/global/dossier/:symbol` | `:symbol` (e.g. `AAPL`, `MSFT`) | Deep profile, analyst ratings, financials, and live quote. |

### Market Data & Stocks Endpoints (`/api/stocks`, `/api/markets`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/stocks/quote/:ticker` | Real-time stock quote with day high/low, volume, and percentage change. |
| `GET` | `/api/stocks/candles/:ticker` | Historical OHLCV candle data for charting. |
| `GET` | `/api/stocks/terminal-search` | Multi-asset unified search across equities, ETFs, funds, and crypto. |
| `GET` | `/api/markets/indices` | Benchmark indices (NIFTY 50, SENSEX, S&P 500, NASDAQ, FTSE, Nikkei). |
| `GET` | `/api/markets/heatmaps` | Sector bull/bear performance heatmap data. |
| `GET` | `/api/markets/fear-greed` | Multi-factor Market Sentiment & Fear/Greed Index. |

### Authentication & Workspace Endpoints (`/api/auth`, `/api/workspace`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Creates a new user account with secure password hashing. |
| `POST` | `/api/auth/login` | Authenticates credentials and returns a secure session token. |
| `GET` | `/api/auth/me` | Validates session token and returns current user profile. |
| `GET` | `/api/workspace/portfolios` | Returns user's saved portfolios and asset allocations. |
| `POST` | `/api/workspace/alerts` | Sets price and NAV notification alerts. |

---

## Database Schema & Storage Engine

The underlying database uses SQLite 3 with the following core relational tables:

```sql
-- 1. Master Fund / Scheme Directory
CREATE TABLE schemes (
  scheme_code       TEXT PRIMARY KEY,
  isin              TEXT,
  isin2             TEXT,
  scheme_name       TEXT NOT NULL,
  fund_family_key   TEXT,
  amc               TEXT NOT NULL,
  instrument_type   TEXT NOT NULL, -- MUTUAL_FUND, ETF, INDEX_FUND, FOF, SEGREGATED
  asset_class       TEXT NOT NULL, -- Equity, Debt, Hybrid, Solution Oriented, Other
  sub_category      TEXT,
  plan_type         TEXT,          -- Direct, Regular
  option_type       TEXT,          -- Growth, IDCW, Bonus
  ter_direct        REAL,
  ter_regular       REAL,
  aum_cr            REAL,
  is_active         INTEGER DEFAULT 1,
  created_at        TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Daily NAV Time-Series
CREATE TABLE nav_history (
  scheme_code       TEXT NOT NULL,
  nav_date          TEXT NOT NULL,
  nav               REAL NOT NULL,
  repurchase_price  REAL,
  sale_price        REAL,
  PRIMARY KEY (scheme_code, nav_date)
);

-- 3. Monthly Disclosed Portfolio Holdings
CREATE TABLE portfolio_holdings (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_code         TEXT NOT NULL,
  month_end         TEXT NOT NULL,
  security_name     TEXT NOT NULL,
  isin              TEXT,
  sector            TEXT,
  asset_group       TEXT,          -- Equity, Debt, Cash, Sovereign
  weight_pct        REAL NOT NULL,
  quantity          REAL,
  market_value_lacs REAL
);

-- 4. Quality Audit & Anomaly Tracking
CREATE TABLE scheme_conflicts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  scheme_code TEXT NOT NULL,
  issue_type  TEXT NOT NULL,
  detail      TEXT,
  status      TEXT DEFAULT 'OPEN',
  detected_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Directory Structure

```
.
├── backend/                        # Modular Express backend architecture
│   ├── app.ts                      # App factory, middleware configuration, and router mounting
│   ├── middleware/
│   │   └── securityMiddleware.ts   # Rate limiters, CSP, and mutation origin checks
│   ├── routes/                     # Domain-specific route controllers
│   │   ├── aiRoutes.ts             # Gemini-powered quant analysis and brief generation
│   │   ├── authRoutes.ts           # Authentication and session management
│   │   ├── marketsRoutes.ts        # Indices, heatmaps, and bullion endpoints
│   │   ├── screenerRoutes.ts       # Mutual fund & ETF screener endpoints
│   │   ├── stocksRoutes.ts         # Stock quotes, candles, and SEC filings
│   │   └── workspaceRoutes.ts      # User portfolios, alerts, and preferences
│   └── services/                   # Business logic and external service integrations
│       ├── auditLogService.ts      # Security and operational audit logging
│       ├── authService.ts          # Password hashing and token verification
│       ├── etfFmpService.ts        # Treasury yield curve and ETF data
│       ├── geminiService.ts        # Google Gemini AI models integration
│       ├── marketDataService.ts    # AMFI historical sync and quote feeds
│       ├── navDatabaseService.ts   # SQLite nav_master helper service
│       └── persistenceService.ts   # In-memory and file-based state store
├── server/                         # SQLite engine and ingestion modules
│   ├── catalog.ts                  # Remote dataset definitions and metadata
│   ├── database.ts                 # SQLite connection, WAL init, and query handlers
│   ├── finnhubService.ts           # Finnhub API client and symbol proxy
│   ├── parsers.ts                  # AMFI text parser, CSV tokenizer, and SQL safety validator
│   ├── routes.ts                   # Core database and global exchange routers
│   ├── syncService.ts              # Upstream dataset download and synchronization
│   └── v1Routes.ts                 # Institutional /api/v1 REST routes
├── frontend/                       # React 19 single-page application
│   ├── App.tsx                     # Main layout, view switching, and navigation state
│   ├── components/                 # Terminal UI components
│   │   ├── GlobalExchangesGlobeSection.tsx # 3D Three.js globe with active market clocks
│   │   ├── LiveStockTerminal.tsx   # Interactive stock chart, depth, and order book
│   │   ├── MutualFundEtfScreenerSection.tsx # Screener table with VaR and risk metrics
│   │   ├── TerminalComparisonWorkbench.tsx # Multi-fund side-by-side comparison
│   │   ├── TerminalCrossFundComparePanel.tsx # Cross-fund overlap and asset split
│   │   ├── TerminalIndividualAnalysisPanel.tsx # Deep fund dossier and analytics
│   │   ├── FearGreedGauge.tsx      # Visual market sentiment meter
│   │   └── SectorHeatmap.tsx       # Sector bull/bear performance matrix
│   ├── services/
│   │   └── financiaApiClient.ts    # Frontend HTTP client for Financia APIs
│   └── utils/                      # Frontend quant algorithms and test suites
│       ├── exchangeSessionEngine.ts# Exchange time zone and market session math
│       ├── riskAnalyticsEngine.ts  # VaR, CVaR, Sharpe, and Drawdown calculations
│       └── terminalSearchEngine.ts # Fuzzy search scoring across symbols and funds
├── landing/                        # Visual marketing and showcase experience
│   ├── EarthHeroSection.tsx        # 3D interactive Earth hero visual
│   ├── AlpineAuthCanvas.tsx        # High-performance canvas visual
│   └── HeroTickerMarquee.tsx       # Live marquee ticker component
├── public/assets/aistudio/         # Seed files, videos, and default AMFI catalogs
├── .env.example                    # Environment variable template
├── amfi_nav_dev.sql                # Seed SQL script containing AMFI schema and records
├── server.ts                       # Server bootstrap entry point
├── package.json                    # Project configuration and dependencies
├── tsconfig.json                   # TypeScript compiler options
└── vite.config.ts                  # Vite build configuration with React plugin
```

---

## Environment Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

| Variable | Required | Description | Default |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | HTTP port for the Express application server. | `3000` |
| `DEFAULT_APP_PORT`| Optional | Fallback application port if `PORT` is occupied or unset. | `3000` |
| `FINANCIA_MF_DB_PATH` | Optional | Custom filesystem path for the SQLite database file. | `./amfi_nav_dev.db` |
| `FINNHUB_API_KEY` | Optional | Finnhub API token for live global stock quotes, candles, and news. | `""` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI-assisted quant summaries. | `""` |
| `ALPACA_KEY_ID` | Optional | Alpaca paper trading API Key ID. | `""` |
| `ALPACA_SECRET_KEY`| Optional | Alpaca paper trading Secret Key. | `""` |
| `DISABLE_HMR` | Optional | Set to `true` to disable Vite HMR in headless/container environments. | `false` |

---

## Quickstart & Development

### Prerequisites

- **Node.js**: Version `20.x` or higher (tested on Node v24 LTS)
- **Package Manager**: `npm` (v10+) or `bun` (v1.1+)

### 1. Clone & Install

```bash
git clone https://github.com/bruce12-glitch/Financia.git
cd Financia
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

*(Optional)* Add your `FINNHUB_API_KEY` or `GEMINI_API_KEY` to `.env` to enable real-time global market feeds and AI insights.

### 3. Start Development Server

```bash
npm run dev
```

The application will start at `http://localhost:3000`. On initial boot, the SQLite engine automatically loads the 14,000+ scheme AMFI catalog and boots the Vite dev server.

### 4. Build for Production

```bash
npm run build
npm start
```

Vite compiles the frontend assets into `dist/`, and Express serves both the static production assets and the full REST API suite from a single process.

---

## Testing & Quality Verification

Financia uses Node.js's native test runner (`node:test`) for zero-overhead unit testing:

```bash
# Run AMFI parser and SQL safety validator test suite
npx tsx --test server/parsers.test.ts

# Run Finnhub service formatting tests
npx tsx --test server/finnhubService.test.ts

# Run frontend exchange session engine tests
npx tsx --test frontend/utils/exchangeSessionEngine.test.ts

# Run risk and VaR calculation unit tests
npx tsx --test frontend/utils/riskAnalyticsEngine.test.ts

# Run terminal search engine scoring tests
npx tsx --test frontend/utils/terminalSearchEngine.test.ts

# Run TypeScript static type check
npm run lint
```

---

## License

Internal engineering distribution. All rights reserved.
