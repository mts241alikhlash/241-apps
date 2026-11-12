import { createApiClient } from '@mts241alikhlash/exam-api'
import type { paths as ExamPaths } from '@mts241alikhlash/exam-api'
import { createServiceClient } from '@mts241alikhlash/web-shared/utils/service-client'

export const examClient = createServiceClient<ExamPaths>(createApiClient)
