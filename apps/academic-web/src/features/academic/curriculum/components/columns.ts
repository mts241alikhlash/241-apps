import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { formatEntityName } from '@mts241alikhlash/web-shared/utils/utils'
import type { Curriculum, CurriculumColumnActions } from '../types'

export const createCurriculumColumns = (
  actions: CurriculumColumnActions,
): ColumnDef<Curriculum>[] => [
  {
    id: 'name',
    header: 'Kurikulum',
    accessorKey: 'name',
    meta: { align: 'left' },
    cell: ({ row }) => formatEntityName(row.original.name),
  },
  {
    id: 'academicYear',
    header: 'Tahun Ajaran',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const ayName = row.original.academicYear?.name
      if (!ayName) return '-'

      return formatEntityName(ayName)
    },
  },
  {
    id: 'isActive',
    header: 'Status',
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.isActive ? 'default' : 'secondary' },
        () => (row.original.isActive ? 'Aktif' : 'Nonaktif'),
      ),
  },
  ...(actions.showActions !== false
    ? [
        {
          id: 'actions',
          header: 'Opsi',
          cell: ({ row }: { row: { original: Curriculum } }) => {
            const curriculum = row.original
            return h(ActionCell, {
              viewLabel: 'Mata Pelajaran',
              hideEdit: actions.canUpdate === false,
              hideDelete: actions.canDelete === false,
              deleteTitle: 'Hapus Kurikulum?',
              deleteDescription:
                'Data kurikulum ini akan dihapus secara permanen dan tidak dapat dikembalikan.',
              onView: () => {
                if (actions.onView) actions.onView(curriculum)
              },
              onEdit: () => {
                if (actions.onEdit) actions.onEdit(curriculum)
              },
              onDelete: (callbacks: {
                closeAlert: () => void
                setLoading: (v: boolean) => void
              }) => {
                if (actions.onDelete)
                  return actions.onDelete(curriculum, callbacks)
              },
            })
          },
        },
      ]
    : []),
]
