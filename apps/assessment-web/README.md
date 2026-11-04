# 241 Assessment Web

The Vue 3 + Vite frontend for **241 Assessment** — the school's marking desk:
assessment items, student scores, report cards, the class attendance register,
and the teacher's own dashboard. Part of the 241 Apps school platform.

Shared UI and utilities come from the published `@mts241alikhlash/ui` and
`@mts241alikhlash/web-shared` packages (GitHub Packages) — never copied or
vendored.

```bash
pnpm install
pnpm run dev         # http://localhost:5179
pnpm run validate    # format:check + lint + typecheck + lint:strict + test + build
```

See `docs/OVERVIEW.md` for what this app owns, its known gaps, and which
backend services it depends on.
