import type { Classroom } from './classroom'
import type { ClassroomStructure } from './structure'
import type { ClassroomEnrollment } from './enrollment'
import type { TeachingAssignment } from '@/features/academic/teaching-assignment'

export interface MyClassroom {
  classroom: Classroom
  structure: ClassroomStructure | null
  supervisor: {
    id?: string
    employee?: { user?: { profile?: { name?: string | null } | null } | null }
  } | null
  classmates: ClassroomEnrollment[]
  subjects: TeachingAssignment[]
}
