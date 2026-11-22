import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import type { ExamEvent } from '../types'
import { eventStatusLabel, eventStatusVariant } from '../types'
import { examTypeLabel } from '@/features/exam-schedule/types'

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'long',
})

const formatDate = (iso: string): string => dateFormat.format(new Date(iso))

export interface EventColumnOptions {
  canManage: boolean
  onEdit: (event: ExamEvent) => void
}

export function buildEventColumns(
  options: EventColumnOptions,
): ColumnDef<ExamEvent>[] {
  return [
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
      id: 'name',
      header: 'Periode Ujian',
      meta: { align: 'left', strong: true, mobileLabel: 'Periode Ujian' },
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'startDate',
      header: 'Tanggal Mulai',
      meta: {
        align: 'center',
        mobileLabel: 'Tanggal Mulai',
        mobileValue: (row: ExamEvent) => formatDate(row.startsAt),
      },
      cell: ({ row }) => formatDate(row.original.startsAt),
    },
    {
      id: 'endDate',
      header: 'Tanggal Selesai',
      meta: {
        align: 'center',
        mobileLabel: 'Tanggal Selesai',
        mobileValue: (row: ExamEvent) => formatDate(row.endsAt),
      },
      cell: ({ row }) => formatDate(row.original.endsAt),
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
