# identity-service

## 0.3.2

### Patch Changes

- 599987c: Add the Pengawas Ujian role (supervise rooms and release sessions) and take both permissions away from the Guru role, so only people given the new role can supervise exam rooms. The supervisor schedule picker now lists holders of that role.

## 0.3.1

### Patch Changes

- 907920d: Give the exam technician role the access code and supervise permissions so a technician can read the token and recover sessions that have no room.

## 0.3.0

### Minor Changes

- 6d04832: Exam events can reset the login passwords of their seated students in one action (`POST /exam-events/:id/credentials/reset`, optional `roomId`, requires `confirm: true`): identity-service gives each account a random readable password, stores only its hash, revokes its sessions and answers the new passwords once. The nest-core helper `randomReadablePassword()` provides the password.

### Patch Changes

- Updated dependencies [6d04832]
  - @mts241alikhlash/nest-core@0.2.0

## 0.2.3

### Patch Changes

- 2c689bc: exam-web is presented as Istiqra: tab title, login, header, app switcher, exam sheet and favicon carry the Istiqra name and symbol, and the SSO launcher lists it as Istiqra. The auth config takes a logoSrc so an app can show its own logo while the school wordmark stays. Every app drops the leftover Vite favicon for the school logo.

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
