import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Users } from '@lucide/vue'
import type { ExamEvent } from '../types'
import { eventStatusLabel, eventStatusVariant } from '../types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { formatWindow } from '@/features/exam-schedule/utils/formatWindow'

export interface EventColumnOptions {
  canManage: boolean
  onOpen: (event: ExamEvent) => void
  onEdit: (event: ExamEvent) => void
  onRooms: (event: ExamEvent) => void
}

export function buildEventColumns(
  options: EventColumnOptions,
): ColumnDef<ExamEvent>[] {
  return [
    {
      id: 'name',
      header: 'Kegiatan',
      meta: { align: 'left', strong: true },
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'type',
      header: 'Jenis',
      meta: {
        mobileLabel: 'Jenis',
        mobileValue: (row: ExamEvent) => examTypeLabel(row.type),
      },
      cell: ({ row }) => examTypeLabel(row.original.type),
    },
    {
      id: 'window',
      header: 'Waktu',
      meta: {
        mobileLabel: 'Waktu',
        mobileValue: (row: ExamEvent) => formatWindow(row.startsAt, row.endsAt),
      },
      cell: ({ row }) =>
        formatWindow(row.original.startsAt, row.original.endsAt),
    },
    {
      id: 'late',
      header: 'Toleransi',
      meta: {
        align: 'center',
        mobileLabel: 'Toleransi',
        mobileValue: (row: ExamEvent) => `${row.lateToleranceMinutes} menit`,
      },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'tabular-nums' },
          `${row.original.lateToleranceMinutes} menit`,
        ),
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
          viewLabel: 'Buka',
          editLabel: 'Ubah',
          hideEdit: !options.canManage,
          hideDelete: true,
          items: [
            {
              label: 'Ruangan',
              icon: Users,
              onClick: () => options.onRooms(row.original),
            },
          ],
          onView: () => options.onOpen(row.original),
          onEdit: () => options.onEdit(row.original),
        }),
    },
  ]
}
