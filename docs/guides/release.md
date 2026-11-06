# Release

Every app, service and library versions on its own. Versions are written by Changesets; images are built only for the packages that were bumped.

## 1. Add a changeset

Any change to a package needs a changeset (`pnpm changeset`): choose the packages and the bump, and write one sentence for the changelog. The PR check `Validate` runs `.github/scripts/require-changeset.mjs` and fails a PR that changes a package without one. Documentation, specs and the lock file need none, and Dependabot branches and the Release pull request (`changeset-release/main`, which consumes the changesets) and the lock pull request (`chore/update-lock`, which only pins digests) are exempt.

Result: a `.changeset/<name>.md` listing your packages is part of the PR, and the `ci-ok` check is green.

## 2. The 0.x rule

Below `1.0.0` a breaking change is a `minor` changeset and a `major` changeset is refused by the guard. A breaking change to an OpenAPI contract demands `minor` below `1.0.0` and `major` from `1.0.0` on (`scripts/check-contract-compatibility.mjs` checks it on every PR).

Result: a PR that removes a contract field without the right bump fails with the package and the version it is at.

## 3. Merge, then the Release PR

After your PR merges, the `Release` workflow runs `changesets/action`: when changesets are pending it opens or updates the PR `Release`, which bumps versions, writes changelogs, emits an app's routing manifest into `infra/gateway/manifests/<app>-<version>.json` and updates the lockfile (`scripts/release-version.mjs`). Merge that PR to release.

Result: the `Release` PR changes only versions, changelogs, manifests and `pnpm-lock.yaml`.

## 4. What Release does after the Release PR merges

When no changesets are pending, `scripts/release-targets.mjs` lists every package whose tag `<name>@<version>` does not exist yet. For each app and service the workflow builds `ghcr.io/mts241alikhlash/<name>:<version>` from the repository root with its `Dockerfile` (cache, OCI labels, provenance, SBOM) and attests it. Then it creates the tag `<name>@<version>` for all targets, libraries included, and a GitHub Release for each app and service with that version's changelog section. A version whose tag exists is never rebuilt or retagged.

Result: `git tag --list '<name>@*'` shows the new tag and the package page in GHCR shows the version with an attestation.

## 5. From images to the server

The `Update lock` workflow starts after a successful Release: it pins the new digests in `infra/deployment/lock.json`, builds the gateway image when its generated configuration changed (tag = first 12 hex of the hash of the rendered `nginx*.conf`), and opens the pull request `Update the lock`. Merging it starts the deploy: see [deploy](deploy.md).

## GitHub App for the release and lock pull requests

Pull requests created with `GITHUB_TOKEN` do not trigger other workflows, so the two workflows that open a pull request which must run `Validate` use the token of one GitHub App, `241-apps bot`: the `version` job of `Release` (the Release pull request, through `changesets/action`) and `Update lock` (the pull request `Update the lock`). There is no fallback: without the App both fail at the token step. Set it up once, before the first push of `main`:

1. As the owner of the organization, create a GitHub App (Settings, Developer settings, GitHub Apps, New GitHub App) named `241-apps bot`. Turn webhooks off. Repository permissions: **Contents: Read and write**, **Pull requests: Read and write** (Metadata is read-only by default); nothing else.
2. Under "Where can this app be installed?" choose "Only on this account", create it, and note the **App ID**.
3. Generate a private key (a `.pem` file is downloaded) and keep it only for the next step.
4. Install the App on the organization with access to the single repository `241-apps`.
5. In the repository (Settings, Secrets and variables, Actions) add the variable `BOT_APP_ID` (the App ID) and the secret `BOT_APP_PRIVATE_KEY` (the whole `.pem` content). Delete the downloaded file.
6. After the first Release, run `Update lock` from the Actions tab.

Result: the "app-token" step succeeds in both workflows, and the Release pull request and the pull request `Update the lock` each show a green `ci-ok` check.

## Dependabot pull requests

Dependabot opens grouped update pull requests (`.github/dependabot.yml`), with no ignore rules: every update type is taken. The workflow `Dependabot` (`.github/workflows/dependabot-auto-merge.yml`) handles each of them:

1. For every workspace package whose `package.json` or `Dockerfile` the update changes (`infra/gateway/Dockerfile` counts for `infra`), it commits one `patch` changeset `.changeset/dependabot-<pull request number>.md` to the Dependabot branch through the GitHub contents API, with the token of the `241-apps bot` App, so `Validate` runs again on the new head. It skips this when that file already exists. `require-changeset.mjs` still exempts `dependabot/` branches; the changeset is an addition, not a requirement.
2. It enables auto-merge (`gh pr merge --auto --squash`). GitHub merges the pull request once `ci-ok` is green; `ci-ok` stays the only gate. An update that touches `infra/deployment/lock.json` or `infra/compose/` is not auto-merged and waits for the owner, because merging it starts a Deploy.

Workflows started by Dependabot read secrets from the repository's **Dependabot secrets**, not from the Actions secrets. Add `BOT_APP_PRIVATE_KEY` there too (Settings, Secrets and variables, Dependabot); the variable `BOT_APP_ID` is shared. Without it the changeset step is skipped and the update still auto-merges.

Result: a Dependabot pull request shows a `chore: changeset for dependabot #<n>` commit by the App and the label "Auto-merge enabled".

## Going to 1.0.0

The guard refuses a `major` changeset below `1.0.0`, so the first stable release is a deliberate edit: in one PR set the package's `version` to `1.0.0` (and, for a service, `info.version` of its contract and the version of its `*-api` client, which `pnpm run version:check` keeps equal) and add a `patch` changeset describing the release. From then on breaking changes are `major`.

Result: `pnpm run version:check` passes and the Release PR tags `<name>@1.0.0`.
