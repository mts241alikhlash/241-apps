export interface TeachingAssignmentProfile {
  name?: string | null
}

export interface TeachingAssignmentUser {
  profile?: TeachingAssignmentProfile | null
}

export interface TeachingAssignmentEmployee {
  id: string
  nip?: string | null
  user?: TeachingAssignmentUser
}

export interface TeachingAssignmentSubject {
  id: string
  name: string
  code: string
}

export interface TeachingAssignmentSubjectOption {
  id: string
  name: string
  code?: string | null
}

export interface TeachingAssignmentClassroom {
  id: string
  name: string
}

export interface TeachingAssignmentAcademicYear {
  id: string
  name: string
}

export interface TeachingAssignmentSemester {
  id: string
  type?: {
    name: string
  }
  academicYear?: TeachingAssignmentAcademicYear
}

export interface TeachingAssignment {
  id: string
  employeeId: string
  classroomId: string
  subjectId: string
  semesterId: string
  passingScore?: number | null
  employee?: TeachingAssignmentEmployee
  classroom?: TeachingAssignmentClassroom
  subject?: TeachingAssignmentSubject
  semester?: TeachingAssignmentSemester
}

export interface TeachingAssignmentCreatePayload {
  employeeId: string
  classroomIds: string[]
  subjectId: string
  semesterId: string
}

export interface TeachingAssignmentUpdatePayload {
  employeeId: string
  classroomId: string
  subjectId: string
  semesterId: string
  passingScore?: number | null
}

export interface SkippedClassroom {
  classroomId: string
  reason: string
}

export interface TeachingAssignmentCreateResult {
  created: TeachingAssignment[]
  skipped: SkippedClassroom[]
}

export interface TeachingAssignmentQueryParams {
  page?: number
  limit?: number
  employeeId?: string
  classroomId?: string
  subjectId?: string
  semesterId?: string
}

export interface TeachingAssignmentColumnActions {
  onEdit?: (item: TeachingAssignment) => void
  onDelete?: (
    item: TeachingAssignment,
    callbacks: { closeAlert: () => void; setLoading: (s: boolean) => void },
  ) => Promise<void>
  showActions?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}
