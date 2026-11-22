import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'
import { History, Laptop, RefreshCw } from '@lucide/vue'
import type { ScheduleSession } from '../types'
import { sessionStatusLabel } from '../types'

export interface SessionColumnOptions {
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

const studentText = (session: ScheduleSession) =>
  [session.studentName ?? 'Siswa tidak ditemukan', session.studentNis]
    .filter(Boolean)
    .join(' · ')
const startedText = (session: ScheduleSession) =>
  timeFormat.format(new Date(session.startedAt))
const scoreText = (session: ScheduleSession) =>
  session.rawScore === null || session.maxScore === null
    ? '-'
    : `${session.rawScore} / ${session.maxScore}`
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
      id: 'student',
      header: 'Siswa',
      meta: { align: 'left', strong: true },
      cell: ({ row }) => studentText(row.original),
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
      id: 'started',
      header: 'Mulai',
      meta: {
        align: 'center',
        mobileLabel: 'Mulai',
        mobileValue: startedText,
      },
      cell: ({ row }) => startedText(row.original),
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
