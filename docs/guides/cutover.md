# Cutover from the old stack

One time only: replace the polyrepo stack on the server with the stack of this repository, move the old inventory data across, and then remove the old stack. Until step 7 the old containers, databases, bucket and folders stay, so the cutover can be reverted. Everything else the old stack held was trial data and is not migrated; a full backup of it is kept on the owner's laptop.

## Preconditions

- Every app and service image and the gateway image exist in GHCR and are pinned in `infra/deployment/lock.json` (the first `Update the lock` pull request is merged).
- The server is provisioned ([provision-vps](provision-vps.md)) and the `production` Environment has its secrets and a required reviewer.
- This guide is read, and a `pg_dump` backup of every old database was taken today ([backup](backup.md)): the ten `*_prod` custom dumps, the globals and the configs archive are on the laptop.

Result: `git show main:infra/deployment/lock.json | grep -c REPLACE_BEFORE_DEPLOYMENT` prints `0`.

## 1. Provision

As root on the server, with the MinIO access key from [provision-vps](provision-vps.md#1-create-the-minio-access-key): `provision.sh --dry-run`, read it, then `provision.sh`. Besides the role, env files and the deploy key, it installs the daily backup timer ([backup](backup.md)) and writes the host nginx site `241-apps` (every app host name, proxying to the gateway), moving `241apps-production`, `241apps-exam` and the two `241apps-production.bak-*` files out of `sites-enabled` only after `nginx -t` passes.

Result: every check of the provisioning table passes, `nginx -t` is ok, and `systemctl list-timers 241-apps-backup.timer` shows the next run.

## 2. Stop the old stack

```
docker compose -p mts241alikhlash-production stop
```

The old containers stop; their databases, bucket and folders stay. The new stack needs port `127.0.0.1:8082` and the memory, and `deploy.sh` refuses to start while a container outside project `241-apps` holds that port.

Result: `docker ps --filter publish=8082` lists nothing.

## 3. Approve the waiting deploy

Approve the `Deploy` run that waits in the `production` Environment. Expected log lines: `==> bootstrap` creating the databases and the bucket, `==> migrate <service>` for all ten, `==> seed permissions`, `==> seed admin`, `==> up`, a `==> health` line per service, and `==> deployed <sha>`. The workflow then tags `deploy-<date>-<sha7>`.

Result: the workflow is green and the tag exists.

## 4. Check the sites

Sign in at the accounts site with the new admin and open each app from the launcher.

Result: every app loads, shows data from its own service and signs out with the others.

## 5. Move the old inventory data

Copy `inventory_prod.dump` from the laptop backup to the server for this run (`scp`), then as root: `RESTORE_DB=inventory infra/scripts/restore-inventory.sh inventory_prod.dump`. The script restores data only, inside one transaction, leaves the new database's migration history alone, empties the reference tables first (their rows come from the old dump), prints row counts before and after, and refuses when the new database already has asset, unit, loan or history rows. Delete the copy of the dump afterwards.

User ids in the inventory rows (who created a record, who approved a loan) point at the old identity users, which do not exist in the new stack; those fields show as unknown until someone maps them by hand.

Result: inventory-web shows 90 assets and 615 units.

## 6. Owner confirms

Steps 4 and 5 passed and the owner says so. Nothing below this line can be undone.

## 7. Remove the old stack

As root: `infra/scripts/remove-polyrepo.sh --dry-run`, read every line, then `infra/scripts/remove-polyrepo.sh` (it asks for a typed confirmation). It brings down the old Compose project (no volumes), removes old `ghcr.io/mts241alikhlash/*` images no container uses, drops the ten `*_prod` databases and the role `mts241_production`, removes `/srv/mts241alikhlash`, the old deploy key line, the `241apps-backup-prod` timer and service and `/var/backups/241apps`, and the old MinIO bucket and user. The server has no `mc`; with an `mc` alias set in `MC_HOST_polyrepo` the script removes the bucket and user itself, otherwise it prints what to delete in the MinIO Console. It never touches the Compose project `pemuda-cirengit` or the nginx sites `9router`, `pemuda-cirengit`, `000-default`, `storage` and `storage-console`.

Result: every other site still answers (pemuda 200, router 307) and the 241 apps answer through Cloudflare.

## 8. Archive

Archive the old polyrepo repositories on GitHub.

## Rollback

Before step 7:

```
docker compose -p 241-apps stop
docker compose -p mts241alikhlash-production start
```

Result: the old sites answer again. Data written to the new databases since the cutover is not in the old ones.

After step 7 the old stack is gone: rollback means deploying an earlier `deploy-*` tag of the new stack, and the old data exists only in the laptop backup.
