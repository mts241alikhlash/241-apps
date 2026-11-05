# AGENTS.md: academic-service

Read [README.md](README.md) first, then the root [AGENTS.md](../../AGENTS.md).

## Standards that apply

- [backend](../../docs/standards/backend.md): layering, ports, transactions, nest-core boundary
- [api](../../docs/standards/api.md): response DTOs, envelope, contract and client regeneration
- [security](../../docs/standards/security.md): permissions, the single bypass, secrets
- [testing](../../docs/standards/testing.md): which test for which change

## Working here

- After `pnpm install` run `pnpm --filter academic-service run prisma:generate`; after editing `nest-core` build it first.
- Changing a controller or DTO: run `openapi:emit` and `api:generate` from the root and commit `contracts/academic/` and `packages/academic-api/` together with the change.
- Migrations are forward-only SQL in `prisma/migrations`; this service is the only process that migrates `academic`.
- Gate: `pnpm --filter academic-service run validate`.
