# API contract standard

Applies to every HTTP handler in `services/`, the contracts in `contracts/`, and the generated clients in `packages/*-api`. Each rule is **Rule**, **Why**, **Check**.

## Responses

**Rule.** Every handler returns a response DTO: `Promise<XDto | XDto[] | void | StreamableFile | HealthCheckResult>`.
**Why.** The contract is generated from the handler's real return type.
**Check.** `src/api-response-types.spec.ts` in each service.

**Rule.** A DTO is built with `static fromDomain()` from the use case's real return type, never from a narrower controller annotation. `Date` becomes an ISO string, decimals become `Number`, `null` stays `null`, an optional field stays optional; only `deletedAt` is dropped, `_count` is kept. Domain entity interfaces declare every Prisma column the repository returns.
**Why.** A narrowed annotation hides fields from the contract and from the client.
**Check.** `api-response-types.spec.ts`; `openapi:check`.

**Rule.** Every 2xx `@ApiResponse` names the same DTO the handler returns.
**Why.** An explicit mismatching type overrides the inferred one in the contract.
**Check.** `openapi:check` (the emitted contract must equal the committed one).

**Rule.** Responses use the global envelope `{ statusCode, message, data, meta? }` and no `success` field. Lists are `{ data, meta }`; the interceptor drops any other top-level key beside `data`, so counts and summaries belong in `meta`.
**Why.** One shape for every client.
**Check.** the `ResponseInterceptor` in `nest-core`; `api-response-types.spec.ts`.

**Rule.** Paginated endpoints take `page` and `limit` and return `meta.total`; the web side pages through them (see [frontend](frontend.md)).
**Why.** Clients page the same way everywhere.
**Check.** review.

**Rule.** Never add secret columns (`passwordHash`, `tokenHash`, reset tokens, credential `code`) to entities, DTOs or responses.
**Why.** A response is a public surface.
**Check.** `no-user-scalar-overfetch.spec.ts` for user rows; review. More in [security](security.md).

## Contracts and clients

**Rule.** `contracts/<service>/openapi.json` is emitted from the service (`pnpm run openapi:emit`) and clients in `packages/<service>-api` are generated from it (`pnpm run api:generate`). Neither is edited by hand; a contract change comes from fixing the DTO or decorator.
**Why.** The contract must describe the actual handler.
**Check.** `pnpm run openapi:check` and `pnpm run api:check`.

**Rule.** A contract's `info.version` equals its service and client package version. While versions are below 1.0.0 a breaking contract change bumps the minor.
**Why.** Consumers pin on the version.
**Check.** `pnpm run version:check`; `scripts/check-contract-compatibility.mjs` for breaking diffs.

**Rule.** Web apps type responses from the generated client of the service that owns the endpoint (hr-web already uses `@mts241alikhlash/hr-api`); apps still using hand-written response types move over as they are touched.
**Why.** One source of truth for response shapes.
**Check.** review.
