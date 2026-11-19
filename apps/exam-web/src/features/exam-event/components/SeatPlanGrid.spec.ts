// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SeatPlanGrid from './SeatPlanGrid.vue'

const room = {
  roomId: 'r1',
  code: 'R01',
  capacity: 32,
  layout: { lanes: 4, left: 16, right: 16, rows: 4 },
}

const seats = [
  {
    roomId: 'r1',
    studentId: 's1',
    classroomId: 'c1',
    desk: 1,
    gender: 'FEMALE' as const,
    gradeLevel: 7,
    lane: 1,
    row: 1,
    side: 'LEFT' as const,
  },
]

const deskNumbers = (
  wrapper: ReturnType<typeof mount>,
  side: 'LEFT' | 'RIGHT',
) =>
  wrapper
    .findAll(`[data-side="${side}"] [data-desk]`)
    .map((cell) => Number(cell.attributes('data-desk')))

describe('SeatPlanGrid', () => {
  it('renders each block row by row, snaking so row 2 shows 8 7 6 5', () => {
    const wrapper = mount(SeatPlanGrid, {
      props: { rooms: [room], seats: [], names: new Map() },
    })

    expect(deskNumbers(wrapper, 'LEFT')).toEqual([
      1, 2, 3, 4, 8, 7, 6, 5, 9, 10, 11, 12, 16, 15, 14, 13,
    ])
    expect(deskNumbers(wrapper, 'RIGHT')).toEqual([
      17, 18, 19, 20, 24, 23, 22, 21, 25, 26, 27, 28, 32, 31, 30, 29,
    ])
  })

  it('places desks by the row and lane of the plan when a seat exists', () => {
    const wrapper = mount(SeatPlanGrid, {
      props: {
        rooms: [room],
        seats: [{ ...seats[0], desk: 2, lane: 2, row: 1 }],
        names: new Map(),
      },
    })

    expect(deskNumbers(wrapper, 'LEFT')).toEqual([
      1, 2, 3, 4, 8, 7, 6, 5, 9, 10, 11, 12, 16, 15, 14, 13,
    ])
    expect(wrapper.find('[data-desk="2"]').classes()).toContain('text-info')
  })

  it('shows the student name and colours the desk by grade', () => {
    const wrapper = mount(SeatPlanGrid, {
      props: { rooms: [room], seats, names: new Map([['s1', 'Ahmad']]) },
    })

    const cell = wrapper.find('[data-desk="1"]')
    expect(cell.text()).toContain('Ahmad')
    expect(cell.classes()).toContain('text-info')
  })
})
