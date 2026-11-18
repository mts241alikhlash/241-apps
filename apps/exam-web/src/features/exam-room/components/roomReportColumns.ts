import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { reportStatusLabel, type RoomReportSummary } from '../types'

const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' })
const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export const roomCodeOf = (code: string): string =>
  code.trim().replace(/^[A-Za-z]+/, '')

const slotWindow = (row: RoomReportSummary): string =>
  `${dateFormat.format(new Date(row.startsAt))} · ${timeFormat.format(
    new Date(row.startsAt),
  )}–${timeFormat.format(new Date(row.endsAt))}`

const statusVariant = (status: string) =>
  status === 'VERIFIED'
    ? 'default'
    : status === 'SUBMITTED'
      ? 'secondary'
      : 'outline'

export function buildRoomReportColumns(options: {
  onPrint: (row: RoomReportSummary) => void
}): ColumnDef<RoomReportSummary>[] {
  return [
    {
      id: 'room',
      header: 'Ruangan',
      meta: {
        mobileLabel: 'Ruangan',
        mobileValue: (row: RoomReportSummary) =>
          `${roomCodeOf(row.roomCode)} · ${row.roomName}`,
      },
      cell: ({ row }) =>
        h('span', { class: 'flex items-center gap-2' }, [
          h(
            'span',
            { class: 'tabular-nums font-medium' },
            roomCodeOf(row.original.roomCode),
          ),
          row.original.roomName,
        ]),
    },
    {
      id: 'slot',
      header: 'Jadwal Pengawasan',
      meta: {
        align: 'center',
        mobileLabel: 'Jadwal',
        mobileValue: (row: RoomReportSummary) => slotWindow(row),
      },
      cell: ({ row }) =>
        h('span', { class: 'tabular-nums' }, slotWindow(row.original)),
    },
    {
      id: 'registered',
      header: 'Peserta',
      meta: {
        align: 'center',
        mobileLabel: 'Peserta',
        mobileValue: (row: RoomReportSummary) => String(row.registeredCount),
      },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'tabular-nums' },
          String(row.original.registeredCount),
        ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: RoomReportSummary) => reportStatusLabel(row.status),
      },
      cell: ({ row }) =>
        h(Badge, { variant: statusVariant(row.original.status) }, () =>
          reportStatusLabel(row.original.status),
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
            onClick: () => options.onPrint(row.original),
          },
          () => 'Cetak',
        ),
    },
  ]
}
