# First deployment

The stack has never run on the VPS. This is the order for the first
install, which brings every service up together, so the "deploy X before Y"
notes written for upgrades do not apply: what matters is publish, then
migrate, then seed, then smoke-test. Every step that touches GitHub or the VPS
is done by a person. Once it is done, later deploys run on their own (section 6).

## 1. Decisions and accounts (before anything is pushed)

- [ ] On 2026-10-04 every repository and package in the `mts241alikhlash`
      organisation was deleted and recreated from one initial commit, with
      every package and app at version 0.1.0 and one init migration per
      service (see `OVERVIEW.md`, "Migrations folded before the first
      deployment").
- [ ] Decide whether the service images stay public. If they turn private,
      create a classic PAT with `read:packages` for `docker login ghcr.io` on
      the VPS. The same PAT runs `scripts/latest-digests.mjs` (`GITHUB_TOKEN`).
- [ ] Create an organisation Dependabot secret `DEPENDABOT_PACKAGES_TOKEN`
      (classic PAT with `read:packages`, visible to the nine web app
      repositories). Their `.github/dependabot.yml` reads the
      `@mts241alikhlash/*` packages from GitHub Packages with it. Dependabot
      alerts and security updates are already on in every repository.
- [x] Traffic path, decided 2026-10-04: Cloudflare (proxied, SSL mode Full
      (strict)) → host nginx with a Cloudflare Origin Certificate → gateway on
      `127.0.0.1:8081` → services. `TRUST_PROXY=3` (`compose/env/README.md`).

## 2. Publish, in this order

1. **web-packages.** Push. With no pending changeset the release workflow
   publishes `@mts241alikhlash/ui` and `@mts241alikhlash/web-shared` 0.1.0.
2. **services.** Push. The release workflow publishes the nine `*-api` client
   packages and the nine service images, all 0.1.0.
3. **Package visibility.** A package that names its public repository in
   `repository` is public; check every image in the organisation's package
   settings and make it public there when it is not (GitHub has no API for
   it). The web apps' CI and Docker builds install the packages anonymously.
4. **Web apps** (all nine, `account-web` included): `pnpm up
"@mts241alikhlash/*"` so the lockfile names the published 0.1.0 packages,
   `pnpm run validate`, commit, push. Each release publishes the image and its
   routing manifest.
5. **platform-infra.** Copy each app's published routing manifest into
   `gateway/manifests/<app>-<version>.json`; `GITHUB_TOKEN=<PAT> node scripts/latest-digests.mjs --write`
   (replaces every `REPLACE_BEFORE_DEPLOYMENT`); `node gateway/generate.mjs`;
   `node gateway/generate.self-check.mjs`; commit, push. The release publishes
   the gateway image.

`exam-service` 3.1.0 removes the WHIP stream routes and their `GET
/exam-schedules/:id/streams` endpoint; camera proctoring moved to
`exam-sessions/:id/snapshots/*` and its UI lives in `exam-web`. Ship
`exam-web` and `exam-service` 3.1.0 in the same window: while `exam-web` has no
pin, the only deployed exam UI is `assessment-web`, whose camera tab
calls the removed route and fails with a 404.

## 3. The VPS

- [ ] PostgreSQL 13 or later (`gen_random_uuid()` in the migrations); one
      database per service, named after the domain: `identity`, `academic`,
      `admission`, `hr`, `inventory`, `presence`, `portal`, `student`,
      `assessment`, `exam`, all owned by the role `mts241`. The S3 bucket is
      `241-apps`.
- [ ] `docker network create 241-apps`.
- [ ] 2 GB of swap (`free -m`); each NestJS service is capped at 320m.
- [ ] Cloudflare, in the dashboard:
  - proxied `A` records to the VPS for `accounts`, `academic`,
    `admission`, `admin`, `assessment`, `exam`, `hr`,
    `inventory` and `portal` (`.mts241alikhlash.sch.id`);
  - SSL/TLS mode **Full (strict)** and **Always Use HTTPS**;
  - an Origin Certificate for `*.mts241alikhlash.sch.id` and
    `mts241alikhlash.sch.id`.
- [ ] Host nginx terminates TLS:
  - the Origin Certificate and key in `/etc/ssl/cloudflare/` (key `chmod 600`);
  - one `listen 443 ssl` server for the nine hosts with
    `proxy_pass http://127.0.0.1:8081`, `proxy_set_header Host $host`,
    `X-Forwarded-For $proxy_add_x_forwarded_for` and
    `X-Forwarded-Proto https`; port 80 redirects to https.
- [ ] `compose/compose.override.yaml` copied from
      `compose.override.example.yaml` (binds the gateway to
      `127.0.0.1:8081`), and `compose/.env` with `TRUST_PROXY=3`.
- [ ] Firewall: ports 80 and 443 only from Cloudflare's ranges
      (`https://www.cloudflare.com/ips-v4`, `ips-v6`); keep SSH open.
- [ ] `compose/env/<service>.env` for the nine services, from each service's
      `.env.example` (`compose/env/README.md`):
  - `NODE_ENV=production` everywhere;
  - `JWT_SECRET` and `PROVISIONING_SERVICE_TOKEN` identical in all nine,
    fresh, at least 32 random characters (`openssl rand -base64 48`); never
    the values of a local `.env`;
  - every `*_SERVICE_URL` is the container address (`http://identity-service:3000`
    and so on), never a public domain;
  - identity: `SSO_ACCOUNTS_ORIGIN=https://accounts.mts241alikhlash.sch.id`,
    `SSO_APPS` with every app's `https://<host>/oauth/callback` (`account`
    required), `GOOGLE_CALLBACK_URL` the admission callback, the Google client
    id and secret;
  - S3 or MinIO credentials where the service stores files.
