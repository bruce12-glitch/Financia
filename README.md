# Financia Mutual Fund Database Engine

High-performance relational SQLite database engine, data ingestion pipeline, and interactive analytical terminal for Indian mutual funds, ETFs, and monthly portfolio disclosures.

---

## Overview

Financia Mutual Fund Database Engine provides an institutional-grade data layer and web interface for tracking, querying, and auditing the Indian mutual fund universe. It combines an embedded SQLite engine operating in Write-Ahead Logging (WAL) mode, robust AMFI feed parsers, automated dataset synchronization, and a zero-latency dark terminal interface built with React 19 and Vite.

The system handles everything from daily AMFI NAV text feeds to multi-month portfolio disclosures (24,000+ holdings records across 24 fund houses), corporate action ISIN mapping, data quality anomaly tracking, and remote Parquet datasets queried in place via HTTP Range requests.

---

## System Architecture

```
                                  +---------------------------------------+
                                  |         External Data Sources         |
                                  |  - Daily AMFI Semicolon NAV Feeds     |
                                  |  - MFPRO Monthly Portfolio Disclosures|
                                  |  - Remote Parquet Datasets (TigZig)   |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |      Ingestion & Parser Pipeline      |
                                  |  - sanitizeAmfiText (Mojibake Fixer)  |
                                  |  - classifyAmfiRecord (Instrument Clf)|
                                  |  - parseCsvRows & Stream Decompressor |
                                  |  - readOnlySqlValidator (AST Guard)   |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |         SQLite Storage Engine         |
                                  |           (better-sqlite3)            |
                                  |  - WAL Mode & Normal Synchronous      |
                                  |  - 9 Relational Tables + B-Tree Idxs  |
                                  |  - Materialized Analytical Views      |
                                  |  - Read-Only Concurrent Query Handle  |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |          Express 4 REST API           |
                                  |     (/api/db/* and /api/funds/*)      |
                                  |  - Screener, Autocomplete, Dossier    |
                                  |  - Holdings & ISIN Resolution         |
                                  |  - AMFI Ingest, Audit & SQL Sandbox   |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |           Frontend Terminal           |
                                  |       (React 19 + Tailwind CSS)       |
                                  |  - Fund Terminal & Screener           |
                                  |  - Scheme Universe & TER Explorer     |
                                  |  - Portfolio Holdings & ISIN Mappings |
                                  |  - Data Quality Auditor & SQL Sandbox |
                                  +---------------------------------------+
```

---

## Core Capabilities

### 1. Pre-seeded Fund Terminal Catalog
- **Instant Autocomplete & Fuzzy Search**: Sub-millisecond prefix, word-boundary, ISIN, and scheme code search across active mutual funds and ETFs.
- **Instrument Classification**: Automatically partitions records into **ETFs**, **Index Funds**, **Mutual Funds**, **Fund of Funds (FoF)**, and **Segregated Portfolios**.
- **Fund Family Grouping**: Groups Direct, Regular, Growth, IDCW, and Bonus share classes under a unified `fund_family_key`.
- **Dossier & Comparison Engine**: Side-by-side metric comparison (NAV, AUM, TER, Expense Ratios, Asset Class, AMC, Allotment Date) with visual charts powered by Recharts.

### 2. AMFI NAV Feed Ingestion Pipeline
- **Semicolon-Delimited Parser**: Handles both 6-column and 8-column AMFI feed formats.
- **Robust Text Normalization**: Automatically strips mojibake characters, normalizes trailing whitespaces, and infers AMC names when missing in raw headers.
- **Dry-Run Validation**: Preview parsed schemes, detected AMCs, identified categories, and syntax warnings prior to database mutation.
- **SQL Export**: Generates clean `.sql` dumps for backup or migration into production databases.

### 3. Portfolio Holdings & ISIN Reference
- **Monthly Portfolio Composition**: Ingests holdings data across 13 consecutive month-ends for 24 leading Indian fund houses.
- **Corporate Action Mapping**: Normalizes changed ISINs (stock splits, consolidations, ISIN retirements) to their active trading identifiers.
- **Synthetic Instrument Aggregation**: Maps synthetic debt codes (`SYN*`, `IN9999999999`) for CDs, CPs, T-bills, and G-secs.
- **Relational Aggregation View**: Computes deduplicated portfolio weights and total market values via `v_fund_holdings_aggregated`.

### 4. Data Quality Auditor
- **Scheme Document Conflicts**: Identifies discrepancies between official Scheme Information Documents (SIDs) and daily AMFI feeds (e.g., benchmark naming drift, riskometer rating conflicts).
- **AUM Anomaly Tracking**: Records fund-day anomalies including unit slip corrections, bad AMFI prints, copied figures, and extreme cash fund swings.

### 5. Sandboxed SQL Workbench
- **In-Browser Analytical SQL**: Execute queries directly against the local SQLite database.
- **Strict Read-Only AST Guard**: Enforces `SELECT`, `WITH`, and `EXPLAIN` statements only. Blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `ATTACH`, and multi-statement injection attempts.
- **Query Profiling**: Measures execution duration in milliseconds and provides bounded result paging.

