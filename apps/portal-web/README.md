# portal-web

## Purpose

Portal: management of the public school website content.

Dev port 5176.

## Depends on

- Packages: `@mts241alikhlash/platform`, `@mts241alikhlash/reference-data`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`, `portal-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- The public site itself is served by portal-service; this app only manages content.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.

## Open work

- None recorded.
