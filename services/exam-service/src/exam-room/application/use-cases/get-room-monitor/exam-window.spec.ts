import { examWindowOf } from './get-room-monitor.use-case.js'

describe('examWindowOf', () => {
  it('spans from the earliest start to the latest end of the schedules', () => {
    expect(
      examWindowOf([
        {
          startsAt: new Date('2026-11-22T17:00:00.000Z'),
          endsAt: new Date('2026-11-22T18:15:00.000Z'),
        },
        {
          startsAt: new Date('2026-11-22T17:00:00.000Z'),
          endsAt: new Date('2026-11-22T19:00:00.000Z'),
        },
      ]),
    ).toEqual({
      startsAt: '2026-11-22T17:00:00.000Z',
      endsAt: '2026-11-22T19:00:00.000Z',
    })
  })

  it('has no window when the room has no schedule', () => {
    expect(examWindowOf([])).toBeNull()
  })
})
