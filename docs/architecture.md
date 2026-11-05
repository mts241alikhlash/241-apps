# Architecture

241 Apps is ten NestJS services behind one gateway, nine Vue web apps, and shared packages, in one pnpm workspace deployed as one environment.

## Services and the data they own

Each service owns one PostgreSQL database named after its domain, and no service declares a table another one owns ([ADR 0003](adr/0003-database-per-service.md)).

| Service              | Owns                                                                                                                     | Port | Database     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---- | ------------ |
| `identity-service`   | users, roles, permissions, sessions, audit log, school profile, a person's address, administrative areas, single sign-on | 3000 | `identity`   |
| `academic-service`   | academic years, semesters, curriculum, timetable, classrooms, reference lists                                            | 3200 | `academic`   |
| `inventory-service`  | assets, units, circulation, approvals                                                                                    | 3300 | `inventory`  |
| `presence-service`   | gate credentials, devices, scans, daily attendance and leave for staff and students                                      | 3400 | `presence`   |
| `portal-service`     | the public website and the area that manages its content                                                                 | 3600 | `portal`     |
| `admission-service`  | admission waves, applications, documents, payments, enrollment                                                           | 3700 | `admission`  |
| `hr-service`         | employees, positions, employment types, payroll                                                                          | 3800 | `hr`         |
| `student-service`    | students, parents, enrollment, graduation, promotion                                                                     | 3900 | `student`    |
| `assessment-service` | assessment, attendance of lessons, report cards, dashboard                                                               | 4000 | `assessment` |
| `exam-service`       | computer-based exams: question bank, versions, approval, import                                                          | 4100 | `exam`       |

The ports are the local development ports (`dev.mjs`); each service's `README.md` says what it owns in detail and the terms are in the [glossary](../GLOSSARY.md).

## Who calls whom

Services talk to each other only over HTTP ([ADR 0004](adr/0004-services-talk-only-over-http.md)). The caller declares a port naming what it needs and an adapter behind it; the owner exposes endpoints guarded by the provisioning token. Every call batches by id where it can and fails closed with a 503.

- Every service calls identity to introspect tokens; most also call it for profiles, accounts, addresses and the audit log.
- academic, assessment and student call each other for classrooms, semesters, academic years, enrollments and report-card averages.
- hr calls presence for monthly attendance summaries and academic for teaching assignments; academic and assessment call hr for employees.
- admission calls student to enroll an applicant.

The calls that exist are the adapters under each service's `platform/` and `integration/` folders; read those, not a list here.

## Web apps and the gateway

Each app owns a set of API prefixes declared in its `api-routes.config.ts`. `infra/gateway/generate.mjs` renders the nginx configuration of the gateway from those files and the deployment lock, and the apps' dev proxies read the same files, so a prefix is routed the same way in development and production. `nginx*.conf` files are generated, never edited.

Apps share code through packages: `@mts241alikhlash/ui` (components), `web-shared` (API instance, types, composables), `platform` (auth, profile, address, layout and other features used by several apps) and `reference-data` (the reference list view). Services share `nest-core` ([ADR 0006](adr/0006-nest-core-as-a-built-package.md)). Contracts are emitted from the services into `contracts/` and clients are generated into `packages/*-api` ([api standard](standards/api.md)).

## Storage

PostgreSQL holds each service's data; files (uploads, photos) go to one S3 bucket (`241-apps`; SeaweedFS locally, MinIO on the server). The local stack (`infra/compose/compose.yaml`, profile `storage`) runs both; the server uses native installs.

## Authentication and sign-on

Staff sign in once at account-web and reach every app they may open without another password: an app with no session starts a PKCE flow through identity to the accounts host, receives a single-use code on its `/oauth/callback`, and exchanges it for its own app session ([ADR 0007](adr/0007-single-sign-on-through-account-web.md)). Applicants sign in inside admission-web. Authorization is permission-based, with one bypass role ([security standard](standards/security.md), [ADR 0008](adr/0008-a-single-role-bypass.md)).

## Environment and deployment

There is one environment ([ADR 0002](adr/0002-one-environment.md)): the deploy workflow applies one lock file (`infra/deployment/lock.json`) of pinned image digests to one Compose project (`241-apps`). How to deploy and roll back: [deploy](guides/deploy.md), [rollback](guides/rollback.md).

The repository is one pnpm workspace ([ADR 0001](adr/0001-monorepo-with-a-pnpm-workspace.md)); `apps/*`, `services/*`, `packages/*` and `infra` are its members.
