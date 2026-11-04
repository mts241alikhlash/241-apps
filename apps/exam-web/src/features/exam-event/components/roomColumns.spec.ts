import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import { buildRoomColumns } from './roomColumns'
import type { ExamRoom } from '../types'

const room = (overrides: Partial<ExamRoom> = {}): ExamRoom => ({
  id: 'r1',
  eventId: 'e1',
  code: 'R01',
  name: 'Ruang 01',
  building: null,
  capacity: 30,
  technicianUserId: 'tech-1',
  tokenRotation: 0,
  ...overrides,
})

function actionProps(
  options: Parameters<typeof buildRoomColumns>[0],
  target = room(),
) {
  const column = buildRoomColumns(options).find(
    (candidate) => candidate.id === 'actions',
  )
  const cell = column?.cell as (context: unknown) => VNode
  const node = cell({ row: { original: target } }) as VNode & {
    component?: { props: Record<string, unknown> }
    props?: Record<string, unknown>
  }
  return (node.props ?? node.component?.props ?? {}) as {
    items: { label: string }[]
    hideEdit: boolean
  }
}

const base = {
  canManage: false,
  canSupervise: false,
  technicianName: () => 'Teknisi',
  canActOnRoom: () => false,
  onEdit: vi.fn(),
  onAccessCode: vi.fn(),
  onRotateToken: vi.fn(),
  onExtendTime: vi.fn(),
}

describe('buildRoomColumns permissions', () => {
  it('offers the token read to a supervisor, not the rotate', () => {
    const props = actionProps({ ...base, canSupervise: true })

    expect(props.items.map((item) => item.label)).toEqual(['Token'])
  })

  it('offers rotate and extend to the assigned technician only', () => {
    const props = actionProps({
      ...base,
      canActOnRoom: (target) => target.technicianUserId === 'tech-1',
    })

    expect(props.items.map((item) => item.label)).toEqual([
      'Putar token',
      'Tambah waktu',
    ])
  })

  it('hides every room action from a technician of another room', () => {
    const props = actionProps({
      ...base,
      canActOnRoom: (target) => target.technicianUserId === 'tech-9',
    })

    expect(props.items).toEqual([])
  })

  it('keeps edit behind exam-events.manage', () => {
    expect(actionProps(base).hideEdit).toBe(true)
    expect(actionProps({ ...base, canManage: true }).hideEdit).toBe(false)
  })
})
