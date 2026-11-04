process.env.DATABASE_URL ??= 'postgresql://routes:routes@localhost:5432/routes'
process.env.JWT_SECRET ??= 'routes-test-secret-not-a-real-key'
process.env.IDENTITY_SERVICE_URL ??= 'http://localhost:3000'
process.env.HR_SERVICE_URL ??= 'http://localhost:3800'
process.env.STUDENT_SERVICE_URL ??= 'http://localhost:3900'
process.env.ASSESSMENT_SERVICE_URL ??= 'http://localhost:4000'
process.env.PROVISIONING_SERVICE_TOKEN ??= 'routes-test-provisioning-token'
process.env.EXAM_ACCESS_CODE_SECRET ??=
  'boots-test-exam-access-code-secret-32-chars'
process.env.ACADEMIC_SERVICE_URL ??= 'http://localhost:3200'
process.env.S3_ENDPOINT ??= 'http://localhost:9000'
process.env.S3_BUCKET ??= 'routes'
process.env.S3_ACCESS_KEY_ID ??= 'routes'
process.env.S3_SECRET_ACCESS_KEY ??= 'routes-secret'

import { describeRouteRegistration } from '@mts241alikhlash/nest-core/testing'
import { AppModule } from './app.module.js'

describeRouteRegistration({ imports: [AppModule], minRoutes: 0 })
