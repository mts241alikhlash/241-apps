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

## Notes

- A machine with little memory cannot run ten services under `nest start --watch` at once; start only the apps you need.
- Academic seeds (`seed:reference-data`, `seed:timetable`) need an active academic year created first.
- Run `node dev.mjs <app>` again after pulling: it migrates databases that fell behind.
