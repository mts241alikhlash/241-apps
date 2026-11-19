# @mts241alikhlash/platform

## 0.2.1

### Patch Changes

- 6d04832: The design system settles on Inter with the `nova` control sizes (20/24/32/36 px, 24/32/36/40 px on a phone) and one type scale. `text-xs` and `text-sm` both read `--text-control` (12 px, 13 px on phones) so sidebar, breadcrumb, table and control text share one size; headings read `--text-heading-sm|heading|title|display|display-lg` (16/18/20/24/30 px); a floating label sits at `--text-label` (11 px). Radius follows the `nova` scale from `--radius` so controls and dialogs sit at 8 px and cards at 10 px, a status colour is a token (`--success`, `--warning`, `--info`, `--destructive`) with no Tailwind palette class outside the admission landing page and the kiosk, `text-control` is a utility registered in `cn` so `twMerge` keeps it, the sidebar is 17rem, tabs are an underline strip only, a card header and footer are 48 px, and the active sidebar item and breadcrumb are marked by `text-primary` alone. Dead variants are gone: `Card variant="flat"`, `CardFooter` `standard`/`thin`, `FieldLegend` `variant`, and the pill `Tabs` variant. Pages no longer set a size of their own: no `text-[Npx]`, no `font-size`, no `font-mono`, no `font-bold`. A badge is plain coloured text with an optional icon instead of a chip, a card uses `CardHeader plain` for a list page's borderless header and `p-4` padding, table surfaces read `--table-stripe`/`--table-header` so a sticky column never shows the cells under it, and spacing uses one scale (0, 0.5, 1, 1.5, 2, 3, 4, 6) checked by `check-card-overrides`.
- Updated dependencies [6d04832]
- Updated dependencies [6d04832]
  - @mts241alikhlash/web-shared@0.2.1
  - @mts241alikhlash/ui@0.2.0

## 0.2.0

### Minor Changes

- 2c689bc: exam-web is presented as Istiqra: tab title, login, header, app switcher, exam sheet and favicon carry the Istiqra name and symbol, and the SSO launcher lists it as Istiqra. The auth config takes a logoSrc so an app can show its own logo while the school wordmark stays. Every app drops the leftover Vite favicon for the school logo.

### Patch Changes

- Updated dependencies [b96d6ad]
  - @mts241alikhlash/ui@0.1.3

## 0.1.3

### Patch Changes

- Updated dependencies [fa71065]
  - @mts241alikhlash/ui@0.1.2

## 0.1.2

### Patch Changes

- b816247: Reworked question bank and package screens, room roster printing (participant cards and seat lists for a whole exam period), a client column in the room monitor, and a collapsed sidebar whose menu groups open as a dropdown. Button icons are spaced by the button gap only.
- 061bc87: Floating sidebar and top bar layout, card and table restyle, and exam-web views moved to the new layout.
- 7110781: Lint runs one type-aware ESLint config; `lint:strict` and `eslint.typecheck.config.mjs` are gone.
- Updated dependencies [b816247]
- Updated dependencies [061bc87]
- Updated dependencies [d587566]
- Updated dependencies [d587566]
  - @mts241alikhlash/ui@0.1.1
  - @mts241alikhlash/web-shared@0.2.0

## 0.1.1

### Patch Changes

- 8894dbd: Drop the shared dashboard that called a missing endpoint.
