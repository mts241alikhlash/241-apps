import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import { buildSessionColumns } from './sessionColumns'
import type { ScheduleSession } from '../types'

const session = (
  overrides: Partial<ScheduleSession> = {},
): ScheduleSession => ({
  sessionId: 'x1',
  client: 'SEB',
  studentId: 'st1',
  studentName: 'Ahmad Fauzi',
  studentNis: '2024001',
  participantNumber: null,
  status: 'IN_PROGRESS',
  startedAt: '2026-11-02T01:05:00.000Z',
  submittedAt: null,
  rawScore: null,
  maxScore: null,
  deviceBound: true,
  violationCount: 0,
  ...overrides,
})

const columns = (canRelease = true, onRelease = vi.fn()) =>
  buildSessionColumns({ canRelease, onRelease })

const mobile = (id: string, row: ScheduleSession) =>
  (
    columns().find((column) => column.id === id)!.meta as {
      mobileValue: (value: ScheduleSession) => string
    }
  ).mobileValue(row)

const action = (canRelease: boolean, row: ScheduleSession) =>
  (
    columns(canRelease).find((column) => column.id === 'actions')!
      .cell as (ctx: { row: { original: ScheduleSession } }) => VNode | null
  )({ row: { original: row } })

interface Item {
  label: string
  onClick: () => void
}

const items = (node: VNode | null): Item[] =>
  node === null ? [] : (node.props as { items: Item[] }).items

const labelsOf = (node: VNode | null): string[] =>
  items(node).map((item) => item.label)

describe('buildSessionColumns', () => {
  it('shows the participant number and the name, and tolerates a missing student', () => {
    expect(mobile('participantNumber', session())).toBe('-')
    expect(
      mobile('participantNumber', session({ participantNumber: '25-007' })),
    ).toBe('25-007')
    expect(mobile('name', session())).toBe('Ahmad Fauzi')
    expect(mobile('name', session({ studentName: null }))).toBe(
      'Siswa tidak ditemukan',
    )
  })

  it('shows the status, the score and the state of the device', () => {
    expect(mobile('status', session())).toBe('Mengerjakan')
    expect(
      mobile('score', session({ rawScore: 8, maxScore: 10, status: 'GRADED' })),
    ).toBe('8 / 10')
    expect(mobile('score', session())).toBe('-')
    expect(mobile('device', session())).toBe('Terikat')
    expect(mobile('device', session({ deviceBound: false }))).toBe('Dilepas')
    expect(mobile('exits', session())).toBe('-')
    expect(mobile('exits', session({ violationCount: 4 }))).toBe('4×')
    expect(mobile('device', session({ status: 'SUBMITTED' }))).toBe('-')
  })

  it('offers the release only for a session in progress and with the permission', () => {
    expect(labelsOf(action(true, session()))).toContain('Lepas Sesi')
    expect(action(true, session({ status: 'SUBMITTED' }))).toBeNull()
    expect(action(false, session())).toBeNull()
  })

  it('offers reset and history to the recovery roles', () => {
    const cell = (
      buildSessionColumns({
        canRelease: false,
        onRelease: vi.fn(),
        canRecover: true,
        onReset: vi.fn(),
        canReadHistory: true,
        onHistory: vi.fn(),
      }).find((column) => column.id === 'actions')!.cell as (ctx: {
        row: { original: ScheduleSession }
      }) => VNode | null
    )({ row: { original: session({ status: 'SUBMITTED' }) } })

    expect(labelsOf(cell)).toEqual(['Reset', 'Riwayat'])
  })

  it('releases the session of the row', () => {
    const onRelease = vi.fn()
    const cell = columns(true, onRelease).find(
      (column) => column.id === 'actions',
    )!.cell as (ctx: { row: { original: ScheduleSession } }) => VNode

    items(cell({ row: { original: session() } }))[0].onClick()

    expect(onRelease).toHaveBeenCalledWith(session())
  })
})
