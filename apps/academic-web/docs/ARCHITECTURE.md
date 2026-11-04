# academic-web: ARCHITECTURE.md

**2026-09-17 update:** `packages/ui` and `packages/shared`, described below as
copied-not-repackaged, have since been replaced by real dependencies on
`@mts241alikhlash/ui`/`@mts241alikhlash/web-shared` (published from the
`web-packages` repo). The history below still explains why `packages/platform`
and `packages/reference-data` remain copied, and why the original extraction
didn't reach for a registry package — that reasoning just no longer covers
`ui`/`shared`, which moved once the registry publish pipeline actually worked.

The first frontend split in this workspace. Every other split here
(`academic-service`, `identity-service`, and the seven other backends) split a
NestJS service; this one splits a Vue app together with the workspace packages
it depends on (`packages/platform`, `packages/shared`, `packages/ui`,
`packages/reference-data`). No precedent existed for a frontend split, so this
document **is** the precedent, read it before extracting `inventory-web`,
`admission-web`, `portal-web`, or `hr-web` the same way.

## What changed structurally

`apps/academic` depended on `@241/platform`, `@241/shared`, `@241/ui`, and
`@241/reference-data` as `workspace:*` pnpm packages, real, but only
resolvable inside the monorepo's own `pnpm-workspace.yaml`. Outside it they
are nothing.

The fix was **not** to keep them as separate npm packages (which would mean
recreating a whole nested monorepo, `pnpm-workspace.yaml` and all, inside a
single app). Every actual `@241/x` import in this codebase's source already
went through a path alias: `@/shared/*`, `@/ui/*`, `@/features/platform/*`,
`@/reference-data/*`, resolved in `vite.config.ts`/`tsconfig.json`, never the
bare package name. So the four packages' `src/` folders were copied in
directly under `packages/*/src/` here, and the alias targets were changed
from `../../packages/*/src` (two levels up, to the monorepo root) to
`./packages/*/src` (right here). **Not one import statement in any `.ts` or
`.vue` file needed to change.** This is the same principle the backend
extractions already established: "anything a service needs must live
inside that service's folder", applied to a frontend for the first time.

One consequence: `packages/*` here are not real packages any more. They
have no `package.json` of their own; their dependencies were merged into
this app's single `package.json`, matching how the backend's `platform/`
folder was never a package either, just source living inside the app that
uses it.

## What was narrowed, and why

`apps/academic`'s `features/academic/` held 38 feature folders, not just
academic-service's own domain, but everything `hr-service`,
`student-service`, `assessment-service`, and parts of `identity-service` own
too, because this frontend predates all four backend splits. The
same methodology used all session to narrow each backend's Prisma schema,
delete what the domain doesn't own, let `vue-tsc -b` catch every dangling
reference, restore what turns out to be a genuine narrow read, was applied
here instead of the ORM as the safety net.

**Kept** (18 folders, matching academic-service's own backend modules
exactly: `academic-year`, `semester`, `curriculum`, `subject`, `grade`,
`classroom`, `calendar`, `academic-setting`, `schedule`,
`teaching-assignment`, `enrollment`, plus the three reference-data lookups
academic-service still owns, `academic-calendar-type`, `occupation`,
`semester-type`): `academic-calendar`, `academic-calendar-type`,
`academic-info`, `academic-setting`, `academic-year`, `classroom`,
`curriculum`, `curriculum-subject`, `grade`, `lesson` (a UI alias for
`schedule`), `occupation`, `schedule`, `semester`, `semester-type`,
`shared`, `subject`, `teaching-assignment`, `time-slot`.

