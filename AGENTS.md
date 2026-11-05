# AGENTS.md

241 Apps is the school platform of MTs Persis 241 Al-Ikhlash: nine Vue 3 web apps (`apps/`), ten NestJS + Prisma services, one database each (`services/`), shared packages and generated API clients (`packages/`), and deployment (`infra/`). One pnpm workspace, one environment.

```
apps/       Vue 3 + Vite web apps (academic, account, admin, admission, assessment, exam, hr, inventory, portal)
services/   NestJS + Prisma services (identity, academic, inventory, presence, portal, admission, hr, student, assessment, exam)
packages/   ui, web-shared, platform, reference-data, nest-core, *-api clients, config presets
contracts/  OpenAPI contracts emitted from the services (generated)
infra/      compose, gateway generator, deploy scripts
docs/       standards, guides, architecture, ADRs
```

Every package has a `README.md` (purpose, dependencies, rules, gotchas, open work) and a short `AGENTS.md`. Read the package README before editing it.

## Commands

- pnpm is not on every shell PATH: `export PATH=$HOME/.local/share/pnpm/bin:$PATH`.
- Scripts live in each `package.json` and the root one. Validate an app with `pnpm --filter <app> run validate`; a service with `pnpm --filter <service> run check` and `run test`; the contracts with the root `openapi:check`, `api:check`, `version:check`, `runtime:check`.
- Which check to run, and when: [testing](docs/standards/testing.md). Services need `pnpm --filter @mts241alikhlash/nest-core run build` first after `nest-core` changes.
- Local stack: `node dev.mjs <app>` (see [local development](docs/guides/local-development.md)).

## Which standard to read

| Changing                 | Read                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| a service                | [backend](docs/standards/backend.md), [api](docs/standards/api.md), [security](docs/standards/security.md) |
| a web app or Vue package | [frontend](docs/standards/frontend.md), [ui](docs/standards/ui.md)                                         |
| anything with tests      | [testing](docs/standards/testing.md)                                                                       |
| names of domain things   | [GLOSSARY.md](GLOSSARY.md)                                                                                 |
| how the system fits      | [architecture](docs/architecture.md), [ADRs](docs/adr/)                                                    |

## Working rules

- Stage by path, never `git add -A` or `git add .`; check `git diff --cached --stat` before committing.
- Commit with Conventional Commits and no AI attribution or Co-Authored-By lines. Branch, changeset and PR flow: [CONTRIBUTING.md](CONTRIBUTING.md).
- No code comments; explanations go in the commit message or a document.
- Never edit generated files: `src/generated/**`, `contracts/**`, `packages/*-api/src/**`. Change the source and regenerate.
- `infra/gateway/nginx*.conf` only through `infra/gateway/generate.mjs`.
- A service never imports another service's source or Prisma client; calls between services go over HTTP.
- Never print or commit secrets; env files are gitignored, `.env.example` holds names only. See [security](docs/standards/security.md).
- Another session may be editing the same tree: check `git status` before staging.

Server and personal facts: `AGENTS.local.md` (gitignored, may be absent), read before any deploy or VPS work.
