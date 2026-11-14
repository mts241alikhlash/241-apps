# hr-web

## 0.1.4

### Patch Changes

- 0d58a39: The identity catalog now has `exam-schedules.manage`, which exam-service and exam-web already checked, so the Kegiatan menu and pages open for the roles that schedule exams. The admin-web school unit type menu checks `school-units.read`, the permission its endpoints use. Every web app opens in Indonesian whatever the browser language, as admission-web already did.

## 0.1.3

### Patch Changes

- Updated dependencies [fa71065]
  - @mts241alikhlash/ui@0.1.2
  - @mts241alikhlash/platform@0.1.3
  - @mts241alikhlash/reference-data@0.1.2

## 0.1.2

### Patch Changes

- 7110781: Lint runs one type-aware ESLint config; `lint:strict` and `eslint.typecheck.config.mjs` are gone.
- Updated dependencies [b816247]
- Updated dependencies [061bc87]
- Updated dependencies [d587566]
- Updated dependencies [7110781]
- Updated dependencies [d587566]
  - @mts241alikhlash/ui@0.1.1
  - @mts241alikhlash/platform@0.1.2
  - @mts241alikhlash/web-shared@0.2.0
  - @mts241alikhlash/reference-data@0.1.1

## 0.1.1

### Patch Changes

- 7d58027: Add the hr dashboard with own and management cards.
- 8894dbd: Drop the shared dashboard that called a missing endpoint.
- 63ffb1e: Serve build files under /_app so app routes under /assets work.
- Updated dependencies [8894dbd]
  - @mts241alikhlash/platform@0.1.1
  - @mts241alikhlash/reference-data@0.1.0
