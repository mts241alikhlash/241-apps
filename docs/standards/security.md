# Security standard

Applies to every service, every web app and the deployment. Each rule is **Rule**, **Why**, **Check**.

## Authentication and sessions

**Rule.** identity-service owns login, refresh, logout, forgot, reset and change password, and role and permission CRUD. A consuming service only verifies: `JwtStrategy` then `ValidateTokenUseCase`, which reads the session and the user on every authenticated request.
**Why.** A revoked session must stop working on the next request; a token claim cannot be revoked before it expires.
**Check.** the `nest-core` auth specs; review for consuming services.

**Rule.** A revoked permission takes effect within the access-token lifetime (15 minutes); that gap is deliberate. A user, an account, is not a person: a student, teacher or parent references one by id. The deployment is single-school: no `organizationId` anywhere.
**Why.** Tokens carry roles and, when small enough, permissions to avoid database reads; the database fallback covers large grants.
**Check.** review.

## Authorization

**Rule.** Authorization uses permissions only (`@RequirePermissions('students.create')`, format `<module>.<action>`, module segment plural). Role names and role codes are never compared in controllers, use cases or repositories.
**Why.** Roles are job functions; permissions are the actions the code protects.
**Check.** `single-role-bypass.spec.ts` in each service (sweeps source for role-name checks); review.

**Rule.** Exactly one role bypasses the check: `SUPER_ADMIN`, as break-glass so the school can recover when a grant configuration locks everybody out. It is checked in exactly one place, `PermissionGuard` in `packages/nest-core`, and nowhere else. Every other role, `ADMIN` included, is authorized by the permissions it holds and nothing more. Adding a second bypassing role or an exemption mechanism is an amendment to this standard and needs an ADR.
**Why.** A copy of a rule does not move when the original does, and the disagreement is invisible ([ADR 0008](../adr/0008-a-single-role-bypass.md)).
**Check.** `single-role-bypass.spec.ts`.

**Rule.** Reading your own record is a separate permission and a separate route, not an `if` on `request.user` inside a general route.
**Why.** Visible in the permission list and in the contract.
**Check.** review.

**Rule.** Some codes are explicit-only: they are granted to named roles and never by a wildcard or default (for example approving, deciding or processing steps). A seed that creates a new permission code grants it once to existing default roles whose definition includes it; roles edited by hand get new codes through the admin app.
**Why.** An edited role must never gain a power silently.
**Check.** review.

**Rule.** The web menu and route guards follow the same rule as the server: an item shows exactly when the user holds its `requiredPermission`; `SUPER_ADMIN` has no menu bypass because it holds every code.
**Why.** UI and server agree.
**Check.** `menuConfig.spec.ts` in the apps; the shared menu visibility composable.

## Data exposure

**Rule.** Entities, DTOs and responses never carry secret columns (`passwordHash`, `tokenHash`, reset tokens, credential `code`). User rows are read with explicit selects, never the whole scalar set.
**Why.** An over-fetched row leaks through any DTO that maps it.
**Check.** `no-user-scalar-overfetch.spec.ts`; `api-response-types.spec.ts`; review.

**Rule.** HTML from users is sanitized on the way in and out with the `nest-core` sanitizer (and `dompurify` in the web where needed). `v-html` is allowed only for trusted or sanitized content and carries `-- <reason>` in its disable directive.
**Why.** Stored XSS reaches other users' sessions.
**Check.** ESLint `vue/no-v-html` (error); the directive-description rule.

## Secrets and configuration

**Rule.** Secrets live only in gitignored env files and in the server; `.env.example` holds names and local-only values. Nothing secret, no server address and no personal data in a committed file.
**Why.** The repository is public.
**Check.** `pnpm run lint` (the doc checker refuses IPv4 literals in Markdown); `.gitignore`; review.

**Rule.** Uploads are limited and validated (`UPLOAD_LIMITS`, file header checks) and stored under their domain key in S3; objects are served through the service or signed URLs.
**Why.** A file upload is untrusted input.
**Check.** `upload-limits-applied.spec.ts`.

## Network

**Rule.** Authorization fails closed: when identity is unreachable the answer is 503. Services are reachable only through the gateway; Postgres and S3 are not exposed to the internet.
**Why.** A degraded platform must not grant access.
**Check.** the identity adapter specs; deploy review ([deploy](../guides/deploy.md)).
