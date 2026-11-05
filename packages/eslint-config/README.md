# @mts241alikhlash/eslint-config

Flat ESLint presets for the workspace. Every active rule is an error.

```js
import { nest } from '@mts241alikhlash/eslint-config'

export default nest({ tsconfigRootDir: import.meta.dirname })
```

`eslint.typecheck.config.mjs` passes `typecheck: true` and is what `lint:strict` runs.

| Preset | Used by                                                  |
| ------ | -------------------------------------------------------- |
| `vue`  | web apps, `packages/platform`, `packages/reference-data` |
| `nest` | services, `packages/nest-core`                           |

Options: `tsconfigRootDir` (required), `typecheck`, `ignores`, `overrides` (extra flat config objects, placed before
`eslint-config-prettier`).

## What is on

- `@eslint/js` recommended, typescript-eslint `recommended` and `stylistic` (their `TypeChecked` versions with
  `typecheck`), and for Vue `flat/recommended` plus the house rules (script setup, type-based props and emits,
  `no-v-html`).
- `no-explicit-any`, `no-unused-vars` (names starting with `_` are allowed), `no-unsafe-*`,
  `no-unnecessary-type-assertion`, `no-redundant-type-constituents`, promise rules, `unbound-method`.
- Module boundaries: no import of another service's source, no import of a workspace package's `src` or `dist` files.
- In `domain/` folders of a service: no Prisma client.
- Disable comments must name the rule and give a reason after `--`; with `typecheck` an unused disable comment or
  inline config is an error.
- Generated files (`src/generated`, `dist`, `coverage`) are ignored; Prettier owns formatting (`eslint-config-prettier`
  comes last).

## What is off, and why

- In test files (`*.spec.ts`, `*.e2e-spec.ts`, `test/`, `smoke/`): `unbound-method` (mocks pass methods around),
  `no-explicit-any` and `no-unsafe-*` (test doubles and HTTP bodies are untyped by nature), and
  `vue/one-component-per-file` (specs define small helper components).
- `vue/require-default-prop`: optional type-based props are `undefined` by design; the rule reported 162 such props.
