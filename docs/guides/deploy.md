# Deploy

A deploy applies the pinned image digests in `infra/deployment/lock.json` to the one environment. It runs from the `Deploy` workflow over SSH; nothing is deployed by hand on the server.

## Before you start

- The change is merged to `main` and its images are released (apps, services and the gateway publish an image per release).
- The server is provisioned ([provision-vps](provision-vps.md)) and the `vps` GitHub Environment has its secrets (`VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, `VPS_HOST`) and the owner as required reviewer. Server and key facts are in `AGENTS.local.md` and the owner's notes, not in this repository.
- Read [rollback](rollback.md) first: there is no staging to rehearse on.

## 1. Update the lock

The `Update lock` workflow (`.github/workflows/update-lock.yml`) starts after every successful `Release` and can be run by hand from the Actions tab. It pins the newest released versions from the repository tags and the digests in GHCR, builds the gateway image when its configuration changed, and opens or updates the pull request `Update the lock`. See [release](release.md).

Locally, `node infra/scripts/update-lock.mjs` writes the pins into `lock.json` and `compose/compose.yaml` the same way, and `--gateway-tag` prints the gateway tag.

Result: the pull request changes only `infra/deployment/lock.json`, `infra/compose/compose.yaml` and, when routes changed, `infra/gateway/`, and `pnpm --filter ./infra run check` passes on it.

A pull request created with the default `GITHUB_TOKEN` does not start the `Validate` workflow, so the required check `ci-ok` would never report. Give the workflow a personal access token or an app token in the repository secret `UPDATE_LOCK_TOKEN`; it is used when present.

## 2. Merge

Merge the pull request. A push to `main` that changes `compose/compose.yaml` or `deployment/lock.json` starts the `Deploy` workflow.

Result: the run waits in the `vps` Environment for the owner's approval.

## 3. Approve and watch

Approve the run. The workflow connects with the forced command (`StrictHostKeyChecking=yes`), which accepts one 40-character commit sha and runs `infra/scripts/deploy.sh`:

1. refuses to start with less than 5 GB free under Docker's root directory, or when `127.0.0.1:8082` is held by something other than the `241-apps` stack;
2. runs `infra/scripts/bootstrap.sh`, which creates each missing database as `mts241` and the bucket `241-apps` (and nothing else);
3. pulls the pinned images;
4. runs every service's migration job, one at a time, and stops at the first failure;
5. runs `seed-permissions.ts` in identity, then `seed-admin-minimal.ts` when `SEED_ADMIN_PASSWORD` is in identity's env file (it creates the admin once and never resets an existing password unless `SEED_ADMIN_RESET=true` is set by hand);
6. brings the stack up with `--wait`;
7. asks the gateway for `/health/<service>` for all ten services;
8. only after every check passes, removes `ghcr.io/mts241alikhlash/*` images that no container uses and the lock does not pin (images of other projects are never touched).

Result: the log ends with `==> deployed <sha>` and the workflow tags the commit `deploy-<yyyy-mm-dd>-<sha7>`.

A failure before step 5 leaves the old containers running. Old containers keep serving while migrations run, so a migration must work with the previous release's code: add first, remove in a later release. The public Actions log prints only container names and states on failure; read container logs on the server.

## 4. Smoke test

Sign in at account-web, open two apps without a password, and open a page that reads data in each service you changed.

Result: pages load and `/health/<service>` answers for every service.

## Manual run

From the Actions tab run `Deploy` with `ref` set to a branch, sha or `deploy-*` tag. A `ref` of an older tag is the rollback.

## Migrations that fail

A failed Prisma migration stays in `_prisma_migrations`; fix it on the server with `prisma migrate resolve` before the next deploy.

## Environment files

Each service reads real values from `infra/compose/env/<service>-service.env` on the server (gitignored; filled from the service's `.env.example`). The web apps are static builds and need none. `TRUST_PROXY` is the number of proxies between the client and each service and defaults to 1 (the gateway alone); count every hop (Cloudflare, host nginx, gateway) and set it in `infra/compose/.env` or the shell that runs Compose. With the wrong count every client looks like the same address and the login and registration rate limits are shared by everyone.

Result: after a deploy, the client address in identity's request log is the real one, not a proxy's.
