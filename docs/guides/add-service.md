# Add a service

A service is a NestJS + Prisma package with its own database. Copy the layout of the smallest current one (`presence-service` or `exam-service`) rather than inventing one.

1. **Package.** Create `services/<name>-service/` with `package.json` (name `<name>-service`, scripts `check`, `lint`, `lint:strict`, `typecheck`, `test`, `build`, `validate`, `prisma:generate`, `prisma:deploy`, `openapi:emit`), `nest-cli.json`, `tsconfig.json` extending `@mts241alikhlash/typescript-config/nest.json`, `eslint.config.mjs` calling the `nest` preset of `@mts241alikhlash/eslint-config`, `vitest.config.ts` using the `nest()` preset of `@mts241alikhlash/vitest-config`, and a `prisma/schema.prisma` declaring only this service's models.
   Result: `pnpm install` links it; `pnpm --filter <name>-service run prisma:generate` succeeds.
2. **Structure and rules.** Follow the [backend standard](../standards/backend.md): `src/<module>/{domain,application,infrastructure,presentation}`, `platform/` for ports to other services, `AppModule` using the `nest-core` modules, and the architecture specs (`app.module.boots.spec.ts`, `api-response-types.spec.ts`, `route-collisions.spec.ts`, `route-conflicts.spec.ts`, `no-ignored-caller.spec.ts`, `single-role-bypass.spec.ts`).
   Result: `pnpm --filter <name>-service run test` passes.
3. **Env.** Add the service's own `.env.example` (names and local-only values; on the server it is copied to `infra/compose/env/<service>-service.env`), and pick the next free port in `dev.mjs` (`SERVICE_PORTS`).
   Result: `node dev.mjs <app>` creates `.env` and the database.
4. **Contract.** Add the service to the contract scripts (`scripts/emit-openapi.mjs`, `scripts/generate-api-clients.mjs`), run `pnpm run openapi:emit` and `pnpm run api:generate`, and add `packages/<name>-api` as the generated client.
   Result: `pnpm run openapi:check && pnpm run api:check && pnpm run version:check` pass.
5. **Gateway and routes.** Register the service in `infra/upstreams/services.json`, add its prefixes to the consuming apps' `api-routes.config.ts` and re-emit their manifests (`routes:emit`), then run `node infra/gateway/generate.mjs`.
   Result: `node infra/gateway/generate.mjs --check` and `node infra/gateway/generate.self-check.mjs` pass.
6. **Image and deploy.** Add a `Dockerfile` modelled on a current service, a service block and a migrate job in `infra/compose/compose.yaml`, the database in `infra/gateway-source/postgres/init-databases.sql`, its pin in `infra/deployment/lock.json`, and its env example in `infra/compose/env/`.
   Result: `pnpm --filter ./infra run check` passes.
7. **Docs.** Write the package `README.md` (five headings) and `AGENTS.md`, and add its terms to [GLOSSARY.md](../../GLOSSARY.md).
   Result: `pnpm run docs:check` passes.
