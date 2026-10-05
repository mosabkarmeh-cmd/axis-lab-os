# AXIS LAB OS v0.14.1

## Hardening
- JWT is no longer persisted in renderer localStorage.
- Authentication is restored through the HttpOnly session cookie.
- Server-side logout endpoint clears the session cookie.
- Packaged runtime paths are explicit.
- Security-sensitive identifiers use UUID-backed IDs.
- Obsolete default credentials removed from installer messaging.

## Validation
- Static security audit: PASS
- Architecture audit: PASS
- Node syntax checks: PASS
- Full dependency-backed TypeScript/Vite/Electron build remains to be executed by Windows CI because the current build environment cannot complete npm dependency installation.
