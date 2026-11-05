# 0008: A single role bypass

## Context

`ADMIN` used to skip the permission check, with an exemption list carved out per area. That failed silently: a new area needing separation had to be remembered into the list, and forgetting it let `ADMIN` pass before any grant was read. Copies of the role check also appeared in use cases and guards and drifted from the original.

## Decision

Exactly one role, `SUPER_ADMIN`, bypasses permission checks, as break-glass so the school can recover when grants lock everybody out. The check exists in one place, `PermissionGuard` in `packages/nest-core`. Every other role, `ADMIN` included, is authorized by the permissions it holds. Each service carries `single-role-bypass.spec.ts`, which sweeps its source for a second bypass.

## Consequences

- Adding a second bypassing role or an exemption mechanism is an amendment to this decision.
- Some powers are granted only through explicit-only permission codes to named roles ([security standard](../standards/security.md)).
- Admins need explicit grants for new areas; seeds grant new codes to unedited default roles.
