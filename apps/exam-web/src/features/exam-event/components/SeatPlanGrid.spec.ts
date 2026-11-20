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

const seat = {
  roomId: 'r1',
  studentId: 's1',
  classroomId: 'c1',
  desk: 1,
  gender: 'FEMALE' as const,
  gradeLevel: 7,
  lane: 1,
  row: 1,
  side: 'LEFT' as const,
}

describe('SeatPlanGrid', () => {
  it('renders one grid per room with all 32 desks in their snake cells', () => {
    const wrapper = mount(SeatPlanGrid, {
      props: { rooms: [room], seats: [], names: new Map() },
    })

    expect(wrapper.findAll('[data-room="r1"]')).toHaveLength(1)
    const cells = wrapper.findAll('[data-desk]')
    expect(cells).toHaveLength(32)
    const at = (desk: number) =>
      wrapper.find(`[data-desk="${desk}"]`).attributes()
    expect([at(8)['data-row'], at(8)['data-lane']]).toEqual(['1', '8'])
    expect([at(9)['data-row'], at(9)['data-lane']]).toEqual(['2', '8'])
    expect([at(16)['data-row'], at(16)['data-lane']]).toEqual(['2', '1'])
    expect([at(28)['data-row'], at(28)['data-lane']]).toEqual(['4', '5'])
  })

  it('leaves lanes 5..8 of the partial last row empty in a 28-seat room', () => {
    const wrapper = mount(SeatPlanGrid, {
      props: {
        rooms: [
          {
            ...room,
            capacity: 28,
            layout: { lanes: 4, left: 16, right: 12, rows: 4 },
          },
        ],
        seats: [],
        names: new Map(),
      },
    })
    expect(wrapper.findAll('[data-desk]')).toHaveLength(28)
    const at = (desk: number) =>
      wrapper.find(`[data-desk="${desk}"]`).attributes()
    expect([at(28)['data-row'], at(28)['data-lane']]).toEqual(['4', '1'])
    expect([at(25)['data-row'], at(25)['data-lane']]).toEqual(['4', '4'])
    expect(wrapper.findAll('[data-row="4"][data-lane="5"]')).toHaveLength(0)
  })

  it('shows the student name and tints the desk by gender', () => {
    const wrapper = mount(SeatPlanGrid, {
      props: {
        rooms: [room],
        seats: [seat],
        names: new Map([['s1', 'Ahmad']]),
      },
    })

    const cell = wrapper.find('[data-desk="1"]')
    expect(cell.text()).toContain('Ahmad')
    expect(cell.classes()).toContain('bg-info/10')
    expect(wrapper.find('[data-desk="2"]').classes()).toContain('border-dashed')
  })

  it('tints boys differently from girls', () => {
    const boy = { ...seat, desk: 17, studentId: 's2', gender: 'MALE' as const }
    const wrapper = mount(SeatPlanGrid, {
      props: { rooms: [room], seats: [boy], names: new Map() },
    })
    expect(wrapper.find('[data-desk="17"]').classes()).toContain(
      'bg-success/10',
    )
  })
})
