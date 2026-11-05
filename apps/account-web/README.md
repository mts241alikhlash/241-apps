# account-web

## Purpose

Accounts: the sign-on host. Staff sign in here once; it also holds the profile and password pages.

Dev port 5180.

## Depends on

- Packages: `@mts241alikhlash/platform`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- It is the required entry in identity's `SSO_APPS`.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.

## Open work

- None recorded.
