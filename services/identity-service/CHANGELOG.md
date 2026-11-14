# identity-service

## 0.2.2

### Patch Changes

- 0d58a39: The identity catalog now has `exam-schedules.manage`, which exam-service and exam-web already checked, so the Kegiatan menu and pages open for the roles that schedule exams. The admin-web school unit type menu checks `school-units.read`, the permission its endpoints use. Every web app opens in Indonesian whatever the browser language, as admission-web already did.

## 0.2.1

### Patch Changes

- adbca23: The login, refresh and password-reset rate limit counts per account (identifier, email or a hash of the token) behind each address, so a class signing in together from one school network no longer shares one budget of 20 a minute.

## 0.2.0

### Minor Changes

- ed0a2aa: Add the exam-schedules.manage-all permission and grant it to the curriculum roles.

### Patch Changes

- 7110781: Lint runs one type-aware ESLint config; `lint:strict` and `eslint.typecheck.config.mjs` are gone.
- Updated dependencies [7110781]
  - @mts241alikhlash/nest-core@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [a6602e2]
  - @mts241alikhlash/nest-core@0.1.1
