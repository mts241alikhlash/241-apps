# @mts241alikhlash/ui

## Purpose

The shared Vue component library of the apps: shadcn-vue `mira` components with the owner decisions in the [ui standard](../../docs/standards/ui.md), the theme (`theme.css`), and two checker bins (`check-card-overrides`, `check-field-style`).

## Depends on

- `@mts241alikhlash/web-shared`, reka-ui, Tailwind 4 and the libraries in its `package.json`.
- Consumed by every app and by `platform` and `reference-data`.

## Rules specific to this package

- A page never restyles a `ui` component to fit; a missing standard is fixed here once ([ui standard](../../docs/standards/ui.md)).
- `theme.css` holds the colors, the radius scale (every step above `md` maps to `md`) and the control tokens `--control-h-xs|sm|md|lg`, `--text-control`, `--icon-control` (larger below `md`).
- Import components by their folder (`@mts241alikhlash/ui/button`); a component reads tokens with Mira values as fallback.

## Gotchas

- An app's `src/style.css` needs `@import '@mts241alikhlash/ui/theme.css'` and an `@source` line for this package, or controls fall back to desktop sizes on phones.
- A component used without its import renders as an unknown element and `vue-tsc` stays silent.

## Open work

- None recorded.
