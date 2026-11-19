import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { RaporData } from '../types'

export const columns: ColumnDef<RaporData>[] = [
  {
    accessorKey: 'nis',
    header: 'NIS',
    cell: ({ row }) => row.original.enrollment?.student?.nis || '-',
  },
  {
    accessorKey: 'name',
    header: 'Nama Siswa',
    cell: ({ row }) =>
      row.original.enrollment?.student?.user?.profile?.name ?? '-',
  },
  {
    accessorKey: 'className',
    header: 'Kelas',
    cell: ({ row }) => row.original.enrollment?.classroom?.displayName || '-',
  },
  {
    accessorKey: 'totalAverage',
    header: 'Rata-rata',
    cell: ({ row }) => {
      const val = row.original.totalAverage
      return val !== null && val !== undefined ? Number(val).toFixed(2) : '-'
    },
  },
  {
    accessorKey: 'rank',
    header: 'Peringkat',
    cell: ({ row }) => row.original.rank ?? '-',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) =>
      h(
        'span',
        {
          class: row.original.isPublished
            ? 'inline-flex items-center rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success ring-1 ring-inset ring-success'
            : 'inline-flex items-center rounded-md bg-warning/10 px-2 py-1 text-xs font-medium text-warning ring-1 ring-inset ring-warning',
        },
        row.original.isPublished ? 'Published' : 'Draft',
      ),
  },
]
