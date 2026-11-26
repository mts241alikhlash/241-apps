import type { ColumnDef } from '@tanstack/vue-table'
import type { MyDashboardLesson } from '../types'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function createTodayLessonColumns(
  todayDate?: string,
): ColumnDef<MyDashboardLesson>[] {
  const d = todayDate ? new Date(todayDate) : new Date()
  const dayLabel = HARI[d.getDay()] ?? ''
  const dateLabel = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return [
    {
      id: 'dayDate',
      header: 'Hari, Tanggal',
      meta: {
        align: 'left',
        mobileLabel: 'Hari, Tanggal',
        mobileValue: () => `${dayLabel}, ${dateLabel}`,
      },
      cell: () => `${dayLabel}, ${dateLabel}`,
    },
    {
      id: 'time',
      header: 'Waktu',
      meta: {
        align: 'center',
        mobileLabel: 'Waktu',
        mobileValue: (row: MyDashboardLesson) =>
          `${row.startTime} - ${row.endTime}`,
      },
      cell: ({ row }) => `${row.original.startTime} - ${row.original.endTime}`,
    },
    {
      id: 'subjectName',
      accessorKey: 'subjectName',
      header: 'Mata Pelajaran',
      meta: { align: 'left', strong: true, mobileLabel: 'Mata Pelajaran' },
    },
    {
      id: 'classroomCode',
      accessorKey: 'classroomCode',
      header: 'Kelas',
      meta: {
        align: 'center',
        mobileLabel: 'Kelas',
        mobileValue: (row: MyDashboardLesson) => row.classroomCode ?? '-',
      },
      cell: ({ row }) => row.original.classroomCode ?? '-',
    },
  ]
}
