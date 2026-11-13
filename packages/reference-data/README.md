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
- `ReferenceDataListView.vue` casts the form payload (`Record<string, unknown>`, built from `config.fields` at runtime) to the generic `TCreate`/`TUpdate`. vue-tsc needs the cast, while typed lint sees the SFC generic as unconstrained and calls it unnecessary, so `eslint.config.mjs` turns `no-unnecessary-type-assertion` off for that one file instead of an inline disable.

## Open work

- None recorded.
