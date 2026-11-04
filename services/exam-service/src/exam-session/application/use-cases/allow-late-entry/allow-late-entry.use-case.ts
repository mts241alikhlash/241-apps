import { Injectable } from '@nestjs/common'
import type { RoomStaffUser } from '../../../../exam-room/application/room-access.service.js'
import {
  SeatFlagService,
  type SeatFlagRequest,
  type SeatFlagResult,
} from '../../seat-flag.service.js'

@Injectable()
export class AllowLateEntryUseCase {
  constructor(private readonly flags: SeatFlagService) {}

  execute(
    user: RoomStaffUser,
    request: SeatFlagRequest,
  ): Promise<SeatFlagResult> {
    return this.flags.allow(user, 'ALLOW_LATE_ENTRY', request)
  }
}
