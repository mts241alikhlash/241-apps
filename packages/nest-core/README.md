# @mts241alikhlash/nest-core

Infrastructure and cross-cutting code shared by the ten NestJS services. Domain models, lookup ports and
anything tied to one service's Prisma client stay in that service.

## Subpaths

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

## Build

The package is compiled with `nest build` (TypeScript plus the `@nestjs/swagger` plugin, as the services) to
`dist`, which the exports point at. Build it before a service needs it:

- `pnpm --filter <service>... run build` builds it first (the Dockerfiles do this);
- `node dev.mjs` builds it once and keeps `pnpm --filter @mts241alikhlash/nest-core run dev` watching;
- `pnpm --filter @mts241alikhlash/nest-core run build` before a service `typecheck` or `test` after editing it.

Nest, Prisma and the other libraries are `peerDependencies`, so every service shares one instance of each.

## Rules

- Only code that is the same in every service that uses it lives here. A difference a service needs becomes a
  module option or an argument; when it cannot, the file stays in the service.
- Never import a service from here, and never import a service's generated Prisma client.
- Changing a file here changes every service: run the verification suite for all services.

## Tests

`pnpm --filter @mts241alikhlash/nest-core run test` (Vitest with `unplugin-swc` for decorator metadata).
