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
      maxWorkers: 2,
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
      env: {
        SCHOOL_TIME_ZONE: 'Asia/Jakarta',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        JWT_SECRET: 'test-jwt-secret-for-testing-minimum-32-chars',
        PROVISIONING_SERVICE_TOKEN: 'test-provisioning-token-not-a-secret',
        IDENTITY_SERVICE_URL: 'http://localhost:3000',
        ACADEMIC_SERVICE_URL: 'http://localhost:3200',
        PRESENCE_SERVICE_URL: 'http://localhost:3400',
        HR_SERVICE_URL: 'http://localhost:3800',
        STUDENT_SERVICE_URL: 'http://localhost:3900',
        ASSESSMENT_SERVICE_URL: 'http://localhost:4000',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_BUCKET: 'test',
        S3_ACCESS_KEY_ID: 'test',
        S3_SECRET_ACCESS_KEY: 'test-secret',
        GOOGLE_CLIENT_ID: 'test-google-client-id',
        GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
        GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
        GOOGLE_OAUTH_SUCCESS_REDIRECT_URL:
          'http://localhost:5175/oauth/callback',
        SSO_ACCOUNTS_ORIGIN: 'http://localhost:5180',
        SSO_APPS: 'account=http://localhost:5180/oauth/callback',
        EXAM_ACCESS_CODE_SECRET:
          'test-exam-access-code-secret-0123456789abcdef',
      },
      include: ['src/**/*.spec.ts'],
      exclude: [...configDefaults.exclude, 'dist/**'],
    },
  })
}
