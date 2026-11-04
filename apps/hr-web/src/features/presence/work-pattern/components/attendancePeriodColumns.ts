import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { Lock } from '@lucide/vue'

import type { AttendancePeriodRow } from '../types'

export function createAttendancePeriodColumns(
  onClosePeriod: (month: number) => void,
): ColumnDef<AttendancePeriodRow>[] {
  return [
    {
      id: 'label',
      header: 'Bulan',
      meta: { align: 'center' },
      cell: ({ row }) =>
        h('span', { class: 'font-medium' }, row.original.label),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const isClosed = row.original.status === 'CLOSED'
        return h(Badge, { variant: isClosed ? 'secondary' : 'outline' }, () =>
          isClosed ? 'Ditutup' : 'Terbuka',
        )
      },
    },
    {
      id: 'actions',
      header: 'Opsi',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const isClosed = row.original.status === 'CLOSED'
        if (isClosed) return null

        return h(
          Button,
          {
            size: 'sm',
            variant: 'outline',
            onClick: () => onClosePeriod(row.original.month),
          },
          () => [h(Lock, { class: 'size-4 mr-1.5' }), 'Tutup Periode'],
        )
      },
    },
  ]
}
