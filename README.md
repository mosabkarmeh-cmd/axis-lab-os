# AXIS LAB OS

AXIS LAB OS is a Windows-oriented ERP application for laser-cutting and engraving workshops. It combines orders, customers, products, materials, inventory, production jobs, invoices, payments, expenses, reports, user roles, and local SQLite persistence in an Electron desktop application.

## Requirements

The project is developed and tested with **Node.js 22**, npm, and Git. Windows developers should use PowerShell or Git Bash. The backend test suite also requires the repository dependencies and the `sql.js` WebAssembly runtime installed through npm.

## First-time setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/mosabkarmeh-cmd/axis-lab-os.git
cd axis-lab-os
npm install
```

Create a local environment file only when you need optional integrations. The SQLite test and desktop modes do not require PostgreSQL credentials. A typical development file is:

```dotenv
NODE_ENV=development
DB_MODE=sqlite
JWT_SECRET=replace-this-with-a-long-local-secret
```

Do not commit `.env`, database files, backups, installer output, or real customer data. Use a separate temporary database for automated tests.

## Running the application

Start the local development server with hot reload:

```bash
npm run dev
```

Build the production frontend and bundled backend:

```bash
npm run build
```

Run the bundled backend:

```bash
npm start
```

The local web interface normally uses port `3000`. The desktop preview starts Electron after building the application:

```bash
npm run desktop:preview
```

The desktop application stores local operational data in SQLite under the Electron application data directory. Automated tests override this location with `AXIS_DATA_FILE`, so test data remains isolated from a developer's real database.

## Currency contract

SYP is the operational base currency. Materials, orders, inventory, invoices, and primary financial totals are stored and calculated in Syrian pounds. USD is a display conversion only:

```text
USD = SYP / exchangeRate
SYP = USD * exchangeRate
```

When an invoice or expense becomes historically final, its exchange rate and SYP/USD totals are frozen. Updating the global exchange rate must not recalculate finalized historical documents.

## Test commands

Run the complete regression suite:

```bash
npm run test:smoke
```

The smoke suite builds the application and covers currency conversion, API security, first-run password handling, protected-route coverage, SQLite migration, crash recovery, concurrency stability, production completion, monthly reports, and inventory guards.

Run individual focused checks when debugging:

```bash
npm run lint
npm run test:coverage
npm run test:sqlite-migration
npm run test:sqlite-crash
npm run test:sqlite-concurrency
```

The tests start isolated server processes with temporary SQLite files. A successful test should report `PASS`; failures include the server log and should be investigated before merging.

## Stress Test

The isolated stress test validates API concurrency, SQLite persistence, exchange-rate writes, analytics reads, activity-log uniqueness, and recovery after a forced restart. The default scale is `1.0`:

```bash
npm run test:stress
```

The load can be changed with `STRESS_SCALE`. For example, the 150% audit run uses:

```bash
STRESS_SCALE=1.5 node tests/stress-test.cjs
```

On Windows PowerShell use:

```powershell
$env:STRESS_SCALE="1.5"
node tests/stress-test.cjs
Remove-Item Env:STRESS_SCALE
```

The test scales the baseline of five read waves, two order-write waves, and ten exchange-rate writes. At `STRESS_SCALE=1.5`, it executes **750 reads, 300 order writes, 15 rate writes, and 1,067 total requests including persistence checks**. The report includes P50, P95, maximum, average latency, SQLite integrity, schema version, order counts before and after restart, final exchange rate, and unique activity-log counts.

A passing stress test demonstrates correctness for the tested workload; it is not a formal production capacity guarantee. Compare P95 latency between runs and investigate any failed request, SQLite integrity error, data-count mismatch, rate mismatch, or activity-log collision.

### Internal benchmarks and persistence queue

Order creation records internal timings for request validation, item parsing, totals and number generation, order/invoice construction, activity-log append, persistence handling, and total handler time. An administrator can inspect the current in-memory measurements with the protected endpoint:

```text
GET /api/diagnostics/benchmarks
Authorization: Bearer <admin-jwt>
```

The response includes order-create buckets, persistence buckets, and queue state. Each bucket reports `count`, `avgMs`, `p95Ms`, and `maxMs`. The endpoint is admin-only because it exposes internal operational information.

SQLite writes use a single-flight queue with coalescing. The first mutation in a burst requests a fast durable flush, while concurrent follow-up mutations are combined into one later snapshot. Shutdown and backup operations still force a complete flush. This design reduces request-tail latency without removing the durability boundary required for local data recovery.

When comparing performance, use the same `STRESS_SCALE`, machine class, Node.js version, and database seed. Compare order-write P95 with the internal `request_total_to_response` and persistence buckets: a low handler P95 with a higher persistence P95 means the remaining cost is SQLite export/atomic file replacement rather than order calculation.

## CI and Windows installers

GitHub Actions validates the backend and produces two NSIS installer variants:

```bash
npm run desktop:package:win:current
npm run desktop:package:win:all
```

The **Current User** configuration installs without administrator scope. The **All Users** configuration installs for the machine and may require administrator permission. The Windows QA workflow builds both variants and installs and launches both on a Windows runner.

Before creating a release, run `npm run lint`, `npm run test:smoke`, and `npm run test:stress`, then verify the relevant GitHub Actions workflow is green. Do not publish an installer from a failing or dirty working tree.

## Development workflow

Use focused commits that describe one logical change. Before pushing, review the diff and run:

```bash
git diff --check
git status --short
npm run lint
npm run test:smoke
npm run test:stress
```

For changes to currency, financial snapshots, inventory, production consumption, SQLite persistence, authentication, or installer configuration, add or update a focused regression test. Never use production data to reproduce a test failure; copy only sanitized structural data into a temporary test fixture.

## Important project files

| Path | Purpose |
|---|---|
| `server.ts` | Express API, SQLite persistence, currency snapshots, locking, and domain operations |
| `src/App.tsx` | Main authenticated application shell and navigation |
| `src/components/AccountingView.tsx` | Invoices, payments, accounting totals, and historical financial displays |
| `src/components/ReportsView.tsx` | Sales, profit, inventory, and monthly analytics views |
| `src/components/CurrencyConverterModal.tsx` | Interactive USD/SYP conversion UI |
| `src/db/schema.ts` | Drizzle schema definitions used by the database layer |
| `tests/` | Smoke, migration, recovery, security, domain, and stress tests |
| `desktop/main.cjs` | Electron main process and auto-update integration |
| `electron-builder.yml` | Current User Windows packaging configuration |
| `electron-builder.all-users.yml` | All Users Windows packaging configuration |
| `grill-me-audit.md` | Hard Grill Me audit evidence and release findings |

## Troubleshooting

If a test cannot reach `/api/health`, check that no previous test process is still using the selected port and rerun the test; every test chooses an isolated temporary port. If a local database is corrupt, stop the application and use the documented backup/recovery workflow rather than deleting the only copy. If GitHub shows a 404 for this repository, verify that the browser session is authenticated because the repository is private.

## Release evidence

The repository contains `stress-results.html`, a locally viewable summary of the latest stress results, and `grill-me-audit.md`, the detailed audit record. These files are documentation artifacts; the authoritative source for reproducible verification remains the commands and tests in this README.
