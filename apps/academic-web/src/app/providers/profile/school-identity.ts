import api from '@mts241alikhlash/web-shared/utils/api'
import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import type { SchoolIdentity } from '@/features/platform/profile'
import { useAuthStore } from '@/features/platform/auth'

interface EmployeeSlice {
  employmentType?: { name?: string } | null
  positions?: {
    isPrimary?: boolean
    hireDate?: string | null
    position?: { name?: string; category?: { name?: string } | null } | null
  }[]
}

interface StudentClassroomSlice {
  classroom?: {
    displayName?: string | null
    grade?: { name?: string } | null
  } | null
  supervisorName?: string | null
}

interface TeachingAssignmentSlice {
  subject?: { name?: string } | null
}

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : undefined

async function soft<T>(request: Promise<{ data: { data: T } }>) {
  try {
    return (await request).data.data
  } catch {
    return null
  }
}

export async function schoolIdentityProvider({
  isOwnProfile,
}: {
  isOwnProfile: boolean
}): Promise<SchoolIdentity | null> {
  if (!isOwnProfile) return null

  const permissions = useAuthStore().user?.permissions ?? []
  if (
    permissions.includes('students.read-own') &&
    !permissions.includes('students.read')
  ) {
    const classroom = await soft(
      api.get<ApiSingleResponse<StudentClassroomSlice>>(
        '/students/me/classroom',
      ),
    )
    if (!classroom?.classroom) return null
    return {
      className: classroom.classroom.displayName ?? undefined,
      gradeLevel: classroom.classroom.grade?.name ?? undefined,
      supervisorName: classroom.supervisorName ?? undefined,
    }
  }

  const [employee, assignments] = await Promise.all([
    soft(api.get<ApiSingleResponse<EmployeeSlice>>('/employees/me')),
    soft(
      api.get<ApiSingleResponse<TeachingAssignmentSlice[]>>(
        '/teaching-assignments/me',
      ),
    ),
  ])

  if (!employee && !assignments?.length) return null

  const positions = employee?.positions ?? []
  const primary = positions.find((p) => p.isPrimary) ?? positions[0]
  const extras = positions
    .filter((p) => p !== primary)
    .map((p) => p.position?.name)
    .filter(Boolean)

  const subjects = [
    ...new Set((assignments ?? []).map((a) => a.subject?.name).filter(Boolean)),
  ]

  return {
    employmentStatus: employee?.employmentType?.name ?? undefined,
    primaryPosition: primary?.position?.name ?? undefined,
    additionalDuties: extras.length > 0 ? extras.join(', ') : undefined,
    positionCategory: primary?.position?.category?.name ?? undefined,
    hireDate: formatDate(primary?.hireDate),
    taughtSubjects: subjects.length > 0 ? subjects.join(', ') : undefined,
  }
}
