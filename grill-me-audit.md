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

## Browser visual checkpoint — current pass

The local UI reopened successfully at port 3000. The login screen renders the Arabic branding, service labels, AXIS LAB v0.13.5, SQLite engine label, and 1$ = 135 SYP without visible mojibake. Selecting the admin demo account did not visibly populate a password; clicking secure login with an empty password triggered the browser's required-field validation. The post-login pass remains pending until the isolated server credentials are known or the preset behavior is corrected.

The isolated UI instance on port 3001 hydrated successfully and rendered the same corrected Arabic branding, version v0.13.5, SQLite label, and SYP rate display. A temporary bootstrap credential is available for the next login action.

The isolated login form accepted the temporary bootstrap password and the secure-login submission was sent. The browser session became unavailable again immediately after submission, so the post-login visual state could not be observed. This is an environment/browser evidence gap, not an observed authentication failure; API login and protected-route tests remain the source of automated evidence.

## Hard Grill Me pass — report and inventory guards

The monthly accounting aggregation now uses a `YYYY-MM` key, sorts chronologically, and keeps January 2025 separate from January 2026. A dedicated `report-monthly-smoke.cjs` test proves the separation and confirms historical expense SYP totals remain unchanged after a rate update.

Inventory guards now reject non-finite/zero adjustment quantities, negative or zero reservations, unreserve quantities greater than the active reservation, and adjustments that would reduce quantity below reserved stock. SQLite mode no longer attempts PostgreSQL writes for these routes; successful changes are persisted through the local SQLite snapshot path. Seed inventory `inv-4` was corrected from an impossible reservation of 15 against quantity 12, and startup normalization repairs legacy inconsistent inventory records. `inventory-guards-smoke.cjs` covers these cases.

After these changes, `npm run lint` and the complete `npm run test:smoke` suite passed, including currency, authentication/security, password bootstrap, API coverage, SQLite migration/recovery/concurrency, production completion, monthly reports, and inventory guards.

## Browser visual checkpoint — authentication modal

The isolated login flow now succeeds without browser prompt interruption. After submitting the bootstrap password, the dashboard loaded and displayed the in-app `تغيير كلمة المرور المؤقتة` dialog with current-password, new-password, confirmation, and submit fields. The dashboard navigation, SYP rate control, empty-state metrics, and Arabic UI rendered behind the modal. This closes the previous post-login visual gap caused by `window.prompt`.

The first-run password flow completed successfully in the browser: the current password was prefilled from login, the new password and confirmation were accepted, the modal disappeared, and the full dashboard remained usable. The visible navigation includes dashboard, orders, production, inventory, products, accounting, reports, AI, G-code, settings, and help. No post-login crash or mojibake was observed in this pass.

## Currency UI hard finding

The browser audit reproduced a severe rate-input issue: entering `200` into the numeric exchange-rate field appended to the existing value (`135` became `135200`, then continued growing on repeated automated entry). This distorted live USD displays and dashboard calculations. Adding `onFocus(select())` alone did not eliminate the behavior under the browser input path. The issue remains open and must be fixed with a controlled draft/apply interaction or equivalent deterministic input handling before release.

The actual DashboardCharts field was the source of the reproduced bug, not only the expanded converter modal. It now uses a separate draft and committed-rate reference. After reload, entering `200` produced a draft value of exactly `200` while the old committed rate remained unchanged until blur/Enter, preventing transient server writes and preserving existing historical values.

The inline rate fix passed its commit test: leaving the field committed rate `200`, the header changed to `1$ = 200 ل.س`, and the inline converter showed `100 USD = 20,000 SYP`. Existing order SYP totals remained unchanged; only their live USD display changed as expected for open orders. The expanded converter also opened with rate `200`.

The expanded converter passed the reverse-direction check at rate `200`: `20,000 SYP` produced `100.00 USD`, matching the forward result `100 USD = 20,000 SYP`. The dashboard header and both converter surfaces showed the same committed rate.

## Rate-input remediation

The severe inline-rate defect was fixed in `DashboardCharts.tsx` by separating `rateDraft` from the committed `exchangeRate`, normalizing appended numeric suffixes, selecting the field on focus, and committing only on blur or Enter. The expanded `CurrencyConverterModal.tsx` received equivalent committed-rate handling. The browser test now passes: the field accepts `200`, commits `200`, and both forward and reverse conversions remain mathematically correct.

Post-fix validation: `npm run lint` passed and the complete `npm run test:smoke` suite passed, including currency conversion, financial persistence, first-run password, API security/coverage, SQLite migration/recovery/concurrency, production completion, monthly reporting, and inventory guards.

## Final Windows QA checkpoint

GitHub Actions run [31940885983](https://github.com/mosabkarmeh-cmd/axis-lab-os/actions/runs/31940885983) completed successfully on commit `89c507e5747926b4cd34d89b3db0221e29fd7ece`. Backend validation, Current User installer build/preservation, All Users installer build, and installation/launch checks for both scopes all passed.

At this point, the previously open P0/P1 audit findings addressed in this cycle have passing local and CI evidence. The browser-only login and currency UI checks also passed after the rate-input remediation.

## Stress Test results

A dedicated isolated stress test was added at `tests/stress-test.cjs`. The first run exposed a real concurrency defect: activity log IDs based only on `Date.now()` collided under parallel order writes, producing duplicate `ACTIVITY_LOGS` IDs and fallback storage keys. The implementation was corrected with a unique activity-log ID generator using timestamp, process ID, sequence, and UUID entropy.

The corrected run passed with **712 requests**: 500 concurrent reads across orders/materials/inventory/production/analytics, 200 parallel order writes, and 10 concurrent exchange-rate updates. SQLite integrity was `ok`; schema version remained `5`; 204 orders persisted before and after restart; final exchange rate persisted as `200`; and all 203 activity-log IDs were unique.

Measured timings were: reads p50 `82.89 ms`, p95 `159.26 ms`; order writes p50 `160.51 ms`, p95 `275.64 ms`; exchange-rate writes p50 `9.53 ms`, p95 `13.76 ms`. These are isolated sandbox measurements, not a formal production capacity limit, but they confirm correctness and stability under the tested load.

## Post-stress Windows validation

After the activity-log ID fix, Windows Installer QA run [31941624140](https://github.com/mosabkarmeh-cmd/axis-lab-os/actions/runs/31941624140) completed successfully on commit `1a4944b7f85a78f05e2be92910e566151b16a7cf`. Current User and All Users installers both built, installed, and launched successfully, and backend validation passed in the same workflow.
