# 241 Exam Web

The Vue 3 + Vite frontend for **241 Exam** — question authoring and package
approval, exam scheduling, exam grading, and the student exam sheet. Part of
the 241 Apps school platform.

Shared UI and utilities come from the published `@mts241alikhlash/ui` and
`@mts241alikhlash/web-shared` packages (GitHub Packages) — never copied or
vendored.

```bash
pnpm install
pnpm run dev         # http://localhost:5181
pnpm run validate    # check:comments + format:check + lint + typecheck + lint:strict + test + build + routes:check
```

`pnpm run check:comments` is a gate, not a formatter: `scripts/check-no-comments.mjs`
fails the build on any comment in `src/`, `packages/` and the root
`.ts`/`.mjs` config files. Explain the code in its names and structure; the
only exemptions are the `vite/client` reference and the `@vitest-environment`
pragma.

See `docs/OVERVIEW.md` for what this app owns, its known gaps, and which
backend services it depends on.
