# assessment-web

**241 Assessment**, the school's marking desk: assessment items, student
scores, report cards, the class register, and the teacher's own dashboard.
Vue 3 + Vite, same stack as `academic-web`.

## Why it is its own app rather than part of academic-web

`assessment-service` had been running since 2026-09-03 with **no frontend at
all**: no app listed `assessment` in its `SERVICE_PREFIXES`, so the gateway
had no upstream for it and no browser could reach its 38 routes.

Putting it back into `academic-web` would have rebuilt the coupling the
2026-09-03 extraction paid to remove. Marking and curriculum are different
jobs done by different people on different days. So it follows the platform's
own rule instead: **one app per service it is the frontend of**, the same
pairing `hr-web` has with `hr-service`.

## What it owns

| Prefix                                                       | Feature                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `/dashboard`                                                 | the teacher's or student's own slice: `GET /dashboards`, plural        |
| `/assessment/items`                                          | assessment items and their weights                                     |
| `/student-scores`, `/student-scores/:assessmentItemId/grade` | entering marks                                                         |
| `/report-card`, `/my/report-card`                            | report cards, generated and read                                       |
| `/attendance/input`, `/attendance/recap`, `/my/attendance`   | the class register                                                     |
| `/my/scores`                                                 | a student's own marks                                                  |
| `/nilai-ujian`                                               | exam scores sent to the assessment for the classes the teacher teaches |

**Every route is English and none keeps the old `/academic/` prefix.**
`src/app/providers/router/router.spec.ts` fails the build if one comes back,
which it did once during the split, catching
`/academic/student-score/:assessmentItemId/grade` that the first sweep missed.

`/dashboard` finally has a client here. It sat in four apps'
`UNROUTED_PREFIXES` because they were calling the singular for a screen
`assessment-service` serves at `/dashboards`; this app calls the plural.

## Four services answer it

| Service    | Port | Answers                                                                                                 |
| ---------- | ---- | ------------------------------------------------------------------------------------------------------- |
| identity   | 3000 | `/auth`, `/users`, `/profiles`, `/roles`, `/permissions`, `/school-units`, `/religions`, `/blood-types` |
| assessment | 4000 | `/assessment-items`, `/assessment-weights`, `/attendances`, `/dashboards`, `/rapors`, `/student-scores` |
| academic   | 3200 | `/academic-years`, `/classrooms`, `/semesters`, `/subjects`, `/teaching-assignments`                    |
| student    | 3900 | `/students`, `/student-enrollments`                                                                     |

The last two are reached only through `src/features/lookup/`. A marking
screen names a class, a term, a subject and a teaching assignment, and after
the split those live elsewhere. That folder holds **api and types only**: no
views, no routes, no stores. It is a read surface, not a second copy of the
academic app.

`UNROUTED_PREFIXES` is empty: every prefix this app calls is routed.

## Exam authoring lives in exam-web

Exam packages, package approval, scheduling, grading and the student exam
sheet moved to `exam-web` (`http://localhost:5181`), the frontend of
`exam-service`. This app keeps `exam-score` (`/nilai-ujian`) because the marks
it shows are assessment records, and `exam-web` owns everything that happens
before those marks exist.

`exam` still keeps `/me/exams` and `/student-exams` in `SERVICE_PREFIXES` for
one release so installed Android APKs that call them keep a gateway upstream.

## Google sign-in on /login

The login form carries a "Masuk dengan Google" button. It sends the browser to
identity-service's `/auth/google?redirect=<origin>`, so no token passes through
a URL: identity-service sets the same refresh cookie a password login does, and
this app's `/oauth/callback` route calls `POST /auth/refresh` to mint the first
access token, then routes by role.

The return origin must be listed in `GOOGLE_OAUTH_REDIRECT_ALLOWLIST` on
identity-service. An origin that is not listed falls back to
`GOOGLE_OAUTH_SUCCESS_REDIRECT_URL`, which points at one app, so a dev port
missing from that list silently lands the user on the wrong app.

## Commands

```bash
pnpm install
pnpm run dev        # http://localhost:5179
pnpm run validate   # format:check + lint + typecheck + lint:strict + test + build
```

The gateway serves it at `assessment.localhost`. `platform-infra/gateway/nginx*.conf` are
generated from `api-routes.config.ts`. Never hand-edit them; run
`node platform-infra/gateway/generate.mjs` from the workspace root after changing a
prefix, and `--check` before a deploy.

## What did not come with it

`achievement`, `scholarship` and `educational-history` stayed behind: **no
service declares those models any more**, so there is nothing for a screen to
call. They are not a gap in this
app; they are a product decision nobody has taken.
