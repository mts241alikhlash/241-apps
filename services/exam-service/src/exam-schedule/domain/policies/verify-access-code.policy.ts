import { timingSafeEqual } from 'node:crypto'
import {
  ROLLOVER_GRACE_SECONDS,
  SLOT_DURATION_MS,
  deriveAccessCode,
  slotIndexAt,
} from './derive-access-code.policy.js'

function sameCode(given: string, expected: string): boolean {
  const actual = Buffer.from(given)
  const wanted = Buffer.from(expected)
  return actual.length === wanted.length && timingSafeEqual(actual, wanted)
}

export function verifyAccessCode(
  input: string,
  secret: string,
  scopeId: string,
  rotation: number,
  now: Date = new Date(),
  allowPreviousSlotGrace = false,
): boolean {
  const given = input.trim().toUpperCase()
  if (sameCode(given, deriveAccessCode(secret, scopeId, rotation, now).code)) {
    return true
  }
  if (!allowPreviousSlotGrace) return false

  const elapsed = now.getTime() - slotIndexAt(now) * SLOT_DURATION_MS
  if (elapsed >= ROLLOVER_GRACE_SECONDS * 1000) return false

  const previous = new Date(now.getTime() - SLOT_DURATION_MS)
  return sameCode(
    given,
    deriveAccessCode(secret, scopeId, rotation, previous).code,
  )
}
