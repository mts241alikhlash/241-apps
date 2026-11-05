# identity-service

## Purpose

Owns identity and access: users, profiles, roles, permissions, sessions, the audit log, the school unit record, a person's address, administrative areas and single sign-on.

Port 3000 locally; database `identity` (21 models: `User`, `AuthSession`, `OAuthAccount`, `PasswordResetToken`, `SsoAuthorizationCode`, `FileCategory`, `File`, `Role`, `Permission`, `UserRole`, `RolePermission`, `AuditLog`, `Profile`, `Religion`, `BloodType`, `Region`, `SchoolUnitType`, `SchoolUnit`, `SocialMedia`, `SchoolUnitSocialMedia`, `Address`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): none.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- Owns `users`; nothing outside joins to it. A service that needs the person behind a `userId` asks over HTTP.
- Owns login, refresh, logout, password flows and role and permission CRUD; consumers only verify tokens.
- The school unit lives here because every service eventually reads institution config and already calls this one for auth.
- Structural roles (`APPLICANT`, `STUDENT`) are protected from deletion; admission-service grants them by name.

## Gotchas

- Sign-in, refresh, logout and SSO exchange refuse a request whose `Origin` is not the host itself: the gateway and any proxy in front must pass `Host` unchanged.
- A token may arrive without `permissions` when the grant list is too large for the header; the guard then reads the database.
- Profile photo storage (S3) is optional here; without it the photo endpoints refuse.

## Open work

- Nothing checks automatically that the structural roles admission-service names still exist.
