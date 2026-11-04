import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'
import { Pencil, Trash2 } from '@lucide/vue'
import { APPLIES_TO_LABEL, TREATMENT_LABEL } from '../types'
import type { LeaveType } from '../types'

export function createLeaveTypeColumns(
  onEdit: (type: LeaveType) => void,
  onDelete: (type: LeaveType) => void,
): ColumnDef<LeaveType>[] {
  return [
    {
      id: 'name',
      header: 'Nama',
      meta: { align: 'left' },
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'treatment',
      header: 'Perlakuan',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const treatment = row.original.treatment
        return h(
          Badge,
          {
            variant: treatment === 'OFFICIAL_DUTY' ? 'outline' : 'secondary',
          },
          () => TREATMENT_LABEL[treatment],
        )
      },
    },
    {
      id: 'appliesTo',
      header: 'Berlaku Untuk',
      meta: { align: 'center' },
      cell: ({ row }) => APPLIES_TO_LABEL[row.original.appliesTo],
    },
    {
      id: 'requiresDocument',
      header: 'Surat Pendukung',
      meta: { align: 'center' },
      cell: ({ row }) =>
        h(
          Badge,
          { variant: row.original.requiresDocument ? 'default' : 'outline' },
          () => (row.original.requiresDocument ? 'Wajib' : 'Tidak'),
        ),
    },
    {
      id: 'consumesQuota',
      header: 'Kuota',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const type = row.original
        return type.consumesQuota ? `${type.annualQuota ?? 0} hari` : '-'
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
        const type = row.original
        return h(ActionCell, {
          hideEdit: true,
          hideDelete: true,
          items: [
            { label: 'Ubah', icon: Pencil, onClick: () => onEdit(type) },
            {
              label: 'Hapus',
              icon: Trash2,
              destructive: true,
              onClick: () => onDelete(type),
            },
          ],
        })
      },
    },
  ]
}