- [ ] Google Cloud console: authorised redirect URIs
      `https://admission.mts241alikhlash.sch.id/auth/google/callback` and
      `https://accounts.mts241alikhlash.sch.id/auth/google/callback`.

## 4. Migrate and seed

Compose loads `compose.override.yaml` on its own only when no `-f` is
given, so every command names it:

```bash
cd 241-apps/infra
dc() { docker compose -f compose/compose.yaml -f compose/compose.override.yaml "$@"; }
dc --profile migrate pull
for s in identity academic admission hr inventory presence portal student assessment exam; do
  dc --profile migrate run --rm "$s-service-migrate" || break
done
seed() { dc run --rm --entrypoint ./node_modules/.bin/tsx "$@"; }
seed -e SEED_ADMIN_PASSWORD='<12+ characters>' identity-service prisma/seed-admin-minimal.ts
seed identity-service prisma/seed-permissions.ts
dc up -d
```

The migrations also fill every default list (administrative areas, religions,
blood types, occupations, educations, the PPDB option lists, document types,
employment types, positions, inventory categories, conditions and funding
sources, leave types, portal categories, homepage sections and menu).
`seed-permissions.ts` creates the twenty-six default roles. Run it again after
every later release's migrations.

`seed:reference-data` in academic-service needs an active academic year:
create the year in academic-web first, then
`seed academic-service prisma/seed-reference-data.ts` for calendar types and a
calendar. Never run `seed-timetable.ts` there (it refuses `NODE_ENV=production`).

## 5. Smoke test

- [ ] `https://<app>.mts241alikhlash.sch.id/health/<service>` answers for
      every service.
- [ ] `SELECT level, count(*) FROM regions GROUP BY level` in `identity` gives
      38 provinces, 514 regencies, 7,285 districts and 83,762 villages.
- [ ] `curl -m 5 http://<VPS IP>/` from outside Cloudflare times out (the
      firewall holds), and `ss -ltnp` shows the gateway on `127.0.0.1:8081`
      only.
- [ ] A request through Cloudflare logs the client's real address in
      identity-service, not a Cloudflare one (`TRUST_PROXY` is right).
- [ ] Sign in at `accounts` as `admin`; the launcher lists every app.
- [ ] Open three apps from the launcher without a password; sign out of one;
      the other two sign out within about 5 seconds.
- [ ] An applicant account is refused at `accounts`; a staff account is
      refused on the admission sign-in form.
- [ ] Add the school's payment account in admission-web (Admin PSB →
      Rekening Pembayaran); applicants cannot upload a payment proof until one
      is active.
- [ ] Register an applicant in admission-web, upload a document, submit; a
      `STUDENT_AFFAIRS_STAFF` account sees and verifies it.
- [ ] A gate kiosk pairs with a device token and records a scan.

Keep the previous images on the VPS until the smoke test passes: do not
`docker image prune` before then.

## 6. Automatic deploys

