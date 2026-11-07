import { describe, expect, it } from 'vitest'
import { codeScopeOf, STATIC_SLOT_ORIGIN } from './access-code-scope.policy.js'

const now = new Date('2026-11-10T02:00:00Z')

describe('codeScopeOf', () => {
  it('keeps a legacy schedule scoped to itself', () => {
    const scope = codeScopeOf({ id: 'schedule-1', tokenRotation: 3 }, now)
    expect(scope).toEqual({
      scope: 'schedule-1',
      rotation: 3,
      at: now,
      allowPreviousSlotGrace: true,
    })
  })

  it('scopes an activity-backed schedule to the activity', () => {
    const scope = codeScopeOf(
      {
        id: 'schedule-1',
        tokenRotation: 3,
        activityId: 'activity-1',
        activityTokenRotation: 0,
        activityTokenMode: 'ROTATING',
      },
      now,
    )
    expect(scope).toEqual({
      scope: 'activity:activity-1',
      rotation: 0,
      at: now,
      allowPreviousSlotGrace: true,
    })
  })

  it('pins a static activity to one slot so the code never rotates', () => {
    const early = codeScopeOf(
      {
        id: 'schedule-1',
        tokenRotation: 0,
        activityId: 'activity-1',
        activityTokenRotation: 0,
        activityTokenMode: 'STATIC',
      },
      new Date('2026-11-10T02:00:00Z'),
    )
    const later = codeScopeOf(
      {
        id: 'schedule-1',
        tokenRotation: 0,
        activityId: 'activity-1',
        activityTokenRotation: 0,
        activityTokenMode: 'STATIC',
      },
      new Date('2026-11-10T05:00:00Z'),
    )
    expect(early.at).toEqual(STATIC_SLOT_ORIGIN)
    expect(later).toEqual(early)
    expect(early.allowPreviousSlotGrace).toBe(false)
  })

  it('lets a rotated activity invalidate its previous static code', () => {
    const scope = codeScopeOf(
      {
        id: 'schedule-1',
        tokenRotation: 0,
        activityId: 'activity-1',
        activityTokenRotation: 4,
        activityTokenMode: 'STATIC',
      },
      now,
    )
    expect(scope.rotation).toBe(4)
  })
})
