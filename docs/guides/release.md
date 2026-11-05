# Release

Every app, service and library versions on its own. Versions are written by Changesets; images are built only for the packages that were bumped.

## 1. Add a changeset

Any change to a package needs a changeset (`pnpm changeset`): choose the packages and the bump, and write one sentence for the changelog. The PR check `Validate` runs `.github/scripts/require-changeset.mjs` and fails a PR that changes a package without one. Documentation, specs and the lock file need none, and Dependabot branches are exempt.

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

## GitHub App for the lock pull request

Pull requests created with `GITHUB_TOKEN` do not trigger other workflows, so `Update lock` opens its pull request with the token of a GitHub App. There is no fallback: without the App the workflow fails at the token step. Set it up once, before the first Release:

1. As the owner of the organization, create a GitHub App (Settings, Developer settings, GitHub Apps, New GitHub App) named for example `241-apps-lock`. Turn webhooks off. Repository permissions: **Contents: Read and write**, **Pull requests: Read and write** (Metadata is read-only by default); nothing else.
2. Under "Where can this app be installed?" choose "Only on this account", create it, and note the **App ID**.
3. Generate a private key (a `.pem` file is downloaded) and keep it only for the next step.
4. Install the App on the organization with access to the single repository `241-apps`.
5. In the repository (Settings, Secrets and variables, Actions) add the variable `LOCK_APP_ID` (the App ID) and the secret `LOCK_APP_PRIVATE_KEY` (the whole `.pem` content). Delete the downloaded file.
6. Run `Update lock` from the Actions tab.

Result: the run's "app-token" step succeeds and the pull request `Update the lock` shows a green `ci-ok` check.

## Going to 1.0.0

The guard refuses a `major` changeset below `1.0.0`, so the first stable release is a deliberate edit: in one PR set the package's `version` to `1.0.0` (and, for a service, `info.version` of its contract and the version of its `*-api` client, which `pnpm run version:check` keeps equal) and add a `patch` changeset describing the release. From then on breaking changes are `major`.

Result: `pnpm run version:check` passes and the Release PR tags `<name>@1.0.0`.
