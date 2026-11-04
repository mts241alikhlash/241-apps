export interface CurriculumSubjectAcademicYear {
  id: string
  name: string
}

export interface CurriculumSubjectCurriculum {
  id: string
  name: string
  academicYear?: CurriculumSubjectAcademicYear
}

export interface CurriculumSubjectSubject {
  id: string
  name: string
  code?: string | null
}

export interface CurriculumSubject {
  id: string
  curriculumId: string
  subjectId: string
  hoursPerWeek: number
  passingScore: number
  curriculum?: CurriculumSubjectCurriculum
  subject?: CurriculumSubjectSubject
}

export interface CurriculumSubjectSavePayload {
  curriculumId: string
  subjectId: string
  hoursPerWeek?: number
  passingScore?: number
}

export interface CurriculumSubjectQueryParams {
  page?: number
  limit?: number
  curriculumId?: string
  subjectId?: string
}

export interface CurriculumSubjectColumnActions {
  onEdit?: (item: CurriculumSubject) => void
  onDelete?: (
    item: CurriculumSubject,
    callbacks: { closeAlert: () => void; setLoading: (s: boolean) => void },
  ) => Promise<void>
  showActions?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}
