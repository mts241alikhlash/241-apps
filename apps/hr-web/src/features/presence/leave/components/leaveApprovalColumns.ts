import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'
import { Check, X } from '@lucide/vue'
import { STATUS_LABEL, STATUS_VARIANT } from '../types'
import type { LeaveRequest } from '../types'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function createLeaveApprovalColumns(
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
  isSaving: boolean,
  currentUserId: string | null = null,
): ColumnDef<LeaveRequest>[] {
  return [
    {
      id: 'requester',
      header: 'Pemohon',
      meta: { align: 'left' },
      cell: ({ row }) => row.original.requester.displayName ?? '-',
      accessorFn: (row) => row.requester.displayName ?? '',
    },
    {
      id: 'leaveType',
      header: 'Jenis',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const type = row.original.leaveType
        return h('div', { class: 'flex items-center justify-center gap-1.5' }, [
          h('span', type.name),
          type.treatment === 'OFFICIAL_DUTY'
            ? h(Badge, { variant: 'outline' }, () => 'Dinas')
            : null,
        ])
      },
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
      id: 'reason',
      header: 'Alasan',
      meta: { align: 'left' },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'max-w-[200px] truncate block', title: row.original.reason },
          row.original.reason,
        ),
    },
    {
      id: 'actions',
      header: 'Opsi',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const req = row.original
        if (req.status !== 'PENDING') {
          return h(
            Badge,
            { variant: STATUS_VARIANT[req.status] },
            () => STATUS_LABEL[req.status],
          )
        }

        if (currentUserId && req.requesterId === currentUserId) {
          return h(
            Badge,
            { variant: 'outline', class: 'text-muted-foreground' },
            () => 'Pengajuan Anda',
          )
        }

        return h(ActionCell, {
          hideEdit: true,
          hideDelete: true,
          items: [
            {
              label: 'Setujui Pengajuan',
              icon: Check,
              disabled: isSaving,
              onClick: () => onApprove(req.id),
            },
            {
              label: 'Tolak Pengajuan',
              icon: X,
              destructive: true,
              disabled: isSaving,
              onClick: () => onReject(req.id),
            },
          ],
        })
      },
    },
  ]
}
