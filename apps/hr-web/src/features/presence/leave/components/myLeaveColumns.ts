import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { RotateCcw } from '@lucide/vue'
import { STATUS_LABEL, STATUS_VARIANT } from '../types'
import type { LeaveRequest } from '../types'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function createMyLeaveColumns(
  onWithdraw: (id: string) => void,
): ColumnDef<LeaveRequest>[] {
  return [
    {
      id: 'leaveType',
      header: 'Jenis',
      meta: { align: 'center' },
      cell: ({ row }) => row.original.leaveType.name,
      accessorFn: (row) => row.leaveType.name,
    },
    {
      id: 'startDate',
      header: 'Tgl Mulai',
      meta: { align: 'center' },
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      id: 'endDate',
      header: 'Tgl Selesai',
      meta: { align: 'center' },
      cell: ({ row }) => formatDate(row.original.endDate),
    },
    {
      id: 'workingDayCount',
      header: 'Hari Kerja',
      meta: { align: 'center' },
      cell: ({ row }) => `${row.original.workingDayCount} hari`,
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const req = row.original
        const children = [
          h(
            Badge,
            { variant: STATUS_VARIANT[req.status] },
            () => STATUS_LABEL[req.status],
          ),
        ]
        if (req.status === 'REJECTED' && req.decisionReason) {
          children.push(
            h(
              'p',
              { class: 'text-muted-foreground mt-1 text-xs italic' },
              `"${req.decisionReason}"`,
            ),
          )
        }
        return h(
          'div',
          { class: 'flex flex-col items-center justify-center' },
          children,
        )
      },
    },
    {
      id: 'actions',
      header: 'Opsi',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const req = row.original
        if (req.status !== 'PENDING') return '-'
        return h(
          Button,
          { size: 'sm', variant: 'outline', onClick: () => onWithdraw(req.id) },
          () => [h(RotateCcw, { class: 'size-4 mr-1.5' }), 'Tarik Pengajuan'],
        )
      },
    },
  ]
}
