import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@mts241alikhlash/ui/badge'
import type { RaporData } from '../types'

const formatAverage = (row: RaporData) => {
  const val = row.totalAverage
  return val !== null && val !== undefined ? Number(val).toFixed(2) : '-'
}

export const columns: ColumnDef<RaporData>[] = [
  {
    accessorKey: 'nis',
    header: 'NIS',
    meta: {
      align: 'center',
      mobileLabel: 'NIS',
      mobileValue: (row: RaporData) => row.enrollment?.student?.nis || '-',
    },
    cell: ({ row }) => row.original.enrollment?.student?.nis || '-',
  },
  {
    accessorKey: 'name',
    header: 'Nama Siswa',
    meta: { align: 'left', strong: true, mobileLabel: 'Nama Siswa' },
    cell: ({ row }) =>
      row.original.enrollment?.student?.user?.profile?.name ?? '-',
  },
  {
    accessorKey: 'className',
    header: 'Kelas',
    meta: {
      align: 'center',
      mobileLabel: 'Kelas',
      mobileValue: (row: RaporData) =>
        row.enrollment?.classroom?.displayName || '-',
    },
    cell: ({ row }) => row.original.enrollment?.classroom?.displayName || '-',
  },
  {
    accessorKey: 'totalAverage',
    header: 'Rata-rata',
    meta: {
      align: 'center',
      mobileLabel: 'Rata-rata',
      mobileValue: formatAverage,
    },
    cell: ({ row }) => formatAverage(row.original),
  },
  {
    accessorKey: 'rank',
    header: 'Peringkat',
    meta: {
      align: 'center',
      mobileLabel: 'Peringkat',
      mobileValue: (row: RaporData) => row.rank ?? '-',
    },
    cell: ({ row }) => row.original.rank ?? '-',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileLabel: 'Status',
      mobileValue: (row: RaporData) =>
        row.isPublished ? 'Published' : 'Draft',
    },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.isPublished ? 'success' : 'warning' },
        () => (row.original.isPublished ? 'Published' : 'Draft'),
      ),
  },
]
