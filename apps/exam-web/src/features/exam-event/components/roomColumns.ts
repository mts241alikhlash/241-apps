import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { KeyRound, RotateCw, Timer } from '@lucide/vue'
import type { ExamRoom } from '../types'

export interface RoomColumnOptions {
  canManage: boolean
  canSupervise: boolean
  technicianName: (userId: string | null) => string
  canActOnRoom: (room: ExamRoom) => boolean
  onEdit: (room: ExamRoom) => void
  onAccessCode: (room: ExamRoom) => void
  onRotateToken: (room: ExamRoom) => void
  onExtendTime: (room: ExamRoom) => void
}

export function buildRoomColumns(
  options: RoomColumnOptions,
): ColumnDef<ExamRoom>[] {
  return [
    {
      id: 'code',
      header: 'Kode',
      meta: { align: 'left', strong: true },
      cell: ({ row }) =>
        h('span', { class: 'tabular-nums' }, row.original.code),
    },
    {
      id: 'name',
      header: 'Ruangan',
      meta: {
        mobileLabel: 'Ruangan',
        mobileValue: (row: ExamRoom) => row.name,
      },
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'building',
      header: 'Gedung',
      meta: {
        mobileLabel: 'Gedung',
        mobileValue: (row: ExamRoom) => row.building ?? '-',
      },
      cell: ({ row }) => row.original.building ?? '-',
    },
    {
      id: 'capacity',
      header: 'Kapasitas',
      meta: {
        align: 'center',
        mobileLabel: 'Kapasitas',
        mobileValue: (row: ExamRoom) => `${row.capacity} kursi`,
      },
      cell: ({ row }) =>
        h('span', { class: 'tabular-nums' }, `${row.original.capacity}`),
    },
    {
      id: 'technician',
      header: 'Teknisi',
      meta: {
        mobileLabel: 'Teknisi',
        mobileValue: (row: ExamRoom) =>
          options.technicianName(row.technicianUserId),
      },
      cell: ({ row }) =>
        row.original.technicianUserId
          ? options.technicianName(row.original.technicianUserId)
          : h(Badge, { variant: 'outline' }, () => 'Belum ditugaskan'),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => {
        const items = []
        if (options.canSupervise) {
          items.push({
            label: 'Token',
            icon: KeyRound,
            onClick: () => options.onAccessCode(row.original),
          })
        }
        if (options.canActOnRoom(row.original)) {
          items.push({
            label: 'Putar token',
            icon: RotateCw,
            onClick: () => options.onRotateToken(row.original),
          })
          items.push({
            label: 'Tambah waktu',
            icon: Timer,
            onClick: () => options.onExtendTime(row.original),
          })
        }
        return h(ActionCell, {
          editLabel: 'Ubah',
          hideEdit: !options.canManage,
          hideDelete: true,
          items,
          onEdit: () => options.onEdit(row.original),
        })
      },
    },
  ]
}
