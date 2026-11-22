import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'
import { History, Laptop, RefreshCw } from '@lucide/vue'
import type { ScheduleSession } from '../types'
import { sessionStatusLabel } from '../types'
import {
  classOfClassroom,
  gradeOfClassroom,
} from '@/features/exam-shared/classroomName'

export interface SessionColumnOptions {
  classroomName?: string | null
  canRelease: boolean
  onRelease: (session: ScheduleSession) => void
  canRecover?: boolean
  onReset?: (session: ScheduleSession) => void
  canReadHistory?: boolean
  onHistory?: (session: ScheduleSession) => void
}

const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})

const startedText = (session: ScheduleSession) =>
  timeFormat.format(new Date(session.startedAt)).replace('.', ':')
const finishedText = (session: ScheduleSession) =>
  session.submittedAt === null
    ? '-'
    : timeFormat.format(new Date(session.submittedAt)).replace('.', ':')
const number = (value: number) =>
  value.toLocaleString('id-ID', { maximumFractionDigits: 2 })
const scoreText = (session: ScheduleSession) =>
  session.rawScore === null || session.maxScore === null
    ? '-'
    : `${number(session.rawScore)} / ${number(session.maxScore)}`
const exitText = (session: ScheduleSession) =>
  session.violationCount > 0 ? `${session.violationCount}×` : '-'
const deviceText = (session: ScheduleSession) =>
  session.status !== 'IN_PROGRESS'
    ? '-'
    : session.deviceBound
      ? 'Terikat'
      : 'Dilepas'

export function buildSessionColumns(
  options: SessionColumnOptions,
): ColumnDef<ScheduleSession>[] {
  return [
    {
      id: 'participantNumber',
      header: 'No. Peserta',
      meta: {
        align: 'center',
        strong: true,
        mobileLabel: 'No. Peserta',
        mobileValue: (row: ScheduleSession) => row.participantNumber ?? '-',
      },
      cell: ({ row }) => row.original.participantNumber ?? '-',
    },
    {
      id: 'name',
      header: 'Nama',
      meta: {
        align: 'left',
        strong: true,
        mobile: 'title',
        mobileValue: (row: ScheduleSession) =>
          row.studentName ?? 'Siswa tidak ditemukan',
      },
      cell: ({ row }) => row.original.studentName ?? 'Siswa tidak ditemukan',
    },
    {
      id: 'grade',
      header: 'Tingkat',
      meta: {
        align: 'center',
        mobileLabel: 'Tingkat',
        mobileValue: () => gradeOfClassroom(options.classroomName ?? null),
      },
      cell: () => gradeOfClassroom(options.classroomName ?? null),
    },
    {
      id: 'classroom',
      header: 'Kelas',
      meta: {
        align: 'center',
        mobileLabel: 'Kelas',
        mobileValue: () => classOfClassroom(options.classroomName ?? null),
      },
      cell: () => classOfClassroom(options.classroomName ?? null),
    },
    {
      id: 'started',
      header: 'Jam Mulai',
      meta: {
        align: 'center',
        mobileLabel: 'Jam Mulai',
        mobileValue: startedText,
      },
      cell: ({ row }) => startedText(row.original),
    },
    {
      id: 'finished',
      header: 'Jam Selesai',
      meta: {
        align: 'center',
        mobileLabel: 'Jam Selesai',
        mobileValue: finishedText,
      },
      cell: ({ row }) => finishedText(row.original),
    },
    {
      id: 'score',
      header: 'Nilai',
      meta: {
        align: 'center',
        mobileLabel: 'Nilai',
        mobileValue: scoreText,
      },
      cell: ({ row }) => scoreText(row.original),
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
      id: 'device',
      header: 'Perangkat',
      meta: {
        align: 'center',
        mobileLabel: 'Perangkat',
        mobileValue: deviceText,
      },
      cell: ({ row }) => deviceText(row.original),
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: ScheduleSession) => sessionStatusLabel(row.status),
      },
      cell: ({ row }) =>
        h(
          Badge,
          { variant: row.original.status === 'GRADED' ? 'default' : 'outline' },
          () => sessionStatusLabel(row.original.status),
        ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => {
        const session = row.original
        const items = []
        if (options.canRelease && session.status === 'IN_PROGRESS') {
          items.push({
            label: 'Lepas Sesi',
            icon: Laptop,
            onClick: () => options.onRelease(session),
          })
        }
        if (options.canRecover && options.onReset) {
          items.push({
            label: 'Reset',
            icon: RefreshCw,
            destructive: true,
            onClick: () => options.onReset?.(session),
          })
        }
        if (options.canReadHistory && options.onHistory) {
          items.push({
            label: 'Riwayat',
            icon: History,
            onClick: () => options.onHistory?.(session),
          })
        }
        return items.length === 0
          ? null
          : h(ActionCell, { hideEdit: true, hideDelete: true, items })
      },
    },
  ]
}
