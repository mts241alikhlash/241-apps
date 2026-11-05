# @mts241alikhlash/reference-data

## Purpose

The generic list view for admin-managed reference data: `ReferenceDataListView` with its form dialog, the CRUD composable, column and field-schema builders, and the config types.

## Depends on

- `@mts241alikhlash/ui` and `web-shared`; `vue`, `vee-validate`, `zod` and `@tanstack/vue-table` as peers.
- Used by academic-web, hr-web, portal-web and admin-web.

## Rules specific to this package

- An app describes a list with a `ReferenceDataConfig` (fields, service callbacks, labels) and renders `ReferenceDataListView`; the package owns the table and form.
- The list view follows the [ui standard](../../docs/standards/ui.md): no card inside a page card, control tokens, server-side paging.

## Gotchas

- Apps need an `@source` line for this package in `src/style.css`.

## Open work

- None recorded.
