# AXIS LAB OS v0.7.0

## Changes

- Removed unused Firebase client and admin SDK dependencies from the desktop build.
- Moved `drizzle-kit` to development dependencies because it is not required at runtime.
- Added an npm override for `uuid` to `^11.1.1`, eliminating the production audit warning inherited through ExcelJS.
- Expanded the SQLite persistence smoke test to verify automatic subtotal, tax, discount, and invoice-total calculations.
- Confirmed that the production dependency tree reports zero npm audit vulnerabilities.

## Verification

- TypeScript check: passed.
- Vite and server production build: passed.
- API security, SQLite persistence, backup/restore, and first-run password smoke tests: passed.
- Electron main-process syntax check: passed.
- Production npm audit (`npm audit --omit=dev`): 0 vulnerabilities.

## Remaining Engineering Work

- The desktop SQLite state layer still uses a compatibility snapshot for parts of the legacy in-memory domain model; a full table-by-table Drizzle/SQLite migration remains a separate architecture project.
- Development-only Drizzle Kit/esbuild audit advisories remain and do not ship in the production dependency set; they should be revisited when the database migration tooling is upgraded.
- Windows code signing still requires a certificate and CI secret configuration.
- The monolithic React entry point remains a maintainability concern and should be decomposed incrementally behind regression tests.
