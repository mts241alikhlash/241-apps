process.env.DATABASE_URL ??= 'postgresql://routes:routes@localhost:5432/routes'
process.env.JWT_SECRET ??= 'routes-test-secret-not-a-real-key'
process.env.IDENTITY_SERVICE_URL ??= 'http://localhost:3000'
process.env.PROVISIONING_SERVICE_TOKEN ??= 'routes-test-provisioning-token'
process.env.ACADEMIC_SERVICE_URL ??= 'http://localhost:3200'
process.env.ASSESSMENT_SERVICE_URL ??= 'http://localhost:4000'

import { describeRouteRegistration } from '@mts241alikhlash/nest-core/testing'
import { AppModule } from './app.module.js'

describeRouteRegistration({ imports: [AppModule], minRoutes: 40 })
