# UI standard

Applies to every page and component in `apps/` and to `packages/ui`. The components follow shadcn-vue's `nova` sizes with Inter and the owner decisions below. A page never restyles a `ui` component to fit; when a standard is missing, fix it once in `packages/ui`. Each rule is **Rule**, **Why**, **Check**.

## Pages and navigation

**Rule.** The sidebar (`collapsible: 'icon'`, `variant: 'floating'`) sits flush under the top bar with a right border and the content has no inset card. The active item and the active breadcrumb are marked by `text-primary` alone, at the same weight as their neighbours; every other item stays muted. Its width is `SIDEBAR_WIDTH` (15rem) from `packages/ui`; an app never overrides `--sidebar-width`. A menu label is at most 26 characters so it fits one line, and a longer one truncates with its full text in `title`. A list page is not wrapped in another card (no ring, border or shadow); the page wrapper is `px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2`. A title that repeats the last breadcrumb is dropped; detail and form pages keep theirs next to `BackButton`.
**Why.** One layout in every app, owned by `packages/platform`.
**Check.** `packages/platform` `AppLayout.spec.ts`; `pnpm run runtime:check` (`scripts/check-menu-labels.spec.mjs`); review for page wrappers.

**Rule.** A page below a list (detail, form, manage, create or edit) puts `BackButton` (`label="Kembali ke ..."`, pushing to its parent) left of the card title; a page reached from many places uses `router.back()`; top-level pages have none. Text buttons "Kembali ke ..." appear only inside empty or error states and auth screens, and never in a form footer, which belongs to step navigation.
**Why.** Predictable way back.
**Check.** review.

**Rule.** Breadcrumbs name the record, not the page type: a page about one record swaps the last route crumb for its name with `useBreadcrumbs`, and a form under a record adds the name as a link plus the action. Create pages keep their route crumb.
**Why.** The user sees where they are.
**Check.** review.

## Cards, fields, actions

**Rule.** A card header holds the title and at most the page's primary action on the right; summaries, notes and secondary actions go in the content. Cards use the `ui` props, never per-page classes: `Card gap="none"`, `CardHeader standard` (40 px, its title truncates) or `CardHeader plain` (a list page's borderless header above the table), `CardTitle size="lg"` (page title) or `"md"`, `CardContent variant="standard"` (`flush` for tables), `CardFooter` (one style). Card padding is `p-4`; `p-6`, `p-8`, `px-5` and `px-6` are rejected by `check-card-overrides`. A card has no decorative footer: never a strip or an empty footer.
**Why.** Spacing and tints are defined once.
**Check.** `pnpm exec check-card-overrides src` (reports `gap-0`, `py-0`, font sizes and backgrounds on those tags); `packages/ui` `check-card-overrides.spec.ts`.

**Rule.** Every text, select, date and textarea field is a `FloatingField` (the label floats, the validation message replaces the label and the control turns red). Checkbox, switch and radio keep a plain label.
**Why.** One field pattern and one error treatment.
**Check.** `pnpm exec check-field-style src` (reports `FormField` + `FormLabel` pairs); a component used without its import renders as an unknown element and `vue-tsc` stays silent, so check imports when converting by script.

**Rule.** One row action is a direct button; two or more use `ActionCell` (edit, delete with its own confirmation, `manageLabel`, custom entries through `items`). No hand-written dropdowns in columns.
**Why.** Consistent row menus.
**Check.** review.

**Rule.** Dates use `DatePicker` (`dd/mm/yyyy`) and ranges `DateRangePicker`. A unit on a numeric field is display only, inside the input: `FormattedNumberInput` (`prefix`, `suffix`, `thousands`, `numeric`, `max-digits`); the stored value is plain digits, never a hand-placed unit `<span>` or a unit in the label. File upload areas use `FileDropzone`.
**Why.** Values stay clean and inputs look the same everywhere.
**Check.** review.

## Sizes and type

