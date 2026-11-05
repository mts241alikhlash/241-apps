# @mts241alikhlash/nest-core

## Purpose

Infrastructure and cross-cutting code shared by the ten NestJS services: configuration, health, filters, the response interceptor, logging, authentication and the identity port, permissions, audit log, the service client, domain base types, pagination DTOs, helpers and the architecture-test helpers. Domain models, lookup ports and anything tied to one service's Prisma client stay in the service.

### Subpaths

| Subpath                       | Contents                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `config`                      | `AppConfigModule.forRoot(envSchema)`, `ROUTE_OPTIONS`                                                         |
| `database`                    | `pgSslOptions`                                                                                                |
| `health`                      | `HealthModule.forRoot(PrismaService)`                                                                         |
| `filters`                     | `HttpExceptionFilter`                                                                                         |
| `interceptors`                | `ResponseInterceptor`                                                                                         |
| `logger`                      | `pinoLoggerConfig`                                                                                            |
| `decorators`                  | `CurrentUser`, `Public`                                                                                       |
| `guards`                      | `ProvisioningTokenGuard`                                                                                      |
| `types`                       | `AuthenticatedUser`, `RequestUser`, the Express `Request.user` augmentation                                   |
| `auth`                        | `AuthModule`, `JwtAuthGuard`, `JwtStrategy`                                                                   |
| `identity`                    | `IdentityModule`, the identity port and HTTP adapter                                                          |
| `access-control`              | `PermissionModule`, `PermissionGuard`, `RequirePermissions`, `RequireAnyPermission`                           |
| `audit-log`                   | `AuditLogModule`, `CreateAuditLogUseCase`                                                                     |
| `service-client`              | `ServiceClientModule`, `ServiceClient`                                                                        |
| `cache`, `throttle`, `upload` | cache module, throttling helper, upload limits                                                                |
| `domain`                      | base entity and value object, repository interface, shared types, enums that are the same in every service    |
| `dto`                         | pagination and address DTOs                                                                                   |
| `helpers`, `validators`       | HTML sanitizer, slug, plain summary, hash, resolve-once-by-key, boolean transformer                           |
| `openapi`                     | the response envelope used by the contract emitter                                                            |
| `testing`                     | architecture test helpers (`describeRouteCollisions`, `describeRouteRegistration`, `describeNoIgnoredCaller`) |

## Depends on

- Nest, Prisma and the other libraries as `peerDependencies`, so every service shares one instance of each.
- No service and no service's Prisma client, ever.

## Rules specific to this package

- Only code identical in every service that uses it lives here. A difference a service needs becomes a module option or an argument; when it cannot, the file stays in the service.
- The package is compiled with `nest build` to `dist`, which the exports point at ([ADR 0006](../../docs/adr/0006-nest-core-as-a-built-package.md)): `pnpm --filter <service>... run build` builds it first, `node dev.mjs` builds it once and keeps `pnpm --filter @mts241alikhlash/nest-core run dev` watching.
- A change here changes every service: run the verification suite for all services.

## Gotchas

- Build it before a service `typecheck` or `test` after editing it.
- Under Vitest, `nestjs-pino` and `@prisma/client/runtime/client` resolve to one CommonJS instance shared with the service under test (see `@mts241alikhlash/vitest-config`).

## Open work

- None recorded.
