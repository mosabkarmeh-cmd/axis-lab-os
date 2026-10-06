# AXIS LAB OS Release Procedure

## Release target

The production desktop release is the Windows Electron application packaged as two NSIS installers:
- Current User
- All Users

SQLite is the database mode used by the packaged desktop application.

## Release gate

A release candidate is not considered ready until the exact release commit passes TypeScript, architecture, security, financial RBAC, workflow, inventory, production, payment, network, stress, unpacked Electron, installer, and GUI checks.

Run locally:
```bash
npm run test:release-gate
```

Build Windows installers:
```bash
npm run release:win
```

## Versioning

`package.json` and `package-lock.json` must use the same semantic version.
Official release tags use `vMAJOR.MINOR.PATCH` and must point to the exact current `main` commit.

## Official publication

Official GitHub Release publication is blocked until Windows code-signing secrets are configured:
- `CSC_CERT_BASE64`
- `CSC_KEY_PASSWORD`

Unsigned installers may still be produced by Windows CI for QA.

## First launch

Each packaged installation generates a random bootstrap administrator password.
The first account email is `admin@axislab.com`.
The first login requires the administrator to change the generated password before operational access.
Never commit, publish, or screenshot the generated password.

## Data safety

Verify backup creation, backup inspection, and restore against a disposable test dataset before production deployment.
Do not use the only copy of real customer data for upgrade testing.

## Upgrade acceptance

Test an upgrade over a previous installed version with representative customers, orders, payments, invoices, inventory, production jobs, files, and backups.
After upgrade verify SQLite integrity, entity counts, financial invariants, files, login, restart, and backup recovery.

## Release evidence

Record the release commit SHA, Git tag, successful Windows CI run, successful Electron GUI Smoke run, successful Windows Unpacked QA run, installer checksums, signing status, release date, and known limitations.
The evidence must refer to the same commit and version.