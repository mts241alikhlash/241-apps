import { createRequire } from 'node:module'
import path from 'node:path'
import vuePlugin from '@vitejs/plugin-vue'
import swc from 'unplugin-swc'
import { configDefaults, defineConfig } from 'vitest/config'

export function vue({ root, alias = true } = {}) {
  return defineConfig({
    plugins: [vuePlugin()],
    resolve:
      alias && root
        ? {
            alias: [{ find: '@', replacement: path.resolve(root, './src') }],
          }
        : undefined,
    test: {
      environment: 'node',
      globals: true,
      exclude: [...configDefaults.exclude, 'smoke/**'],
    },
  })
}

const SHARED_WITH_NEST_CORE = ['nestjs-pino', '@prisma/client/runtime/client']

function requireEntries(root) {
  const require = createRequire(path.join(root, 'package.json'))
  return SHARED_WITH_NEST_CORE.flatMap((id) => {
    try {
      return [{ find: new RegExp(`^${id}$`), replacement: require.resolve(id) }]
    } catch {
      return []
    }
  })
}

export function nest({ root = process.cwd() } = {}) {
  return defineConfig({
    resolve: { alias: requireEntries(root) },
    plugins: [
      swc.vite({
        jsc: {
          transform: { legacyDecorator: true, decoratorMetadata: true },
        },
      }),
    ],
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.spec.ts'],
      exclude: [...configDefaults.exclude, 'dist/**'],
    },
  })
}
