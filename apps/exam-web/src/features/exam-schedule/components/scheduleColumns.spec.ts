import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import { buildScheduleColumns } from './scheduleColumns'
import type { ExamSchedule } from '../types'
import { toInstant } from '../utils/instant'

const schedule = (overrides: Partial<ExamSchedule> = {}): ExamSchedule => ({
  id: 's1',
  packageId: 'p1',
  packageTitle: 'UTS Matematika',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem',
  eventId: null,
  activityId: null,
  type: 'UTS',
  startsAt: toInstant('2026-11-02', '08:00'),
  endsAt: toInstant('2026-11-02', '11:00'),
  durationMinutes: 90,
  status: 'SCHEDULED',
  kind: 'REGULAR' as const,
  makeupOfId: null,
  hasSessions: false,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
  ...overrides,
})

const allowed = {
  canUpdate: true,
  canCancel: true,
  canAccessCode: true,
  canSessions: true,
}

function columns(
  overrides: Partial<Parameters<typeof buildScheduleColumns>[0]> = {},
) {
  return buildScheduleColumns({
    ...allowed,
    now: () => new Date(toInstant('2026-11-02', '09:00')),
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onAccessCode: vi.fn(),
    onSessions: vi.fn(),
    ...overrides,
  })
}

function actionProps(
  options: Partial<Parameters<typeof buildScheduleColumns>[0]>,
  row: ExamSchedule,
) {
  const column = columns(options).find((item) => item.id === 'actions')!
  const cell = column.cell as (ctx: {
    row: { original: ExamSchedule }
  }) => VNode
  return cell({ row: { original: row } }).props as Record<string, unknown>
}

const labels = (props: Record<string, unknown>) =>
  (props.items as { label: string }[]).map((item) => item.label)

