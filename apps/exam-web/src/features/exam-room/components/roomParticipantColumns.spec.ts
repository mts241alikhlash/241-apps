import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import {
  buildRoomParticipantColumns,
  isLowBattery,
  readinessWarnings,
  syncText,
} from './roomParticipantColumns'
import type { RoomMonitorParticipant, RoomMonitorSession } from '../types'

const session = (
  overrides: Partial<RoomMonitorSession> = {},
): RoomMonitorSession => ({
  sessionId: 'x1',
  status: 'IN_PROGRESS',
  startedAt: '2026-11-02T01:00:00.000Z',
  deadline: '2026-11-02T02:30:00.000Z',
  submittedAt: null,
  extraMinutes: 0,
  answeredCount: 38,
  syncedAnswerCount: 34,
  unsyncedCount: 4,
  lastSeenAt: '2026-11-02T01:10:00.000Z',
  batteryLevel: 80,
  isCharging: false,
  dndGranted: true,
  lockTaskActive: true,
  batteryUnrestricted: true,
  kioskMode: 'STRICT',
  allowWebClient: false,
  violationCount: 0,
  lockedByViolation: false,
  requiresTokenReentry: false,
  lastEvent: null,
  latestSnapshotUrl: null,
  lastSnapshotAt: null,
  cameraBlocked: null,
  ...overrides,
})

const participant = (
  overrides: Partial<RoomMonitorParticipant> = {},
): RoomMonitorParticipant => ({
  seatNumber: 1,
  studentId: 'st1',
  studentName: 'Ahmad Fauzi',
  nis: '2024001',
  classroomName: 'VII A',
  subjectName: 'Matematika',
  packageTitle: 'PAS Ganjil',
  scheduleId: 's1',
  totalQuestions: 50,
  session: session(),
  absence: null,
  ...overrides,
})

const base = {
  supervise: true,
  recover: false,
  onTimeline: vi.fn(),
  onAbsence: vi.fn(),
  onFieldNote: vi.fn(),
  onRelease: vi.fn(),
  onReopen: vi.fn(),
  onReset: vi.fn(),
  onExtendTime: vi.fn(),
  onAllowWeb: vi.fn(),
  onAllowLate: vi.fn(),
}

type CellFn = (ctx: { row: { original: RoomMonitorParticipant } }) => unknown

function column(id: string, options: Partial<typeof base> = {}) {
  return buildRoomParticipantColumns({ ...base, ...options }).find(
    (candidate) => candidate.id === id,
  )!
}

function cellOf(id: string, options: Partial<typeof base> = {}): CellFn {
  const definition = column(id, options)
  return definition.cell as CellFn
}

function actionLabels(options: Partial<typeof base>) {
  const node = cellOf(
    'actions',
    options,
  )({
    row: { original: participant() },
  }) as VNode
  const props = node.props as { items: { label: string }[] }
  return props.items.map((item) => item.label)
}

const cellText = (id: string, row: RoomMonitorParticipant): string => {
  const meta = column(id).meta as {
    mobileValue?: (value: RoomMonitorParticipant) => string
  }
  if (meta.mobileValue) return meta.mobileValue(row)
  const value = cellOf(id)({ row: { original: row } })
  return typeof value === 'string' ? value : ''
}

describe('syncText', () => {
  it('names the answers waiting on the phone beside the delivered ones', () => {
    expect(syncText(session({ syncedAnswerCount: 34, unsyncedCount: 4 }))).toBe(
      '34 terkirim • 4 tertunda di HP',
    )
  })

  it('says every answer is delivered once the batch lands', () => {
    expect(syncText(session({ syncedAnswerCount: 38, unsyncedCount: 0 }))).toBe(
      '38 terkirim',
    )
  })

  it('renders the exact sentence in the sync column', () => {
    expect(cellText('sync', participant({ session: session() }))).toBe(
      '34 terkirim • 4 tertunda di HP',
    )
  })

  it('shows a dash for a student who has not started', () => {
    expect(cellText('sync', participant({ session: null }))).toBe('-')
  })
})

