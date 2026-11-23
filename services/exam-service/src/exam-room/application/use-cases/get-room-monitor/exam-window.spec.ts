import { examWindowOf, scheduleToShow } from './get-room-monitor.use-case.js'

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

describe('scheduleToShow', () => {
  const quran = {
    name: 'quran',
    startsAt: new Date('2026-11-23T00:00:00.000Z'),
    endsAt: new Date('2026-11-23T02:00:00.000Z'),
  }
  const indonesian = {
    name: 'indonesia',
    startsAt: new Date('2026-11-23T02:15:00.000Z'),
    endsAt: new Date('2026-11-23T03:30:00.000Z'),
  }
  const none = () => undefined

  it('shows the exam that is running now, not the first one the student sat', () => {
    expect(
      scheduleToShow(
        [quran, indonesian],
        (row) => (row === quran ? 'SUBMITTED' : undefined),
        new Date('2026-11-23T02:20:00.000Z'),
      ),
    ).toBe(indonesian)
  })

  it('keeps a student who is still working on the earlier exam on that exam', () => {
    expect(
      scheduleToShow(
        [quran, indonesian],
        (row) => (row === quran ? 'IN_PROGRESS' : undefined),
        new Date('2026-11-23T02:20:00.000Z'),
      ),
    ).toBe(quran)
  })

  it('shows the next exam between two exams and the last one after all', () => {
    expect(
      scheduleToShow(
        [quran, indonesian],
        none,
        new Date('2026-11-23T02:05:00.000Z'),
      ),
    ).toBe(indonesian)
    expect(
      scheduleToShow(
        [quran, indonesian],
        none,
        new Date('2026-11-23T05:00:00.000Z'),
      ),
    ).toBe(indonesian)
    expect(scheduleToShow([], none, new Date())).toBeUndefined()
  })
})
