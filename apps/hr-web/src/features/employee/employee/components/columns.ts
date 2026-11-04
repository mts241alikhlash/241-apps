import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import type { Employee, EmployeeColumnActions } from '../types'
import { getPrimaryPosition } from '../utils'

function statusBadge(isActive: boolean) {
  return h(Badge, { variant: isActive ? 'default' : 'secondary' }, () =>
    isActive ? 'Aktif' : 'Nonaktif',
  )
}

export const createColumns = (
  actions: EmployeeColumnActions,
): ColumnDef<Employee>[] => [
  {
    id: 'nik',
    header: 'NIK',
    meta: { align: 'center' },
    cell: ({ row }) => row.original.user?.profile?.nik ?? '-',
    accessorFn: (row) => row.user?.profile?.nik,
  },
  {
    id: 'name',
    header: 'Nama Lengkap',
    meta: { align: 'left' },
    cell: ({ row }) => row.original.user?.profile?.name ?? '-',
    accessorFn: (row) => row.user?.profile?.name,
  },
  {
    id: 'gender',
    header: 'L/P',
    meta: { align: 'center' },
    cell: ({ row }) => row.getValue<string>('gender'),
    accessorFn: (row) => {
      const g = row.user?.profile?.gender?.toLowerCase()
      return g === 'male' ? 'L' : g === 'female' ? 'P' : '-'
    },
  },
  {
    id: 'position',
    header: 'Jabatan',
    meta: { align: 'center' },
    cell: ({ row }) => getPrimaryPosition(row.original),
    accessorFn: (row) => getPrimaryPosition(row),
  },
  {
    id: 'employmentType',
    header: 'Status Kepegawaian',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const label = row.original.employmentType?.name ?? '-'
      return h(Badge, { variant: 'outline' }, () => label)
    },
    accessorFn: (row) => row.employmentType?.name,
  },
  {
    id: 'status',
    header: 'Status',
    meta: { align: 'center' },
    accessorFn: (row) => (row.user?.isActive ? 'active' : 'inactive'),
    cell: ({ row }) => statusBadge(row.original.user?.isActive ?? false),
  },
  ...(actions.showActions !== false
    ? [
        {
          id: 'actions',
          header: 'Opsi',
          cell: ({ row }: { row: { original: Employee } }) => {
            const employee = row.original
            return h(ActionCell, {
              viewLabel: 'Lihat Detail',
              editLabel: 'Edit Data',
              hideEdit: actions.canUpdate === false,
              hideDelete: actions.canDelete === false,
              deleteTitle: 'Hapus Pegawai?',
              deleteDescription: `Yakin ingin menghapus data guru "${employee.user?.profile?.name || ''}"? Tindakan ini tidak dapat dibatalkan.`,
              onView: () => {
                if (actions.onViewDetail) actions.onViewDetail(employee)
              },
              onEdit: () => {
                if (actions.onEdit) actions.onEdit(employee)
              },
              onDelete: (callbacks: {
                closeAlert: () => void
                setLoading: (v: boolean) => void
              }) => {
                if (actions.onDelete)
                  return actions.onDelete(employee, callbacks)
              },
            })
          },
        },
      ]
    : []),
]

export const createAccountColumns = (
  actions: EmployeeColumnActions,
): ColumnDef<Employee>[] => [
  {
    id: 'name',
    header: 'Nama Lengkap',
    meta: { align: 'left' },
    cell: ({ row }) => row.original.user?.profile?.name || '-',
    accessorFn: (row) => row.user?.profile?.name,
  },
  {
    id: 'identifier',
    header: 'Username',
    cell: ({ row }) => row.original.user?.identifier || '-',
    accessorFn: (row) => row.user?.identifier,
  },
  {
    id: 'position',
    header: 'Jabatan Utama',
    meta: { align: 'center' },
    cell: ({ row }) => getPrimaryPosition(row.original),
    accessorFn: (row) => getPrimaryPosition(row),
  },
  {
    id: 'status',
    header: 'Status Akun',
    meta: { align: 'center' },
    accessorFn: (row) => (row.user?.isActive ? 'active' : 'inactive'),
    cell: ({ row }) => statusBadge(row.original.user?.isActive ?? false),
  },
  ...(actions.showActions !== false
    ? [
        {
          id: 'actions',
          header: 'Opsi',
          cell: ({ row }: { row: { original: Employee } }) => {
            const employee = row.original
            const isActive = employee.user?.isActive ?? false
            return h(ActionCell, {
              hideEdit: true,
              hideDelete: actions.canDelete === false,
              manageLabel: isActive ? 'Nonaktifkan' : 'Aktifkan',
              deleteTitle: 'Hapus Akun Pegawai?',
              deleteDescription: `Yakin ingin menghapus akun "${employee.user?.identifier || ''}"? Tindakan ini tidak dapat dibatalkan.`,
              onManage: () => {
                if (actions.onToggleActive)
                  void actions.onToggleActive(employee, !isActive)
              },
              onDelete: (callbacks: {
                closeAlert: () => void
                setLoading: (v: boolean) => void
              }) => {
                if (actions.onDelete)
                  return actions.onDelete(employee, callbacks)
              },
            })
          },
        },
      ]
    : []),
]
