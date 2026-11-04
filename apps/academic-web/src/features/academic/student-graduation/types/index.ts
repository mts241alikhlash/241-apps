export interface GraduationStudentProfile {
  name?: string | null
}

export interface GraduationStudentUser {
  identifier: string
  profile?: GraduationStudentProfile | null
}

export interface GraduationStudent {
  id: string
  nis: string
  nisn: string
  status: string
  user?: GraduationStudentUser
}

export interface GraduationAcademicYear {
  id: string
  name: string
  isActive: boolean
}

export interface StudentGraduation {
  id: string
  studentId: string
  academicYearId: string
  graduationDate?: string | null
  certificateNo?: string | null
  note?: string | null
  createdAt: string
  updatedAt: string
  student?: GraduationStudent
  academicYear?: GraduationAcademicYear
}

export interface StudentGraduationSavePayload {
  studentId: string
  academicYearId: string
  graduationDate?: string
  certificateNo?: string
  note?: string
}

export interface StudentGraduationQueryParams {
  page?: number
  limit?: number
  academicYearId?: string
  search?: string
}

export interface StudentGraduationColumnActions {
  onEdit?: (item: StudentGraduation) => void
  onDelete?: (
    item: StudentGraduation,
    callbacks: { closeAlert: () => void; setLoading: (s: boolean) => void },
  ) => Promise<void>
  showActions?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export interface GraduationPreviousHold {
  academicYearId: string
  academicYearName: string
  reason: string
  decidedAt: string
}

export interface GraduationCandidate {
  studentId: string
  studentName: string
  nis: string
  classroomId: string
  classroomName: string
  gradeName: string
  previousHold?: GraduationPreviousHold
}

export interface GraduationTerm {
  id: string
  name: string
}

export interface GraduationCandidateList {
  academicYear: GraduationTerm | null
  finalGradeName: string | null
  students: GraduationCandidate[]
}

export interface BulkGraduationPayload {
  graduationDate?: string
  students: { studentId: string; certificateNo?: string; note?: string }[]
  held?: { studentId: string; reason: string }[]
}

export interface BulkGraduationResult {
  graduated: number
  skipped: number
  held: number
}

export interface GraduationHold {
  id: string
  studentId: string
  studentName: string
  nis: string
  academicYearId: string
  academicYearName: string
  reason: string
  decidedAt: string
}

export interface GraduationStudentDecision {
  studentId: string
  approved: boolean
  declineReason?: string
}
