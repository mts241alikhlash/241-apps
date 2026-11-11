import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import {
  assertActivityAllowed,
  type ActivityEventRef,
} from './activity-rules.policy.js'

const startsAt = new Date('2026-11-10T01:00:00Z')
const endsAt = new Date('2026-11-10T03:00:00Z')

const activeMidtermEvent: ActivityEventRef = {
  type: 'MIDTERM',
  status: 'ACTIVE',
  startsAt,
  endsAt,
}

function codeOf(fn: () => void): { code: unknown; status: number } {
  try {
    fn()
    throw new Error('Expected assertActivityAllowed to throw')
  } catch (error) {
    if (
      error instanceof UnprocessableEntityException ||
      error instanceof ForbiddenException
    ) {
      const response = error.getResponse() as { code?: unknown }
      return { code: response.code, status: error.getStatus() }
    }
    throw error
  }
}

describe('assertActivityAllowed', () => {
  it('MIDTERM + preset DAILY -> PRESET_LOCKED', () => {
    expect(
      codeOf(() =>
        assertActivityAllowed({
          type: 'MIDTERM',
          presetName: 'DAILY',
          tokenMode: 'ROTATING',
          manageAll: true,
          event: activeMidtermEvent,
          startsAt,
          endsAt,
        }),
      ),
    ).toEqual({ code: 'PRESET_LOCKED', status: 422 })
  })

  it('FINAL + tokenMode STATIC -> TOKEN_MODE_LOCKED', () => {
    expect(
      codeOf(() =>
        assertActivityAllowed({
          type: 'FINAL',
          presetName: 'FINAL',
          tokenMode: 'STATIC',
          manageAll: true,
          event: { ...activeMidtermEvent, type: 'FINAL' },
          startsAt,
          endsAt,
        }),
      ),
    ).toEqual({ code: 'TOKEN_MODE_LOCKED', status: 422 })
  })

  it('FINAL, manageAll: false -> FINAL_ADMIN_ONLY (403)', () => {
    expect(
      codeOf(() =>
        assertActivityAllowed({
          type: 'FINAL',
          presetName: 'FINAL',
          tokenMode: 'ROTATING',
          manageAll: false,
          event: { ...activeMidtermEvent, type: 'FINAL' },
          startsAt,
          endsAt,
        }),
      ),
    ).toEqual({ code: 'FINAL_ADMIN_ONLY', status: 403 })
  })

  it('FINAL, manageAll: true, event: null -> EVENT_REQUIRED', () => {
    expect(
      codeOf(() =>
        assertActivityAllowed({
          type: 'FINAL',
          presetName: 'FINAL',
          tokenMode: 'ROTATING',
          manageAll: true,
          event: null,
          startsAt,
          endsAt,
        }),
      ),
    ).toEqual({ code: 'EVENT_REQUIRED', status: 422 })
  })

  it('MIDTERM, manageAll: false, event MIDTERM berstatus DRAFT -> MIDTERM_OUTSIDE_EVENT', () => {
    expect(
      codeOf(() =>
        assertActivityAllowed({
          type: 'MIDTERM',
          presetName: 'MIDTERM',
          tokenMode: 'ROTATING',
          manageAll: false,
          event: { ...activeMidtermEvent, status: 'DRAFT' },
          startsAt,
          endsAt,
        }),
      ),
    ).toEqual({ code: 'MIDTERM_OUTSIDE_EVENT', status: 422 })
  })

  it('MIDTERM, manageAll: false, event aktif, endsAt = event.endsAt + 60_000 -> MIDTERM_OUTSIDE_EVENT', () => {
    expect(
      codeOf(() =>
        assertActivityAllowed({
          type: 'MIDTERM',
          presetName: 'MIDTERM',
          tokenMode: 'ROTATING',
          manageAll: false,
          event: activeMidtermEvent,
          startsAt,
          endsAt: new Date(activeMidtermEvent.endsAt.getTime() + 60_000),
        }),
      ),
    ).toEqual({ code: 'MIDTERM_OUTSIDE_EVENT', status: 422 })
  })

  it('MIDTERM, manageAll: true, event FINAL -> EVENT_REQUIRED', () => {
    expect(
      codeOf(() =>
        assertActivityAllowed({
          type: 'MIDTERM',
          presetName: 'MIDTERM',
          tokenMode: 'ROTATING',
          manageAll: true,
          event: { ...activeMidtermEvent, type: 'FINAL' },
          startsAt,
          endsAt,
        }),
      ),
    ).toEqual({ code: 'EVENT_REQUIRED', status: 422 })
  })

  it('DAILY + preset ASSIGNMENT + STATIC -> tidak melempar', () => {
    expect(() =>
      assertActivityAllowed({
        type: 'DAILY',
        presetName: 'ASSIGNMENT',
        tokenMode: 'STATIC',
        manageAll: false,
        event: null,
        startsAt,
        endsAt,
      }),
    ).not.toThrow()
  })

  it('DAILY + preset MIDTERM -> PRESET_LOCKED', () => {
    expect(
      codeOf(() =>
        assertActivityAllowed({
          type: 'DAILY',
          presetName: 'MIDTERM',
          tokenMode: 'STATIC',
          manageAll: false,
          event: null,
          startsAt,
          endsAt,
        }),
      ),
    ).toEqual({ code: 'PRESET_LOCKED', status: 422 })
  })

  it('MIDTERM, manageAll: false, event MIDTERM aktif, jendela tepat di dalam -> tidak melempar', () => {
    expect(() =>
      assertActivityAllowed({
        type: 'MIDTERM',
        presetName: 'MIDTERM',
        tokenMode: 'ROTATING',
        manageAll: false,
        event: activeMidtermEvent,
        startsAt,
        endsAt,
      }),
    ).not.toThrow()
  })
})
