# 241 Platform Infrastructure

Nginx gateway and Docker Compose deployment definitions for 241 Apps, a
school platform. `gateway/generate.mjs` renders `gateway/nginx.conf` (and the
TLS variant) from every app's routing manifest plus the deployment lock —
never hand-edit the generated files; run `node gateway/generate.mjs` after
changing a manifest, and `--check` before a deploy. `compose/compose.yaml` is
the one Compose stack (project `241-apps`): the gateway, the nine web apps and
the ten services. The local Postgres and S3 sit in the same file behind the
`storage` profile, which only the laptop enables; the VPS uses its native
PostgreSQL and MinIO.

```bash
docker compose -f compose/compose.yaml --profile storage up -d postgres s3   # local Postgres :5433 and S3 :9000
node gateway/generate.mjs --check
```

## Picking versions to deploy

Every app and service versions independently — there's no single platform
version. The **Update lock** workflow (`.github/workflows/update-lock.yml`)
runs every hour: it pins every newly released app, service and gateway into
`deployment/lock.json` and `compose/compose.yaml`, downloads the app's routing
manifest from its GitHub Release into `gateway/manifests/<app>-<version>.json`,
and opens a pull request; merging it deploys. It reads only public tags,
releases and GHCR, so it needs no token.

By hand, `scripts/latest-digests.mjs` reports the latest published digest of
all 20 components (9 web apps, 10 services, the gateway) in one shot, and can
pin them straight into `deployment/lock.json` and
`compose/compose.yaml` at once (both files need the same digest,
and aren't synced automatically otherwise):

```bash
GITHUB_TOKEN=<a PAT with read:packages> node scripts/latest-digests.mjs              # report only
GITHUB_TOKEN=<...>                      node scripts/latest-digests.mjs --write
```

See `docs/OVERVIEW.md` for the full picture: which service backs which app,
the cross-service call map, and the operational rules that bite hardest.

## `compose.override.yaml` on a shared VPS

If the VPS already runs a host-level nginx that owns ports 80/443 (terminating
TLS, reverse-proxying to the gateway on `127.0.0.1:8081`), the gateway can't
also bind 80/443 — copy `compose/compose.override.example.yaml` to
`compose/compose.override.yaml` on that VPS (git-ignored, like
`compose/env/`) and Compose picks it up automatically alongside
`compose.yaml`. A server without a pre-existing host nginx doesn't
need it. Without it on a VPS that does, the gateway container fails to start —
port already in use.
