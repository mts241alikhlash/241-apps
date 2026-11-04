# portal-web

The public website, and the admin screens behind it: news, articles, pages,
agenda, gallery, announcements. Vue 3 + Vite, same stack as `academic-web`.

## Which services answer it

| Service | Port | Answers |
|---|---|---|
| identity | 3000 | `/auth`, `/users`, `/profiles`, `/school-units`, `/school-unit-types`, `/religions`, `/blood-types` |
| portal | 3600 | `/portal`, `/files` |

Two services, not one: the public pages are portal-service's, but signing in to
the admin side is identity-service's, and so is every dropdown on the profile
form. `/files` is portal-service's own upload endpoint:
`src/features/media/api/mediaApi.ts` posts to `/files/upload?appKey=PORTAL`.

## What was narrowed

`packages/platform` carried eighteen feature folders. This app reaches `auth`,
`profile` and `reference-data`, which pull in `address`,
`blood-type`, `religion` and `school-unit-type`. The other eleven went. The four
that stayed only as dependencies keep their `api/`, `services/` and `types/`.
their `config.ts`, `routes.ts` and `*ListView.vue` are the reference-data-driven
admin screens, and this app's router registers none of them.

`packages/reference-data` stayed: `src/features/taxonomy` uses it for the category
and tag screens.

## CMS body content is sanitised through SafeHtml

`PublicPageView.vue`, `PublicPostDetailView.vue` and
`PublicAgendaDetailView.vue` render CMS body content through
`SafeHtml` (`@mts241alikhlash/ui`), which runs it through DOMPurify against a
tag/attribute allowlist, restricts `iframe` embeds to a small host allowlist
(YouTube, Vimeo), and forces `rel="noopener noreferrer"` on `target="_blank"`
links before it ever reaches `v-html`. None of the three views uses `v-html`
directly.

## `/settings` is gone

`platform/settings`'s `AppSetting` was an admin screen that did not survive the
split. `settings` was deleted on 2026-09-23: no service serves `/settings`, so it only
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
pnpm run dev        # http://localhost:5176
pnpm run validate   # format:check + lint + typecheck + lint:strict + test + build
```
