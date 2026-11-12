# Backend standard

Applies to every NestJS service in `services/` and to `packages/nest-core`. Each rule is stated as **Rule**, **Why**, **Check**. "review" means no tool enforces it yet.

## Layering

**Rule.** Dependencies point one way: `presentation -> application -> domain`, and `infrastructure -> domain`. A controller parses, delegates and returns; a use case holds one business operation; only `infrastructure/persistence/` imports Prisma.
**Why.** A use case holding `PrismaService` cannot be tested without a database and hides the query from everyone reading the port.
**Check.** The nest ESLint preset (`no-restricted-imports` boundaries, and no Prisma client under `domain/`); `app.module.boots.spec.ts`.

**Rule.** One use case is one class in one file (`CreateAgendaUseCase`, not `manage-agenda.use-cases.ts`). `application/services/` is only for stateless helpers shared by two or more use cases.
**Why.** Small units stay removable and testable.
**Check.** review.

**Rule.** Use cases receive the abstract `IXxxRepository` token; the module wires `{ provide: IXxxRepository, useClass: PrismaXxxRepository }`. A port is declared in `domain/repositories/` next to its input and output types, and is owned by the code that consumes it.
**Why.** The consumer decides what it needs; an implementation can change without touching callers.
**Check.** Nest ESLint preset (domain has no Prisma import); review for port ownership.

**Rule.** `domain/` declares its own enums and maps them to the ORM enum in the repository. A domain file may throw an `HttpException` subclass but never imports `@Injectable()`, a repository, Prisma or a DTO.
**Why.** The domain must compile and test without the ORM.
**Check.** Nest ESLint preset.

## Boundaries between modules and services

**Rule.** A service never imports another service's source, Prisma client or types, by path, package or copy. Data owned elsewhere is reached over HTTP through a port in `platform/` or `integration/` with an adapter behind it, and a narrow read model naming only the fields used.
**Why.** Services evolve and deploy independently; a copied type drifts silently.
**Check.** Nest ESLint preset (`no-restricted-imports` on `services/*/src`); review for read models.

**Rule.** Inside a service, a module is reached through its public API; business modules do not reach into each other's internals. Shared infrastructure comes from `@mts241alikhlash/nest-core`, imported only through its subpath exports (the ESLint boundary rule forbids `src` and `dist` paths); `src/platform/` holds only the service's own lookup ports and adapters. A Nest `Module` class or a cross-module DTO is imported from its own file, never through a barrel.
**Why.** A DTO importing a barrel closes an ESM cycle and crashes boot.
**Check.** `app.module.boots.spec.ts`; review.

**Rule.** A repository queries only models its own module owns; another module's data comes through that module's port.
**Why.** Prisma joins anything, so the boundary exists only if written down.
**Check.** review.

## Contracts at each boundary

**Rule.** `XxxDto` (presentation, `class-validator` + `@ApiProperty`), `XxxInput` (use case, plain interface) and `XxxRepositoryInput` (port, plain interface) are different types. A use case never imports a `*Dto`; it maps `Input` to `RepositoryInput` field by field. `Partial<Pick<Entity, ...>>` is not a port parameter.
**Why.** Structural typing lets a whole object pass through and an unwanted field reach persistence.
**Check.** review; the Nest ESLint preset forbids DTO imports in `domain/`.

**Rule.** No `any`, no `unknown` in a declared return type, no magic strings or numbers, no inline types inside use cases (types next to their port or in `types/`, constants in `constants/`).
**Why.** Every untyped edge is a silent runtime failure.
**Check.** ESLint `no-explicit-any` and the type-aware `no-unsafe-*` rules (`lint`).

**Rule.** Request-path failures throw NestJS HTTP exceptions (or a subclass of one). A plain `Error` is only for startup and configuration invariants (`AppConfigModule` validation, `SSO_APPS`, default roles), impossible states in mappers, and test fakes.
**Why.** The shared filter maps HTTP exceptions to the response envelope; startup failures should stop the process.
**Check.** review.

**Rule.** Domain events are not used: `@nestjs/event-emitter` is not a dependency. A must-succeed consequence is a direct awaited call.
**Why.** An in-process emitter is fire-and-forget, so a failed consequence is logged instead of reaching the caller.
**Check.** review. Introducing a broker needs an ADR.

**Rule.** A cross-service response is append-only: removing or renaming a field another service reads is a coordinated release with the consumer's read model changing in the same change.
**Why.** The consumer fails at runtime, on a record someone depends on.
**Check.** `check-contract-compatibility.mjs` for published contracts; review for read models.

