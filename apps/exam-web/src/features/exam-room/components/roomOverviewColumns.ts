import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import type { RoomOverview } from '../types'

export type RoomSlotPhase = 'ACTIVE' | 'WAITING' | 'FINISHED'

export interface RoomOverviewRow extends RoomOverview {
  slotId?: string
  slotPhase?: RoomSlotPhase
}

const phaseLabel: Record<RoomSlotPhase, string> = {
  ACTIVE: 'Berlangsung',
  WAITING: 'Menunggu',
  FINISHED: 'Selesai',
}

const phaseVariant: Record<RoomSlotPhase, 'default' | 'outline' | 'secondary'> =
  {
    ACTIVE: 'default',
    WAITING: 'outline',
    FINISHED: 'secondary',
  }

const statusOf = (row: RoomOverviewRow): RoomSlotPhase =>
  row.slotPhase ?? (row.isActiveNow ? 'ACTIVE' : 'WAITING')

export interface RoomOverviewColumnOptions {
  onOpen: (room: RoomOverviewRow) => void
}

export function buildRoomOverviewColumns(
  options: RoomOverviewColumnOptions,
): ColumnDef<RoomOverviewRow>[] {
  return [
    {
      id: 'name',
      header: 'Ruangan',
      meta: {
        strong: true,
        mobile: 'title',
        mobileLabel: 'Ruangan',
        mobileValue: (row: RoomOverviewRow) => row.name,
      },
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'registered',
      header: 'Peserta',
      meta: {
        align: 'center',
        mobileLabel: 'Peserta',
        mobileValue: (row: RoomOverviewRow) =>
          `${row.registeredCount} dari ${row.capacity}`,
      },
      cell: ({ row }) =>
        h('span', `${row.original.registeredCount} / ${row.original.capacity}`),
    },
    {
      id: 'supervisor',
      header: 'Pengawas',
      meta: {
        mobileLabel: 'Pengawas',
        mobileValue: (row: RoomOverviewRow) =>
          row.currentSupervisorName ?? 'Belum ditugaskan',
      },
      cell: ({ row }) =>
        row.original.currentSupervisorName
          ? h('span', { class: 'flex items-center gap-2' }, [
              row.original.currentSupervisorName,
              row.original.isSubstituted
                ? h(Badge, { variant: 'secondary' }, () => 'Pengganti')
                : null,
            ])
          : h(Badge, { variant: 'outline' }, () => 'Belum ditugaskan'),
    },
    {
      id: 'technician',
      header: 'Teknisi',
      meta: {
        mobileLabel: 'Teknisi',
        mobileValue: (row: RoomOverviewRow) => row.technicianName ?? '-',
      },
      cell: ({ row }) => row.original.technicianName ?? '-',
    },
    {
      id: 'state',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: RoomOverviewRow) => phaseLabel[statusOf(row)],
      },
      cell: ({ row }) => {
        const phase = statusOf(row.original)
        return h(
          Badge,
          { variant: phaseVariant[phase] },
          () => phaseLabel[phase],
        )
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        h(ActionCell, {
          viewLabel: 'Pantau',
          hideEdit: true,
          hideDelete: true,
          onView: () => options.onOpen(row.original),
        }),
    },
  ]
}
