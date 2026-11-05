# @mts241alikhlash/portal-api

## Purpose

The generated TypeScript client of portal-service: types from `contracts/portal/openapi.json` and a typed `createApiClient`. Nothing here is written by hand.

## Depends on

- The contract `contracts/portal/openapi.json`, emitted from portal-service.
- `openapi-fetch`.

## Rules specific to this package

- Generated: never edit `src/**`. Change the DTO or decorator in the service, then run `pnpm run openapi:emit` and `pnpm run api:generate` from the root.
- The package version equals the contract's `info.version` and the service version (`pnpm run version:check`).

## Gotchas

- `pnpm run api:check` fails when a generated file is stale.

## Open work

- None recorded.