**Rule.** Controls use tokens, never fixed classes: `--control-h-xs|sm|md|lg` (20/24/28/32 px; 24/32/36/40 px on phones), text `--text-control` (12 px; 13 px on phones), icons `--icon-control` (14 px; 16 px on phones). The type scale is tokens, never a raw size: `text-xs` and `text-sm` both read `--text-control` (12 px, 13 px on phones), so sidebar, breadcrumb, table and control text share one size; then `text-base` = `--text-heading-sm` 16 px, `text-lg` = `--text-heading` 18 px, `text-xl` = `--text-title` 20 px, `text-2xl` = `--text-display` 24 px, `text-3xl` = `--text-display-lg` 30 px. A page never sets `text-[Npx]` or a `font-size` of its own. No `h-9`, `h-10` or `min-h-11` on Button, Input, SelectTrigger or Badge; filters and selects are `md`, not `size="sm"`.
**Why.** Density follows the viewport from one place (`theme.css`).
**Check.** `packages/ui` `theme.spec.ts` and `standards.spec.ts`; review for pages.

**Rule.** Inter only (its 12 px x-height is legible where DM Sans's was not), no `font-mono` outside `CodeBlock` (use `tabular-nums` for digits, IDs and codes). Weights are three and no more: 400 body text and table cells, 500 labels, table headers, `CardTitle` default and `size="md"`, 600 emphasis, stat numbers, headings and the page title (`CardTitle size="lg"`). No `font-bold`, `font-extrabold`, `font-light` or a CSS `font-weight` above 600. A table's main column sets `meta: { strong: true }`, with no weight class in cell renders.
**Why.** One type scale.
**Check.** `packages/ui` `standards.spec.ts`; review.

**Rule.** Radius is the Nova ladder off one base: `--radius` 10 px, `sm` 0.6×, `md` 0.8×, `lg` 1×, `xl` 1.4×, `2xl` 1.8×, `3xl` 2.2×, `4xl` 2.6×. Controls, inputs, dialogs, popovers and cards use `rounded-md`; a page never writes a pixel radius and never picks a step above `md` for a surface that has one.
**Why.** Owner decision: Nova, not the flat 8 px of `mira`; the corner grows with the control.
**Check.** `packages/ui` `theme.spec.ts` and `standards.spec.ts`.

**Rule.** Tabs are an underline strip, never a pill: `TabsList` carries `border-b` with a transparent background, `TabsTrigger` is `border-b-2` and turns `border-primary text-primary` when active. No `variant` prop and no `bg-muted` on the list.
**Why.** One tab pattern across the nine apps.
**Check.** `packages/ui` `Tabs.spec.ts` and `surfaces.spec.ts`; review.

**Rule.** A badge is plain coloured text with an optional 14 px icon on its left, never a box: no border, background, padding or fixed height. `variant` picks the colour (`outline` default, `default` primary, `secondary` and `ghost` muted, `success`, `warning`, `info`, `destructive`, `link`); a page never adds `bg-*`, `border-*`, `px-*`, `py-*`, `h-*` or a text size to a badge.
**Why.** A status reads as a label, not as a chip competing with the content.
**Check.** `packages/ui` `controls.spec.ts`; review.

**Rule.** Colour comes from a token, never from the Tailwind palette. A status is `text-success`, `text-warning`, `text-info` or `text-destructive`; a soft surface is the same token at `/10` and its border at `/30`; a filled status surface pairs `bg-<token>` with `text-<token>-foreground`. `text-amber-*`, `bg-emerald-*`, `border-red-*` and every other raw palette class is rejected by `check-card-overrides`, except under `features/**/landing/` (the public admission page keeps its own brand art) and `features/**/kiosk/` (a deliberately dark full-screen surface).
**Why.** One meaning per colour across nine apps; a token value changes in one place.
**Check.** `pnpm exec check-card-overrides src`; `packages/ui` `theme.spec.ts`.

**Rule.** Spacing uses one scale and no other value: `0`, `0.5`, `1`, `1.5`, `2`, `3`, `4`, `6`. Between cards and page sections use `space-y-4`; between fields inside a card `space-y-2` or `space-y-3`; a row of buttons or controls uses `gap-2`; a form grid uses `gap-4`. `space-y-5`, `space-y-8`, `space-y-10`, `space-y-12`, `space-y-2.5`, `space-y-3.5`, `gap-5`, `gap-8`, `gap-10`, `gap-16` and `gap-2.5` are rejected by `check-card-overrides`.
**Why.** One rhythm across nine apps; a stray step is the first sign of a page inventing its own layout.
**Check.** `pnpm exec check-card-overrides src`; `packages/ui` `check-card-overrides.spec.ts`.

**Rule.** A control with no visible text carries a name: `size="icon"` buttons get `aria-label`, an icon-only link gets `aria-label`, and a decorative icon gets none. An empty list uses `Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`, never a hand-written `py-10 text-center`.
**Why.** A screen reader and a test both need the same name; one empty state looks the same in nine apps.
**Check.** review.

## Dialogs

**Rule.** `DialogContent size="md"` (one column, 448 px, up to about 5 fields) or `size="xl"` (two columns, 672 px, 6 fields or more); no other widths for forms. `DialogHeader standard`, `DialogBody` and `DialogFooter standard` carry the spacing; a plain body element uses `class="dialog-body"`, never `px-6 py-5`, borders or hand padding.
**Why.** Dialog spacing is defined once in `theme.css`.

**Rule.** Dialogs sit on `bg-card`; header and footer carry no tint of their own. `BackButton` is the ghost variant. An icon inside `Button` takes no margin class: the button's `gap` spaces it. Table headers use the `table-header` token and rows stripe with `muted`.
**Why.** One surface colour per layer and one spacing source keep the nine apps alike; a margin on the icon doubles the gap.
**Check.** review; `pnpm --filter @mts241alikhlash/ui run test`.
**Check.** `packages/ui` dialog specs; review.

**Rule.** Every footer is `<DialogFooter standard class="justify-between">`: cancel or secondary (outline) on the left, primary on the right, in one row on phones too; one button uses the default `justify-end`. No `flex-1`, `w-full`, `flex-row`, `sm:justify-*` or `mt-auto` on a footer or its buttons; a filter dialog's footer is the same ("Atur Ulang" left, "Tutup" right).
**Why.** Muscle memory.
**Check.** review.

**Rule.** A dialog body that can outgrow the screen scrolls with `min-h-0 flex-1 overflow-y-auto`, never a reka `ScrollArea`.
**Why.** `ScrollArea`'s percentage height has no reference in a max-height dialog.
**Check.** review.

## Tables

**Rule.** `DataTable` top row is, from the left, `filters` (the list's filters joined in one frame) and `header-left` (the add button, labelled just "Tambah"), then `header-right` on the right (search at 160 px). Filters never go in `header-left` or `header-right`. The footer has `[n] baris per halaman` and "Menampilkan x dari y" left and pagination centered. Do not put `block` on `DataTable` (use `md:flex`). Server lists pass `:page`, `:page-size`, `:total-items` and `@update:page` (5 to 100 rows, default 10), page back to 1 when a filter or page size changes, and bulk selection applies to the shown page; small fixed lists stay client-side with `hide-pagination`.
**Why.** Same table everywhere; the server owns paging (see [frontend](frontend.md)).
**Check.** `packages/ui` table specs; review.

**Rule.** Phone lists use `DataTable mobile="cards"` (with `row-clickable` for detail links): the `strong` column is the title, other columns are label and value rows (`meta.mobileLabel`, `meta.mobileValue(row)`, `meta.mobile: 'hide'`), `actions` sits at the right and a `select` cell at the left. No badges on cards, no hand-made `<ul class="md:hidden">`, no local pager; data that exists only in phone markup is a bug. The phone toolbar is Tambah, `mobile-filter` and rows per page, with `mobile-toolbar` holding the search.
**Why.** One phone pattern.
**Check.** review.

**Rule.** Table surfaces read the tokens in `theme.css`: `TableHeader` and `TableFooter` use `bg-table-header`, a striped row uses `bg-table-stripe`, and its hover uses `bg-table-stripe-hover`. A page never paints a row, header or footer with `bg-muted/*`, because a translucent row lets the sticky action column show the cells underneath it.
**Why.** A sticky column inherits its row background; a translucent row makes the column see-through.
**Check.** `packages/ui` table specs; review.

**Rule.** A reviewer's note on a row goes into a tooltip on the status badge, not into the cell.
**Why.** Keeps cells scannable.
**Check.** review.

## Language and spelling

**Rule.** User-visible copy is Indonesian; code, tests and API names use American spelling (`enrollment`, `summarize`, `color`).
**Why.** One vocabulary for code, translations for users; domain terms are in [GLOSSARY.md](../../GLOSSARY.md).
**Check.** review.
