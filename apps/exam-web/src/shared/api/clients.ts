import { createApiClient as createAcademicClient } from '@mts241alikhlash/academic-api'
import type { paths as AcademicPaths } from '@mts241alikhlash/academic-api'
import { createApiClient } from '@mts241alikhlash/exam-api'
import type { paths as ExamPaths } from '@mts241alikhlash/exam-api'
import { createApiClient as createIdentityClient } from '@mts241alikhlash/identity-api'
import type { paths as IdentityPaths } from '@mts241alikhlash/identity-api'
import { createApiClient as createStudentClient } from '@mts241alikhlash/student-api'
import type { paths as StudentPaths } from '@mts241alikhlash/student-api'
import { createServiceClient } from '@mts241alikhlash/web-shared/utils/service-client'

export const examClient = createServiceClient<ExamPaths>(createApiClient)
export const academicClient =
  createServiceClient<AcademicPaths>(createAcademicClient)
export const identityClient =
  createServiceClient<IdentityPaths>(createIdentityClient)
export const studentClient =
  createServiceClient<StudentPaths>(createStudentClient)
