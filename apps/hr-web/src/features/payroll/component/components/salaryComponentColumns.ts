import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'
import { Pencil, Trash2 } from '@lucide/vue'
import { COMPONENT_TYPE_LABEL, DRIVER_LABEL } from '../types'
import type { SalaryComponent } from '../types'

export function createSalaryComponentColumns(
  onEdit: (component: SalaryComponent) => void,
  onRemove: (component: SalaryComponent) => void,
): ColumnDef<SalaryComponent>[] {
  return [
    {
      id: 'code',
      header: 'Kode',
      meta: { align: 'left' },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'font-mono text-sm text-muted-foreground' },
          row.original.code,
        ),
    },
    {
      id: 'name',
      header: 'Nama',
      meta: { align: 'left' },
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
    },
    {
      id: 'type',
      header: 'Jenis',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const isDeduction = row.original.type === 'DEDUCTION'
        return h(
          Badge,
          { variant: isDeduction ? 'destructive' : 'secondary' },
          () => COMPONENT_TYPE_LABEL[row.original.type],
        )
      },
    },
    {
      id: 'driver',
      header: 'Dasar Perhitungan',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const driver = row.original.driver
        return driver ? DRIVER_LABEL[driver] : 'Tetap'
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
    {
      id: 'actions',
      header: 'Opsi',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const item = row.original
        return h(ActionCell, {
          hideEdit: true,
          hideDelete: true,
          items: [
            {
              label: 'Ubah Komponen',
              icon: Pencil,
              onClick: () => onEdit(item),
            },
            {
              label: 'Hapus Komponen',
              icon: Trash2,
              destructive: true,
              onClick: () => onRemove(item),
            },
          ],
        })
      },
    },
  ]
}