describe('low battery', () => {
  it('warns below 15 percent while unplugged', () => {
    expect(isLowBattery(session({ batteryLevel: 14, isCharging: false }))).toBe(
      true,
    )
  })

  it('stays quiet at 15 percent or while charging', () => {
    expect(isLowBattery(session({ batteryLevel: 15, isCharging: false }))).toBe(
      false,
    )
    expect(isLowBattery(session({ batteryLevel: 9, isCharging: true }))).toBe(
      false,
    )
    expect(isLowBattery(session({ batteryLevel: null }))).toBe(false)
  })

  it('paints the battery destructive in the activity cell', () => {
    const node = cellOf('activity')({
      row: {
        original: participant({
          session: session({ batteryLevel: 9, isCharging: false }),
        }),
      },
    }) as VNode
    const children = node.children as VNode[]
    const battery = children[1]

    expect(String(battery.props?.class)).toContain('text-destructive')
  })
})

describe('device readiness', () => {
  it('names every flag that is not granted', () => {
    expect(
      readinessWarnings(
        session({
          dndGranted: false,
          lockTaskActive: true,
          batteryUnrestricted: null,
        }),
      ),
    ).toEqual(['DND', 'optimisasi baterai'])
  })

  it('says nothing is missing once the three flags are true', () => {
    expect(readinessWarnings(session())).toEqual([])
    expect(cellText('readiness', participant())).toBe('Siap')
  })

  it('warns with the failing flag in the readiness cell', () => {
    expect(
      cellText(
        'readiness',
        participant({ session: session({ lockTaskActive: false }) }),
      ),
    ).toBe('Belum siap: pinning layar')
  })

  it('paints the readiness cell destructive and shows the shield when a flag fails', () => {
    const node = cellOf('readiness')({
      row: {
        original: participant({
          session: session({ dndGranted: null }),
        }),
      },
    }) as VNode
    const children = node.children as VNode[]

    expect(String(node.props?.class)).toContain('text-destructive')
    expect(children[0]).not.toBeNull()
  })

  it('shows a dash for a student who has not started', () => {
    expect(cellText('readiness', participant({ session: null }))).toBe('-')
  })
})

describe('action cell permissions', () => {
  it('hides reopen, reset and extend time from a supervisor', () => {
    const labels = actionLabels({ supervise: true, recover: false })

    expect(labels).toContain('Riwayat Kejadian')
    expect(labels).toContain('Lepas Perangkat')
    expect(labels).not.toContain('Buka Kembali Sesi')
    expect(labels).not.toContain('Reset Ulang Sesi')
    expect(labels).not.toContain('Tambah Waktu')
  })

  it('shows them to a technician', () => {
    const labels = actionLabels({ supervise: false, recover: true })

    expect(labels).not.toContain('Riwayat Kejadian')

    expect(labels).toContain('Buka Kembali Sesi')
    expect(labels).toContain('Reset Ulang Sesi')
    expect(labels).toContain('Tambah Waktu')
    expect(labels).toContain('Izinkan Mode Web')
    expect(labels).toContain('Izinkan Masuk Terlambat')
  })

  it('shows them to a coordinator who holds both abilities', () => {
    const labels = actionLabels({ supervise: true, recover: true })

    expect(labels).toContain('Reset Ulang Sesi')
    expect(labels).toContain('Catat Absen')
  })

  it('offers nothing to a caller with no room permission', () => {
    const cell = cellOf('actions', { supervise: false, recover: false })
    expect(cell({ row: { original: participant() } })).toBeNull()
  })
})

describe('status and progress cells', () => {
  it('renders the absence reason before the session state', () => {
    expect(
      cellText(
        'status',
        participant({
          session: null,
          absence: { reason: 'SICK', note: 'Demam' },
        }),
      ),
    ).toBe('Tidak Hadir: Sakit')
  })

  it('counts the answered questions against the package total', () => {
    expect(cellText('progress', participant())).toBe('38 / 50 soal')
    expect(cellText('progress', participant({ session: null }))).toBe(
      '0 / 50 soal',
    )
  })
})
