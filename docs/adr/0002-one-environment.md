# 0002: One environment

## Context

The polyrepo had `dev`, `staging` and `production` variants of compose files, locks, databases (suffixed with the environment and with `service`), workflows and a server folder per environment. Staging was parked and nothing ran on it; the names leaked the environment into everything.

## Decision

There is one environment. Names carry no environment word: Compose project and network `241-apps`, databases named after the service domain, one lock (`infra/deployment/lock.json`), one deploy workflow and one GitHub Environment. Local development uses the same Compose file with the `storage` profile; the server uses native PostgreSQL and MinIO.

## Consequences

- Fewer files and no environment drift to reconcile.
- There is no staging to test a deploy on: a deploy goes straight to the live environment, so rollback must be quick ([rollback](../guides/rollback.md)).
- A second environment later means reintroducing a parameter in the lock, compose and workflows; that is a deliberate future decision.
