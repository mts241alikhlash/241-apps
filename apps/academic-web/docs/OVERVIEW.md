# academic-web

The Vue 3 + Vite frontend for `academic-service`, carrying its own
`packages/platform` and `packages/reference-data`. `packages/ui` and
`packages/shared` are gone: this app now depends on the published
`@mts241alikhlash/ui` and `@mts241alikhlash/web-shared` packages (from the
`web-packages` repo) instead of a local copy — see "The rule that bites
hardest" below, which no longer applies to those two.

**Start with `docs/ARCHITECTURE.md`.** It explains the structural rule that
holds the packages together (path aliases, not `workspace:*` packages), which
of the 38 academic and 18 platform feature folders stayed here vs. moved to
`hr-service`/`student-service`/`assessment-service`/`identity-service`, and
critically, the **Known gaps** section: this app
is wired to one backend (academic-service) and several things it kept
(auth, profile, the student/teacher rosters) are actually
identity-service's, student-service's, or hr-service's endpoints, not
yet reachable.

`docs/adr/0010-shared-session-across-apps.md` is the one ADR this app's own
code actually depends on: how the shared-cookie session across all five
original web apps works, and why `restoreSession()`/`GET /auth/me` are
shaped the way they are.

## The student register arrived on 2026-09-11

Four modules were added:

| Folder | Screens | Served by |
|---|---|---|
| `features/academic/student/` | `/student`, `/student/create`, `/student/account` | student-service |
| `features/academic/parent/` | `/data/parent` | student-service |
| `features/academic/student-parent/` | `/data/parent-relation` | student-service |
| `features/academic/student-graduation/` | `/academic/graduation`, `/student/alumni` | student-service |

They came with `shared/import-export`, `shared/import-preview` and
`shared/multi-step-form`, which the student create wizard and the bulk import
need.

**Why they live under `features/academic/` and not a `features/student/`.**
The folder names the app's domain, not the service behind it: this app already
calls four services (identity, academic, student, hr) from modules sitting
side by side, and `classroom/` has read `/student-enrollments` since the
split. A folder per upstream service would put `classroom/` in two places at
once. The service boundary is enforced in the backend, by data ownership,
not by how a frontend files its screens.

**Nothing had to be rewired.** All six prefixes (`/students`,
`/student-parents`, `/student-graduations`, `/parents`, plus the
`/student-enrollments` and `/student-promotions` already in use) were already
in `api-routes.config.ts`, the Vite proxy and the generated gateway: routed
since the extraction for screens that did not exist yet. `UNROUTED_PREFIXES`
stays empty.

Every payload was diffed by hand against student-service's DTOs before this
was called done: `CreateStudentDto`, `CreateParentDto`,
`CreateStudentWithRelationsDto`, `CreateStudentParentDto`,
`CreateStudentGraduationDto` and `BulkGraduationDto`. Because a field name
that drifted would compile fine and fail at runtime. All matched.

**Three things were deliberately left out:**
`student-score` (assessment-web's), `/achievement` (no service declares
`AchievementType` any more, it went with the multi-tenant layer), and the
`educational-history` / `scholarship` folders, which no service serves.

`src/config/menuConfig.spec.ts` gained the URL test the other apps have: every
menu URL must resolve to a registered route, not to `not-found`. It is the
test that found four dead links in inventory-web the day it was written.

## The timetable builder stopped guessing on 2026-09-11

Three things on `/learning/time-slot` were wrong in the same way: each made
a decision on the operator's behalf and then hid that it had:

**The type dropdown defaulted to whichever type was created first.** A new row
arrived already claiming to be a "Jam Pelajaran" whether or not it was, and a
row saved without anyone looking at that field is wrong data that nothing
flags. It now starts empty with a `Pilih tipe...` placeholder, and `validate()`
already refused an empty `typeId`, so the mistake is caught rather than
assumed.

**Every new row started at 07:00–07:30.** Slots are consecutive; the second one
starts where the first ended. A new row now takes its start from the previous
row's end, and only the first row of an empty table falls back to 07:00.

**The end time had to be typed.** Choosing a type now fills it in from that
type's `defaultDurationMinutes`, so building a day is: add row, pick type, add
row, pick type.

Two rules keep that from fighting the operator:

- **Changing the type re-derives the end.** That is what picking a type means.
- **Moving the start carries the end with it**, preserving the slot's actual
  length rather than resetting it to the type's default. A row someone
  deliberately made 35 minutes long stays 35 minutes when it is moved.

`domain/time-of-day.ts` holds the arithmetic as pure functions: `addMinutes`,
`durationBetween`, `shiftEndWithStart`, all wrapping past midnight and all
returning the input untouched rather than inventing a time when the string is
not `HH:MM`. 22 tests cover it and the three behaviours above.

The table also shows what it decided: a **Durasi** column reading the row's
real length, and an amber note under any start time that leaves a gap or
overlaps the row before it. Neither blocks saving: a gap between the last
morning lesson and the first afternoon one is legitimate, they just stop the
schedule being wrong silently.

## Importing 188 students used to close the dialog and lose track

`POST /students/bulk-import` is a preview and writes nothing;
`POST /students/bulk-import/resolve` applies the result. Three things made a
large import look like it had half worked:

1. **Every row went in one request.** `buildResolveDecisions` submits SUCCESS
   rows as well as conflicts, and student-service processes them **serially**,
   each row is a bcrypt hash, a `POST /accounts` to identity-service, a local
   transaction and an enrollment. 188 rows is a single request running for a
   minute or more, and the JSON body is close to Express's 100 kb default.
2. **A failed row was a number.** `processBulkImportConflicts` catches per row,
   counts `failed`, and still answers **200**. The screen showed one sample
   error in a toast description and then closed the dialog.
3. **The progress bar was a timer**, easing towards 90% on a `setInterval`
   whatever the server was doing.

All three are fixed:

- **The client sends batches of 25** and adds up the results, so progress is a
  real fraction of rows sent and no single request runs long.
- **Errors carry their row.** `BulkImportConflictError` gained an `index`; the
  client offsets it by the batch and `markFailedRows` turns each one back into
  a red row in the preview table, with the server's message on it.
- **A failure keeps the dialog open.** Only a clean run closes it. The toast
  says how many failed and that the table is marked; the operator fixes those
  rows and re-imports just them.

If a batch itself throws, the toast names how many rows were already sent
before it stopped, a partial import is stated rather than guessed at.

**bcrypt was left at cost 10.** Batching already keeps each request short, and
lowering the work factor to speed up an import trades a permanent security
property for a one-off convenience.

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
pnpm run dev         # http://localhost:5173, expects academic-service on :3200
pnpm run validate    # format:check + lint + typecheck + lint:strict + test + build
```

## The rule that bites hardest

**No import statement should ever need to change to keep `packages/platform`
or `packages/reference-data` working.** They are copied, not repackaged:
`vite.config.ts` and `tsconfig.json` alias `@/features/platform/*` and
`@/reference-data/*` straight at `packages/*/src`. Every sibling app uses the
same mapping for these two, so a change to it has to hold everywhere or the
aliases stop agreeing.

`@/ui` and `@/shared` used to follow the same rule but no longer do: this app
consumes `@mts241alikhlash/ui` and `@mts241alikhlash/web-shared` (published
from the `web-packages` repo, via GitHub Packages) as real dependencies now,
so those two import specifiers changed everywhere they were used. A fix to a
shared component or util belongs in `web-packages`, published, then pulled in
here with `pnpm update @mts241alikhlash/ui @mts241alikhlash/web-shared` — not
copied by hand.
