import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Button } from '@mts241alikhlash/ui/button'
import { Eye } from '@lucide/vue'

export interface PrintParticipantRow {
  studentId: string
  seatNumber: number
  name: string | null
  classroomName: string | null
  nis: string | null
  participantNumber: string | null
  roomCode: string
  roomName: string
  password?: string | null
}

export function buildPrintParticipantColumns(options: {
  kind: 'card' | 'seat'
  onPreview: (row: PrintParticipantRow) => void
}): ColumnDef<PrintParticipantRow>[] {
  const seatColumn: ColumnDef<PrintParticipantRow> = {
    id: 'seat',
    header: 'Kursi',
    meta: {
      align: 'center',
      mobileLabel: 'Kursi',
      mobileValue: (row: PrintParticipantRow) =>
        String(row.seatNumber).padStart(2, '0'),
    },
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums' },
        String(row.original.seatNumber).padStart(2, '0'),
      ),
  }

  const columns: ColumnDef<PrintParticipantRow>[] = [
    {
      id: 'participant-number',
      header: 'No. Peserta',
      meta: {
        align: 'center',
        strong: true,
        mobileLabel: 'No. Peserta',
        mobileValue: (row: PrintParticipantRow) => row.participantNumber ?? '-',
      },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'tabular-nums' },
          row.original.participantNumber ?? '-',
        ),
    },
    {
      id: 'name',
      header: 'Nama',
      meta: {
        mobileLabel: 'Nama',
        mobileValue: (row: PrintParticipantRow) => row.name ?? '-',
      },
      cell: ({ row }) => row.original.name ?? '-',
    },
    {
      id: 'classroom',
      header: 'Kelas',
      meta: {
        align: 'center',
        mobileLabel: 'Kelas',
        mobileValue: (row: PrintParticipantRow) => row.classroomName ?? '-',
      },
      cell: ({ row }) => row.original.classroomName ?? '-',
    },
    {
      id: 'room',
      header: 'Ruang',
      meta: {
        align: 'center',
        mobileLabel: 'Ruang',
        mobileValue: (row: PrintParticipantRow) => row.roomName,
      },
      cell: ({ row }) => row.original.roomName,
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        h(
          Button,
          {
            size: 'icon',
            variant: 'ghost',
            'aria-label': 'Pratinjau',
            title: 'Pratinjau',
            onClick: () => options.onPreview(row.original),
          },
          () => h(Eye),
        ),
    },
  ]

  return options.kind === 'seat' ? [seatColumn, ...columns] : columns
}
