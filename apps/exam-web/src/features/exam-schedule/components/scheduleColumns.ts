import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Ban, KeyRound, UserRoundPlus, Users } from '@lucide/vue'
import type { ExamSchedule } from '../types'
import { examTypeLabel, phaseLabel, phaseTone } from '../types'
import { formatDay, formatTime } from '../utils/formatWindow'
import { schedulePhase } from '../utils/schedulePhase'
import { gradeOfClassroom } from '@/features/exam-shared/classroomName'

export interface ScheduleColumnOptions {
  subjectName?: (schedule: ExamSchedule) => string
  canUpdate: boolean
  canCancel: boolean
  canAccessCode: boolean
  canSessions: boolean
  canMakeup?: boolean
  canParticipants?: boolean
  now: () => Date
  onEdit: (schedule: ExamSchedule) => void
  onCancel: (schedule: ExamSchedule) => void
  onAccessCode: (schedule: ExamSchedule) => void
  onSessions: (schedule: ExamSchedule) => void
  onMakeup?: (schedule: ExamSchedule) => void
  onParticipants?: (schedule: ExamSchedule) => void
}

const BADGE_VARIANT = {
  neutral: 'outline',
  info: 'info',
  success: 'success',
  warning: 'warning',
} as const

const typeText = (schedule: ExamSchedule) =>
  schedule.kind === 'MAKEUP'
    ? `${examTypeLabel(schedule.type)} · Susulan`
    : examTypeLabel(schedule.type)
const classroomText = (schedule: ExamSchedule) => schedule.classroomName ?? '-'
const durationText = (schedule: ExamSchedule) =>
  `${schedule.durationMinutes} menit`

export function scheduleActions(
  schedule: ExamSchedule,
  options: ScheduleColumnOptions,
  now: Date,
) {
  const current = schedulePhase(schedule, now)
  const canChange = current === 'UPCOMING' || current === 'RUNNING'
  const items = []
  if (canChange && options.canAccessCode) {
    items.push({
      label: 'Token',
      icon: KeyRound,
      onClick: () => options.onAccessCode(schedule),
    })
  }
  if ((schedule.hasSessions || current === 'RUNNING') && options.canSessions) {
    items.push({
      label: 'Sesi',
      icon: Users,
      onClick: () => options.onSessions(schedule),
    })
  }
  if (current === 'UPCOMING' && options.canCancel && !schedule.hasSessions) {
    items.push({
      label: 'Batalkan',
      icon: Ban,
      destructive: true,
      onClick: () => options.onCancel(schedule),
    })
  }
  if (
    schedule.kind === 'REGULAR' &&
    schedule.status === 'SCHEDULED' &&
    schedule.deliveryMode === 'ONLINE' &&
    schedule.packageId !== null &&
    options.canMakeup
  ) {
    items.push({
      label: 'Susulan',
      icon: UserRoundPlus,
      onClick: () => options.onMakeup?.(schedule),
    })
  }
  if (
    schedule.kind === 'MAKEUP' &&
    schedule.status === 'SCHEDULED' &&
    options.canParticipants
  ) {
    items.push({
      label: 'Peserta',
      icon: Users,
      onClick: () => options.onParticipants?.(schedule),
    })
  }
  return { canEdit: canChange && options.canUpdate, items }
}

export const scheduleHasActions = (
  schedule: ExamSchedule,
  options: ScheduleColumnOptions,
): boolean => {
  const { canEdit, items } = scheduleActions(schedule, options, options.now())
  return canEdit || items.length > 0
}

export function buildScheduleColumns(
  options: ScheduleColumnOptions,
): ColumnDef<ExamSchedule>[] {
  const subjectOf = (schedule: ExamSchedule) =>
    options.subjectName?.(schedule) ?? schedule.packageTitle

  const phase = (schedule: ExamSchedule) =>
    schedulePhase(schedule, options.now())

  return [
    {
      id: 'type',
      header: 'Jenis',
      meta: {
        align: 'center',
        mobileLabel: 'Jenis',
        mobileValue: typeText,
      },
      cell: ({ row }) => typeText(row.original),
    },
    {
      id: 'package',
      header: 'Mata Pelajaran',
      meta: { align: 'left', strong: true, mobile: 'title' },
      cell: ({ row }) =>
        row.original.kind === 'MAKEUP'
          ? h('span', { class: 'flex items-center gap-2' }, [
              subjectOf(row.original),
              h(Badge, { variant: 'outline' }, () => 'Susulan'),
            ])
          : subjectOf(row.original),
    },
    {
      id: 'grade',
      header: 'Tingkat',
      meta: {
        align: 'center',
        mobileLabel: 'Tingkat',
        mobileValue: (row: ExamSchedule) => gradeOfClassroom(row.classroomName),
      },
      cell: ({ row }) => gradeOfClassroom(row.original.classroomName),
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
        mobileValue: (row: ExamSchedule) => formatDay(row.startsAt),
      },
      cell: ({ row }) => formatDay(row.original.startsAt),
    },
    {
      id: 'start',
      header: 'Jam Mulai',
      meta: {
        align: 'center',
        mobileLabel: 'Jam Mulai',
        mobileValue: (row: ExamSchedule) => formatTime(row.startsAt),
      },
      cell: ({ row }) => formatTime(row.original.startsAt),
    },
    {
      id: 'end',
      header: 'Jam Selesai',
      meta: {
        align: 'center',
        mobileLabel: 'Jam Selesai',
        mobileValue: (row: ExamSchedule) => formatTime(row.endsAt),
      },
      cell: ({ row }) => formatTime(row.original.endsAt),
    },
    {
      id: 'duration',
      header: 'Durasi',
      meta: {
        align: 'center',
        mobileLabel: 'Durasi',
        mobileValue: durationText,
      },
      cell: ({ row }) => durationText(row.original),
    },
    {
      id: 'phase',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: ExamSchedule) => phaseLabel(phase(row)),
      },
      cell: ({ row }) =>
        h(
          Badge,
          { variant: BADGE_VARIANT[phaseTone(phase(row.original))] },
          () => phaseLabel(phase(row.original)),
        ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => {
        const { canEdit, items } = scheduleActions(
          row.original,
          options,
          options.now(),
        )
        if (!canEdit && items.length === 0) return null
        return h(ActionCell, {
          editLabel: 'Ubah',
          hideEdit: !canEdit,
          hideDelete: true,
          items,
          onEdit: () => options.onEdit(row.original),
        })
      },
    },
  ]
}
