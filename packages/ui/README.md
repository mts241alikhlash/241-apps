# @mts241alikhlash/ui

## Purpose

The shared Vue component library of the apps: shadcn-vue `nova` components with the owner decisions in the [ui standard](../../docs/standards/ui.md), the theme (`theme.css`), and two checker bins (`check-card-overrides`, `check-field-style`).

## Depends on

- `@mts241alikhlash/web-shared`, reka-ui, Tailwind 4 and the libraries in its `package.json`.
- Consumed by every app and by `platform` and `reference-data`.

## Rules specific to this package

- A page never restyles a `ui` component to fit; a missing standard is fixed here once ([ui standard](../../docs/standards/ui.md)).
- `theme.css` holds the colors, the `nova` radius scale (`sm` 6 px to `2xl` 18 px, from `--radius: 0.625rem`) and the control tokens `--control-h-xs|sm|md|lg` (24/28/32/36 px), `--text-control` (14 px) and `--icon-control` (16 px), larger below `md`. The type scale starts at `--text-xs` 13 px, then `--text-sm` 14 px.
- `SIDEBAR_WIDTH` in `sidebar/utils.ts` is 17rem and is the only sidebar width; an app never overrides `--sidebar-width`.
- Import components by their folder (`@mts241alikhlash/ui/button`); a component reads tokens with its `nova` value as fallback.

## Gotchas

- An app's `src/style.css` needs `@import '@mts241alikhlash/ui/theme.css'` and an `@source` line for this package, or controls fall back to desktop sizes on phones.
- A component used without its import renders as an unknown element and `vue-tsc` stays silent.

## Open work

- None recorded.
