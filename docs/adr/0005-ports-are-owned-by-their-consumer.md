# 0005: Ports are owned by their consumer

## Context

Use cases need data and side effects from outside the domain (repositories, other services, storage). Interfaces defined next to the implementation couple callers to what the implementation offers.

## Decision

A port (an abstract class) is declared by the code that consumes it, in `domain/repositories/` or `platform/` / `integration/`, with its input and output types in the same file. Implementations in `infrastructure/` depend on the port, never the reverse. Use cases are injected with the port token.

## Consequences

- A use case states exactly what it needs and is testable with a fake.
- Several consumers needing similar data may declare similar ports; that is accepted over a shared fat interface.
- Moving an implementation (Prisma to HTTP) changes only the module wiring.
