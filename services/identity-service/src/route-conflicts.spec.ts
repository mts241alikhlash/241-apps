process.env.DATABASE_URL ??= 'postgresql://routes:routes@localhost:5432/routes'
process.env.JWT_SECRET ??= 'routes-test-secret-not-a-real-key'
process.env.PROVISIONING_SERVICE_TOKEN ??= 'routes-test-provisioning-token'
process.env.GOOGLE_CLIENT_ID ??= 'routes-test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET ??= 'routes-test-google-client-secret'
process.env.GOOGLE_CALLBACK_URL ??= 'http://localhost:3000/auth/google/callback'
process.env.GOOGLE_OAUTH_SUCCESS_REDIRECT_URL ??=
  'http://localhost:5173/oauth/callback'
process.env.S3_ENDPOINT ??= 'http://localhost:9000'
process.env.S3_BUCKET ??= 'routes'
process.env.S3_ACCESS_KEY_ID ??= 'routes'
process.env.S3_SECRET_ACCESS_KEY ??= 'routes'

import { describeRouteRegistration } from '@mts241alikhlash/nest-core/testing'
import { AppModule } from './app.module.js'
import { EnsureStructuralRolesUseCase } from './access-control/role/application/use-cases/ensure-structural-roles/ensure-structural-roles.use-case.js'
import { SyncPermissionsUseCase } from './access-control/permission/application/use-cases/sync-permissions/sync-permissions.use-case.js'

const noop = { execute: () => Promise.resolve() }

describeRouteRegistration({
  imports: [AppModule],
  minRoutes: 40,
  overrides: [
    { provide: EnsureStructuralRolesUseCase, useValue: noop },
    { provide: SyncPermissionsUseCase, useValue: noop },
  ],
})
