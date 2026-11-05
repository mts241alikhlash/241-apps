# 0001: Monorepo with a pnpm workspace

## Context

The platform started as twelve repositories (nine apps, one services repo, UI packages and infra). Shared code was copied between repositories with no sync tooling: the platform feature folder existed nine times, the services' shared files ten times, and every change had to be repeated by hand in the same session.

## Decision

One repository with one pnpm workspace: `apps/*`, `services/*`, `packages/*` and `infra`. Shared code becomes a workspace package consumed as `workspace:*`; versions of shared libraries live in the `catalog:` of `pnpm-workspace.yaml`.

## Consequences

- A change to shared code is made once and verified against every consumer in one run.
- One lock file and one toolchain version; upgrades are workspace-wide and held dependencies are recorded in [dependency holds](../dependency-holds.md).
- CI must be selective or fast, because everything lives together; deploys still build per-package images.
- Reverting to separate repositories would mean re-copying shared code, so it is hard to undo.
