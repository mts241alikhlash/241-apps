import { Injectable } from '@nestjs/common'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../room-access.service.js'
import type { ExamRoomSupervisor } from '../../../domain/entities/exam-room-supervisor.entity.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'

@Injectable()
export class ListSupervisorsUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly access: RoomAccessService,
  ) {}

  async execute(
    user: RoomStaffUser,
    roomId: string,
    now: Date = new Date(),
  ): Promise<ExamRoomSupervisor[]> {
    await this.access.assertCanSupervise(user, roomId, now)
    return this.rooms.listSupervisors(roomId)
  }
}
