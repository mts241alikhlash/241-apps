# 0006: `nest-core` as a built package

## Context

Ten services each carried the same infrastructure code (response interceptor, identity client, permission guard, health, logger, upload limits), copied ten times.

## Decision

The code identical in every service lives once in `packages/nest-core`, compiled with `nest build` to `dist`, which its `exports` point at, with subpath exports (`config`, `auth`, `access-control`, ...). Nest, Prisma and the other libraries are `peerDependencies` so every service shares one instance. Domain code, lookup ports and anything tied to one service's generated Prisma client stay in the service.

## Consequences

- A fix to shared behavior reaches every service at once; so does a mistake, so a change runs the suite for all services.
- Services must build `nest-core` before typecheck or test (`dev.mjs` and the Dockerfiles do); source-only export was rejected because the swagger plugin and decorator metadata need compiled output.
- A difference a service needs must become an option, not a fork.
