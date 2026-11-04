import { describe, expect, it } from 'vitest'
import { roleUsageWarning } from './roleUsage'

describe('roleUsageWarning', () => {
  it('names the steps and workflows a deletion would strand', () => {
    expect(
      roleUsageWarning({
        roleCode: 'PRINCIPAL',
        steps: 3,
        workflows: ['Peminjaman', 'Pengadaan'],
      }),
    ).toBe(
      'Role ini menyetujui 3 langkah persetujuan inventaris (Peminjaman, Pengadaan). Jika dihapus, langkah tersebut tidak dapat disetujui siapa pun sampai workflow-nya diubah.',
    )
  })

  it('says nothing for a role no workflow uses', () => {
    expect(roleUsageWarning(undefined)).toBeNull()
  })
})
