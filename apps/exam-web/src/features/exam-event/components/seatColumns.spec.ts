import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import { buildSeatColumns, supervisorDisplayName } from './seatColumns'
import type { SeatedStudent } from '../services/examEventService'

const seat: SeatedStudent = {
  studentId: 's1',
  classroomId: 'c1',
  seatNumber: 3,
  name: 'Ahmad',
  nis: '001',
  nisn: '0099887766',
  classroomName: 'VII A',
  gradeName: 'VII',
  className: 'A',
}

function actionNode(
  options: Parameters<typeof buildSeatColumns>[0],
  target = seat,
): VNode | null {
  const column = buildSeatColumns(options).find(
    (candidate) => candidate.id === 'actions',
  )
  const cell = column?.cell as (context: unknown) => VNode | null
  return cell({ row: { original: target } })
}

describe('buildSeatColumns permissions', () => {
  it('offers the seat flags only where the technician may act', () => {
    const node = actionNode({ canFlag: () => true, onFlag: vi.fn() })
    const props = (node as VNode & { props: { items: { label: string }[] } })
      .props

    expect(props.items.map((item) => item.label)).toEqual([
      'Izinkan masuk terlambat',
    ])
  })

  it('renders no action cell for a room the caller does not own', () => {
    expect(actionNode({ canFlag: () => false, onFlag: vi.fn() })).toBeNull()
  })
})

describe('supervisorDisplayName', () => {
  it('names a person by identifier when the user is known', () => {
    expect(
      supervisorDisplayName('u1', [{ id: 'u1', identifier: 'Budi' }]),
    ).toBe('Budi')
  })

  it('shows Belum ditentukan when no person is set', () => {
    expect(supervisorDisplayName(null, [])).toBe('Belum ditentukan')
  })

  it('falls back to the id when the user is not in the list', () => {
    expect(supervisorDisplayName('u2', [])).toBe('u2')
  })
})
