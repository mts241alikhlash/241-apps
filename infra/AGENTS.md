# AGENTS.md: infra

Read [README.md](README.md) first, then the root [AGENTS.md](../AGENTS.md).

## Standards that apply

- [deploy](../docs/guides/deploy.md) and [rollback](../docs/guides/rollback.md)
- [security](../docs/standards/security.md)

## Working here

- Gate: `pnpm --filter ./infra run check`, `node gateway/generate.self-check.mjs`, `node --test scripts/update-lock.test.mjs` and `bash scripts/deploy-entry.test.sh`.
- Server addresses and secrets never go in committed files; they live in `AGENTS.local.md`.
