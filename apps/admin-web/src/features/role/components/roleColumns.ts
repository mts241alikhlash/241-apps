import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'
import type { Role, RoleUsage } from '../types'
import { roleUsageWarning } from '../utils/roleUsage'

export const getColumns = (
  onEdit: (role: Role) => void,
  onDelete: (
    role: Role,
    payload: { closeAlert: () => void; setLoading: (state: boolean) => void },
  ) => void,
  usageOf: (code: string) => RoleUsage | undefined = () => undefined,
): ColumnDef<Role>[] => [
  {
    id: 'no',
    header: 'No',
    cell: ({ row }) => row.index + 1,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Nama Role',
  },
  {
    accessorKey: 'code',
    header: 'Kode Role',
    cell: ({ row }) => {
      const code = row.getValue<string>('code')
      return h(Badge, { variant: 'outline' }, () => code)
    },
  },
  {
    accessorKey: 'description',
    header: 'Deskripsi',
    cell: ({ row }) => row.getValue<string>('description') ?? '-',
  },
  {
    accessorKey: 'isSystem',
    header: 'Tipe',
    cell: ({ row }) => {
      const system = row.getValue<boolean>('isSystem')
      return h(Badge, { variant: system ? 'default' : 'secondary' }, () =>
        system ? 'Sistem' : 'Kustom',
      )
    },
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) => {
      const role = row.original

      return h(ActionCell, {
        hideDelete: role.isSystem,
        deleteTitle: 'Hapus Role?',
        deleteDescription: [
          roleUsageWarning(usageOf(role.code)),
          `Apakah Anda yakin ingin menghapus role ${role.name}? Tindakan ini tidak dapat dibatalkan.`,
        ]
          .filter(Boolean)
          .join(' '),
        onEdit: () => onEdit(role),
        onDelete: (payload: {
          closeAlert: () => void
          setLoading: (state: boolean) => void
        }) => onDelete(role, payload),
      })
    },
  },
]
