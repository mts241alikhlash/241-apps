# infra

## Purpose

Deployment definitions: the one Compose stack (project `241-apps`), the nginx gateway generator, the deployment lock and the deploy scripts. The local Postgres and S3 sit in the same file behind the `storage` profile; the server uses native PostgreSQL and MinIO.

## Depends on

- Every app's `api-routes.config.ts` and routing manifest, and `deployment/lock.json`, as inputs to `gateway/generate.mjs`.
- Images published by the app, service and gateway releases (`ghcr.io/mts241alikhlash/`).

## Rules specific to this package

- `gateway/nginx*.conf` is generated; run `node gateway/generate.mjs` and `--check` before a deploy. `gateway/manifests/*.json` are routing manifests emitted by each app's `routes:emit` and copied in from its release, not edited by hand.
- The lock is changed by the `Update lock` workflow or `scripts/update-lock.mjs`, never by editing digests by hand.
- There is one environment; no name carries an environment word ([ADR 0002](../docs/adr/0002-one-environment.md)).
- The deploy entry runs from the checkout, so only a commit on `main` can change what the forced command does.

## Gotchas

- Compose loads `compose.override.yaml` on its own only when no `-f` is given: every command names both files.
- Old containers keep serving while migrations run: a migration must work with the previous release's code.
- The repository and its Actions logs are public: deploy failures print container names and states only.

## Open work

- The workflows live in the root `.github/`; `infra/scripts/provision.sh` does the one-time server setup (see the provisioning guide).
