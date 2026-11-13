import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  BatteryWarning,
  History,
  Laptop,
  RefreshCw,
  ShieldAlert,
  Timer,
  Undo2,
  UserX,
  NotebookPen,
} from '@lucide/vue'
import type {
  MonitorAbilities,
  RoomMonitorParticipant,
  RoomMonitorSession,
} from '../types'
import { reasonLabel } from '../types'

export interface RoomParticipantColumnOptions extends MonitorAbilities {
  onTimeline: (row: RoomMonitorParticipant) => void
  onAbsence: (row: RoomMonitorParticipant) => void
  onFieldNote: (row: RoomMonitorParticipant) => void
  onRelease: (row: RoomMonitorParticipant) => void
  onReopen: (row: RoomMonitorParticipant) => void
  onReset: (row: RoomMonitorParticipant) => void
  onExtendTime: (row: RoomMonitorParticipant) => void
  onAllowLate: (row: RoomMonitorParticipant) => void
}

const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})

const LOW_BATTERY = 15

export const syncText = (session: RoomMonitorSession): string =>
  session.unsyncedCount > 0
    ? `${session.syncedAnswerCount} terkirim • ${session.unsyncedCount} tertunda di HP`
    : `${session.syncedAnswerCount} terkirim`

const progressText = (row: RoomMonitorParticipant) =>
  row.session === null
    ? `0 / ${row.totalQuestions} soal`
    : `${row.session.answeredCount} / ${row.totalQuestions} soal`

export const isLowBattery = (session: RoomMonitorSession): boolean =>
  session.batteryLevel !== null &&
  session.batteryLevel < LOW_BATTERY &&
  session.isCharging !== true

const batteryText = (session: RoomMonitorSession): string => {
  if (session.batteryLevel === null) return '-'
  const charging = session.isCharging === true ? ' (dicas)' : ''
  return `${session.batteryLevel}%${charging}`
}

type ReadinessFlag = 'dndGranted' | 'lockTaskActive' | 'batteryUnrestricted'

const READINESS_LABELS = [
  ['dndGranted', 'DND'],
  ['lockTaskActive', 'pinning layar'],
  ['batteryUnrestricted', 'optimisasi baterai'],
] as const satisfies readonly [ReadinessFlag, string][]

export const readinessWarnings = (session: RoomMonitorSession): string[] =>
  READINESS_LABELS.filter(([flag]) => session[flag] !== true).map(
    ([, label]) => label,
  )

const readinessText = (session: RoomMonitorSession | null): string => {
  if (session === null) return '-'
  const warnings = readinessWarnings(session)
  return warnings.length === 0 ? 'Siap' : `Belum siap: ${warnings.join(' · ')}`
}

const activityText = (session: RoomMonitorSession | null): string => {
  if (session === null) return '-'
  const seen =
    session.lastSeenAt === null
      ? 'Belum ada aktivitas'
      : `Aktif ${timeFormat.format(new Date(session.lastSeenAt))}`
  return session.submittedAt === null
    ? seen
    : `${seen} · Kumpul ${timeFormat.format(new Date(session.submittedAt))}`
}

const disturbanceText = (row: RoomMonitorParticipant): string => {
  const session = row.session
  if (session === null) return '-'
  const parts: string[] = []
  if (session.violationCount > 0) parts.push(`${session.violationCount}×`)
  if (session.lastEvent !== null) {
    parts.push(
      `${session.lastEvent.type} ${timeFormat.format(new Date(session.lastEvent.occurredAt))}`,
    )
  }
  return parts.length === 0 ? '-' : parts.join(' · ')
}

const statusNode = (row: RoomMonitorParticipant) => {
  const absence = row.absence
  if (absence !== null) {
    return h(
      Badge,
      { variant: 'destructive' },
      () => `Tidak Hadir: ${reasonLabel(absence.reason)}`,
    )
  }
  const session = row.session
  if (session === null) {
    return h(Badge, { variant: 'outline' }, () => 'Belum Mulai')
  }
  if (session.lockedByViolation) {
    return h(Badge, { variant: 'destructive' }, () => 'Terkunci Pelanggaran')
  }
  if (session.requiresTokenReentry) {
    return h(Badge, { variant: 'secondary' }, () => 'Menunggu Token Ulang')
  }
  if (session.status === 'IN_PROGRESS') {
    return h(Badge, { variant: 'default' }, () => 'Mengerjakan')
  }
  return h(Badge, { variant: 'outline' }, () => 'Terkumpul')
}

const statusText = (row: RoomMonitorParticipant): string => {
  const absence = row.absence
  if (absence !== null) {
    return `Tidak Hadir: ${reasonLabel(absence.reason)}`
  }
  const session = row.session
  if (session === null) return 'Belum Mulai'
  if (session.lockedByViolation) return 'Terkunci Pelanggaran'
  if (session.requiresTokenReentry) return 'Menunggu Token Ulang'
  return session.status === 'IN_PROGRESS' ? 'Mengerjakan' : 'Terkumpul'
}

export function clientLabel(session: RoomMonitorSession | null): string {
  if (session === null) return '-'
  return session.client === 'SEB' ? 'Safe Exam Browser' : 'Istiqra'
}

