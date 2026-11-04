# exam-web

**241 Exam**, the school's exam desk: question authoring and package approval,
exam scheduling, exam grading, and the sheet a student sits at. Vue 3 + Vite,
same stack as `assessment-web`.

## Why it is its own app rather than part of assessment-web

assessment-web had grown two jobs. Marking coursework and running an exam are
different work done by different people on different days, and the exam half
carried its own service, its own permission group and its own APK. It follows
the platform's rule instead: **one app per service it is the frontend of**, the
same pairing `hr-web` has with `hr-service` and `assessment-web` has with
`assessment-service`.

## What it owns

| Prefix | Feature |
|---|---|
| `/paket-soal`, `/paket-soal/:id`, `/paket-soal/:id/soal/baru`, `/paket-soal/:id/soal/:questionId`, `/paket-soal/:id/impor` | exam packages: questions live inside a package (write, import, take from another package) |
| `/persetujuan-paket`, `/persetujuan-paket/:id` | package approval: read every question of a submitted package, note, approve or return |
| `/jadwal-ujian` | exam schedules: a package for a classroom in a time window, cancel, and the access code students enter |
| `/penilaian-ujian`, `/penilaian-ujian/:scheduleId`, `/penilaian-ujian/:scheduleId/:sessionId` | exam grading: the exams of the teacher's classes with how many students wait, then each short answer and essay |
| `/ujian`, `/ujian/:scheduleId/token`, `/ujian/sesi/:sessionId` | the student exam sheet: enter the token, then sit the exam |

`landingPath` sends each signed-in user to the first of those their permissions
allow — schedules, packages, grading, sitting — and to `/profile` otherwise, so
a technician holding only room or session grants is not bounced between `/` and
a screen they cannot open.

## Four services answer it

| Service | Port | Answers |
|---|---|---|
| identity | 3000 | `/auth`, `/sso`, `/users`, `/profiles`, `/roles`, `/permissions`, `/school-units`, `/religions`, `/blood-types`, `/regions` |
| exam | 4100 | `/exam-events`, `/exam-rooms`, `/exam-reports`, `/exam-files`, `/exam-grading`, `/exam-imports`, `/exam-packages`, `/exam-questions`, `/exam-schedules`, `/exam-sessions`, `/me/exams`, `/student-exams` |
| academic | 3200 | `/academic-years`, `/classrooms`, `/grades`, `/semesters`, `/subjects`, `/teaching-assignments` |
| student | 3900 | `/students`, `/student-enrollments` |

The last two are reached only through `src/features/lookup/`. A scheduling or
grading screen names a class, a term, a subject and a teaching assignment, and
those live elsewhere. That folder holds **api and types only**: no views, no
routes, no stores. It is a read surface, not a second copy of the academic app.

`UNROUTED_PREFIXES` is empty: every prefix this app calls is routed.

## What deliberately did not come with it

`/nilai-ujian` — exam scores sent to the assessment for the classes a teacher
teaches — stayed in assessment-web, where the score that receives them lives.
`/dashboard`, `/assessment/items`, `/student-scores`, `/report-card` and
`/attendance/*` are assessment-web's and are refused here;
`src/app/providers/router/router.spec.ts` fails the build if one resolves.

## Commands

```bash
pnpm install
pnpm run dev        # http://localhost:5181
pnpm run validate   # check:comments + format:check + lint + typecheck + lint:strict + test + build + routes:check
```

The gateway serves it at `exam.localhost`; see
`infra/docs/OVERVIEW.md`. `infra/gateway/nginx*.conf` are
generated from `api-routes.config.ts`. Never hand-edit them; run
`node platform-infra/gateway/generate.mjs` from the workspace root after
changing a prefix, and `--check` before a deploy.

Zero comments is a gate: `scripts/check-no-comments.mjs` fails on any comment
outside the two directives, and its own test is typechecked and linted with the
rest of `scripts/`.
