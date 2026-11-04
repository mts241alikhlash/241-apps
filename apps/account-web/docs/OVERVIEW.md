# account-web

The one place staff sign in. Vue 3 + Vite, same stack as the other apps, served at `accounts.mts241alikhlash.sch.id` (dev port 5180).

## What it owns

| Route | What it does |
|---|---|
| `/login` | Staff password sign-in and "Masuk dengan Google". Opens the central session through `POST /sso/login`, then resumes the `/sso/authorize` request in `?continue=`, or lands on the launcher. |
| `/` | The launcher: the apps the person may open, from `GET /sso/apps`. `?denied=<app>` shows that access was refused. |
| `/profile` | The person's own profile, from the shared `profile` feature. `?from=<app>` adds a link back to that app. |
| `/forgot-password`, `/reset-password` | Password reset, from the shared auth feature. Reset links in staff e-mails point here. |
| `/masuk`, `/oauth/callback` | The SSO trigger and PKCE callback every app has, so accounts signs in to itself the same way (`ssoApp: 'account'`). |

## Which service answers it

identity only (`/auth`, `/sso`, `/profiles`, `/religions`, `/blood-types`). It has no backend of its own.

## One rule

`packages/platform/src/features/auth` must stay byte-identical to the six staff apps (academic, admin, assessment, hr, inventory, portal). Change it in all seven copies in the same session. admission-web keeps its own variant.

## Commands

```bash
pnpm install
pnpm run dev        # http://localhost:5180
pnpm run validate   # format:check + lint + typecheck + lint:strict + test + build
```
