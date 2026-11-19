import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { formatDateRange } from '@/features/exam-schedule/utils/formatDateRange'
import { eventStatusLabel, eventStatusVariant } from '../types'
import type { ExamEvent, ExamRoom } from '../types'

export interface RoomSummary {
  event: ExamEvent
  rooms: ExamRoom[]
}

const capacityOf = (row: RoomSummary) =>
  row.rooms.reduce((sum, room) => sum + room.capacity, 0)

const staffedOf = (row: RoomSummary) =>
  row.rooms.filter((room) => room.technicianUserId).length

const number = (value: number | string) =>
  h('span', { class: 'tabular-nums' }, String(value))

export function buildRoomSummaryColumns(options: {
  onOpen: (event: ExamEvent) => void
}): ColumnDef<RoomSummary>[] {
  return [
    {
      id: 'name',
      header: 'Periode Ujian',
      meta: { align: 'left', strong: true },
      cell: ({ row }) => row.original.event.name,
    },
    {
      id: 'window',
      header: 'Waktu',
      meta: {
        align: 'center',
        mobileLabel: 'Waktu',
        mobileValue: (row: RoomSummary) =>
          formatDateRange(row.event.startsAt, row.event.endsAt),
      },
      cell: ({ row }) =>
        formatDateRange(row.original.event.startsAt, row.original.event.endsAt),
    },
    {
      id: 'rooms',
      header: 'Ruangan',
      meta: {
        align: 'center',
        mobileLabel: 'Ruangan',
        mobileValue: (row: RoomSummary) => String(row.rooms.length),
      },
      cell: ({ row }) => number(row.original.rooms.length),
    },
    {
      id: 'capacity',
      header: 'Kapasitas',
      meta: {
        align: 'center',
        mobileLabel: 'Kapasitas',
        mobileValue: (row: RoomSummary) => String(capacityOf(row)),
      },
      cell: ({ row }) => number(capacityOf(row.original)),
    },
    {
      id: 'technicians',
      header: 'Teknisi',
      meta: {
        align: 'center',
        mobileLabel: 'Teknisi',
        mobileValue: (row: RoomSummary) => String(staffedOf(row)),
      },
      cell: ({ row }) => number(staffedOf(row.original)),
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: RoomSummary) => eventStatusLabel(row.event.status),
      },
      cell: ({ row }) =>
        h(
          Badge,
          { variant: eventStatusVariant(row.original.event.status) },
          () => eventStatusLabel(row.original.event.status),
        ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        h(ActionCell, {
          viewLabel: 'Buka',
          hideEdit: true,
          hideDelete: true,
          onView: () => options.onOpen(row.original.event),
        }),
    },
  ]
}
