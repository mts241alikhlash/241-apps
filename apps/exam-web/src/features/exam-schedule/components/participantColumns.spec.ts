import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import { buildParticipantColumns } from './participantColumns'
import type { MakeupParticipant } from '../types'

const participant = (
  overrides: Partial<MakeupParticipant> = {},
): MakeupParticipant => ({
  studentId: 'st1',
  name: 'Ani',
  nis: '1',
  reason: 'SICK',
  note: null,
  status: 'WAITING',
  ...overrides,
})

const columns = (canRemove = true, onRemove = vi.fn()) =>
  buildParticipantColumns({ canRemove, onRemove })

const mobile = (id: string, row: MakeupParticipant) =>
  (
    columns().find((column) => column.id === id)!.meta as {
      mobileValue: (value: MakeupParticipant) => string
    }
  ).mobileValue(row)

const action = (
  canRemove: boolean,
  row: MakeupParticipant,
  onRemove = vi.fn(),
) =>
  (
    columns(canRemove, onRemove).find((column) => column.id === 'actions')!
      .cell as (ctx: { row: { original: MakeupParticipant } }) => VNode | null
  )({ row: { original: row } })

describe('buildParticipantColumns', () => {
  it('shows who, why, the note and the status', () => {
    expect(columns().map((column) => column.id)).toEqual([
      'student',
      'reason',
      'status',
      'actions',
    ])
    expect(mobile('reason', participant())).toBe('Sakit')
    expect(mobile('reason', participant({ note: 'Demam' }))).toBe(
      'Sakit · Demam',
    )
    expect(mobile('status', participant({ status: 'SAT_REGULAR' }))).toBe(
      'Sudah ikut ujian utama',
    )
  })

  it('names the student with the nis and tolerates a missing one', () => {
    const cell = columns().find((column) => column.id === 'student')!
      .cell as (ctx: { row: { original: MakeupParticipant } }) => string

    expect(cell({ row: { original: participant() } })).toBe('Ani · 1')
    expect(
      cell({ row: { original: participant({ name: null, nis: null }) } }),
    ).toBe('Siswa tidak ditemukan')
  })

  it('offers Hapus only while the student has no session on the makeup', () => {
    expect(action(true, participant({ status: 'WAITING' }))).not.toBeNull()
    expect(action(true, participant({ status: 'SAT_REGULAR' }))).not.toBeNull()
    expect(action(true, participant({ status: 'IN_PROGRESS' }))).toBeNull()
    expect(action(true, participant({ status: 'DONE' }))).toBeNull()
    expect(action(false, participant())).toBeNull()
  })

  it('removes the right student', () => {
    const onRemove = vi.fn()
    const row = participant()

    ;(action(true, row, onRemove)!.props as { onClick: () => void }).onClick()

    expect(onRemove).toHaveBeenCalledWith(row)
  })
})
