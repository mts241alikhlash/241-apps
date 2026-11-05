# 0003: Database per service

## Context

The services were split out of a single backend that shared one schema. A schema declared in two services lets either one's migration drop the other's tables, and a join across modules hides coupling.

## Decision

Each service owns one PostgreSQL database named after its domain (`identity`, `academic`, `hr`, ...) and is the only process that migrates it. Another service's data is reached over HTTP, never by reading its tables.

## Consequences

- Services deploy and migrate independently; a failed migration affects one service.
- Cross-service reads need an endpoint and an adapter, and consistency across services is eventual (sagas, idempotent writes).
- Reports that join across domains must be built from API calls or a dedicated read model.
