import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Progress } from '@mts241alikhlash/ui'
import type { AttendanceRecapItem } from '../types'

export * from './attendanceInputColumns'

export const createRecapColumns = (): ColumnDef<AttendanceRecapItem>[] => [
  {
    accessorKey: 'nis',
    header: 'NIS',
    meta: {
      align: 'center',
      mobileLabel: 'NIS',
      mobileValue: (row: AttendanceRecapItem) => row.nis || '-',
    },
  },
  {
    accessorKey: 'studentName',
    header: 'Nama Siswa',
    meta: { align: 'left', strong: true, mobileLabel: 'Nama Siswa' },
  },
  {
    accessorKey: 'PRESENT',
    header: 'Hadir',
    meta: {
      align: 'center',
      mobileLabel: 'Hadir',
      mobileValue: (row: AttendanceRecapItem) => row.PRESENT,
    },
  },
  {
    accessorKey: 'SICK',
    header: 'Sakit',
    meta: {
      align: 'center',
      mobileLabel: 'Sakit',
      mobileValue: (row: AttendanceRecapItem) => row.SICK,
    },
  },
  {
    accessorKey: 'EXCUSED',
    header: 'Izin',
    meta: {
      align: 'center',
      mobileLabel: 'Izin',
      mobileValue: (row: AttendanceRecapItem) => row.EXCUSED,
    },
  },
  {
    accessorKey: 'ABSENT',
    header: 'Alpa',
    meta: {
      align: 'center',
      mobileLabel: 'Alpa',
      mobileValue: (row: AttendanceRecapItem) => row.ABSENT,
    },
  },
  {
    accessorKey: 'LATE',
    header: 'Telat',
    meta: {
      align: 'center',
      mobileLabel: 'Telat',
      mobileValue: (row: AttendanceRecapItem) => row.LATE,
    },
  },
  {
    accessorKey: 'total',
    header: 'Total',
    meta: {
      align: 'center',
      mobileLabel: 'Total',
      mobileValue: (row: AttendanceRecapItem) => row.total,
    },
  },
  {
    id: 'percentage',
    header: 'Persentase',
    meta: {
      align: 'center',
      mobileLabel: 'Persentase',
      mobileValue: (row: AttendanceRecapItem) => `${row.percentage}%`,
    },
    cell: ({ row }) => {
      const pct = row.original.percentage
      return h('div', { class: 'flex items-center gap-2 min-w-28' }, [
        h(Progress, { modelValue: pct, class: 'h-1.5' }),
        h('span', { class: 'tabular-nums' }, `${pct}%`),
      ])
    },
  },
]
