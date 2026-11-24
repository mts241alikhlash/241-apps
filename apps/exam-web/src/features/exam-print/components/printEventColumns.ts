import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Printer } from '@lucide/vue'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  eventStatusLabel,
  eventStatusVariant,
  type ExamEvent,
} from '@/features/exam-event/types'
import { examTypeLabel } from '@/features/exam-schedule/types'

export function buildPrintEventColumns(options: {
  formatDate: (iso: string) => string
  onView: (event: ExamEvent) => void
  onPrint: (event: ExamEvent) => void
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
        mobileValue: (row: ExamEvent) => options.formatDate(row.startsAt),
      },
      cell: ({ row }) => options.formatDate(row.original.startsAt),
    },
    {
      id: 'endDate',
      header: 'Tanggal Selesai',
      meta: {
        align: 'center',
        mobileLabel: 'Tanggal Selesai',
        mobileValue: (row: ExamEvent) => options.formatDate(row.endsAt),
      },
      cell: ({ row }) => options.formatDate(row.original.endsAt),
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
          manageLabel: 'Lihat',
          hideEdit: true,
          hideDelete: true,
          items: [
            {
              label: 'Cetak',
              icon: Printer,
              onClick: () => options.onPrint(row.original),
            },
          ],
          onManage: () => options.onView(row.original),
        }),
    },
  ]
}
