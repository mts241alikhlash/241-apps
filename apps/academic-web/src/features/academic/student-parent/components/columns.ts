import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { StudentParent, StudentParentColumnActions } from '../types'
import { getParentRelationLabel } from '../types'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'

export const createStudentParentColumns = (
  actions: StudentParentColumnActions,
): ColumnDef<StudentParent>[] => [
  {
    id: 'studentName',
    header: 'Nama Siswa',
    cell: ({ row }) => {
      const studentName = row.original.student?.user?.profile?.name ?? '-'
      return h('div', { class: 'font-medium' }, studentName)
    },
  },
  {
    id: 'parentName',
    header: 'Nama Orang Tua',
    cell: ({ row }) => {
      const parentName = row.original.parent?.name ?? '-'
      return h('div', parentName)
    },
  },
  {
    id: 'parentNik',
    header: 'NIK',
    cell: ({ row }) => {
      const parentNik = row.original.parent?.nik ?? '-'
      return h('div', parentNik)
    },
  },
  {
    id: 'relation',
    header: 'Hubungan',
    cell: ({ row }) => {
      const label = getParentRelationLabel(row.original.relation)
      return h(Badge, { variant: 'outline' }, () => label)
    },
  },
  {
    id: 'isPrimary',
    header: 'Wali Utama',
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.isPrimary ? 'default' : 'secondary' },
        () => (row.original.isPrimary ? 'Ya' : 'Tidak'),
      ),
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const item = row.original

      return h(ActionCell, {
        deleteTitle: 'Hapus relasi orang tua?',
        deleteDescription:
          'Tindakan ini tidak dapat dibatalkan. Data relasi orang tua akan dihapus secara permanen.',
        onEdit: () => actions.onEdit(item),
        onDelete: (payload: {
          closeAlert: () => void
          setLoading: (state: boolean) => void
        }) => actions.onDelete(item, payload),
      })
    },
  },
]
