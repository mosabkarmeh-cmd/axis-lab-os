# AXIS LAB OS — Hard Grill Me Audit

## Scope

This audit covers the complete Windows ERP surface: startup and authentication, permissions, dashboard, orders, customers, materials, inventory, suppliers, production, accounting, reports, settings, database/backup/restore, file attachments, printing/PDF, exports, AI/network integrations, SQLite persistence, migration, crash recovery, concurrency, security, and Windows packaging.

## Currency contract

Operational materials and orders are stored and calculated in SYP. USD is presentation-only for final invoices and reports. SYP-to-USD is division by the applicable historical or current rate. USD-to-SYP is multiplication only when the USD value is explicitly the source amount. Finalized invoices and fully paid/delivered orders must retain their exchange-rate snapshot and SYP/USD totals permanently.

## Audit matrix

| Priority | Area | Required checks | Status |
|---|---|---|---|
| P0 | Currency integrity | SYP-primary arithmetic, historical invoice/expense snapshots, no current-rate rewrite | PASS — currency, invoice, expense persistence and rate-freeze smoke tests passed |
| P0 | Orders/payments | validation, duplicate payments, overpayment, finalization lock, status transitions | PASS in current API security/financial persistence suite; production completion duplicate guard added |
| P0 | SQLite | schema migration, persistence, restore, corruption recovery, crash recovery, concurrency | PASS — migration, integrity, restore, crash recovery and concurrency suites passed |
| P0 | Authentication/security | protected routes, roles, first-run password, unauthorized access | PASS — security, coverage and first-run password suites passed |
| P1 | Accounting/reports | periods, monthly aggregation, profit, expenses, exports, PDFs | PARTIAL — historical report paths covered; monthly/PDF visual verification remains |
| P1 | Inventory/materials | stock arithmetic, negative stock, imports, supplier prices, SYP display | PARTIAL — production completion now rejects insufficient stock; broader UI/import audit remains |
| P1 | Production | costing, job transitions, machine assignment, completion, inventory consumption | PASS for targeted completion guards — isolated API test passed; broader costing review remains |
| P1 | UI flows | loading, empty/error states, forms, dialogs, navigation, stale data | PARTIAL — dashboard fake data and inspected mojibake fixed; post-login browser pass remains unavailable |
| P2 | Data management | backup, restore, recycle bin, files, import/export, numbering | pending |
| P2 | Integrations | AI, SMTP, network, auto-update behavior and graceful failures | pending |
| P2 | Packaging | Current User, All Users, unpacked runtime, SQLite path, icon, installer launch | PASS — Windows Installer QA run 31935527457 succeeded for build, both installers, install and launch |

## Completion rule

Do not call the release fully ready until the automated suite, targeted edge-case tests, TypeScript/build, and Windows QA all pass, and every discovered P0/P1 issue is either fixed or explicitly documented as a remaining limitation.

## UI checkpoint

The local browser smoke test reached the login screen successfully after waiting for React hydration. The first screenshot was blank while the page was loading, then the DOM and screenshot showed the login UI and demo-account controls. A visible issue remains: several Arabic/emoji strings are rendered with mojibake such as `ðŸ“` in extracted content, while the visual screenshot renders the main Arabic copy correctly. This needs a character-encoding/source audit before final release.

## UI/login checkpoint 2

The server intentionally refuses to start without a JWT secret of at least 32 characters; with an isolated test secret and bootstrap admin password, the login screen loads and exposes the expected demo-account controls. The browser screenshot and DOM are functional after hydration. The extracted HTML showed mojibake in some emoji/Arabic strings. The inspected source locations in the logo and Electron update messages were repaired and rechecked; a post-login browser pass is still unavailable.

## Browser interaction checkpoint

The isolated admin password was entered successfully. The login submission action caused the browser session to become unavailable before the post-login screen could be inspected. Automated API authentication and security tests remain available; visual post-login verification is marked pending until the browser session can be reopened.

## Hard-grill checkpoint — v0.13.5 working tree

The production build and complete smoke command passed after two fixes: stale UI/Electron version labels were updated to 0.13.5 and all injected dashboard baseline orders/revenue were removed so the seven-day chart uses real orders only. A P0 production-flow issue was also fixed: completing a job now rejects insufficient available material stock and rejects repeated completion attempts before changing job state. No negative-stock deduction is permitted through this route.

Windows Installer QA run 31935527457 completed successfully for commit faea983: backend validation, Current User build, All Users build, installation and launch checks all passed. The focused production endpoint test also passed, and the source audit found no remaining mojibake in the inspected logo/Electron files after repair. The only remaining evidence gap is a visual post-login browser pass because the browser session became unavailable; multi-month report/PDF visual verification and the broader P2 data/integration checks are not yet evidence-backed, so a 100% release claim would be premature.
