# Testing standard

Applies to all packages. Each rule is **Rule**, **Why**, **Check**.

## Which test for which change

| Change                           | Test                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| a domain policy or pure function | unit spec, no mocks                                                                                                |
| a use case                       | spec with fakes of its ports                                                                                       |
| a controller or DTO              | spec of the handler plus `api-response-types.spec.ts`                                                              |
| a repository query               | spec against a real Postgres (the local `storage` profile, port 5433)                                              |
| module wiring                    | `app.module.boots.spec.ts`                                                                                         |
| structural rules                 | the `nest-core/testing` helpers: `describeRouteCollisions`, `describeRouteRegistration`, `describeNoIgnoredCaller` |
| a Vue component or composable    | Vitest with `@vue/test-utils` (happy-dom where the file says `// @vitest-environment happy-dom`)                   |
| a shared package export          | the package's own `*.spec.ts`                                                                                      |

**Rule.** A bug fix starts with a test that fails on the old code.
**Why.** It proves the bug existed and stays fixed.
**Check.** review.

**Rule.** A refactor keeps the test count: no spec is deleted to make it pass. New behavior and bug fixes add tests.
**Why.** A refactor that changes coverage is two changes in one diff.
**Check.** compare the per-package counts of `test` before and after; review.

**Rule.** Tests use real code; mocks only where a port or the network is crossed. A test asserts behavior, not that a mock was called.
**Why.** Mock-only tests pass while the code is wrong.
**Check.** review.

## Tooling

**Rule.** End-to-end suites (`test/*.e2e-spec.ts`, run with `pnpm run test:e2e`) boot `AppModule`, override the outbound HTTP ports and `IIdentityPort` (a real signed token carries the request), and use `overrideProvider(PrismaService)` with a mock. A suite that needs a database uses its own `<service>_e2e` database on the local Postgres (the `storage` profile, port 5433), created by the suite's setup with `prisma migrate deploy` and checked by name before any write; it never touches the development database.
**Why.** A hand-picked module list misses globally provided lookups and tests a shape the service never runs; a shared database is data loss waiting.
**Check.** `pnpm run test:e2e`.

**Rule.** Services and `nest-core` run Vitest through the `nest()` preset of `@mts241alikhlash/vitest-config` (`unplugin-swc` with legacy decorators and metadata); apps and Vue packages use the `vue()` preset. Packages do not hand-roll their own Vitest config beyond `mergeConfig` additions.
**Why.** One configuration for decorators, globals and environments.
**Check.** `packages/vitest-config`; each package's `vitest.config.ts`.

**Rule.** Run the narrowest check that would fail if the change were wrong (the touched spec, or `vue-tsc` / `tsc` for type-only edits), then the package gate once before pushing: `pnpm --filter <app> run validate`, or `pnpm --filter <service> run check` and `run test`. Run `pnpm --filter <service> run prisma:generate` after a fresh install, and build `nest-core` after editing it.
**Why.** Fast feedback first, full proof once.
**Check.** the gates themselves; [CONTRIBUTING](../../CONTRIBUTING.md).

**Rule.** Load-sensitive specs (large component trees, `sharp`) pass when rerun alone; a failure under a parallel full run is rerun in isolation before it is investigated, and the concurrency is lowered rather than the timeout raised blindly.
**Why.** The machine runs out of memory before it runs out of correctness.
**Check.** review.

## Contracts

**Rule.** A change to a DTO or controller is proven by `pnpm run openapi:check && pnpm run api:check && pnpm run version:check` as well as the service tests.
**Why.** The contract is part of the behavior ([api](api.md)).
**Check.** those scripts.
