# @mts241alikhlash/nest-core

## 0.2.0

### Minor Changes

- 6d04832: Exam events can reset the login passwords of their seated students in one action (`POST /exam-events/:id/credentials/reset`, optional `roomId`, requires `confirm: true`): identity-service gives each account a random readable password, stores only its hash, revokes its sessions and answers the new passwords once. The nest-core helper `randomReadablePassword()` provides the password.

## 0.1.2

### Patch Changes

- 7110781: Lint runs one type-aware ESLint config; `lint:strict` and `eslint.typecheck.config.mjs` are gone.

## 0.1.1

### Patch Changes

- a6602e2: Add the time module that derives calendar days in the school time zone.
