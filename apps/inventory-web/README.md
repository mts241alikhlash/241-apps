# inventory-web

## Purpose

Inventory: assets, label printing, loans, circulation and approvals.

Dev port 5174.

## Depends on

- Packages: `@mts241alikhlash/platform`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`, `inventory-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- Label sheet geometry lives in `src/features/inventory/logic/labelSheetLayout.ts`.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.

## Open work

- None recorded.
