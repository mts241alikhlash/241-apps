# Tasks: Admission Bounded-Context Split

## Phase 1: Baseline

- [x] T001 Create `specs/001-bounded-context-split/preflight.md` with current file ownership, import consumers, route inventory, Git limitation, and baseline command results.
- [x] T002 Run `pnpm run typecheck`, focused admission Jest, `app.module.boots.spec.ts`, and `pnpm run validate`; stop on baseline failure and record exact output in `preflight.md`.

## Phase 2: Wave

- [x] T003 [US1] Create `src/admission/wave/` and move wave entity, repository port, Prisma adapter, six wave use cases including `GetActiveWavesUseCase`, wave DTOs including `admission-wave-ids.dto.ts`, wave specs, and required controller imports without behavior edits.
- [x] T004 [US1] Run wave focused tests, route tests, boot test, and `pnpm run typecheck`; write `wave-checkpoint.md` with results and stale-path scan.

## Phase 3: Announcement

- [x] T005 [US1] Create `src/admission/announcement/` and move announcement entity, repository port, Prisma adapter, announcement use cases, DTOs, specs, and controller imports without behavior edits.
- [x] T006 [US1] Run announcement focused tests, route tests, boot test, and `pnpm run typecheck`; write `announcement-checkpoint.md`.

## Phase 4: Applicant

- [x] T007 [US1] Create `src/admission/applicant/` and move applicant entity, repository port, Prisma adapter, applicant use cases, DTOs, specs, and controller imports without behavior edits.
- [x] T008 [US1] Run applicant focused tests, route tests, boot test, and `pnpm run typecheck`; write `applicant-checkpoint.md`.

## Phase 5: Document

- [x] T009 [US1] Create `src/admission/document/` and move document/file entities, upload/verify use cases, DTOs, and existing document workflow coverage without repository redesign.
- [x] T010 [US1] Run document focused tests, route tests, boot test, and `pnpm run typecheck`; write `document-checkpoint.md`.

## Phase 6: Payment

- [x] T011 [US1] Create `src/admission/payment/` and move payment/file entities, upload/verify use cases, DTOs, and existing payment workflow coverage without repository redesign.
- [x] T012 [US1] Run payment focused tests, route tests, boot test, and `pnpm run typecheck`; write `payment-checkpoint.md`.

## Phase 7: Notification

- [x] T013 [US1] Create `src/admission/notification/` and move notification service/use cases, specs, and controller imports without changing notification behavior.
- [x] T014 [US1] Run notification focused tests, route tests, boot test, and `pnpm run typecheck`; write `notification-checkpoint.md`.

## Phase 8: Application

- [x] T015 [US1] Create `src/admission/application/` and move application entities, parent entity, status policy, enrollment rules, repository port/adapter, workflow use cases/specs, DTOs, and controller imports without changing current enrollment state behavior.
- [x] T016 [US1] Run application workflow/stats tests, route tests, boot test, and `pnpm run typecheck`; write `application-checkpoint.md`.

## Phase 9: Final Verification

- [x] T017 Search `src/admission/` for stale flat root imports and duplicate moved files; record result in `final-verification.md`.
- [x] T018 Run `pnpm test`, `pnpm run build`, and `pnpm run validate`; record exact counts and warnings in `final-verification.md`.
- [x] T019 Confirm no route, permission, DTO, response, status, repository, storage, or integration behavior changes by existing contract tests; record Git checkpoint limitation.

## Dependencies

```text
T001 -> T002 -> T003 -> T004 -> T005 -> T006 -> T007 -> T008 -> T009 -> T010
T010 -> T011 -> T012 -> T013 -> T014 -> T015 -> T016 -> T017 -> T018 -> T019
```

## MVP

T001-T004 proves the first bounded-context move. Package completion requires
T001-T019 before layering starts.
