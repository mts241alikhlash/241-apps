# hr-web

**241 HR**, kepegawaian, presensi and penggajian in one browser app: the staff
register, the gate attendance built on it, leave, and payroll. Vue 3 + Vite,
same stack as `academic-web`.

Renamed from `presence-web` on 2026-09-10, when the employee register moved in
from `academic-web` and `employee-service` became `hr-service`.

## Three domains, one app

| Prefix | Features |
|---|---|
| `/employee/*` | teachers, positions, position categories, employment types, teacher accounts |
| `/attendance/*` | credential cards, devices, the kiosk, shifts and holidays, leave, periods, recaps |
| `/payroll/*` | salary components, per-person salaries, monthly runs, payslips |

The staff register arrived here on 2026-09-10. It had been in `academic-web`
since the split, which was wrong twice over: a teacher's NIP, employment type
and structural position are employment records, not academic ones, and
`hr-service` had owned the tables since 2026-09-03. `academic-web` keeps a
read-only teacher picker (`/teachers` for a timetable row, a subject, a
homeroom slot) and nothing else.

`src/features/shared/{import-export,import-preview,multi-step-form}` came with
the register. They are the Excel import/export and the multi-step teacher
form; no other extracted app carries them.

## Five services answer it: more than any other app

| Service | Port | Answers |
|---|---|---|
| identity | 3000 | `/auth`, `/users`, `/profiles`, `/school-units`, `/school-unit-types`, `/religions`, `/blood-types` |
| hr | 3800 | `/teachers`, `/teacher-positions`, `/positions`, `/position-categories`, `/employment-types`, `/payroll` |
| presence | 3400 | `/presence` |
| academic | 3200 | `/academic-years`, `/academic-calendars` |
| student | 3900 | `/students` |

`/payroll` moved from presence (3400) to hr (3800) on 2026-09-10; the app is
the only caller and the manifest is the only place that knew.

The last two are reached from a single file,
`src/features/lookup/api/lookupApi.ts`: a presence record names a person and a
term, and after the split those live in other services. All five have to be
running for the app to be usable. This is the app that feels the split most.

## Student attendance is not here

Gate presence is person-agnostic. `presence-service` keys every row on
`userId` and its only distinction is a `subjectType` of `STUDENT` or
`EMPLOYEE`. Student RFID/QR therefore costs no schema change; it needs a screen
to issue and print student cards and a place to show a student recap, and both
belong in `academic-web`, where students live. This app stays the employee
side of the same service.

## What was narrowed

`packages/platform` carried eighteen feature folders; this app reaches `auth`,
`dashboard`, `profile` and `reference-data`, which pull in
`address`, `blood-type`, `religion` and `school-unit-type`. The rest went. The
four that stayed only as dependencies keep their `api/`, `services/` and
`types/`, not their admin screens.

`packages/reference-data` came back with the staff register. The teacher form
reads it, after being dropped at extraction.

`@types/qrcode` is a real dependency, not a leftover:
`src/features/presence/credential/views/CardPrintSheet.vue` renders the QR code
the gate scanner reads.

## One gap, and one deletion

`/dashboard` is called here and served by nothing. It is the near miss:
assessment-service serves `/dashboards`, plural, a teacher's or student's own
slice, a different shape. It sits in `UNROUTED_PREFIXES`, so it 404s in dev
exactly as the gateway 404s it.

`settings` was deleted on 2026-09-23: no service serves `/settings`, so it only
ever fetched a 404 and fell back to the static branding in `configureAuth()`.
`/settings` stays in `UNROUTED_PREFIXES` until the next routing-manifest change.

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
pnpm run dev        # http://localhost:5177
pnpm run validate   # format:check + lint + typecheck + lint:strict + test + build
```

The gateway serves it at `hr.localhost`. `platform-infra/gateway/nginx*.conf` are generated
from `api-routes.config.ts`. Never hand-edit them; run
`node platform-infra/gateway/generate.mjs` from the workspace root after changing a
prefix, and `--check` before a deploy.