export function buildRoomParticipantColumns(
  options: RoomParticipantColumnOptions,
): ColumnDef<RoomMonitorParticipant>[] {
  return [
    {
      id: 'seat',
      header: 'Kursi',
      meta: {
        align: 'center',
        mobileLabel: 'Kursi',
        mobileValue: (row: RoomMonitorParticipant) =>
          `[${String(row.seatNumber).padStart(2, '0')}]`,
      },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'tabular-nums' },
          `[${String(row.original.seatNumber).padStart(2, '0')}]`,
        ),
    },
    {
      id: 'participant',
      header: 'Peserta',
      meta: {
        align: 'left',
        strong: true,
        mobileLabel: 'Peserta',
        mobileValue: (row: RoomMonitorParticipant) =>
          [row.studentName ?? 'Siswa tidak ditemukan', row.nis]
            .filter(Boolean)
            .join(' · '),
      },
      cell: ({ row }) =>
        h(
          'span',
          {},
          [
            row.original.studentName ?? 'Siswa tidak ditemukan',
            row.original.nis,
          ]
            .filter(Boolean)
            .join(' · '),
        ),
    },
    {
      id: 'subject',
      header: 'Mapel',
      meta: {
        align: 'left',
        mobileLabel: 'Mapel',
        mobileValue: (row: RoomMonitorParticipant) => row.subjectName ?? '-',
      },
      cell: ({ row }) => row.original.subjectName ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: statusText,
      },
      cell: ({ row }) => statusNode(row.original),
    },
    {
      id: 'progress',
      header: 'Progres',
      meta: {
        align: 'center',
        mobileLabel: 'Progres',
        mobileValue: progressText,
      },
      cell: ({ row }) =>
        h('span', { class: 'tabular-nums' }, progressText(row.original)),
    },
    {
      id: 'sync',
      header: 'Sinkronisasi',
      meta: {
        align: 'center',
        mobileLabel: 'Sinkronisasi',
        mobileValue: (row: RoomMonitorParticipant) =>
          row.session === null ? '-' : syncText(row.session),
      },
      cell: ({ row }) => {
        const session = row.original.session
        if (session === null) return '-'
        return h(
          'span',
          {
            class:
              session.unsyncedCount > 0
                ? 'tabular-nums text-amber-600 dark:text-amber-500'
                : 'tabular-nums',
          },
          syncText(session),
        )
      },
    },
    {
      id: 'disturbance',
      header: 'Gangguan',
      meta: {
        align: 'center',
        mobileLabel: 'Gangguan',
        mobileValue: disturbanceText,
      },
      cell: ({ row }) => disturbanceText(row.original),
    },
    {
      id: 'activity',
      header: 'Aktivitas & Baterai',
      meta: {
        mobileLabel: 'Aktivitas',
        mobileValue: (row: RoomMonitorParticipant) =>
          `${activityText(row.session)} · ${row.session === null ? '-' : batteryText(row.session)}`,
      },
      cell: ({ row }) => {
        const session = row.original.session
        if (session === null) return '-'
        return h('div', { class: 'flex flex-col gap-1' }, [
          h('span', { class: 'tabular-nums' }, activityText(session)),
          h(
            'span',
            {
              class: isLowBattery(session)
                ? 'flex items-center gap-1 tabular-nums font-medium text-destructive'
                : 'flex items-center gap-1 tabular-nums text-muted-foreground',
            },
            [
              isLowBattery(session)
                ? h(BatteryWarning, { class: 'size-3.5' })
                : null,
              h('span', {}, batteryText(session)),
            ],
          ),
        ])
      },
    },
    {
      id: 'client',
      header: 'Aplikasi',
      meta: {
        align: 'center',
        mobileLabel: 'Aplikasi',
        mobileValue: (row: RoomMonitorParticipant) => clientLabel(row.session),
      },
      cell: ({ row }) => clientLabel(row.original.session),
    },
    {
      id: 'readiness',
      header: 'Perangkat',
      meta: {
        align: 'center',
        mobileLabel: 'Perangkat',
        mobileValue: (row: RoomMonitorParticipant) =>
          readinessText(row.session),
      },
      cell: ({ row }) => {
        const session = row.original.session
        if (session === null) return '-'
        const warnings = readinessWarnings(session)
        return h(
          'span',
          {
            class:
              warnings.length > 0
                ? 'flex items-center gap-1 font-medium text-destructive'
                : 'flex items-center gap-1 text-muted-foreground',
          },
          [
            warnings.length > 0 ? h(ShieldAlert, { class: 'size-3.5' }) : null,
            h('span', {}, readinessText(session)),
          ],
        )
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => {
        if (!options.supervise && !options.recover) return null
        const target = row.original
        const items: {
          label: string
          icon: typeof History
          destructive?: boolean
          disabled?: boolean
          onClick: () => void
        }[] = []
        if (options.supervise) {
          items.push({
            label: 'Riwayat Kejadian',
            icon: History,
            onClick: () => options.onTimeline(target),
          })
        }
        items.push(
          {
            label: 'Catat Absen',
            icon: UserX,
            disabled: target.session !== null,
            onClick: () => options.onAbsence(target),
          },
          {
            label: 'Catat Pelanggaran',
            icon: NotebookPen,
            onClick: () => options.onFieldNote(target),
          },
          {
            label: 'Lepas Perangkat',
            icon: Laptop,
            onClick: () => options.onRelease(target),
          },
        )
        if (options.recover) {
          items.push(
            {
              label: 'Buka Kembali Sesi',
              icon: Undo2,
              onClick: () => options.onReopen(target),
            },
            {
              label: 'Tambah Waktu',
              icon: Timer,
              onClick: () => options.onExtendTime(target),
            },
            {
              label: 'Izinkan Masuk Terlambat',
              icon: Timer,
              onClick: () => options.onAllowLate(target),
            },
            {
              label: 'Reset Ulang Sesi',
              icon: RefreshCw,
              destructive: true,
              onClick: () => options.onReset(target),
            },
          )
        }
        return h(ActionCell, {
          hideEdit: true,
          hideDelete: true,
          items,
        })
      },
    },
  ]
}
