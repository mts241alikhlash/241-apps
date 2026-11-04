# admin-web

Platform administration: users, roles, permissions, the activity log, the
school's own profile, and the reference lists everything else picks from.
Vue 3 + Vite, same stack as `academic-web`.

Split out of `inventory-web` on 2026-09-10. Those eleven screens had been
riding along in the assets app, back when every app shipped the
whole platform. They are not inventory, and an account or a role edited from
"SIMAS" is a confusing place to grant someone access to SIAKAD.

## Two services answer it

| Service | Port | Answers |
|---|---|---|
| identity | 3000 | `/auth`, `/sso`, `/users`, `/profiles`, `/roles`, `/permissions`, `/audit-logs`, `/school-units`, `/school-unit-addresses`, `/school-unit-social-medias`, `/school-unit-types`, `/religions`, `/blood-types` |
| portal | 3600 | `/files` |
| inventory | 3300 | `/inventory/workflows/role-usage` only: the role screen's warning about approval steps a role approves |

**`UNROUTED_PREFIXES` is empty**. The only app where that is true. Everything
this app calls has an owner.

`/files` reaching portal-service is the odd one, and it is history rather than
design: portal-service owns the public website, and `platform/file` (`POST
/files/upload?appKey=`, `GET /files`, `DELETE /files/:id`, partitioned by app)
happens to live there because that is where object storage was wired first. If
file management is taken seriously it belongs in a `storage-service` of its
own, and this app changes one line in the manifest.

What does **not** belong there: admission-service's documents and payment
proofs. Those go through its own `core/storage` and are part of an application,
not files anyone browses. Two kinds of file; only one wants a manager screen.

## What it deliberately does not have

**`settings`.** `platform/settings`'s `AppSetting` has no owning service. The
other apps keep the feature and 404 the prefix; a new app should not ship a
screen that provably cannot work, so this one deletes it, the same call
academic-web made.

## The dashboard: one query per widget

Four cards, four independent `useQuery` calls. That is the point: when
identity-service is unreachable, three cards can still render and the fourth
shows its own retry, rather than the page going blank. Each card carries three
states: `isPending` (skeleton), `isError` (message plus retry), `isFetching`
(a background-refresh hint, which is not the same as a first load). `staleTime`
is five minutes, so navigating away and back does not refetch.

The two paginated widgets read purpose-built endpoints added to
identity-service on 2026-09-10: `GET /users/summary` (total, active, inactive)
and `GET /audit-logs/summary` (total, plus the last 24 hours). Both count in a
single `$transaction` rather than fetching rows, so the cost does not grow with
the table.

**One endpoint per widget, deliberately.** A single fat `/summary` that every
app calls is the shape that becomes a god-endpoint nobody dares change. Every
app adds a field, no app can remove one.

Roles and permissions are still counted from their full lists, and that is
proportionate rather than lazy: both are small, complete, unpaginated reads
that the app already makes elsewhere. Give them summary endpoints when the
lists grow enough that downloading them for a number is the wrong trade.

`GET /users/summary` is declared **before** `@Get(':id')` in the controller.
Nest matches in declaration order, so the other way round makes `summary` a
user id; `route-collisions.spec.ts` fails the build if that regresses.

## i18n starts here, and `en` is the source

`src/i18n/`. **`en` is both the default locale and the `fallbackLocale`**, so a
key that has not been translated yet falls back to English rather than
rendering blank. `id` is a translation, loaded on demand with `import()`. It
is not in the initial bundle, which is what keeps a third locale from costing
anything at first paint.

`setLocale` also sets `document.documentElement.lang`, which screen readers and
search engines read. The locale is resolved before mount (`localStorage` →
`navigator.languages` → `en`), so there is no flash of the wrong language.

One typing detail worth knowing: `messages` is annotated
`Record<Locale, typeof en>` even though only `en` is passed. Without it
TypeScript narrows the locale union to `'en'` from the object literal, and
`setLocaleMessage('id', …)` stops compiling. The lazy path would be
unreachable.

**The menu is the pilot.** `menuConfig.ts` carries keys (`menu.users`), not
sentences, and `NavMain.vue` resolves them. Three tests hold the line: every
menu label must look like a key, both locales must define every key the menu
uses, and every menu URL must resolve to a route this app registers.

The rest of the app is still Indonesian in the template. Move it feature by
feature, when you are in that feature for another reason. A single sweep
across thousands of strings is the kind of refactor that ends up half done.

## Routes are English, and now correct

`/setting/user`, `/setting/role`, `/setting/permission`, `/setting/audit-log`,
`/school-unit`, `/setting/school-unit-type`, `/setting/religion`,
`/setting/blood-type`.

Those paths were always English in the feature `routes.ts` files. What was
wrong was inventory-web's menu, which linked to `/pengaturan/kelola-pengguna`,
`/pengaturan/roles`, `/pengaturan/permissions` and `/pengaturan/audit-logs`:
**four routes that do not exist**. Every one of those menu entries 404'd. The
menu here is built against the real paths, and a test now fails the build if a
link stops resolving.

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
pnpm run dev        # http://localhost:5178
pnpm run validate   # format:check + lint + typecheck + lint:strict + test + build
```