### 6. Parquet & Remote HTTP Range Queries
- **Zero-Download Remote Querying**: Pre-configured metadata for 37.8M rows of daily NAV history and 2.45M rows of daily fund size history hosted as Parquet files on TigZig.
- **Range Probe Service**: Tests HTTP Range header compatibility and byte-range offsets for DuckDB, Polars, and PyArrow integration.

---

## Database Schema

The database engine runs on SQLite via `better-sqlite3` and initializes the following schema:

| Table / View | Description | Key Indexes |
| :--- | :--- | :--- |
| `fund_terminal_catalog` | Sanitized, categorized master list of funds and ETFs for terminal queries. | `scheme_name`, `isin`, `amc`, `instrument_type`, `asset_class`, `sub_category`, `is_active`, `fund_family_key` |
| `scheme_universe` | Full AMFI scheme universe including active, matured, and segregated plans. | `amc`, `category_group_clean`, `is_active`, `isin`, `scheme_name` |
| `scheme_details` | Daily fund size, riskometers, benchmarks, fund managers, and TER (Direct & Regular). | `amfi_ssd_fund_id`, `fund_dedup_flag`, `amc`, `amfi_daily_riskometer` |
| `portfolio_holdings` | Monthly equity and debt portfolio holdings per fund-month disclosure. | `(fund_code, month_end)`, `isin`, `nse_symbol`, `asset_group`, `amfi_ssd_fund_id` |
| `portfolio_isin_mappings`| Mapping table for corporate actions and synthetic instrument codes. | `isin`, `mapping_category` |
| `amfi_nav_records` | Raw ingested AMFI NAV records with composite primary key `(scheme_code, nav_date)`. | `amc`, `nav_date`, `isin_div_payout_growth` |
| `data_quality_issues` | Audit records for unmatched schemes, benchmark mismatches, and risk conflicts. | `status`, `issue_code` |
| `fund_aum_quality_notes` | Quality annotations on historical daily fund size prints. | `quality_code`, `amfi_ssd_fund_id` |
| `dataset_catalog` | Catalog metadata tracking local row counts, sync statuses, and file locations. | `dataset_id` (PK) |
| `sync_runs` | Audit history of all background synchronization jobs. | `id` (PK AUTOINCREMENT) |
| `v_fund_holdings_aggregated` | View summing market values and weight percentages grouped by fund, month, and ISIN. | Computed from `portfolio_holdings` |
| `v_dedup_fund_aum` | View aggregating distinct fund-level AUM across multiple scheme plans. | Computed from `scheme_details` |

---

## REST API Reference

The backend exposes REST endpoints under both `/api/db` and `/api/funds`:

### Fund Terminal Endpoints

| Method | Endpoint | Query / Body Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/db/terminal/stats` | — | Summary metrics: total schemes, ETFs, mutual funds, active schemes, latest NAV date. |
| `GET` | `/api/db/terminal/index` | — | Lightweight in-memory search index payload for client-side search acceleration. |
| `GET` | `/api/db/terminal/autocomplete` | `q`, `instrumentType`, `assetClass`, `activeOnly`, `limit` | Ranked scheme suggestions with token matching and plan weighting. |
| `GET` | `/api/db/terminal/screener` | `q`, `instrumentType`, `assetClass`, `subCategory`, `amc`, `activeOnly`, `excludeSegregated`, `sortBy`, `sortDir`, `limit`, `offset` | Filtered, sorted, and paginated screener table. |
| `GET` | `/api/db/terminal/fund/:schemeCode` | `:schemeCode` (path parameter) | Detailed fund dossier including peer share classes within the same fund family. |
| `POST` | `/api/db/terminal/compare` | `{ "schemeCodes": ["122639", "118955"] }` | Side-by-side metric comparison across up to 4 funds. |
| `POST` | `/api/db/terminal/reprocess` | `{ "rawText": "...", "sourceFile": "..." }` | Reprocesses the catalog from local disk or pasted AMFI feed text. |

### Scheme & Holdings Endpoints

| Method | Endpoint | Query / Body Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/db/schemes` | `q`, `amc`, `category`, `plan`, `activeOnly`, `sortBy`, `sortDir`, `limit`, `offset` | Paginated query over the 38,000+ scheme universe. |
| `GET` | `/api/db/schemes/:schemeCode` | `:schemeCode` (path parameter) | Single scheme record with TER and AUM data. |
| `GET` | `/api/db/holdings` | `fundCode`, `monthEnd`, `assetGroup`, `q`, `aggregated`, `limit`, `offset` | Portfolio holdings filtered by fund, reporting month, or asset group. |
| `GET` | `/api/db/holdings/filters` | — | Available fund names, reporting month-ends, and asset categories. |
| `GET` | `/api/db/isin-mappings` | `q`, `category`, `limit`, `offset` | ISIN corporate action mappings and synthetic code references. |