`.github/workflows/deploy.yml` deploys over SSH. A push to `main` that
changes `compose/compose.yaml` or `deployment/lock.json` deploys after the
owner approves the run in the `vps` Environment. It can also be run by hand
from the Actions tab (`Deploy` → `ref`); a `ref` of an older `deploy-*` tag is
the rollback. Digest commits no longer use `[skip ci]`: in every repository,
Release skips publishing a version whose tag already exists
(`<package>@<version>`; per service image), so a commit without a version bump
rebuilds nothing.

New releases reach the lock through `.github/workflows/update-lock.yml`.
Every hour it compares the lock with the newest released app, service and
gateway versions (public git tags, GitHub Release manifests and GHCR, no
token), and opens or updates the pull request `Update the lock`; merging it
deploys. When the change alters the gateway routes, the pull request adds a
changeset and says so: the gateway has to be released and pinned before the
stack serves the new routes. Pull requests the workflow opens do not trigger
Validate; the workflow runs the generator, its self-check and the lock
validation itself.

A rollback runs the older images against the current database. It is safe
only back to a release whose code still works with every migration applied
since: after a release whose migrations drop or rename a column or table,
roll forward with a fix instead.

Every deploy first refuses to start with less than 5 GB free under Docker's
root directory, then pulls, runs the ten migrations, runs `seed-permissions.ts`,
brings the stack up with `--wait`, and asks the gateway for
`/health/<service>` for all ten services, each through the host of an app
that routes it. Only after every check passes does it remove every
`ghcr.io/mts241alikhlash/*` image no container uses. Images in use are refused
by Docker and kept, and images of other projects on the VPS are never touched.
A rollback pulls its pinned digests from GHCR again, so nothing it needs is
lost; a failed deploy prunes nothing. Every container's log is capped at three
10 MB files (`x-logging` in `compose.yaml`). The repository is public and so
are its Actions logs: a failed deploy prints only container names and states
there; read the container logs on the VPS. A failure before `up` leaves the old
containers running. Old containers keep serving while migrations run, so a
migration must work with the previous release's code: add first, remove in a
later release. A failed Prisma migration stays in `_prisma_migrations`; fix it
by hand with `prisma migrate resolve` before the next deploy.

One-time setup on the VPS:

```bash
sudo useradd -m -s /bin/bash -G docker deploy
sudo install -d -o deploy -g deploy /srv/241-apps
sudo -u deploy git clone https://github.com/mts241alikhlash/241-apps.git /srv/241-apps
sudo -u deploy install -d -m 700 /home/deploy/.ssh
docker network create 241-apps
```

- Membership of `docker` is root-equivalent; the `deploy` user is as
  powerful as root.
- The checkout gets its own `infra/compose/env/<service>.env`,
  `infra/compose/.env` (`TRUST_PROXY=3`) and
  `infra/compose/compose.override.yaml` (the gateway on `127.0.0.1:8081`). It
  points at the native PostgreSQL databases named after the domains, ideally
  with the role `mts241` and nothing else.
- Run `docker login ghcr.io` (section 1) as `deploy` when the images are
  private.
- Host nginx sends every host to `127.0.0.1:8081`.
- `python3` must be installed.
- `deploy-entry.sh` runs from the checkout, so a deploy updates it; only a
  commit on `main` can change what the forced command does.

The key is generated on your own machine:

```bash
ssh-keygen -t ed25519 -N '' -C deploy -f deploy
ssh-keyscan -t ed25519 <DEPLOY_HOST> > known_hosts
```

`<DEPLOY_HOST>` is exactly the string stored in the `DEPLOY_HOST` secret (the
same IP or the same hostname), or host-key checking refuses the connection.

Append the public key to `/home/deploy/.ssh/authorized_keys` (mode 600, owned
by `deploy`) as below. The forced command accepts one 40-character commit sha
and nothing else.

```
restrict,command="/srv/241-apps/infra/scripts/deploy-entry.sh" ssh-ed25519 AAAA... deploy
```

In GitHub, Settings → Environments, create `vps`. Give it the secrets
`DEPLOY_SSH_KEY` (the private key file), `DEPLOY_HOST` (the VPS address) and
`DEPLOY_KNOWN_HOSTS` (the `known_hosts` file), add the owner as a required
reviewer and restrict deployment branches to `main`. Delete the local private
key file afterwards.
