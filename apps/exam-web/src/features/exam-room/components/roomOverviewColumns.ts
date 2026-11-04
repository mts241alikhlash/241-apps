import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import type { RoomOverview } from '../types'

export interface RoomOverviewColumnOptions {
  onOpen: (room: RoomOverview) => void
}

export function buildRoomOverviewColumns(
  options: RoomOverviewColumnOptions,
): ColumnDef<RoomOverview>[] {
  return [
    {
      id: 'room',
      header: 'Ruangan',
      meta: { align: 'left', strong: true },
      cell: ({ row }) =>
        h('div', { class: 'flex flex-col' }, [
          h('span', { class: 'tabular-nums' }, row.original.code),
          h(
            'span',
            {
              class:
                'text-[length:var(--text-control,0.75rem)] text-muted-foreground',
            },
            row.original.name,
          ),
        ]),
    },
    {
      id: 'building',
      header: 'Gedung',
      meta: {
        mobileLabel: 'Gedung',
        mobileValue: (row: RoomOverview) => row.building ?? '-',
      },
      cell: ({ row }) => row.original.building ?? '-',
    },
    {
      id: 'registered',
      header: 'Peserta',
      meta: {
        align: 'center',
        mobileLabel: 'Peserta',
        mobileValue: (row: RoomOverview) =>
          `${row.registeredCount} dari ${row.capacity}`,
      },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'tabular-nums' },
          `${row.original.registeredCount} / ${row.original.capacity}`,
        ),
    },
    {
      id: 'supervisor',
      header: 'Pengawas',
      meta: {
        mobileLabel: 'Pengawas',
        mobileValue: (row: RoomOverview) =>
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
        mobileValue: (row: RoomOverview) => row.technicianName ?? '-',
      },
      cell: ({ row }) => row.original.technicianName ?? '-',
    },
    {
      id: 'state',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: RoomOverview) =>
          row.isActiveNow ? 'Berlangsung' : 'Menunggu',
      },
      cell: ({ row }) =>
        h(
          Badge,
          { variant: row.original.isActiveNow ? 'default' : 'outline' },
          () => (row.original.isActiveNow ? 'Berlangsung' : 'Menunggu'),
        ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        h(
          Button,
          {
            size: 'sm',
            variant: 'outline',
            onClick: () => options.onOpen(row.original),
          },
          () => 'Pantau',
        ),
    },
  ]
}
