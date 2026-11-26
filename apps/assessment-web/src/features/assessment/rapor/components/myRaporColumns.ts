import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import type { RaporData } from '../types'

const semesterText = (row: RaporData) => {
  const semester = row.enrollment?.semester
  const year = semester?.academicYear?.name
  const term =
    semester?.type?.name === 'ODD'
      ? 'Ganjil'
      : semester?.type?.name === 'EVEN'
        ? 'Genap'
        : null
  return [term, year].filter(Boolean).join(' – ') || '-'
}

const classroomText = (row: RaporData) =>
  row.enrollment?.classroom?.displayName ??
  row.enrollment?.classroom?.name ??
  '-'

const averageText = (row: RaporData) => {
  const val = row.totalAverage
  return val !== null && val !== undefined ? Number(val).toFixed(2) : '-'
}

export const createMyRaporColumns = (
  onView: (rapor: RaporData) => void,
): ColumnDef<RaporData>[] => [
  {
    id: 'semester',
    header: 'Semester',
    meta: { align: 'left', strong: true, mobileLabel: 'Semester' },
    cell: ({ row }) => semesterText(row.original),
  },
  {
    id: 'classroom',
    header: 'Kelas',
    meta: {
      align: 'center',
      mobileLabel: 'Kelas',
      mobileValue: classroomText,
    },
    cell: ({ row }) => classroomText(row.original),
  },
  {
    accessorKey: 'totalAverage',
    header: 'Rata-rata',
    meta: {
      align: 'center',
      mobileLabel: 'Rata-rata',
      mobileValue: averageText,
    },
    cell: ({ row }) => averageText(row.original),
  },
  {
    accessorKey: 'rank',
    header: 'Peringkat',
    meta: {
      align: 'center',
      mobileLabel: 'Peringkat',
      mobileValue: (row: RaporData) => row.rank ?? '-',
    },
    cell: ({ row }) =>
      row.original.rank !== null && row.original.rank !== undefined
        ? String(row.original.rank)
        : '-',
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileLabel: 'Status',
      mobileValue: () => 'Terbit',
    },
    cell: () => h(Badge, { variant: 'success' }, () => 'Terbit'),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Lihat Rapor',
        hideEdit: true,
        hideDelete: true,
        onView: () => onView(row.original),
      }),
  },
]