### Ingestion, Audit & SQL Sandbox

| Method | Endpoint | Query / Body Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/db/amfi-nav` | `q`, `amc`, `limit`, `offset` | Ingested historical daily AMFI NAV entries. |
| `POST` | `/api/db/ingest/amfi` | `{ "rawText": "...", "dryRun": false, "source": "FEED" }` | Ingest raw AMFI feed text with dry-run support. |
| `GET` | `/api/db/export/nav-master.sql` | `limit` (default: 500) | Generates and streams a SQL `INSERT` script. |
| `GET` | `/api/db/quality` | `tab` (`scheme_conflicts` \| `aum_anomalies`), `status`, `code`, `q`, `limit`, `offset` | Quality audit issues and AUM anomaly records. |
| `POST` | `/api/db/query` | `{ "sql": "SELECT ...", "maxRows": 250 }` | Executes a validated read-only SQL query against SQLite. |
| `POST` | `/api/db/sync-all` | — | Synchronizes all configured bulk datasets from upstream providers. |
| `POST` | `/api/db/sync/:datasetId` | `:datasetId` (path parameter) | Triggers background synchronization for a specific dataset. |
| `POST` | `/api/db/probe-parquet/:datasetId` | `:datasetId` (path parameter) | Probes HTTP Range request support on remote Parquet files. |

---

## Project Structure

```
.
├── server/
│   ├── catalog.ts              # Dataset definitions, metadata, and upstream URLs
│   ├── database.ts             # SQLite initialization, schema, queries, and views
│   ├── database.test.ts        # Node:test suite for database queries and transactions
│   ├── parsers.ts              # AMFI text parser, CSV tokenizer, and SQL safety validator
│   ├── parsers.test.ts         # Unit tests for text normalization and SQL AST guards
│   ├── routes.ts               # Express 4 REST API routers (/api/db and /api/funds)
│   └── syncService.ts          # Dataset download, gzip streaming, and sync orchestration
├── src/
│   ├── App.tsx                 # Main application layout, sidebar navigation, and header
│   ├── index.css               # Tailwind CSS v4 styling rules
│   ├── main.tsx                # React 19 application entry point
│   ├── components/
│   │   ├── AmfiIngestView.tsx         # Semicolon NAV feed ingestion and validation UI
│   │   ├── DataQualityView.tsx        # Scheme conflict and AUM anomaly audit tables
│   │   ├── FinanciaLogo.tsx           # Scalable SVG branding component
│   │   ├── FundTerminal.tsx           # Interactive search, dossier, and comparison view
│   │   ├── OverviewCatalogView.tsx    # Database status, row counts, and dataset catalog
│   │   ├── PortfolioHoldingsView.tsx  # Holdings explorer with ISIN mapping drawer
│   │   ├── SchemeUniverseView.tsx     # Master scheme table with TER and AUM filters
│   │   └── SqlWorkbenchView.tsx       # In-browser SQL query editor with quick templates
│   ├── types/
│   │   └── db.ts               # TypeScript interfaces matching backend payloads
│   └── utils/
│       ├── fundSearch.ts       # Client-side fuzzy search and relevance scoring
│       └── fundSearch.test.ts  # Search relevance and tokenization tests
├── public/
│   └── assets/
│       └── aistudio/           # Pre-seeded AMFI terminal catalog file
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules (node_modules, .db, .env, .aistudio)
├── bun.lock                    # Dependency lockfile
├── package.json                # Project dependencies and operational scripts
├── server.ts                   # Unified development and production Express/Vite server
├── tsconfig.json               # TypeScript compiler configuration
└── vite.config.ts              # Vite 6 configuration with React and Tailwind plugins
```

---

## Local Setup & Development

### Prerequisites
- **Node.js**: Version 20.x or higher (or **Bun** 1.1+)
- **npm** or **bun**

### 1. Clone the Repository
```bash
git clone https://github.com/bruce12-glitch/Financia.git
cd Financia
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port for Express server | `3000` |
| `FINANCIA_MF_DB_PATH` | Path to the SQLite database file | `./data/financia_mf.db` |
| `GEMINI_API_KEY` | Optional Gemini API key for AI extensions | `""` |
| `DISABLE_HMR` | Set to `true` to disable Vite HMR in headless environments | `false` |

### 4. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`. On first boot, the engine automatically initializes the SQLite schema, creates all indexes and analytical views, and pre-loads the AMFI Fund Terminal catalog.

### 5. Run the Test Suite
```bash
npm test
```
Runs unit tests for the AMFI parser, SQL AST guard, and frontend search engine using the native Node.js test runner.

### 6. Build for Production
```bash
npm run build
npm start
```
Vite bundles the frontend assets into `dist/`, and Express serves both the production static assets and the `/api/db` REST endpoints from a single Node process.

---

## License

Internal engineering distribution. All rights reserved.
