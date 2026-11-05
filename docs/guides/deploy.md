# Deploy

A deploy applies the pinned image digests in `infra/deployment/lock.json` to the one environment. It runs from the `Deploy` workflow over SSH; nothing is deployed by hand on the server.

## Before you start

- The change is merged to `main` and its images are released (apps, services and the gateway publish an image per release).
- The server is provisioned and the `vps` GitHub Environment has its secrets and the owner as required reviewer. Server and key facts are in `AGENTS.local.md` and the owner's notes, not in this repository.
- Read [rollback](rollback.md) first: there is no staging to rehearse on.

## 1. Update the lock

The `Update lock` workflow (`infra/.github/workflows/update-lock.yml`) runs every hour: it compares `lock.json` with the newest released app, service and gateway versions and opens or updates the pull request `Update the lock`. To pull a version in sooner, run it from the Actions tab.

Locally, `node infra/scripts/update-lock.mjs` does the same comparison and writes `lock.json` and `compose/compose.yaml`.

Result: the pull request changes only `infra/deployment/lock.json` and `infra/compose/compose.yaml`, and `pnpm --filter ./infra run check` passes on it.

When the change alters gateway routes, the pull request says so: release and pin the gateway first, because the stack serves new routes only with the new gateway image.

## 2. Merge

Merge the pull request. A push to `main` that changes `compose/compose.yaml` or `deployment/lock.json` starts the `Deploy` workflow.

Result: the run waits in the `vps` Environment for the owner's approval.

## 3. Approve and watch

Approve the run. The workflow connects with the forced command, which accepts one 40-character commit sha and runs `infra/scripts/deploy.sh`:

1. refuses to start with less than 5 GB free under Docker's root directory;
2. pulls the pinned images;
3. runs every service's migration job, one at a time, and stops at the first failure;
4. runs `seed-permissions.ts` in identity;
5. brings the stack up with `--wait`;
6. asks the gateway for `/health/<service>` for all ten services;
7. only after every check passes, removes platform images no container uses (images of other projects are never touched).

Result: the log ends with `==> deployed <sha>` and the workflow tags the commit `deploy-<yyyy-mm-dd>-<sha7>`.

A failure before step 5 leaves the old containers running. Old containers keep serving while migrations run, so a migration must work with the previous release's code: add first, remove in a later release. The public Actions log prints only container names and states on failure; read container logs on the server.

## 4. Smoke test

Sign in at account-web, open two apps without a password, and open a page that reads data in each service you changed.

Result: pages load and `/health/<service>` answers for every service.

## Manual run

From the Actions tab run `Deploy` with `ref` set to a branch, sha or `deploy-*` tag. A `ref` of an older tag is the rollback.

## Migrations that fail

A failed Prisma migration stays in `_prisma_migrations`; fix it on the server with `prisma migrate resolve` before the next deploy.
