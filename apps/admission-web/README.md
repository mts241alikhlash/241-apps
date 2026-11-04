# 241 Admission Web

The Vue 3 + Vite frontend for **241 Admission** — admission waves,
applications, documents, payments, and enrollment (PPDB). Part of the 241 Apps
school platform.

Shared UI and utilities come from the published `@mts241alikhlash/ui` and
`@mts241alikhlash/web-shared` packages (GitHub Packages) — never copied or
vendored.

```bash
pnpm install
pnpm run dev         # http://localhost:5175
pnpm run validate    # format:check + lint + typecheck + lint:strict + test + build
```

See `docs/OVERVIEW.md` for what this app owns, its known gaps, and which
backend services it depends on.
