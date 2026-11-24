import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  eventStatusLabel,
  eventStatusVariant,
  type ExamEvent,
} from '@/features/exam-event/types'
import { examTypeLabel } from '@/features/exam-schedule/types'

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'long',
})

const formatEventDate = (iso: string): string =>
  dateFormat.format(new Date(iso))

export function buildRoomEventColumns(options: {
  onOpen: (event: ExamEvent) => void
}): ColumnDef<ExamEvent>[] {
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
      meta: {
        strong: true,
        mobile: 'title',
        mobileValue: (row: ExamEvent) => row.name,
      },
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'startDate',
      header: 'Tanggal Mulai',
      meta: {
        align: 'center',
        mobileLabel: 'Tanggal Mulai',
        mobileValue: (row: ExamEvent) => formatEventDate(row.startsAt),
      },
      cell: ({ row }) => formatEventDate(row.original.startsAt),
    },
    {
      id: 'endDate',
      header: 'Tanggal Selesai',
      meta: {
        align: 'center',
        mobileLabel: 'Tanggal Selesai',
        mobileValue: (row: ExamEvent) => formatEventDate(row.endsAt),
      },
      cell: ({ row }) => formatEventDate(row.original.endsAt),
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
      meta: { align: 'center' },
      cell: ({ row }) =>
        h(ActionCell, {
          viewLabel: 'Lihat',
          hideEdit: true,
          hideDelete: true,
          onView: () => options.onOpen(row.original),
        }),
    },
  ]
}
