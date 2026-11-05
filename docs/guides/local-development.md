# Local development

Run the web apps and the services they use on your machine, with Postgres and S3 in containers.

## Prerequisites

- Node 24.22.1 (`.node-version`), Docker or Podman with Compose, and pnpm 12: `export PATH=$HOME/.local/share/pnpm/bin:$PATH`.
- With Podman on SELinux the init SQL mount needs a relabel; the Compose file already uses `:ro,z`.

## 1. Install

```
pnpm install
```

Result: `pnpm install` ends with `Done`. After a fresh install generate each service's Prisma client when you need to run or test it: `pnpm --filter <service> run prisma:generate`.

## 2. Create identity's env file

`dev.mjs` creates every other service's `.env` from its `.env.example`, copying identity's secrets, but it reads identity's first.

```
cp services/identity-service/.env.example services/identity-service/.env
```

Edit it: `DATABASE_URL` and `DIRECT_URL` point at `postgresql://mts241:mts241@localhost:5433/identity`, `NODE_ENV=development`, and `JWT_SECRET` and `PROVISIONING_SERVICE_TOKEN` are random values you generate (`openssl rand -hex 32`). `.env` files are gitignored; never commit them.

Result: `services/identity-service/.env` exists and `git status` does not list it.

## 3. Start an app

```
node dev.mjs academic
```

It starts the local stack when ports 5433 and 9000 are closed (Compose project `241-apps`, profile `storage`: Postgres 5433 and SeaweedFS S3 9000 with bucket `241-apps`), builds `nest-core` once and keeps it watching, creates missing databases (named after the service) and migrates them, then starts the named app, account-web, identity and every service the app's `api-routes.config.ts` routes to. Ctrl+C stops everything. If port 5433 or 9000 is held by something that is not the `241-apps` stack, `dev.mjs` stops and names the container.

Result: the log shows the apps on their ports (academic 5173, inventory 5174, admission 5175, portal 5176, hr 5177, admin 5178, assessment 5179, account 5180, exam 5181) and each service printing `Nest application successfully started`.

## 4. Create an admin and sign in

```
SEED_ADMIN_PASSWORD='<12+ characters>' pnpm --filter identity-service run seed:admin-minimal
pnpm --filter identity-service run seed:permissions
```

Open `http://localhost:5180` (account-web) and sign in as `admin` with that password; the launcher then opens any running app without another password. Staff sign in through `POST /sso/login`; `POST /auth/login` is for applicants only.

Result: after sign-in the app's home page loads (for academic, `/academic/info`).

## Run the end-to-end suites

With the local stack's Postgres running (step 3 starts it, or `docker compose -f infra/compose/compose.yaml --profile storage up -d postgres`):

```
pnpm run test:e2e
```

Result: every service with a `test/*.e2e-spec.ts` reports its suite passing; the portal suite creates and migrates its own `portal_e2e` database.

## Rehearse a deploy

Run the whole deploy path (`deploy.sh`, `bootstrap.sh`, migrations, seeds, health checks) on the laptop, behind a local TLS front that answers to the production host names. It needs Podman with the Podman socket and a `docker compose` provider, and it uses the Compose project `241-apps`, so stop the `dev.mjs` storage containers first (`podman stop 241-apps_postgres_1 241-apps_s3_1`). Rehearsal state (env files, override, Caddy data) lives in `~/.local/share/241-apps-rehearsal/`; its volumes are named `241-apps-rehearsal-*`, so `dev.mjs` data is never touched.

1. `infra/scripts/rehearsal-build.sh` builds the 20 images as `localhost/241-apps/<name>:rehearsal`.
2. `infra/scripts/rehearsal-env.sh` writes the override and the ten env files (random secrets; the admin password is printed once and kept in `admin-password`), and links them into the gitignored `infra/compose/env/`.
3. `podman network create 241-apps`, then start the storage services: `docker compose -f infra/compose/compose.yaml -f ~/.local/share/241-apps-rehearsal/compose.override.yaml --profile storage up -d --wait postgres s3`.
4. `infra/scripts/rehearsal-caddy.sh up` starts the TLS front on port 8443 (resolve `*.mts241alikhlash.sch.id` to `127.0.0.1` in the browser, for example with Chrome's `--host-resolver-rules`).
5. From `infra/`: `DEPLOY_OVERRIDE=<state>/compose.override.yaml DEPLOY_PULL=never BOOTSTRAP_PSQL="podman exec -i 241-apps-postgres-1 psql -U mts241 -d postgres" BOOTSTRAP_S3_ENDPOINT=http://127.0.0.1:9000 BOOTSTRAP_S3_KEY=rehearsal BOOTSTRAP_S3_SECRET=rehearsal bash scripts/deploy.sh`; run it twice.

Result: both runs exit 0, the second creates nothing and changes no data, and `https://accounts.mts241alikhlash.sch.id:8443` signs in. Tear down with `docker compose ... down -v`, `rehearsal-caddy.sh down`, removing the links in `infra/compose/env/` and `infra/compose/.env`, `podman network rm 241-apps`, and `podman start 241-apps_postgres_1 241-apps_s3_1`.

The knobs that exist only for the rehearsal: `DEPLOY_OVERRIDE`, `DEPLOY_PULL=never`, `BOOTSTRAP_PSQL`, `BOOTSTRAP_S3_*` (their VPS defaults are `compose/compose.override.yaml`, pull, native `psql` through `PGPASSFILE`, the S3 values in the env file), and a gateway `nginx.conf` mounted with the Podman DNS resolver and `Host $http_host` (the VPS image uses the Docker embedded DNS resolver and `Host $host`).

## Notes

- A machine with little memory cannot run ten services under `nest start --watch` at once; start only the apps you need.
- Academic seeds (`seed:reference-data`, `seed:timetable`) need an active academic year created first.
- Run `node dev.mjs <app>` again after pulling: it migrates databases that fell behind.
