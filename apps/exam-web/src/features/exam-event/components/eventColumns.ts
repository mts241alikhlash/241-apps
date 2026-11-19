import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import type { ExamEvent } from '../types'
import { eventStatusLabel, eventStatusVariant } from '../types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { formatDateRange } from '@/features/exam-schedule/utils/formatDateRange'

export interface EventColumnOptions {
  canManage: boolean
  onEdit: (event: ExamEvent) => void
}

export function buildEventColumns(
  options: EventColumnOptions,
): ColumnDef<ExamEvent>[] {
  return [
    {
      id: 'name',
      header: 'Periode Ujian',
      meta: { align: 'left', strong: true, mobileLabel: 'Periode Ujian' },
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'type',
      header: 'Jenis',
      meta: {
        align: 'center',
        mobileLabel: 'Jenis',
        mobileValue: (row: ExamEvent) => examTypeLabel(row.type),
      },
      cell: ({ row }) => examTypeLabel(row.original.type),
    },
    {
      id: 'window',
      header: 'Waktu',
      meta: {
        align: 'center',
        mobileLabel: 'Waktu',
        mobileValue: (row: ExamEvent) =>
          formatDateRange(row.startsAt, row.endsAt),
      },
      cell: ({ row }) =>
        formatDateRange(row.original.startsAt, row.original.endsAt),
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: ExamEvent) => eventStatusLabel(row.status),
      },
      cell: ({ row }) =>
        h(Badge, { variant: eventStatusVariant(row.original.status) }, () =>
          eventStatusLabel(row.original.status),
        ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        h(ActionCell, {
          editLabel: 'Ubah',
          hideEdit: !options.canManage,
          hideDelete: true,
          onEdit: () => options.onEdit(row.original),
        }),
    },
  ]
}