**Removed** (20 folders, moved to other backends in the 2026-09-03
extractions, or never academic-service's to begin with): `achievement`,
`announcement`, `assessment-item`, `assessment-weight`, `attendance`,
`education`, `educational-history`, `employment-type`, `my-dashboard`,
`parent`, `position`, `position-category`, `profile` (the academic-specific
extra-tabs config, not `platform/profile`, which stayed), `rapor`,
`scholarship`, `social-media`, `student`, `student-graduation`,
`student-parent`, `student-score`, `teacher`.

`packages/platform/src/features/` went from 18 folders to 3
(`auth`, `profile`, `reference-data`) the same way: `permission`, `role`,
`user-role`, `school-unit`, `school-unit-type`, `organization`, `tenant`,
`settings`, `audit-log`, `file`, `achievement-type`, `religion`,
`blood-type`, `dashboard`, `address` were all identity-service's own admin
CRUD or app-wide settings, not academic-service's. `address` was briefly
removed and then restored narrow: `platform/profile`'s own self-service form
(a user's own address, not anyone else's) genuinely needs it.

`router/index.ts`'s route tree, `menuConfig.ts`'s nav sections, `main.ts`'s
bootstrap, and every file the typechecker flagged after the deletion were
updated to match. See the git history in this repo's first commit for the
full list; there is no earlier history to diff against here, since this was
split by copying, the same Strangler Fig approach every backend split used.

## The roster problem, and how it's handled

`classroom`'s enrollment screen ("available students to add to a class")
and `classroom`/`teaching-assignment`'s supervisor/teacher pickers all call
a students or teachers *list* endpoint, not a narrow "who am I" lookup, a
real browse-and-pick UI. That endpoint is `student-service`'s and
`hr-service`'s now, not academic-service's. Academic-service's
backend never had a `/students` or `/employees` controller (confirmed by
grepping its `src/`; the two services only ever exchanged a narrow
`platform/student-identity`/`platform/teacher-identity` "one method" read,
which answers a different question).

Rather than tearing the enrollment/roster UI out, `src/features/academic/
shared/roster/rosterApi.ts` holds a **narrow, read-only, correctly-typed**
API client for exactly the two list calls those screens make
(`GET /students`, `GET /employees`). Both resolve through the single `api`
instance, and both are routed: `/students` to student-service and `/employees`
to hr-service. This mirrors `platform/student-identity`/
`teacher-identity`'s own shape on the backend: narrow, named, and honest about
which service it actually reads.

**Both were 404ing until 2026-09-09**. The file said so, and the manifest
listed them in `UNROUTED_PREFIXES` so that dev refused them as loudly as the
gateway did. That is what the list is for, and it is what made closing them a
five-line change rather than an investigation.

## Known gaps

**This section described a one-backend app. That stopped being true on
2026-09-09**. Read the paragraph below before trusting anything else here.

This app talks to **one origin**, not one backend. `VITE_API_BASE_URL` is
empty on purpose: every request is relative, and a proxy decides which service
answers: the Vite dev server in development, the nginx gateway in production,
both generated from `api-routes.config.ts`. Four services sit behind it:

| Service | Port | Answers |
|---|---|---|
| identity | 3000 | `/auth`, `/profiles`, `/users`, `/roles`, `/religions`, `/blood-types`, … |
| academic | 3200 | most of this app's screens |
| student | 3900 | `/students`, `/student-enrollments`, `/parents`, … |
| hr | 3800 | `/employees` |

**All four must be running.** A screen that comes back empty is a service that
is down, not a missing route.

`UNROUTED_PREFIXES` is empty: every prefix this app calls is routed. It closed
in two steps: `/teachers` when hr-service was wired in, then
`/religions` and `/blood-types` once they had an owner at all. Neither did
before: `Religion` was declared only by admission-service, for its own
applicants, and `BloodType` was declared by no service anywhere, so the profile
form's two dropdowns were reading an endpoint with no table behind it. Both are
attributes of a person, identity-service owns people, and both are served from
there now, filled with defaults by an identity-service migration.

### What is still missing

- **Admin-configured branding.** `platform/settings`'s `AppSetting` (logo,
  title, favicon, maintenance-mode toggle, per-menu-item visibility) was
  identity/portal-service's own admin screen, not read-only reference data
  worth borrowing narrow, so `AuthLogo`, `LoginHero`, `LoginForm`,
  `AppSidebar`, and `main.ts` fall back to the static defaults
  `configureAuth()` already provided, and maintenance mode and per-item menu
  hiding are gone from `router/index.ts` and `useMenuVisibility.ts` until a
  real settings source is wired back in. This one is a genuine feature gap,
  not a routing gap.
- **The other five web apps are extracted.** `inventory-web`, `admission-web`,
  `portal-web`, `hr-web` and `admin-web` all followed this app's
  `api-routes.config.ts` + `platform-infra/gateway/generate.mjs` pair: one manifest per
  app, three consumers each (Vite proxy, gateway, compose), no list written
  twice. `generate.mjs` reads all six manifests and exits 1 naming the app if
  one routes a prefix to a service with no upstream declared.

## Commands

```bash
pnpm install
pnpm run dev
pnpm run validate   # format:check + lint + typecheck + lint:strict + test + build
```

`pnpm-workspace.yaml`'s `allowBuilds` pre-approves `esbuild`, `vue-demi`, and
`maplibre-gl`'s postinstall scripts, pnpm 11 blocks these by default, and a
fresh `pnpm install` without it silently ships a broken `esbuild` binary.
