import { describe, it, expect } from 'vitest'

function affordance(permissions: string[]) {
  const can = (...codes: string[]) => codes.some((c) => permissions.includes(c))
  return {
    ownSchedule: can('schedules.read-own'),
    classroomPicker:
      !can('schedules.read-own') &&
      (can('schedules.update') || can('schedules.read')),
  }
}

describe('which schedule a person is shown', () => {
  it('gives a holder of schedules.read-own their own schedule', () => {
    expect(affordance(['schedules.read-own'])).toEqual({
      ownSchedule: true,
      classroomPicker: false,
    })
  })

  it('gives an administrator the classroom picker', () => {
    expect(affordance(['schedules.read', 'schedules.update'])).toEqual({
      ownSchedule: false,
      classroomPicker: true,
    })
  })

  it('prefers their own schedule when a person holds both', () => {
    expect(
      affordance(['schedules.read-own', 'schedules.read', 'schedules.update']),
    ).toEqual({ ownSchedule: true, classroomPicker: false })
  })

  it('gives nothing to a holder of neither', () => {
    expect(affordance(['students.read'])).toEqual({
      ownSchedule: false,
      classroomPicker: false,
    })
  })

  it('does not change when the role is called something the school invented', () => {
    const grants = ['schedules.read-own']

    expect(affordance(grants)).toEqual(affordance([...grants]))
    expect(affordance(grants).ownSchedule).toBe(true)
  })
})
