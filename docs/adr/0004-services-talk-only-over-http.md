# 0004: Services talk only over HTTP

## Context

With all services in one repository, importing another service's source or Prisma client is one `import` away. The services were split by copying, so nothing mechanical stops one from growing a second copy of another's types and rules.

## Decision

A service never imports another service's source, types or Prisma client. When it needs data it does not own it declares a port, implements an HTTP adapter behind it in `platform/` or `integration/`, and defines a narrow read model of the fields it uses. Cross-service endpoints are guarded by the provisioning token and fail closed with 503.

## Consequences

- A service can be extracted, scaled or rewritten without touching its callers.
- Some duplication of read models is accepted; business arithmetic must still have one implementation behind a contract.
- The nest ESLint preset enforces the import boundary; the rest is review ([backend standard](../standards/backend.md)).
