import { describe, expect, it } from 'vitest'
import { ApiConflictException } from '../../../core/filters/api-exception.js'
import type { ActivityStatus } from '../../../exam-activity/domain/entities/exam-activity.entity.js'
import type { ExamSchedule } from '../entities/exam-schedule.entity.js'
import { assertOpenable } from './assert-openable.policy.js'

type OpenableSchedule = Pick<
  ExamSchedule,
  'deliveryMode' | 'packageId' | 'kind' | 'startsAt' | 'endsAt'
>

const startsAt = new Date('2026-11-27T02:00:00Z')
const endsAt = new Date('2026-11-27T04:00:00Z')
const inside = new Date('2026-11-27T03:00:00Z')
const before = new Date('2026-11-27T01:59:59Z')
const after = new Date('2026-11-27T04:00:00Z')

function schedule(overrides: Partial<OpenableSchedule> = {}): OpenableSchedule {
  return {
    deliveryMode: 'ONLINE',
    packageId: 'package-1',
    kind: 'REGULAR',
    startsAt,
    endsAt,
    ...overrides,
  }
}

function active(status: ActivityStatus = 'ACTIVE'): { status: ActivityStatus } {
  return { status }
}

function refusal(run: () => void): { code: string; message: string } {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ApiConflictException)
    const conflict = error as ApiConflictException
    return { code: conflict.code, message: conflict.message }
  }
  throw new Error('expected a refusal')
}

describe('assertOpenable', () => {
  it('opens an online schedule with a package of an active activity inside its window', () => {
    expect(() =>
      assertOpenable({ schedule: schedule(), activity: active(), now: inside }),
    ).not.toThrow()
  })

  it('opens a legacy schedule without an activity inside its window', () => {
    expect(() =>
      assertOpenable({ schedule: schedule(), activity: null, now: inside }),
    ).not.toThrow()
  })

  it('refuses an offline schedule before anything else', () => {
    expect(
      refusal(() =>
        assertOpenable({
          schedule: schedule({ deliveryMode: 'OFFLINE', packageId: null }),
          activity: active('CLOSED'),
          now: after,
        }),
      ),
    ).toEqual({
      code: 'OFFLINE_NOT_STARTABLE',
      message: 'Ujian offline tidak dikerjakan di aplikasi',
    })
  })

  it('refuses an online schedule without a package before the window check', () => {
    expect(
      refusal(() =>
        assertOpenable({
          schedule: schedule({ packageId: null }),
          activity: active('SCHEDULED'),
          now: before,
        }),
      ),
    ).toEqual({ code: 'PACKAGE_MISSING', message: 'Paket soal belum dipasang' })
  })

  it.each(['DRAFT', 'SCHEDULED'] as const)(
    'refuses a regular schedule of a %s activity as not yet open',
    (status) => {
      expect(
        refusal(() =>
          assertOpenable({
            schedule: schedule(),
            activity: active(status),
            now: inside,
          }),
        ),
      ).toEqual({ code: 'WINDOW_CLOSED', message: 'Ujian belum dibuka' })
    },
  )

  it('refuses a regular schedule of a closed activity as ended', () => {
    expect(
      refusal(() =>
        assertOpenable({
          schedule: schedule(),
          activity: active('CLOSED'),
          now: inside,
        }),
      ),
    ).toEqual({ code: 'WINDOW_CLOSED', message: 'Waktu ujian sudah berakhir' })
  })

  it('refuses an active activity before and after the window', () => {
    expect(
      refusal(() =>
        assertOpenable({
          schedule: schedule(),
          activity: active(),
          now: before,
        }),
      ),
    ).toEqual({ code: 'WINDOW_CLOSED', message: 'Ujian belum dibuka' })
    expect(
      refusal(() =>
        assertOpenable({
          schedule: schedule(),
          activity: active(),
          now: after,
        }),
      ),
    ).toEqual({ code: 'WINDOW_CLOSED', message: 'Waktu ujian sudah berakhir' })
  })

  it('opens a makeup in its own window while its original activity is closed', () => {
    expect(() =>
      assertOpenable({
        schedule: schedule({ kind: 'MAKEUP' }),
        activity: active('CLOSED'),
        now: inside,
      }),
    ).not.toThrow()
  })

  it('refuses a makeup outside its own window', () => {
    expect(
      refusal(() =>
        assertOpenable({
          schedule: schedule({ kind: 'MAKEUP' }),
          activity: active(),
          now: before,
        }),
      ),
    ).toEqual({ code: 'WINDOW_CLOSED', message: 'Ujian belum dibuka' })
    expect(
      refusal(() =>
        assertOpenable({
          schedule: schedule({ kind: 'MAKEUP' }),
          activity: active('CLOSED'),
          now: after,
        }),
      ),
    ).toEqual({ code: 'WINDOW_CLOSED', message: 'Waktu ujian sudah berakhir' })
  })

  it('refuses a makeup of an online exam without a package', () => {
    expect(
      refusal(() =>
        assertOpenable({
          schedule: schedule({ kind: 'MAKEUP', packageId: null }),
          activity: active(),
          now: inside,
        }),
      ),
    ).toEqual({ code: 'PACKAGE_MISSING', message: 'Paket soal belum dipasang' })
  })
})
