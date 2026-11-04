import type { RoleUsage } from '../types'

export function roleUsageWarning(usage: RoleUsage | undefined): string | null {
  if (!usage) return null
  return `Role ini menyetujui ${usage.steps} langkah persetujuan inventaris (${usage.workflows.join(', ')}). Jika dihapus, langkah tersebut tidak dapat disetujui siapa pun sampai workflow-nya diubah.`
}
