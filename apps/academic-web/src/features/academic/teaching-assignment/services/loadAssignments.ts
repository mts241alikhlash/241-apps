import { teachingAssignmentApi } from '../api/teachingAssignmentApi'
import type {
  TeachingAssignment,
  TeachingAssignmentQueryParams,
} from '../types'
import { useRoleGuard } from '@/features/platform/auth'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'

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
    } catch (err) {
      if (notifyIfOutage(err)) throw err
      if (!maySeeEveryone)
        throw new Error('Tidak ada jadwal mengajar.', { cause: err })
    }
  }

  if (!maySeeEveryone) return { rows: [], total: 0 }

  const all = await teachingAssignmentApi.getTeachingAssignments(query)
  const rows = all.data?.data ?? []
  return { rows, total: all.data?.meta?.total ?? rows.length }
}
