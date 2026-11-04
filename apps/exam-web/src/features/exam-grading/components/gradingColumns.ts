import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { UserRoundPlus, Users } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  examTypeLabel,
  sessionStatusLabel,
} from '@/features/exam-schedule/types'
import { formatWindow } from '@/features/exam-schedule/utils/formatWindow'
import type { GradingSchedule, GradingSessionRow } from '../types'
import { publicationLabel } from '../types'

const typeText = (row: GradingSchedule) =>
  row.kind === 'MAKEUP'
    ? `${examTypeLabel(row.type)} · Susulan`
    : examTypeLabel(row.type)
const exitText = (row: GradingSessionRow) =>
  row.violationCount > 0 ? `${row.violationCount}×` : '-'
const classroomText = (row: GradingSchedule) => row.classroomName ?? '-'
const windowText = (row: GradingSchedule) =>
  formatWindow(row.startsAt, row.endsAt)

export function buildGradingScheduleColumns(options: {
  onOpen: (schedule: GradingSchedule) => void
  canMakeup?: boolean
  canParticipants?: boolean
  onMakeup?: (schedule: GradingSchedule) => void
  onParticipants?: (schedule: GradingSchedule) => void
}): ColumnDef<GradingSchedule>[] {
  return [
    {
      id: 'title',
      header: 'Ujian',
      meta: { align: 'left', strong: true },
      cell: ({ row }) => row.original.title,
    },
    {
      id: 'type',
      header: 'Jenis',
      meta: { mobileLabel: 'Jenis', mobileValue: typeText },
      cell: ({ row }) => typeText(row.original),
    },
    {
      id: 'classroom',
      header: 'Kelas',
      meta: { mobileLabel: 'Kelas', mobileValue: classroomText },
      cell: ({ row }) => classroomText(row.original),
    },
    {
      id: 'window',
      header: 'Waktu',
      meta: { mobileLabel: 'Waktu', mobileValue: windowText },
      cell: ({ row }) => windowText(row.original),
    },
    {
      id: 'sessions',
      header: 'Siswa',
      meta: {
        align: 'center',
        mobileLabel: 'Siswa',
        mobileValue: (row: GradingSchedule) => String(row.sessions),
      },
      cell: ({ row }) => String(row.original.sessions),
    },
    {
      id: 'awaiting',
      header: 'Perlu dinilai',
      meta: {
        align: 'center',
        mobileLabel: 'Perlu dinilai',
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
      cell: ({ row }) => {
        const items = []
        if (options.canMakeup && row.original.kind === 'REGULAR') {
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
        if (items.length === 0) {
          return h(
            Button,
            {
              size: 'sm',
              variant: 'outline',
              onClick: () => options.onOpen(row.original),
            },
            () => 'Buka',
          )
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
  [row.studentName ?? 'Siswa tidak ditemukan', row.studentNis]
    .filter(Boolean)
    .join(' · ')
const scoreText = (row: GradingSessionRow) =>
  row.rawScore === null || row.maxScore === null
    ? '-'
    : `${row.rawScore} / ${row.maxScore}`

export function buildGradingSessionColumns(options: {
  onOpen: (session: GradingSessionRow) => void
}): ColumnDef<GradingSessionRow>[] {
  return [
    {
      id: 'student',
      header: 'Siswa',
      meta: { align: 'left', strong: true },
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
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        h(
          Button,
          {
            size: 'sm',
            variant: row.original.awaitingGrading ? 'default' : 'outline',
            onClick: () => options.onOpen(row.original),
          },
          () => (row.original.awaitingGrading ? 'Nilai' : 'Lihat'),
        ),
    },
  ]
}
