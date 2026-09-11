# Project Conventions

## Clinical Report ID Generation

- **Format**: `<last digit of companyId>/<7-digit sequence>/<2-digit year>` (e.g. `7/0000001/26`)
- **Sequence table**: `clinical_report_sequences` — keyed by `(company_id, year)`
- **Concurrency safety**: Uses `INSERT ... ON CONFLICT (company_id, year) DO UPDATE SET last_number = last_number + 1 RETURNING last_number`, wrapped in a transaction.
- **`report_number` column** on `clinical_reports`: unique and nullable. Legacy records without a report number fall back to the UUID prefix for display.
- **Display surfaces**: list table, view modal, PDF, and DOCX exports.
- **Tests**: `clinical-reports.service.test.ts` covers first/second report, company isolation, year reset, multiple trainees, and concurrent allocation uniqueness.

## Verification Commands

- Backend tests: `cd backend && npm test` (vitest, scoped to `src`). Do **not** run bare `vitest run` — `backend/dist/` contains stale compiled test files from an older codebase state that always fail. `src/utils/geofence.test.ts` is a plain script (`npm run geo:test`), not a vitest suite, and is excluded.
- Backend typecheck/build: `cd backend && npx tsc --noEmit -p tsconfig.json` / `npm run build`.
- Frontend typecheck/build: `cd frontend && npx tsc --noEmit -p tsconfig.app.json` / `npm run build`.
- `DATABASE_URL` points at a shared Neon database — avoid writes when testing.

## Authentication & Roles

- Role hierarchy: `PROGRAM_OWNER` → `MASTER_ADMIN` → `ADMIN` → `STAFF` (enum `user_role`, table `users`).
- **Creating a PROGRAM_OWNER**: the first one is created only by `npm run bootstrap:program-admin` (env `BOOTSTRAP_EMAIL/PASSWORD/NAME/EMPLOYEE_ID`; aborts if any privileged account exists). `POST /api/auth/program-owner/register` requires an authenticated `PROGRAM_OWNER`.
- **Login** (`backend/src/modules/auth/auth.service.ts`): emails are normalized with `normalizeEmail()` before the lookup (all stored emails are lowercase), soft-deleted (`is_deleted`) users are rejected before token generation, and failed attempts are tracked in `failed_login_attempts` / `locked_until` (5 failures → 15-minute lock, error code `ACCOUNT_LOCKED`). Failed logins never change `status`.
- `POST /api/auth/login` is throttled by `loginRateLimiter` (10 failed attempts / 15 min), keyed by account email with an IP fallback so a shared proxy IP cannot lock out everyone.
- **Password policy** is centralised: `validatePassword()` / `strongPasswordSchema` in `backend/src/utils/password.ts` (min 8 chars, upper + lower + digit + one of `@#$%^&*!`), used by the PROGRAM_OWNER, MASTER_ADMIN and ADMIN creation schemas. Frontend mirror: `frontend/src/utils/validation.ts`.
- New Master Admins are created with `must_change_password = true`. `POST /api/auth/change-password` is available to `STAFF` and `MASTER_ADMIN`; the frontend forces them to `/change-password` until it is cleared.
- Frontend role routing helpers live in `frontend/src/services/auth.service.ts` (`getRoleHomePath`, `canChangeOwnPassword`, `CHANGE_PASSWORD_PATH`); `ProtectedRoute` sends a wrong-role but authenticated user to their own dashboard, not to `/login`.
