# @mts241alikhlash/vitest-config

Vitest presets.

| Preset           | Used by                        | What it sets                                                                                                                   |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `nest({ root })` | services, `packages/nest-core` | `unplugin-swc` with legacy decorators and decorator metadata (Nest DI needs it), Node environment, globals, `src/**/*.spec.ts` |
| `vue({ root })`  | web apps and Vue packages      | `@vitejs/plugin-vue`, the `@` alias to `src`, Node environment, globals, `smoke/` excluded                                     |

Merge package specifics with `mergeConfig`:

```ts
import { nest } from '@mts241alikhlash/vitest-config'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  nest(),
  defineConfig({ test: { testTimeout: 15_000 } }),
)
```

`nest()` resolves `nestjs-pino` and `@prisma/client/runtime/client` to their CommonJS builds. Both packages ship an
ES module build too, and `@mts241alikhlash/nest-core` (CommonJS) must share one instance with the service under test:
otherwise `@InjectPinoLogger` tokens and Prisma error classes differ between the two copies.
