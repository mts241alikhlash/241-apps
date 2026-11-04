import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { ClassroomEnrollment } from '../types'
import { Badge } from '@mts241alikhlash/ui/badge'
import { formatEntityName } from '@mts241alikhlash/web-shared/utils/utils'

export const baseColumns: ColumnDef<ClassroomEnrollment>[] = [
  {
    id: 'nis',
    header: 'NIS',
    meta: { align: 'center' },
    accessorFn: (row) => row.student.nis,
  },
  {
    id: 'nisn',
    header: 'NISN',
    meta: { align: 'center' },
    accessorFn: (row) => row.student.nisn,
  },
  {
    id: 'name',
    header: 'Nama Siswa',
    meta: { align: 'left' },
    accessorFn: (row) => row.student.user.profile.name,
    cell: ({ row }) => formatEntityName(row.original.student.user.profile.name),
  },
  {
    id: 'gender',
    header: 'L/P',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const gender = row.original.student.user.profile.gender
      if (gender === 'MALE') return 'L'
      if (gender === 'FEMALE') return 'P'
      return '-'
    },
  },
  {
    id: 'status',
    header: 'Status',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const status = row.original.status
      const labelMap: Record<string, string> = {
        ACTIVE: 'Aktif',
        PROMOTED: 'Naik Kelas',
        REPEATED: 'Tinggal Kelas',
        TRANSFERRED: 'Pindah',
        DROPPED: 'Dikeluarkan',
        GRADUATED: 'Lulus',
      }
      const label = labelMap[status] ?? status
      const variant = status === 'ACTIVE' ? 'default' : 'secondary'
      return h(Badge, { variant }, () => label)
    },
  },
]

export const selectColumn: ColumnDef<ClassroomEnrollment> = {
  id: 'select',
  header: ({ table }) =>
    h(Checkbox, {
      modelValue:
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
        table.toggleAllPageRowsSelected(value === true),
      ariaLabel: 'Pilih semua',
    }),
  cell: ({ row }) =>
    h(Checkbox, {
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
        row.toggleSelected(value === true),
      ariaLabel: 'Pilih baris',
    }),
  enableSorting: false,
  enableHiding: false,
}
