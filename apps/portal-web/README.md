# 241 Portal Web

The Vue 3 + Vite frontend for **241 Portal** — the public school website and
the admin screens behind it: news, articles, pages, agenda, gallery,
announcements. Part of the 241 Apps school platform.

Shared UI and utilities come from the published `@mts241alikhlash/ui` and
`@mts241alikhlash/web-shared` packages (GitHub Packages) — never copied or
vendored.

```bash
pnpm install
pnpm run dev         # http://localhost:5176
pnpm run validate    # format:check + lint + typecheck + lint:strict + test + build
```

See `docs/OVERVIEW.md` for what this app owns, its known gaps, and which
backend services it depends on.
