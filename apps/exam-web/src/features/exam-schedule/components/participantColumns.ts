import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'
import { Trash2 } from '@lucide/vue'
import type { MakeupParticipant } from '../types'
import { participantStatusLabel, reasonLabel } from '../types'

export interface ParticipantColumnOptions {
  canRemove: boolean
  onRemove: (participant: MakeupParticipant) => void
}

const studentText = (participant: MakeupParticipant) =>
  participant.name === null && participant.nis === null
    ? 'Siswa tidak ditemukan'
    : [participant.name, participant.nis].filter(Boolean).join(' · ')

const reasonText = (participant: MakeupParticipant) =>
  [reasonLabel(participant.reason), participant.note]
    .filter(Boolean)
    .join(' · ')

export function buildParticipantColumns(
  options: ParticipantColumnOptions,
): ColumnDef<MakeupParticipant>[] {
  return [
    {
      id: 'student',
      header: 'Siswa',
      meta: { align: 'left', strong: true },
      cell: ({ row }) => studentText(row.original),
    },
    {
      id: 'reason',
      header: 'Alasan',
      meta: { mobileLabel: 'Alasan', mobileValue: reasonText },
      cell: ({ row }) => reasonText(row.original),
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: MakeupParticipant) =>
          participantStatusLabel(row.status),
      },
      cell: ({ row }) =>
        h(
          Badge,
          { variant: row.original.status === 'DONE' ? 'default' : 'outline' },
          () => participantStatusLabel(row.original.status),
        ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        options.canRemove &&
        (row.original.status === 'WAITING' ||
          row.original.status === 'SAT_REGULAR')
          ? h(ActionCell, {
              hideEdit: true,
              hideDelete: true,
              items: [
                {
                  label: 'Hapus',
                  icon: Trash2,
                  destructive: true,
                  onClick: () => options.onRemove(row.original),
                },
              ],
            })
          : null,
    },
  ]
}
