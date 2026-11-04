import type { InventoryAssetUnit } from '../types'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { ActionCell } from '@mts241alikhlash/ui'
import type { ColumnDef } from '@tanstack/vue-table'
import { Pencil, Printer, Trash2 } from '@lucide/vue'
import { h } from 'vue'

export interface UnitColumnActions {
  onPrint: (unit: InventoryAssetUnit) => void
  onEdit: (unit: InventoryAssetUnit) => void
  onDelete: (unit: InventoryAssetUnit) => void
  isSaving: boolean
  canDelete: boolean
}

export const createUnitColumns = (
  actions: UnitColumnActions,
): ColumnDef<InventoryAssetUnit>[] => [
  {
    id: 'select',
    header: ({
      table,
    }: {
      table: {
        getIsAllPageRowsSelected: () => boolean
        getIsSomePageRowsSelected: () => boolean
        toggleAllPageRowsSelected: (v: boolean) => void
      }
    }) =>
      h(Checkbox, {
        modelValue: table.getIsAllPageRowsSelected()
          ? true
          : table.getIsSomePageRowsSelected()
            ? 'indeterminate'
            : false,
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(value === true),
        ariaLabel: 'Pilih semua unit',
      }),
    cell: ({
      row,
    }: {
      row: {
        getIsSelected: () => boolean
        toggleSelected: (v: boolean) => void
      }
    }) =>
      h(Checkbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          row.toggleSelected(value === true),
        ariaLabel: 'Pilih unit',
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'unitNumber',
    header: 'No. Unit',
    cell: ({ row }) =>
      h('span', { class: 'font-mono' }, row.original.unitNumber),
    accessorKey: 'unitNumber',
  },
  {
    id: 'condition',
    header: 'Kondisi',
    cell: ({ row }) => row.original.condition?.name ?? '-',
    accessorFn: (row) => row.condition?.name,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => row.original.status?.name ?? '-',
    accessorFn: (row) => row.status?.name,
  },
  {
    id: 'location',
    header: 'Lokasi',
    cell: ({ row }) => row.original.location?.name ?? '-',
    accessorFn: (row) => row.location?.name,
  },
  {
    id: 'actions',
    header: 'Aksi',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const unit = row.original
      return h(ActionCell, {
        hideEdit: true,
        hideDelete: true,
        items: [
          {
            label: 'Cetak label',
            icon: Printer,
            onClick: () => actions.onPrint(unit),
          },
          {
            label: 'Ubah',
            icon: Pencil,
            disabled: actions.isSaving,
            onClick: () => actions.onEdit(unit),
          },
          {
            label: 'Hapus',
            icon: Trash2,
            destructive: true,
            disabled: actions.isSaving || !actions.canDelete,
            onClick: () => actions.onDelete(unit),
          },
        ],
      })
    },
    enableSorting: false,
    enableHiding: false,
  },
]
