import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import {
  classOfClassroom,
  gradeOfClassroom,
} from '@/features/exam-shared/classroomName'

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
      h('span', String(row.original.seatNumber).padStart(2, '0')),
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
      cell: ({ row }) => h('span', row.original.participantNumber ?? '-'),
    },
    {
      id: 'name',
      header: 'Nama',
      meta: {
        align: 'left',
        strong: true,
        mobileLabel: 'Nama',
        mobileValue: (row: PrintParticipantRow) => row.name ?? '-',
      },
      cell: ({ row }) => row.original.name ?? '-',
    },
    {
      id: 'grade',
      header: 'Tingkat',
      meta: {
        align: 'center',
        mobileLabel: 'Tingkat',
        mobileValue: (row: PrintParticipantRow) =>
          gradeOfClassroom(row.classroomName),
      },
      cell: ({ row }) => gradeOfClassroom(row.original.classroomName),
    },
    {
      id: 'classroom',
      header: 'Kelas',
      meta: {
        align: 'center',
        mobileLabel: 'Kelas',
        mobileValue: (row: PrintParticipantRow) =>
          classOfClassroom(row.classroomName),
      },
      cell: ({ row }) => classOfClassroom(row.original.classroomName),
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
        h(ActionCell, {
          viewLabel: 'Pratinjau',
          hideEdit: true,
          hideDelete: true,
          onView: () => options.onPreview(row.original),
        }),
    },
  ]

  return options.kind === 'seat' ? [seatColumn, ...columns] : columns
}
