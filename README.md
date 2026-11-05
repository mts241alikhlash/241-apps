# 241 Apps

The school information platform of MTs Persis 241 Al-Ikhlash: admissions (PPDB), academics, students, staff, inventory, attendance, the school website, assessment and exams.

## Layout

| Folder       | Holds                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `apps/`      | Vue 3 web apps, one per area (`academic-web`, `admission-web`, `hr-web`, and so on)                                  |
| `services/`  | NestJS + Prisma services, one database each (`identity-service`, `academic-service`, and so on)                      |
| `packages/`  | shared UI (`ui`, `web-shared`, `platform`, `reference-data`), `nest-core`, generated `*-api` clients, config presets |
| `contracts/` | OpenAPI contracts emitted from the services                                                                          |
| `infra/`     | Compose, the gateway generator, deploy scripts                                                                       |
| `docs/`      | standards, guides, architecture and decision records                                                                 |

## Quickstart

```
export PATH=$HOME/.local/share/pnpm/bin:$PATH
pnpm install
node dev.mjs academic
```

`dev.mjs` starts Postgres and S3 (Compose profile `storage`), the named web app, account-web, identity and every service the app routes to. Sign in at `http://localhost:5180`. Details: [local development](docs/guides/local-development.md).

## Documentation

- [Standards](docs/standards/backend.md): [backend](docs/standards/backend.md), [frontend](docs/standards/frontend.md), [ui](docs/standards/ui.md), [api](docs/standards/api.md), [security](docs/standards/security.md), [testing](docs/standards/testing.md)
- [Guides](docs/guides/local-development.md): local development, add a service, add an app, deploy, roll back, back up
- [Architecture](docs/architecture.md) and [decision records](docs/adr/0001-monorepo-with-a-pnpm-workspace.md)
- [Glossary](GLOSSARY.md) of the Indonesian domain terms
- [Contributing](CONTRIBUTING.md) and [security policy](SECURITY.md)
