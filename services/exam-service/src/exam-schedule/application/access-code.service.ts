import {
  type DerivedAccessCode,
  deriveAccessCode,
} from '../domain/policies/derive-access-code.policy.js'
import { verifyAccessCode } from '../domain/policies/verify-access-code.policy.js'

export class AccessCodeService {
  constructor(private readonly secret: string) {}

  codeFor(
    scheduleId: string,
    rotation: number,
    now: Date = new Date(),
  ): DerivedAccessCode {
    return deriveAccessCode(this.secret, scheduleId, rotation, now)
  }

  matches(
    scheduleId: string,
    rotation: number,
    given: string,
    now: Date = new Date(),
    allowPreviousSlotGrace = false,
  ): boolean {
    return verifyAccessCode(
      given,
      this.secret,
      scheduleId,
      rotation,
      now,
      allowPreviousSlotGrace,
    )
  }
}
