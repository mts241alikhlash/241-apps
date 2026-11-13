import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import {
  assertClientVerified,
  assertNotLate,
  type ClientGateInput,
} from './client-gate.policy.js'

const EVENT_START = new Date('2026-11-02T01:00:00.000Z')
const base: ClientGateInput = {
  platform: 'web',
  sebVerified: false,
  now: EVENT_START,
  eventStartsAt: EVENT_START,
  lateToleranceMinutes: 10,
  allowLateEntry: false,
}

describe('assertClientVerified', () => {
  it('refuses a web client without a verified Safe Exam Browser', () => {
    expect(() => assertClientVerified(base)).toThrow(ForbiddenException)
    try {
      assertClientVerified(base)
    } catch (error) {
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'SEB_REQUIRED',
        message:
          'Buka ujian lewat Safe Exam Browser dengan konfigurasi sekolah.',
      })
    }
  })

  it('lets a web client through once Safe Exam Browser is verified', () => {
    expect(() =>
      assertClientVerified({ ...base, sebVerified: true }),
    ).not.toThrow()
  })

  it('lets a native client through without Safe Exam Browser', () => {
    expect(() =>
      assertClientVerified({ ...base, platform: 'native' }),
    ).not.toThrow()
  })
})

describe('assertNotLate', () => {
  it('still refuses a late entry without an allowance', () => {
    const late = new Date(EVENT_START.getTime() + 11 * 60_000)
    expect(() => assertNotLate({ ...base, now: late })).toThrow(
      'Anda melewati batas toleransi keterlambatan, hubungi Pengawas/Teknisi Ruangan',
    )
  })
})
