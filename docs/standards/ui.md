# UI standard

Applies to every page and component in `apps/` and to `packages/ui`. The components follow shadcn-vue's `mira` style with the owner decisions below. A page never restyles a `ui` component to fit; when a standard is missing, fix it once in `packages/ui`. Each rule is **Rule**, **Why**, **Check**.

## Pages and navigation

**Rule.** The sidebar (`collapsible: 'icon'`, `variant: 'sidebar'`) sits flush under the top bar with a right border and the content has no inset card. A list page is not wrapped in another card (no ring, border or shadow); the page wrapper is `px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2`. A title that repeats the last breadcrumb is dropped; detail and form pages keep theirs next to `BackButton`.
**Why.** One layout in every app, owned by `packages/platform`.
**Check.** `packages/platform` `AppLayout.spec.ts`; review for page wrappers.

**Rule.** A page below a list (detail, form, manage, create or edit) puts `BackButton` (`label="Kembali ke ..."`, pushing to its parent) left of the card title; a page reached from many places uses `router.back()`; top-level pages have none. Text buttons "Kembali ke ..." appear only inside empty or error states and auth screens, and never in a form footer, which belongs to step navigation.
**Why.** Predictable way back.
**Check.** review.

**Rule.** Breadcrumbs name the record, not the page type: a page about one record swaps the last route crumb for its name with `useBreadcrumbs`, and a form under a record adds the name as a link plus the action. Create pages keep their route crumb.
**Why.** The user sees where they are.
**Check.** review.

## Cards, fields, actions

**Rule.** A card header holds the title and at most the page's primary action on the right; summaries, notes and secondary actions go in the content. Cards use the `ui` props, never per-page classes: `Card gap="none"`, `CardHeader standard`, `CardTitle size="lg"` (page title) or `"md"`, `CardContent variant="standard"` (`flush` for tables), `CardFooter standard`.
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

**Rule.** Controls use tokens, never fixed classes: `--control-h-xs|sm|md|lg` (20/24/28/32 px; 24/32/36/40 px on phones), text `--text-control` (12 px), icons `--icon-control` (14 px). No `h-9`, `h-10`, `min-h-11` or `text-sm` on Button, Input, SelectTrigger or Badge; filters and selects are `md`, not `size="sm"`.
**Why.** Density follows the viewport from one place (`theme.css`).
**Check.** `packages/ui` `theme.spec.ts` and `standards.spec.ts`; review for pages.

**Rule.** DM Sans only, no `font-mono` (use `tabular-nums`). Weights: 400 body and table cells, 500 labels and titles, 600 emphasis and the page title (`CardTitle size="lg"`), never 700. A table's main column sets `meta: { strong: true }`, with no `font-medium` in cell renders.
**Why.** One type scale.
**Check.** `packages/ui` `standards.spec.ts`; review.

**Rule.** Every radius step above `md` maps to `md` in `theme.css` (an 8 px corner for cards, dialogs, popovers, badges and controls; `xs` buttons keep `sm`, circles keep `full`).
**Why.** Owner decision that differs from `mira`.
**Check.** `packages/ui` `theme.spec.ts`.

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

**Rule.** A reviewer's note on a row goes into a tooltip on the status badge, not into the cell.
**Why.** Keeps cells scannable.
**Check.** review.

## Language and spelling

**Rule.** User-visible copy is Indonesian; code, tests and API names use American spelling (`enrollment`, `summarize`, `color`).
**Why.** One vocabulary for code, translations for users; domain terms are in [GLOSSARY.md](../../GLOSSARY.md).
**Check.** review.
