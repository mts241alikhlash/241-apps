# Dependency holds

Record of dependencies kept below their latest version. Phase 2e moves these into catalogs and Dependabot `ignore`.

## Waiting on upstream

| Dependency | Position and reason | Release condition |
| --- | --- | --- |
| `typescript` | 5.9.x, latest 7.0.2 | release when vue-tsc officially supports TypeScript 7 |
| `@vueuse/core` | 14.x, latest 15.0.0 | release when reka-ui depends on @vueuse/core 15 |
| `@types/node` | ^24, latest 26.6.6 | release when the Node runtime moves major |
| `prisma` | 7.x, latest tag is 8.0.0-rc | release when stable 8.0.x ships (ideally 8.0.1), together with @prisma/client, following the official migration guide |
| `@prisma/client` | 7.x | release together with prisma 8 stable |
| `zod` | apps stay on 3.25.x (services already on 4) | release when vee-validate 5 stable ships and @vee-validate/zod supports zod 4 |

## Our code (phase 1c and later)

| Dependency | Position and reason | Release condition |
| --- | --- | --- |
| `@tanstack/vue-table` | 8.x, latest 9.3.1 | release when the DataTable API migration in packages/ui is done as its own step |
| `vue-tsc` | 3.3.11 pinned with @vue/language-core by patch 1b-3-pins | 3.3.14 breaks pinia store .value typing in portal-web typecheck; release when portal-web store usage is fixed |
| `@vue/language-core` | 3.3.11 pinned with vue-tsc | release together |
| `@fullcalendar/core` | stay on 6.x | v7 removes core/daygrid/interaction (no v7 release of daygrid/interaction; plugins move to @fullcalendar/vue3/*), renames Arg types to Info, uses Temporal dates and needs theme plugin + CSS imports; release when AcademicCalendarGridView.vue is migrated as its own step with a visual check |
| `@fullcalendar/daygrid` | stay on 6.x | v7 removes core/daygrid/interaction (no v7 release of daygrid/interaction; plugins move to @fullcalendar/vue3/*), renames Arg types to Info, uses Temporal dates and needs theme plugin + CSS imports; release when AcademicCalendarGridView.vue is migrated as its own step with a visual check |
| `@fullcalendar/interaction` | stay on 6.x | v7 removes core/daygrid/interaction (no v7 release of daygrid/interaction; plugins move to @fullcalendar/vue3/*), renames Arg types to Info, uses Temporal dates and needs theme plugin + CSS imports; release when AcademicCalendarGridView.vue is migrated as its own step with a visual check |
| `@fullcalendar/vue3` | stay on 6.x | v7 removes core/daygrid/interaction (no v7 release of daygrid/interaction; plugins move to @fullcalendar/vue3/*), renames Arg types to Info, uses Temporal dates and needs theme plugin + CSS imports; release when AcademicCalendarGridView.vue is migrated as its own step with a visual check |
