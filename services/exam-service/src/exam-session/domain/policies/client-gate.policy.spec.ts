import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import {
  assertClientVerified,
  assertNotLate,
  type ClientVerifyInput,
  type LateGateInput,
} from './client-gate.policy.js'

const SCHEDULE_START = new Date('2026-11-02T01:00:00.000Z')
const late: LateGateInput = {
  now: SCHEDULE_START,
  scheduleStartsAt: SCHEDULE_START,
  lateToleranceMinutes: 15,
  allowLateEntry: false,
}

const verify: ClientVerifyInput = {
  platform: 'web',
  sebVerified: false,
  allowWeb: true,
}

const codeOf = (fn: () => void) => {
  try {
    fn()
  } catch (error) {
    return (error as ForbiddenException).getResponse()
  }
  return null
}

describe('assertClientVerified', () => {
  it('refuses a web client without a verified Safe Exam Browser', () => {
    expect(() => assertClientVerified(verify)).toThrow(ForbiddenException)
    expect(codeOf(() => assertClientVerified(verify))).toMatchObject({
      code: 'SEB_REQUIRED',
      message: 'Buka ujian lewat Safe Exam Browser dengan konfigurasi sekolah.',
    })
  })

  it('lets a web client through once Safe Exam Browser is verified', () => {
    expect(() =>
      assertClientVerified({ ...verify, sebVerified: true }),
    ).not.toThrow()
  })

  it('lets a native client through without Safe Exam Browser', () => {
    expect(() =>
      assertClientVerified({
        platform: 'native',
        sebVerified: false,
        allowWeb: false,
      }),
    ).not.toThrow()
  })

  it('refuses a web client when the policy does not allow the web', () => {
    expect(
      codeOf(() =>
        assertClientVerified({ ...verify, sebVerified: true, allowWeb: false }),
      ),
    ).toMatchObject({
      code: 'WEB_NOT_ALLOWED',
      message: 'Ujian ini hanya dapat dibuka lewat aplikasi.',
    })
  })

  it('checks the web permission before Safe Exam Browser', () => {
    expect(
      codeOf(() => assertClientVerified({ ...verify, allowWeb: false })),
    ).toMatchObject({ code: 'WEB_NOT_ALLOWED' })
  })
})

describe('assertNotLate', () => {
  it('lets a student in at schedule start plus tolerance exactly', () => {
    expect(() =>
      assertNotLate({ ...late, now: new Date('2026-11-02T01:15:00.000Z') }),
    ).not.toThrow()
  })

  it('refuses a student one second after the cutoff', () => {
    expect(
      codeOf(() =>
        assertNotLate({ ...late, now: new Date('2026-11-02T01:15:01.000Z') }),
      ),
    ).toMatchObject({
      code: 'LATE_ENTRY_FORBIDDEN',
      message:
        'Anda melewati batas toleransi keterlambatan, hubungi Pengawas/Teknisi Ruangan',
    })
  })

  it('lets a late student in when the seat allows late entry', () => {
    expect(() =>
      assertNotLate({
        ...late,
        now: new Date('2026-11-02T01:30:00.000Z'),
        allowLateEntry: true,
      }),
    ).not.toThrow()
  })

  it('judges by the start of the session when it is given', () => {
    expect(() =>
      assertNotLate({
        ...late,
        now: new Date('2026-11-02T03:00:00.000Z'),
        startedAt: new Date('2026-11-02T01:10:00.000Z'),
      }),
    ).not.toThrow()
  })
})
