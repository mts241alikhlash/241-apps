# Frontend standard

Applies to the Vue 3 + Vite apps in `apps/` and the Vue packages in `packages/` (`ui`, `web-shared`, `platform`, `reference-data`). Each rule is **Rule**, **Why**, **Check**.

## Structure

**Rule.** An app's code is `src/features/<area>/<feature>/` with `api/`, `services/`, `composables/`, `components/`, `stores/`, `types/`, `views/`, a `routes.ts` and, where used, a `config.ts`. App wiring lives in `src/app/` (`main.ts`, providers for router and store); the sidebar menu is `src/config/menuConfig.ts`.
**Why.** One shape means any feature is found the same way in every app.
**Check.** review; `routes:check` verifies the emitted routing manifest.

**Rule.** Data flows `views/components -> composables -> services -> api`. `api/` holds the HTTP calls through the shared `api` instance; `services/` maps and orchestrates; components never call `api/` directly.
**Why.** Components stay presentational and the call sites are searchable.
**Check.** review. The envelope typing of every call is checked by `api-calls-read-the-envelope.spec.ts` where present.

**Rule.** Server state uses `@tanstack/vue-query`; client state uses Pinia stores. Forms use vee-validate with zod schemas.
**Why.** One tool per kind of state.
**Check.** review.

## Shared packages

**Rule.** Use the shared packages through their exports only: `@mts241alikhlash/platform/<feature>` (auth, profile, address, blood-type, religion, school-unit-type, dashboard, reference-data, layout), `@mts241alikhlash/reference-data`, `@mts241alikhlash/ui` and `@mts241alikhlash/web-shared`. No deep imports into a package's folders and no per-app copies of a shared feature.
**Why.** A change is made once for every app.
**Check.** `exports` maps of the packages (a missing export fails the build); `git grep "@mts241alikhlash/platform/[a-z-]+/"` returns nothing.

**Rule.** A feature used by two or more apps lives in `platform`; a feature used by one stays in that app. Admin-only features live in `apps/admin-web`.
**Why.** Shared code is a cost for every consumer.
**Check.** review.

**Rule.** Each app calls `configureAuth` in `main.ts` with its app key, titles, `homeRoute` (the path after login) and `ssoApp`; the app's `src/layouts/AppLayout.vue` renders the shared `AppLayout` with its `menuSections` and its `HeaderAppSwitcher` in the `app-switcher` slot.
**Why.** Login destination and menu differ per app; everything else is shared.
**Check.** `useLoginForm.spec.ts` and `AppLayout.spec.ts` in `packages/platform`.

**Rule.** Third-party libraries a shared package imports are its `peerDependencies` and stay dependencies of each app; each app's `src/style.css` has `@source` lines for `ui`, `web-shared`, `platform` and `reference-data`.
**Why.** One instance of `vue` and `pinia` per app, and Tailwind generates classes used only inside packages.
**Check.** `pnpm why vue` and `pnpm why pinia` list one version; the apps' `tailwind-sources.spec.ts`.

## Routing and API access

**Rule.** Each app declares which service owns each API prefix in `api-routes.config.ts`; the dev proxy reads it directly and the routing manifest the gateway is generated from is emitted from it (`routes:emit`). A prefix with no owner goes in `UNROUTED_PREFIXES`, which the dev proxy refuses as loudly as the gateway does.
**Why.** A route that works in dev and 404s in production is found in review of one file.
**Check.** `pnpm --filter <app> run routes:check`; `infra/gateway/generate.mjs --check`.

**Rule.** Route `meta` uses the typed fields from `@mts241alikhlash/web-shared/types/router` (`requiresAuth`, `guestOnly`, `requiredPermission`, `requiredAnyPermission`, `breadcrumbs`); a menu item shows exactly when the user holds its `requiredPermission`.
**Why.** The menu, the router guard and `can()` apply one rule.
**Check.** `menuConfig.spec.ts`; the shared menu visibility composable.

## Types and style

**Rule.** TypeScript strict; no `any`; `import type` for types; components are `<script setup lang="ts">` with type-based props and emits; multi-word component names.
**Why.** Consistent, checkable components.
**Check.** the vue ESLint preset and `vue-tsc` (`validate`).

**Rule.** No hard-coded user-visible text outside the app's i18n or feature config.
**Why.** Copy changes belong in one place; names stay consistent.
**Check.** review; exam-web's `check-no-comments.mjs`.

List paging rules are in [ui](ui.md) (the table) and [api](api.md) (the endpoint).

## Gates

`pnpm --filter <app> run validate` (format, lint, typecheck, strict lint, tests, build, routing manifest) must pass; a package runs its own `check` and `test`.
