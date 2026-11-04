process.env.DATABASE_URL ??= 'postgresql://routes:routes@localhost:5432/routes'
process.env.JWT_SECRET ??= 'routes-test-secret-not-a-real-key'
process.env.S3_ENDPOINT ??= 'http://localhost:9000'
process.env.S3_BUCKET ??= 'routes'
process.env.S3_ACCESS_KEY_ID ??= 'routes'
process.env.S3_SECRET_ACCESS_KEY ??= 'routes'
process.env.IDENTITY_SERVICE_URL ??= 'http://localhost:3000'
process.env.ACADEMIC_SERVICE_URL ??= 'http://localhost:3200'
process.env.PROVISIONING_SERVICE_TOKEN ??= 'routes-test-token-not-a-real-secret'

import { describeRouteRegistration } from '@mts241alikhlash/nest-core/testing'
import { AppModule } from './app.module.js'

describeRouteRegistration({ imports: [AppModule], minRoutes: 40 })
