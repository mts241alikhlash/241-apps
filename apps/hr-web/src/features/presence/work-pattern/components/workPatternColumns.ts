import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'
import { Pencil, Trash2 } from '@lucide/vue'
import type { WorkPattern } from '../types'

export function createWorkPatternColumns(
  onEdit: (pattern: WorkPattern) => void,
  onDelete: (pattern: WorkPattern) => void,
): ColumnDef<WorkPattern>[] {
  return [
    {
      id: 'name',
      header: 'Nama Pola Kerja',
      meta: { align: 'left' },
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'workingDays',
      header: 'Hari Kerja',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const count = row.original.days.filter((d) => d.isWorkingDay).length
        return `${count} hari / minggu`
      },
    },
    {
      id: 'graceMinutes',
      header: 'Toleransi',
      meta: { align: 'center' },
      cell: ({ row }) => `${row.original.graceMinutes} menit`,
    },
    {
      id: 'isDefault',
      header: 'Kategori',
      meta: { align: 'center' },
      cell: ({ row }) =>
        h(
          Badge,
          { variant: row.original.isDefault ? 'default' : 'secondary' },
          () => (row.original.isDefault ? 'Default' : 'Khusus'),
        ),
    },
    {
      id: 'actions',
      header: 'Opsi',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const pattern = row.original
        return h(ActionCell, {
          hideEdit: true,
          hideDelete: true,
          items: [
            { label: 'Ubah', icon: Pencil, onClick: () => onEdit(pattern) },
            ...(pattern.isDefault
              ? []
              : [
                  {
                    label: 'Hapus',
                    icon: Trash2,
                    destructive: true,
                    onClick: () => onDelete(pattern),
                  },
                ]),
          ],
        })
      },
    },
  ]
}
