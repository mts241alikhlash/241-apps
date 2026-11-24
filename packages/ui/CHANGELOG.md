# @mts241alikhlash/ui

## 0.3.0

### Minor Changes

- be1132e: Add DataTable row-click support, exam score recap documents, exam-api updates, and skip throttling on internal controllers.

## 0.2.4

### Patch Changes

- 77e82c9: Add a page that monitors every room at once for the proctors, print the essay answers for manual grading per day, subject, class or student, start the exam grading from the exam period list, join every group of filters in one frame, rebuild the session recovery dialog with vee-validate, write Mata Pelajaran in full across the exam pages, draw the attendance sheet borders inside the table so they print, and ignore the violation events a device queued before the last reopen or reset of its session so a reopened student is no longer locked again by the old events.

## 0.2.3

### Patch Changes

- e21b2ef: Use one room token for the first entry and the re-entry of a seated student, lock a wrong token for two minutes, stop short connection gaps from counting as violations, lock a session at the violation limit of its own policy, show the exam window and the running exam in the room monitor, split the monitor activity column into start, last seen and submitted, translate the session events, close Safe Exam Browser after submitting, order the room reports by day then room, center the attendance number and put the rows per page, filter and search of a phone table on one line.

## 0.2.2

### Patch Changes

- 77a3a27: Standardize the exam pages (activities by period, status dialog, policy dialog, schedules, print documents, monitoring and grading), grade every question type in the grading session with short answers scored automatically, show the participant number in the sessions, tolerate hr-service throttling with a cache, and align the shared table, card header and dialog footer.

## 0.2.1

### Patch Changes

- 4bb8539: Rework the room monitoring page into separate cards (room, summary, token and time, actions needed, notes, participants) with every participant shown at once, split activity and battery into their own columns, list silent participants under actions needed, and add a searchable participant picker for physical violation notes. The exam card shows only the room number, and the command search field is no longer tinted.

## 0.2.0

### Minor Changes

- 6d04832: The design system settles on Inter with the `nova` control sizes (20/24/32/36 px, 24/32/36/40 px on a phone) and one type scale. `text-xs` and `text-sm` both read `--text-control` (12 px, 13 px on phones) so sidebar, breadcrumb, table and control text share one size; headings read `--text-heading-sm|heading|title|display|display-lg` (16/18/20/24/30 px); a floating label sits at `--text-label` (11 px). Radius follows the `nova` scale from `--radius` so controls and dialogs sit at 8 px and cards at 10 px, a status colour is a token (`--success`, `--warning`, `--info`, `--destructive`) with no Tailwind palette class outside the admission landing page and the kiosk, `text-control` is a utility registered in `cn` so `twMerge` keeps it, the sidebar is 17rem, tabs are an underline strip only, a card header and footer are 48 px, and the active sidebar item and breadcrumb are marked by `text-primary` alone. Dead variants are gone: `Card variant="flat"`, `CardFooter` `standard`/`thin`, `FieldLegend` `variant`, and the pill `Tabs` variant. Pages no longer set a size of their own: no `text-[Npx]`, no `font-size`, no `font-mono`, no `font-bold`. A badge is plain coloured text with an optional icon instead of a chip, a card uses `CardHeader plain` for a list page's borderless header and `p-4` padding, table surfaces read `--table-stripe`/`--table-header` so a sticky column never shows the cells under it, and spacing uses one scale (0, 0.5, 1, 1.5, 2, 3, 4, 6) checked by `check-card-overrides`.

### Patch Changes

- Updated dependencies [6d04832]
  - @mts241alikhlash/web-shared@0.2.1

## 0.1.3

### Patch Changes

- b96d6ad: Every web app declares a light colour scheme (meta tag and `color-scheme: light` on `:root`), so a phone in dark mode no longer darkens form controls and scrollbars; dark mode is left for a later phase. The admission landing drops its template comments.

## 0.1.2

### Patch Changes

- fa71065: DataTable shows every row when pagination is hidden instead of only the first ten, so the schedule session list, seat and supervisor panels and package question list are no longer cut off.

## 0.1.1

### Patch Changes

- b816247: Reworked question bank and package screens, room roster printing (participant cards and seat lists for a whole exam period), a client column in the room monitor, and a collapsed sidebar whose menu groups open as a dropdown. Button icons are spaced by the button gap only.
- 061bc87: Floating sidebar and top bar layout, card and table restyle, and exam-web views moved to the new layout.
- Updated dependencies [d587566]
- Updated dependencies [d587566]
  - @mts241alikhlash/web-shared@0.2.0
