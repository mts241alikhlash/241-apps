# portal-service

## Purpose

Owns the public school website content (posts, gallery, agenda, pages, navigation, homepage sections) and the area that manages it, and serves the portal single-page app.

Port 3600 locally; database `portal` (15 models: `FileCategory`, `File`, `Post`, `PostSlugHistory`, `PostCategory`, `PostTag`, `PostTagOnPost`, `GalleryAlbum`, `GalleryPhoto`, `AgendaEntry`, `PortalPage`, `PortalPageSlugHistory`, `PortalNavItem`, `PortalMediaUsage`, `PortalHomepageSection`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): none; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- Public visibility is a read-time predicate defined once per model in `*.where.ts` and composed by every public query, the homepage, the sitemap and media authorization. It is never a stored flag.
- Portal announcements and agenda are separate from academic announcements and events: different tables, lifecycles and permissions.

## Gotchas

- `PortalHtmlController` answers `GET *` with `index.html` and per-path metadata injected, because social crawlers do not run JavaScript; do not remove it.
- `test/portal-public-visibility.e2e-spec.ts` is the database-backed sweep for visibility leaks and needs a real Postgres.

## Open work

- None recorded.
