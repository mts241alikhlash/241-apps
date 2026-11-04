import path from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import {
  HEALTH_ROUTES,
  SERVICE_PREFIXES,
  UNROUTED_PREFIXES,
} from './api-routes.config.ts'

const platformRoot = path.resolve(
  import.meta.dirname,
  './packages/platform/src/features',
)

const IDENTITY_URL = process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3000'
const PORTAL_URL = process.env.PORTAL_SERVICE_URL ?? 'http://localhost:3600'
const INVENTORY_URL =
  process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3300'

const SERVICE_URL = {
  identity: IDENTITY_URL,
  portal: PORTAL_URL,
  inventory: INVENTORY_URL,
} as const

const proxyOptions = {
  changeOrigin: true,
  secure: false,
}

type ProxyTable = Record<string, Record<string, unknown>>

const serviceProxy: ProxyTable = Object.fromEntries(
  Object.entries(SERVICE_PREFIXES).flatMap(([service, prefixes]) =>
    prefixes.map((p) => [
      p,
      {
        target: SERVICE_URL[service as keyof typeof SERVICE_URL],
        ...proxyOptions,
      },
    ]),
  ),
)

const healthProxy: ProxyTable = Object.fromEntries(
  HEALTH_ROUTES.map(({ path: routePath, service }) => [
    routePath,
    {
      target: SERVICE_URL[service],
      ...proxyOptions,
      rewrite: () => '/health',
    },
  ]),
)

const unroutedProxy: ProxyTable = Object.fromEntries(
  UNROUTED_PREFIXES.map((p) => [
    p,
    { target: IDENTITY_URL, ...proxyOptions, bypass: () => false },
  ]),
)

export default defineConfig(({ mode }) => ({
  optimizeDeps: {
    include: ['@unovis/ts > striptags'],
    exclude: ['@mts241alikhlash/ui'],
  },
  server: {
    port: 5174,
    proxy: { ...serviceProxy, ...healthProxy, ...unroutedProxy },
  },
  plugins: [vue(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
    dedupe: ['vue', 'pinia', 'vue-router'],
    alias: [
      {
        find: /^@\/features\/platform\/(.+)$/,
        replacement: path.resolve(platformRoot, '$1'),
      },
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
    ],
  },
  build: {
    outDir: mode === 'development' ? 'dist-dev' : 'dist',
  },
}))