The response envelope and DTO building rules are in [api](api.md).

## Data access

**Rule.** Queries over a soft-deletable model filter `deletedAt: null`; `includeDeleted` is an explicit input, never a default.
**Why.** A bare `findMany()` silently returns deleted records.
**Check.** review.

**Rule.** Rows that belong to a period are scoped by the period key in the repository's `where` clause, resolving the active period when the caller gives none. Month bounds are `gte` / `lt`, never `lte`.
**Why.** A `lte` on the last day includes midnight of the next month; wide reads filtered in JavaScript return wrong data that looks right.
**Check.** review.

**Rule.** Use a Prisma transaction when several writes inside one module must land together; prefer `prisma.$transaction([...])` when the writes are independent. Interactive transactions stay short with no network, storage or slow queries inside. A write sequence across services is never one transaction.
**Why.** Immediate consistency belongs inside an aggregate; across services it is eventual.
**Check.** review.

## Schema and migrations

**Rule.** Each service owns one database named after its domain and is the only process that migrates it. Migrations are forward-only SQL in `prisma/migrations`.
**Why.** Two deployers racing on one schema drop each other's tables.
**Check.** `migrations.spec.ts` where present; review.

## Cross-service failure

**Rule.** When identity is unreachable, authorization fails closed with 503, not 401. A cached identity lookup states its staleness window at the adapter.
**Why.** A 401 sends an operator to check a password; a 503 says the platform is degraded.
**Check.** the `nest-core` identity adapter specs.

**Rule.** A multi-service write is a saga: each local transaction has its compensating step written with the forward step, every cross-service write is idempotent on a natural key with the idempotency check before the uniqueness check, and a half-finished state is visible and repairable by repeating the action.
**Why.** A distributed system fails quietly; these make the failure loud.
**Check.** review.

**Rule.** Business arithmetic has one implementation, behind a contract both sides test.
**Why.** A copied rule does not move when the original does (a copied month summary once shipped four defects that no build caught).
**Check.** review.

## Time

**Rule.** Instants are UTC everywhere. A calendar day, a month default, the time of day against a work pattern and a due date are derived from an instant with `@mts241alikhlash/nest-core/time` and the required `SCHOOL_TIME_ZONE` (an IANA zone such as `Asia/Jakarta`); `@db.Date` columns hold the local calendar date as a UTC-midnight `Date`.
**Why.** A scan at 06:45 WIB is 23:45 UTC of the day before: reading the UTC day filed it under the wrong date and judged it late.
**Check.** the `nest` ESLint preset forbids `getUTC*` on `new Date()`, `now`, `today` and `current`, and `new Date().toISOString().slice(…)`, in `src`.

## Size and style

**Rule.** Budgets, counting code only (imports, `@Api*` decorators and pure data files excluded): use case or service 300 lines, repository class 200, controller 150, any other file 300. An over-budget repository splits into sibling `*.includes.ts`, `*.where.ts`, `*.reader.ts`, `*.writer.ts`; the interface is not split.
**Why.** An over-budget file has usually absorbed a second responsibility.
**Check.** review.

**Rule.** A disabled lint rule carries `-- <reason>` in the directive; unused directives are errors. The no-comments rule is in the root [AGENTS.md](../../AGENTS.md).
**Why.** An unexplained suppression hides a defect.
**Check.** ESLint `eslint-comments/require-description` and `reportUnusedDisableDirectives`.

**Rule.** New use cases ship with a `*.spec.ts`; a refactor neither adds specs to untested use cases nor deletes existing ones.
**Why.** A refactor commit that changes coverage is two changes in one diff.
**Check.** review. See [testing](testing.md).

## What lives in `nest-core`

**Rule.** Only code identical in every service that uses it lives in `packages/nest-core` (config, health, filters, interceptors, logger, auth, identity port, permissions, audit log, service client, domain base types, pagination DTOs, helpers, the response envelope, architecture-test helpers). A difference a service needs becomes a module option or an argument; when it cannot, the file stays in the service. `nest-core` never imports a service or a service's Prisma client.
**Why.** A change there changes every service.
**Check.** Nest ESLint preset; `pnpm --filter @mts241alikhlash/nest-core run build` before a service typecheck or test. The subpath list is in the package [README](../../packages/nest-core/README.md).

## Gates

A service is finished when `pnpm --filter <service> run validate` (format, type-aware lint, typecheck, tests, build) passes. After `pnpm install` in a fresh checkout, run `pnpm --filter <service> run prisma:generate` first.
