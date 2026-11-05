# Add a web app

An app is a Vue 3 + Vite package under `apps/`. Copy the layout of a current small app (`inventory-web` or `portal-web`).

1. **Package.** Create `apps/<name>-web/` with `package.json` (scripts `dev`, `build`, `lint`, `lint:strict`, `typecheck`, `test`, `validate`, `routes:check`), `vite.config.ts` and `vitest.config.ts` (the `vue()` preset of `@mts241alikhlash/vitest-config`), `tsconfig*.json` extending `@mts241alikhlash/typescript-config`, `eslint.config.mjs` calling the `vue` preset, and the dependencies `@mts241alikhlash/ui`, `web-shared`, `platform` (and `reference-data` if used) as `workspace:*`.
   Result: `pnpm install` links it.
2. **Wiring.** `src/app/main.ts` calls `configureAuth` (app key, titles, `homeRoute`, `ssoApp`); `src/layouts/AppLayout.vue` renders `AppLayout` from `@mts241alikhlash/platform/layout` with the app's `menuSections` and its `HeaderAppSwitcher` in the `app-switcher` slot; `src/style.css` has `@source` lines for `ui`, `web-shared`, `platform`; routes use `@mts241alikhlash/platform/auth` for login and callbacks.
   Result: `pnpm --filter <name>-web run typecheck` passes.
3. **Routes.** Write `api-routes.config.ts` naming which service owns each prefix, pick a dev port in `dev.mjs` (`WEB_PORTS`), and emit the routing manifest (`pnpm --filter <name>-web run routes:emit`).
   Result: `pnpm --filter <name>-web run routes:check` prints `routing manifest valid`.
4. **Sign-on.** Register the app and its `https://<host>/oauth/callback` in identity's `SSO_APPS` ([ADR 0007](../adr/0007-single-sign-on-through-account-web.md)) ; the launcher is served from the same list (`/sso/apps`).
   Result: signing in at account-web lists the app and opens it without a password.
5. **Gateway and deploy.** Run `node infra/gateway/generate.mjs`, add a `Dockerfile` and its service block in `infra/compose/compose.yaml`, and its pin in `infra/deployment/lock.json`.
   Result: `pnpm --filter ./infra run check` and `node infra/gateway/generate.self-check.mjs` pass.
6. **Standards and docs.** Pages follow [frontend](../standards/frontend.md) and [ui](../standards/ui.md); write the package `README.md` and `AGENTS.md`.
   Result: `pnpm --filter <name>-web run validate` and `pnpm run docs:check` pass.
