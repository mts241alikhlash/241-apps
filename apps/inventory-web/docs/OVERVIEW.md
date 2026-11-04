# inventory-web

SIMAS, as a browser sees it: assets and their units, circulation, approvals,
and the reference lists behind them. Vue 3 + Vite, same stack as
`academic-web`.

## Inventory only, as of 2026-09-10

The eleven platform administration screens it used to route: users, roles,
permissions, audit log, school unit, the reference lists, files. Moved to
`admin-web`. What is left is assets, units, circulation, approvals, the
inventory reference lists, plus auth, the profile and a dashboard.

`packages/platform` went with them: `audit-log`, `permission`, `role`,
`user-role`, `school-unit` and `file` are gone, and `blood-type`, `religion`
and `school-unit-type` keep only their `api/`, `services/` and `types/`. The
profile form reads those lists, it does not administer them.

`packages/reference-data` went too: it was the CRUD toolkit those admin screens
were built from, and nothing here uses it.

## What was removed earlier the same day

`organization`, `tenant` and `achievement-type`, along with `organizationId` /
`schoolUnitId` on the session. Not a narrowing decision: a check. **No backend
service declares `Organization`, `Tenant` or `AchievementType`.** The
multi-tenant layer did not survive the split, and this platform serves one
school.

## Which services answer it

| Service | Port | Answers |
|---|---|---|
| identity | 3000 | `/auth`, `/profiles`, `/school-unit-types`, `/religions`, `/blood-types` |
| inventory | 3300 | `/inventory` |

identity is still here for sign-in and the profile form's dropdowns. The same
shape as every other app.

## One gap, 404 by design

`/dashboard` is called by this app and served by nothing. It is the near
miss: assessment-service serves `/dashboards`, plural, and a different shape.
It sits in `UNROUTED_PREFIXES`, which makes the dev server refuse it with a
404 exactly as the gateway does, instead of Vite's SPA fallback answering
`index.html` at HTTP 200 and leaving `res.data.data` undefined with nothing
thrown.

`settings` was deleted on 2026-09-23: no service serves `/settings`, so it only
ever fetched a 404 and fell back to the static branding in `configureAuth()`.
`/settings` stays in `UNROUTED_PREFIXES` until the next routing-manifest change.

## When a service is not running

Every read that used to end `catch { return [] }` calls `notifyIfOutage` first
(`@mts241alikhlash/web-shared/utils/notify-outage`). An empty list and an
unreachable service look identical on screen, and only one of them is a fact
about the school.

`ServiceUnavailable` (`@mts241alikhlash/ui`) is the in-page version for a
primary read.

## Google sign-in on /login

The login form carries a "Masuk dengan Google" button. It sends the browser to
identity-service's `/auth/google?redirect=<origin>`, so no token passes through
a URL: identity-service sets the same refresh cookie a password login does, and
this app's `/oauth/callback` route calls `POST /auth/refresh` to mint the first
access token, then routes by role.

The return origin must be listed in `GOOGLE_OAUTH_REDIRECT_ALLOWLIST` on
identity-service. An origin that is not listed falls back to
`GOOGLE_OAUTH_SUCCESS_REDIRECT_URL`, which points at one app, so a dev port
missing from that list silently lands the user on the wrong app.

## Commands

```bash
pnpm install
pnpm run dev        # http://localhost:5174
pnpm run validate   # format:check + lint + typecheck + lint:strict + test + build
```
