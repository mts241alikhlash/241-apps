import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import type { DayGroup, SubjectGroup } from '../composables/useReportHierarchy'

const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' })
const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dayLabel = (day: DayGroup): string =>
  dateFormat.format(new Date(day.startsAt))

const clock = (iso: string): string => timeFormat.format(new Date(iso))

export function buildMonitorDayColumns(options: {
  onOpen: (row: DayGroup) => void
}): ColumnDef<DayGroup>[] {
  return [
    {
      id: 'date',
      header: 'Tanggal',
      meta: {
        strong: true,
        mobile: 'title',
        mobileValue: (row: DayGroup) => dayLabel(row),
      },
      cell: ({ row }) => dayLabel(row.original),
    },
    {
      id: 'subjects',
      header: 'Mata Pelajaran',
      meta: {
        align: 'center',
        mobileValue: (row: DayGroup) => row.subjectCount,
      },
      cell: ({ row }) => String(row.original.subjectCount),
    },
    {
      id: 'rooms',
      header: 'Jumlah Ruang',
      meta: {
        align: 'center',
        mobileValue: (row: DayGroup) => row.roomCount,
      },
      cell: ({ row }) => String(row.original.roomCount),
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

export function buildMonitorSubjectColumns(options: {
  onOpen: (row: SubjectGroup) => void
}): ColumnDef<SubjectGroup>[] {
  return [
    {
      id: 'subject',
      header: 'Mata Pelajaran',
      meta: {
        strong: true,
        mobile: 'title',
        mobileValue: (row: SubjectGroup) => row.subjectName,
      },
      cell: ({ row }) => row.original.subjectName,
    },
    {
      id: 'start',
      header: 'Jam Mulai',
      meta: {
        align: 'center',
        mobileValue: (row: SubjectGroup) => clock(row.startsAt),
      },
      cell: ({ row }) => clock(row.original.startsAt),
    },
    {
      id: 'end',
      header: 'Jam Selesai',
      meta: {
        align: 'center',
        mobileValue: (row: SubjectGroup) => clock(row.endsAt),
      },
      cell: ({ row }) => clock(row.original.endsAt),
    },
    {
      id: 'rooms',
      header: 'Jumlah Ruang',
      meta: {
        align: 'center',
        mobileValue: (row: SubjectGroup) => row.roomCount,
      },
      cell: ({ row }) => String(row.original.roomCount),
    },
    {
      id: 'participants',
      header: 'Jumlah Peserta',
      meta: {
        align: 'center',
        mobileValue: (row: SubjectGroup) => row.participantCount,
      },
      cell: ({ row }) => String(row.original.participantCount),
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
