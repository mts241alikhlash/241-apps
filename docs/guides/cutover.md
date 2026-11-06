# Cutover from the old stack

One time only: replace the polyrepo stack on the server with the stack of this repository. The old containers, databases, bucket and folders stay until a later, explicit decision, so the cutover can be reverted.

## Preconditions

- Every app and service image and the gateway image exist in GHCR and are pinned in `infra/deployment/lock.json` (the first `Update the lock` pull request is merged).
- The server is provisioned ([provision-vps](provision-vps.md)) and the `production` Environment has its secrets and a required reviewer.
- This guide is read, and a `pg_dump` backup of every old database was taken today ([backup](backup.md)).

Result: `git show main:infra/deployment/lock.json | grep -c REPLACE_BEFORE_DEPLOYMENT` prints `0`.

## 1. Provision

As root on the server, with the MinIO access key from [provision-vps](provision-vps.md#1-create-the-minio-access-key): `provision.sh --dry-run`, read it, then `provision.sh`.

Result: every check of the provisioning table passes.

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

## 5. Archive

Archive the old polyrepo repositories on GitHub. Removing the old resources (containers, databases, bucket, folders) is a later decision.

## Rollback while the old resources exist

```
docker compose -p 241-apps stop
docker compose -p mts241alikhlash-production start
```

Result: the old sites answer again. Data written to the new databases since the cutover is not in the old ones.
