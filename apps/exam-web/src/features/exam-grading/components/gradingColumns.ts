import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { UserRoundPlus, Users } from '@lucide/vue'
import {
  examTypeLabel,
  sessionStatusLabel,
} from '@/features/exam-schedule/types'
import {
  formatDay,
  formatTime,
} from '@/features/exam-schedule/utils/formatWindow'
import type { GradingSchedule, GradingSessionRow } from '../types'
import { formatScore, publicationLabel } from '../types'

const typeText = (row: GradingSchedule) =>
  row.kind === 'MAKEUP'
    ? `${examTypeLabel(row.type)} · Susulan`
    : examTypeLabel(row.type)
const exitText = (row: GradingSessionRow) =>
  row.violationCount > 0 ? `${row.violationCount}×` : '-'
const classroomText = (row: GradingSchedule) => row.classroomName ?? '-'

export function buildGradingScheduleColumns(options: {
  subjectName?: (schedule: GradingSchedule) => string
  onOpen: (schedule: GradingSchedule) => void
  canMakeup?: (schedule: GradingSchedule) => boolean
  canParticipants?: boolean
  onMakeup?: (schedule: GradingSchedule) => void
  onParticipants?: (schedule: GradingSchedule) => void
}): ColumnDef<GradingSchedule>[] {
  return [
    {
      id: 'type',
      header: 'Jenis',
      meta: { align: 'center', mobileLabel: 'Jenis', mobileValue: typeText },
      cell: ({ row }) => typeText(row.original),
    },
    {
      id: 'title',
      header: 'Mata Pelajaran',
      meta: { align: 'left', strong: true, mobile: 'title' },
      cell: ({ row }) =>
        options.subjectName?.(row.original) ?? row.original.title,
    },
    {
      id: 'classroom',
      header: 'Kelas',
      meta: {
        align: 'center',
        mobileLabel: 'Kelas',
        mobileValue: classroomText,
      },
      cell: ({ row }) => classroomText(row.original),
    },
    {
      id: 'date',
      header: 'Tanggal',
      meta: {
        align: 'center',
        mobileLabel: 'Tanggal',
        mobileValue: (row: GradingSchedule) => formatDay(row.startsAt),
      },
      cell: ({ row }) => formatDay(row.original.startsAt),
    },
    {
      id: 'start',
      header: 'Jam Mulai',
      meta: {
        align: 'center',
        mobileLabel: 'Jam Mulai',
        mobileValue: (row: GradingSchedule) => formatTime(row.startsAt),
      },
      cell: ({ row }) => formatTime(row.original.startsAt),
    },
    {
      id: 'end',
      header: 'Jam Selesai',
      meta: {
        align: 'center',
        mobileLabel: 'Jam Selesai',
        mobileValue: (row: GradingSchedule) => formatTime(row.endsAt),
      },
      cell: ({ row }) => formatTime(row.original.endsAt),
    },
    {
      id: 'sessions',
      header: 'Jumlah Siswa',
      meta: {
        align: 'center',
        mobileLabel: 'Jumlah Siswa',
        mobileValue: (row: GradingSchedule) => String(row.sessions),
      },
      cell: ({ row }) => String(row.original.sessions),
    },
    {
      id: 'awaiting',
      header: 'Perlu Dinilai',
      meta: {
        align: 'center',
        mobileLabel: 'Perlu Dinilai',
        mobileValue: (row: GradingSchedule) => String(row.awaitingGrading),
      },
      cell: ({ row }) =>
        h(
          Badge,
          {
            variant:
              row.original.awaitingGrading > 0 ? 'destructive' : 'outline',
          },
          () => String(row.original.awaitingGrading),
        ),
    },
    {
      id: 'graded',
      header: 'Selesai',
      meta: {
        align: 'center',
        mobileLabel: 'Selesai',
        mobileValue: (row: GradingSchedule) => String(row.graded),
      },
      cell: ({ row }) => String(row.original.graded),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      meta: { align: 'center' },
      cell: ({ row }) => {
        const items = []
        if (
          row.original.kind === 'REGULAR' &&
          row.original.packageId !== null &&
          options.canMakeup?.(row.original)
        ) {
          items.push({
            label: 'Susulan',
            icon: UserRoundPlus,
            onClick: () => options.onMakeup?.(row.original),
          })
        }
        if (options.canParticipants && row.original.kind === 'MAKEUP') {
          items.push({
            label: 'Peserta',
            icon: Users,
            onClick: () => options.onParticipants?.(row.original),
          })
        }
        return h(ActionCell, {
          viewLabel: 'Buka',
          hideEdit: true,
          hideDelete: true,
          items,
          onView: () => options.onOpen(row.original),
        })
      },
    },
  ]
}

const studentText = (row: GradingSessionRow) =>
  row.studentName ?? 'Siswa tidak ditemukan'
const numberText = (row: GradingSessionRow) => row.participantNumber ?? '-'
const scoreText = (row: GradingSessionRow) =>
  row.rawScore === null || row.maxScore === null
    ? '-'
    : `${formatScore(row.rawScore)} / ${formatScore(row.maxScore)}`

export function buildGradingSessionColumns(options: {
  onOpen: (session: GradingSessionRow) => void
}): ColumnDef<GradingSessionRow>[] {
  return [
    {
      id: 'participantNumber',
      header: 'No. Peserta',
      meta: {
        align: 'center',
        strong: true,
        mobileLabel: 'No. Peserta',
        mobileValue: numberText,
      },
      cell: ({ row }) => numberText(row.original),
    },
    {
      id: 'student',
      header: 'Nama Siswa',
      meta: { align: 'left', strong: true, mobile: 'title' },
      cell: ({ row }) => studentText(row.original),
    },
    {
      id: 'exits',
      header: 'Keluar',
      meta: {
        align: 'center',
        mobileLabel: 'Keluar',
        mobileValue: exitText,
      },
      cell: ({ row }) => exitText(row.original),
    },
    {
      id: 'score',
      header: 'Nilai',
      meta: { align: 'center', mobileLabel: 'Nilai', mobileValue: scoreText },
      cell: ({ row }) => scoreText(row.original),
    },
    {
      id: 'publication',
      header: 'Nilai ke penilaian',
      meta: {
        align: 'center',
        mobileLabel: 'Nilai ke penilaian',
        mobileValue: (row: GradingSessionRow) =>
          publicationLabel(row.publication),
      },
      cell: ({ row }) => publicationLabel(row.original.publication),
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: GradingSessionRow) => sessionStatusLabel(row.status),
      },
      cell: ({ row }) =>
        h(
          Badge,
          { variant: row.original.awaitingGrading ? 'destructive' : 'outline' },
          () => sessionStatusLabel(row.original.status),
        ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      meta: { align: 'center' },
      cell: ({ row }) =>
        h(ActionCell, {
          viewLabel: row.original.awaitingGrading ? 'Nilai' : 'Lihat',
          hideEdit: true,
          hideDelete: true,
          onView: () => options.onOpen(row.original),
        }),
    },
  ]
}
