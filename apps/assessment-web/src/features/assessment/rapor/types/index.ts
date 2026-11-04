import type { PaginationMeta } from '@mts241alikhlash/web-shared/types/api'

export interface RaporEnrollment {
  student: {
    id: string
    nis: string
    nisn: string
    user: {
      profile: {
        name: string
      } | null
    }
  }
  classroom: {
    id: string
    name: string
    displayName: string
    gradeId: string
    classroomLevelId?: string
  }
  semester: {
    id: string
    type?: {
      name: string
    }
    academicYear?: {
      name: string
    }
  }
}

export interface RaporSubject {
  subjectId: string
  subjectCode: string | null
  subjectName: string
  score: number
  passingScore: number
  predicate: string
  description: string
  isComplete: boolean
}

export interface RaporData {
  id: string
  enrollmentId: string
  totalAverage: number | null
  rank: number | null
  employeeNote: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
  enrollment: RaporEnrollment
  subjects?: RaporSubject[]
}

export interface RaporDetailData extends RaporData {
  attendance: {
    SICK: number
    EXCUSED: number
    ABSENT: number
  }
}

export interface RaporQueryParams {
  page?: number
  limit?: number
  studentId?: string
  classroomId?: string
  semesterId?: string
  isPublished?: boolean
}

export interface RaporSummary {
  published: number
  draft: number
  averageScore: number | null
}

export interface RaporListMeta extends PaginationMeta {
  summary?: RaporSummary
}

export interface GenerateRaporPayload {
  enrollmentId: string
  employeeNote?: string
  rank?: number
  isPublished?: boolean
}

export interface BulkGeneratePayload {
  classroomId: string
  semesterId: string
}

export interface BulkGenerateResult {
  total: number
  generated: number
  skipped: number
  skippedEnrollmentIds: string[]
}

export interface UpdateRaporPayload {
  employeeNote?: string
  rank?: number
  isPublished?: boolean
}

export interface RaporScoreRow {
  subject: string
  type: string
  score: number | null
  weight: number
}
