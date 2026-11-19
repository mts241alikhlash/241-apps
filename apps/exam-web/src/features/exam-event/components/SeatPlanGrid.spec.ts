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
  it('renders desks 1 to 16 on the left block and 17 to 32 on the right', () => {
    const wrapper = mount(SeatPlanGrid, {
      props: { rooms: [room], seats: [], names: new Map() },
    })

    expect(deskNumbers(wrapper, 'LEFT')).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    )
    expect(deskNumbers(wrapper, 'RIGHT')).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 17),
    )
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
