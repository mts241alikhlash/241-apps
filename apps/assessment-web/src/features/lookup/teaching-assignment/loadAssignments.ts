import { teachingAssignmentApi } from './api/teachingAssignmentApi'
import type { TeachingAssignment, TeachingAssignmentQueryParams } from './types'
import { useRoleGuard } from '@/features/platform/auth'

export interface LoadedAssignments {
  rows: TeachingAssignment[]
  total: number
}

export async function loadAssignments(
  query: TeachingAssignmentQueryParams,
): Promise<LoadedAssignments> {
  const { can } = useRoleGuard()
  const maySeeEveryone = can('teaching-assignments.read')

  if (can('teaching-assignments.read-own')) {
    try {
      const mine = await teachingAssignmentApi.getMyTeachingAssignments(query)
      const rows = mine.data?.data ?? []
      if (rows.length > 0 || !maySeeEveryone) {
        return { rows, total: mine.data?.meta?.total ?? rows.length }
      }
    } catch {
      if (!maySeeEveryone) throw new Error('Tidak ada jadwal mengajar.')
    }
  }

  if (!maySeeEveryone) return { rows: [], total: 0 }

  const all = await teachingAssignmentApi.getTeachingAssignments(query)
  const rows = all.data?.data ?? []
  return { rows, total: all.data?.meta?.total ?? rows.length }
}
