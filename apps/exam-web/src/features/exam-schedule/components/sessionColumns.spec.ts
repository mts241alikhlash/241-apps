import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import { buildSessionColumns } from './sessionColumns'
import type { ScheduleSession } from '../types'

const session = (
  overrides: Partial<ScheduleSession> = {},
): ScheduleSession => ({
  sessionId: 'x1',
  studentId: 'st1',
  studentName: 'Ahmad Fauzi',
  studentNis: '2024001',
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

const childText = (node: VNode | null): string[] => {
  if (node === null) return []
  const children = (node.children as VNode[] | undefined) ?? []
  return children.map((child) => {
    const slots = child.children
    const text =
      slots !== null && !Array.isArray(slots) && typeof slots === 'object'
        ? (slots as { default?: () => unknown }).default?.()
        : slots
    if (Array.isArray(text)) return text.join('')
    return typeof text === 'string' ? text : ''
  })
}

describe('buildSessionColumns', () => {
  it('shows the student name with the nis and tolerates a missing student', () => {
    const cell = columns().find((column) => column.id === 'student')!
      .cell as (ctx: { row: { original: ScheduleSession } }) => string

    expect(cell({ row: { original: session() } })).toBe('Ahmad Fauzi · 2024001')
    expect(
      cell({
        row: { original: session({ studentName: null, studentNis: null }) },
      }),
    ).toBe('Siswa tidak ditemukan')
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
    expect(childText(action(true, session()))).toContain('Lepas Sesi')
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

    expect(childText(cell)).toEqual(['Reset', 'Riwayat'])
  })

  it('releases the session of the row', () => {
    const onRelease = vi.fn()
    const cell = columns(true, onRelease).find(
      (column) => column.id === 'actions',
    )!.cell as (ctx: { row: { original: ScheduleSession } }) => VNode
    const node = cell({ row: { original: session() } })
    const buttons = node.children as VNode[]
    const button = buttons[0]

    ;(button.props as { onClick: () => void }).onClick()

    expect(onRelease).toHaveBeenCalledWith(session())
  })
})
