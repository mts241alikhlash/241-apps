import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { TimerReset } from '@lucide/vue'
import type { SeatedStudent } from '../services/examEventService'
import type { SupervisorSlot } from '../types'
import { seatLabel } from '../types'

const windowFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export interface SeatColumnOptions {
  canFlag: (seat: SeatedStudent) => boolean
  onFlag: (seat: SeatedStudent) => void
}

export function buildSeatColumns(
  options: SeatColumnOptions,
): ColumnDef<SeatedStudent>[] {
  return [
    {
      id: 'seat',
      header: 'Kursi',
      meta: {
        align: 'center',
        mobileLabel: 'Kursi',
        mobileValue: (row: SeatedStudent) => seatLabel(row.seatNumber),
      },
      cell: ({ row }) =>
        h('span', { class: 'tabular-nums' }, `${row.original.seatNumber}`),
    },
    {
      id: 'name',
      header: 'Siswa',
      meta: { align: 'left', strong: true },
      cell: ({ row }) => row.original.name ?? 'Siswa tidak ditemukan',
    },
    {
      id: 'nis',
      header: 'NIS',
      meta: {
        align: 'center',
        mobileLabel: 'NIS',
        mobileValue: (row: SeatedStudent) => row.nis ?? '-',
      },
      cell: ({ row }) =>
        h('span', { class: 'tabular-nums' }, row.original.nis ?? '-'),
    },
    {
      id: 'classroom',
      header: 'Kelas',
      meta: {
        mobileLabel: 'Kelas',
        mobileValue: (row: SeatedStudent) => row.classroomName ?? '-',
      },
      cell: ({ row }) => row.original.classroomName ?? '-',
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        options.canFlag(row.original)
          ? h(ActionCell, {
              hideEdit: true,
              hideDelete: true,
              items: [
                {
                  label: 'Izinkan masuk terlambat',
                  icon: TimerReset,
                  onClick: () => options.onFlag(row.original),
                },
              ],
            })
          : null,
    },
  ]
}

export interface SupervisorColumnOptions {
  canSubstitute: boolean
  userName: (userId: string) => string
  onSubstitute: (slot: SupervisorSlot) => void
}

export function buildSupervisorColumns(
  options: SupervisorColumnOptions,
): ColumnDef<SupervisorSlot>[] {
  const windowText = (slot: SupervisorSlot) =>
    `${windowFormat.format(new Date(slot.startsAt))}–${windowFormat.format(new Date(slot.endsAt))}`

  return [
    {
      id: 'window',
      header: 'Jam',
      meta: { align: 'left', strong: true },
      cell: ({ row }) =>
        h('span', { class: 'tabular-nums' }, windowText(row.original)),
    },
    {
      id: 'scheduled',
      header: 'Dijadwalkan',
      meta: {
        mobileLabel: 'Dijadwalkan',
        mobileValue: (row: SupervisorSlot) =>
          options.userName(row.scheduledUserId),
      },
      cell: ({ row }) => options.userName(row.original.scheduledUserId),
    },
    {
      id: 'actual',
      header: 'Bertugas',
      meta: {
        mobileLabel: 'Bertugas',
        mobileValue: (row: SupervisorSlot) =>
          options.userName(row.actualUserId),
      },
      cell: ({ row }) => {
        const substituted =
          row.original.actualUserId !== row.original.scheduledUserId
        return substituted
          ? h('span', { class: 'flex items-center gap-2' }, [
              options.userName(row.original.actualUserId),
              h(Badge, { variant: 'outline' }, () => 'Pengganti'),
            ])
          : options.userName(row.original.actualUserId)
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        options.canSubstitute
          ? h(
              Button,
              {
                size: 'sm',
                variant: 'outline',
                onClick: () => options.onSubstitute(row.original),
              },
              () => 'Ganti',
            )
          : null,
    },
  ]
}
