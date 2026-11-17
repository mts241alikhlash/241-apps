---
'@mts241alikhlash/ui': minor
'@mts241alikhlash/platform': patch
'academic-web': patch
'account-web': patch
'admin-web': patch
'admission-web': patch
'assessment-web': patch
'exam-web': patch
'hr-web': patch
'inventory-web': patch
'portal-web': patch
---

The design system settles on Inter with the `mira` control sizes and one type scale. `text-xs` and `text-sm` both read `--text-control` (12 px, 13 px on phones) so sidebar, breadcrumb, table and control text share one size; headings read `--text-heading-sm|heading|title|display|display-lg` (16/18/20/24/30 px); a floating label sits at `--text-label` (11 px). Radius keeps one flat corner: every step above `md` maps to `md`, so controls, cards, dialogs and popovers all sit at 8 px, a status colour is a token (`--success`, `--warning`, `--info`, `--destructive`) with no Tailwind palette class outside the admission landing page and the kiosk, `text-control` is a utility registered in `cn` so `twMerge` keeps it, the sidebar is 15rem, tabs are an underline strip only, a card header and footer are 40 px, and the active sidebar item and breadcrumb are marked by `text-primary` alone. Dead variants are gone: `Card variant="flat"`, `CardFooter` `standard`/`thin`, `FieldLegend` `variant`, and the pill `Tabs` variant. Pages no longer set a size of their own: no `text-[Npx]`, no `font-size`, no `font-mono`, no `font-bold`. A badge is plain coloured text with an optional icon instead of a chip, a card uses `CardHeader plain` for a list page's borderless header and `p-4` padding, table surfaces read `--table-stripe`/`--table-header` so a sticky column never shows the cells under it, and spacing uses one scale (0, 0.5, 1, 1.5, 2, 3, 4, 6) checked by `check-card-overrides`.