describe('buildScheduleColumns', () => {
  it('shows package, classroom, window, duration and phase', () => {
    const built = columns()
    const mobile = (id: string) =>
      (
        built.find((column) => column.id === id)!.meta as {
          mobileValue: (row: ExamSchedule) => string
        }
      ).mobileValue(schedule())

    expect(built.map((column) => column.id)).toEqual([
      'package',
      'type',
      'classroom',
      'window',
      'duration',
      'phase',
      'actions',
    ])
    expect(mobile('type')).toBe('UTS')
    expect(mobile('classroom')).toBe('VII A')
    expect(mobile('window')).toContain('08.00')
    expect(mobile('duration')).toBe('90 menit')
    expect(mobile('phase')).toBe('Berlangsung')
  })

  it('falls back to a dash when the classroom name is missing', () => {
    const column = columns().find((item) => item.id === 'classroom')!
    const mobile = (
      column.meta as { mobileValue: (row: ExamSchedule) => string }
    ).mobileValue

    expect(mobile(schedule({ classroomName: null }))).toBe('-')
  })

  it('offers change, access code and cancel before the exam starts', () => {
    const props = actionProps(
      { now: () => new Date(toInstant('2026-11-02', '07:00')) },
      schedule(),
    )

    expect(props.hideEdit).toBe(false)
    expect(props.editLabel).toBe('Ubah')
    expect(labels(props)).toEqual(['Token', 'Batalkan'])
  })

  it('offers nothing for a cancelled schedule', () => {
    const props = actionProps({}, schedule({ status: 'CANCELLED' }))

    expect(props.hideEdit).toBe(true)
    expect(labels(props)).toEqual([])
  })

  it('follows the permissions of the user', () => {
    const before = { now: () => new Date(toInstant('2026-11-02', '07:00')) }

    expect(
      actionProps({ ...before, canUpdate: false }, schedule()).hideEdit,
    ).toBe(true)
    expect(
      labels(actionProps({ ...before, canAccessCode: false }, schedule())),
    ).toEqual(['Batalkan'])
    expect(
      labels(actionProps({ ...before, canCancel: false }, schedule())),
    ).toEqual(['Token'])
  })

  it('lets a running exam be extended, its code and sessions shown, but not be cancelled', () => {
    const props = actionProps({}, schedule())

    expect(props.hideEdit).toBe(false)
    expect(labels(props)).toEqual(['Token', 'Sesi'])
  })

  it('offers nothing once the exam has ended', () => {
    const props = actionProps(
      { now: () => new Date(toInstant('2026-11-02', '12:00')) },
      schedule(),
    )

    expect(props.hideEdit).toBe(true)
    expect(labels(props)).toEqual([])
  })

  it('offers the sessions of a schedule that has any, and no cancel once students started', () => {
    const upcoming = {
      now: () => new Date(toInstant('2026-11-02', '07:00')),
    }

    expect(
      labels(actionProps(upcoming, schedule({ hasSessions: true }))),
    ).toEqual(['Token', 'Sesi'])
    expect(labels(actionProps(upcoming, schedule()))).toEqual([
      'Token',
      'Batalkan',
    ])
  })

  it('offers the activity status entry for a schedule with an activity', () => {
    const props = actionProps(
      {
        canManageActivity: true,
        onStatus: vi.fn(),
        now: () => new Date(toInstant('2026-11-02', '07:00')),
      },
      schedule({ activityId: 'activity-1' }),
    )

    expect(labels(props)).toContain('Ubah status')
    expect(
      labels(
        actionProps(
          { canManageActivity: false },
          schedule({ activityId: 'activity-1' }),
        ),
      ),
    ).not.toContain('Ubah status')
    expect(
      labels(actionProps({ canManageActivity: true }, schedule())),
    ).not.toContain('Ubah status')
  })

  it('hides the sessions action without the permission', () => {
    expect(
      labels(
        actionProps({ canSessions: false }, schedule({ hasSessions: true })),
      ),
    ).not.toContain('Sesi')
  })

  it('offers the sessions while the exam is running even before the list knows of any', () => {
    expect(labels(actionProps({}, schedule()))).toContain('Sesi')
    expect(
      labels(
        actionProps(
          { now: () => new Date(toInstant('2026-11-02', '07:00')) },
          schedule(),
        ),
      ),
    ).not.toContain('Sesi')
  })

  describe('makeups', () => {
    const ended = { now: () => new Date(toInstant('2026-11-02', '12:00')) }

    it('offers a makeup of a regular schedule, even after it ended', () => {
      expect(
        labels(actionProps({ ...ended, canMakeup: true }, schedule())),
      ).toEqual(['Susulan'])
      expect(
        labels(
          actionProps({ canMakeup: true }, schedule({ hasSessions: true })),
        ),
      ).toContain('Susulan')
    })

    it('does not offer a makeup of a makeup, of a cancelled schedule, or without the permission', () => {
      const options = { ...ended, canMakeup: true }

      expect(
        labels(
          actionProps(options, schedule({ kind: 'MAKEUP', makeupOfId: 's0' })),
        ),
      ).not.toContain('Susulan')
      expect(
        labels(actionProps(options, schedule({ status: 'CANCELLED' }))),
      ).not.toContain('Susulan')
      expect(labels(actionProps(ended, schedule()))).not.toContain('Susulan')
    })

    it('offers the participants of a makeup', () => {
      const makeup = schedule({ kind: 'MAKEUP', makeupOfId: 's0' })

      expect(
        labels(actionProps({ ...ended, canParticipants: true }, makeup)),
      ).toEqual(['Peserta'])
      expect(labels(actionProps(ended, makeup))).toEqual([])
    })

    it('calls the handlers with the row', () => {
      const onMakeup = vi.fn()
      const onParticipants = vi.fn()
      const regular = schedule()
      const makeup = schedule({ kind: 'MAKEUP', makeupOfId: 's0' })
      const items = (row: ExamSchedule) =>
        actionProps(
          { canMakeup: true, canParticipants: true, onMakeup, onParticipants },
          row,
        ).items as { label: string; onClick: () => void }[]

      items(regular)
        .find((item) => item.label === 'Susulan')!
        .onClick()
      items(makeup)
        .find((item) => item.label === 'Peserta')!
        .onClick()

      expect(onMakeup).toHaveBeenCalledWith(regular)
      expect(onParticipants).toHaveBeenCalledWith(makeup)
    })

    it('tells a makeup apart in the type column', () => {
      const type = columns().find((column) => column.id === 'type')!
      const text = (type.meta as { mobileValue: (row: ExamSchedule) => string })
        .mobileValue

      expect(text(schedule({ kind: 'MAKEUP', makeupOfId: 's0' }))).toBe(
        'UTS · Susulan',
      )
      expect(text(schedule())).toBe('UTS')
    })
  })
})
