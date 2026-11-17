# @mts241alikhlash/ui

## Purpose

The shared Vue component library of the apps: shadcn-vue `mira` components in Inter with the owner decisions in the [ui standard](../../docs/standards/ui.md), the theme (`theme.css`), and two checker bins (`check-card-overrides`, `check-field-style`).

## Depends on

- `@mts241alikhlash/web-shared`, reka-ui, Tailwind 4 and the libraries in its `package.json`.
- Consumed by every app and by `platform` and `reference-data`.

## Rules specific to this package

- A page never restyles a `ui` component to fit; a missing standard is fixed here once ([ui standard](../../docs/standards/ui.md)).
- `theme.css` holds the colours (including `--success`, `--warning` and `--info` beside `--destructive`), the radius scale (every step above `md` maps to `md`) and the control tokens `--control-h-xs|sm|md|lg` (20/24/32/36 px), `--text-control` (12 px) and `--icon-control` (14 px), larger below `md`; `text-control` is a utility and is registered in `cn` so `twMerge` keeps it next to a text colour. The type scale is all tokens: `text-xs` and `text-sm` read `--text-control` (12 px, 13 px on phones), `--text-label` 11 px for a floating label, and `text-md` reads `--text-subheading` (14 px), and `text-base|lg|xl|2xl|3xl` = `--text-heading-sm|heading|title|display|display-lg` (16/18/20/24/30 px).
- `SIDEBAR_WIDTH` in `sidebar/utils.ts` is 15rem and is the only sidebar width; an app never overrides `--sidebar-width`.
- Import components by their folder (`@mts241alikhlash/ui/button`); a component reads tokens with its `mira` value as fallback.

## Gotchas

- An app's `src/style.css` needs `@import '@mts241alikhlash/ui/theme.css'` and an `@source` line for this package, or controls fall back to desktop sizes on phones.
- A component used without its import renders as an unknown element and `vue-tsc` stays silent.

## Open work

- None recorded.
