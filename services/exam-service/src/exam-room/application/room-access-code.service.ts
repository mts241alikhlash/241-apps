import { Injectable } from '@nestjs/common'
import {
  type DerivedAccessCode,
  deriveAccessCode,
} from '../../exam-schedule/domain/policies/derive-access-code.policy.js'
import { verifyAccessCode } from '../../exam-schedule/domain/policies/verify-access-code.policy.js'

export function roomScope(roomId: string): string {
  return `room:${roomId}`
}

@Injectable()
export class RoomAccessCodeService {
  constructor(private readonly secret: string) {}

  codeFor(roomId: string, rotation: number, now: Date): DerivedAccessCode {
    return deriveAccessCode(this.secret, roomScope(roomId), rotation, now)
  }

  matches(
    roomId: string,
    rotation: number,
    given: string,
    now: Date,
    allowPreviousSlotGrace = false,
  ): boolean {
    return verifyAccessCode(
      given,
      this.secret,
      roomScope(roomId),
      rotation,
      now,
      allowPreviousSlotGrace,
    )
  }
}
